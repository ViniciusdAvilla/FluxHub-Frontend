"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

type SyncPhase = "listings" | "orders";
type SyncResult = {
  error?: string;
  listings?: number;
  saved_listings?: number;
  storage_limit?: number;
  orders?: number;
  next_scroll_id?: string | null;
  next_orders_offset?: number | null;
  orders_unavailable?: boolean;
};

type SyncPayload = {
  accountId: number;
  phase: SyncPhase;
  offset?: number;
  scrollId?: string;
};

class SyncRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncRateLimitError";
  }
}

type SyncCheckpoint = {
  phase: SyncPhase;
  scrollId?: string;
  offset: number;
  listings: number;
  savedListings: number;
  orders: number;
  pages: number;
};

async function waitDelay(milliseconds: number, signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Sincronização cancelada.", "AbortError");
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Sincronização cancelada.", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchSyncPage(payload: SyncPayload, signal: AbortSignal): Promise<SyncResult> {
  // A scan cursor is stateful. Only a confirmed 429 can safely be retried
  // with the same cursor; ambiguous network/5xx failures restart the scan.
  const maxAttempts = payload.phase === "listings" ? 3 : 4;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch("/api/platform/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal,
      });
      const data = await response.json() as SyncResult;
      if (response.ok) return data;
      if (response.status === 429) {
        if (attempt === maxAttempts - 1)
          throw new SyncRateLimitError(data.error || "Limite temporário da API. Aguarde e retome.");
        const seconds = Number(response.headers.get("Retry-After"));
        if (Number.isFinite(seconds) && seconds > 60)
          throw new SyncRateLimitError("A API pediu uma pausa maior que um minuto. Aguarde e retome.");
        const delay = Number.isFinite(seconds) && seconds > 0
          ? seconds * 1000 : 1000 * (2 ** attempt) + Math.random() * 400;
        await waitDelay(delay, signal);
        continue;
      }
      throw new Error(data.error || "Falha na sincronização.");
    } catch (error) {
      if (signal.aborted || error instanceof SyncRateLimitError) throw error;
      // Retrying a scan after an ambiguous failure could skip items.
      // Orders use offset pagination and can retry safely.
      if (payload.phase === "listings" || attempt === maxAttempts - 1 ||
          !(error instanceof TypeError && /fetch/i.test(error.message)))
        throw error;
    }
    await waitDelay(500 * (2 ** attempt), signal);
  }
  throw new Error("Não foi possível sincronizar após novas tentativas.");
}

export default function SyncAction({
  accountId,
  auto = false,
}: {
  accountId: number;
  auto?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inProgress = useRef(false);
  const autoStarted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const checkpointRef = useRef<SyncCheckpoint | null>(null);
  const [canResume, setCanResume] = useState(false);
  const router = useRouter();

  const run = useCallback(async (firstPageOnly = false, resume = false) => {
    if (inProgress.current) return;
    inProgress.current = true;
    const checkpoint = resume ? checkpointRef.current : null;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setCanResume(false);
    setMessage(resume ? "Retomando do último lote confirmado..." :
      "Consultando anúncios e pedidos do Mercado Livre...");

    let listings = checkpoint?.listings ?? 0;
    let savedListings = checkpoint?.savedListings ?? 0;
    let orders = checkpoint?.orders ?? 0;
    let pages = checkpoint?.pages ?? 0;
    let complete = false;
    let ordersUnavailable = false;
    let scanFinished = checkpoint?.phase === "orders";
    try {
      // Scroll pagination is unbounded, and the cursor expires in five minutes.
      // Checkpoints are local to this tab; no credentials or item details are stored.
      let scrollId = checkpoint?.phase === "listings" ? checkpoint.scrollId : undefined;
      let scanRestarts = 0;
      if (!scanFinished) {
        checkpointRef.current = { phase: "listings", scrollId, offset: 0,
          listings, savedListings, orders, pages };
        while (true) {
          let data: SyncResult;
          try {
            data = await fetchSyncPage(
              { accountId, phase: "listings", ...(scrollId ? { scrollId } : {}) },
              controller.signal,
            );
          } catch (error) {
            if (error instanceof SyncRateLimitError) throw error;
            if (controller.signal.aborted || scanRestarts >= 2) throw error;
            scanRestarts += 1;
            scrollId = undefined;
            listings = 0;
            savedListings = 0;
            checkpointRef.current = { phase: "listings", offset: 0,
              listings, savedListings, orders, pages };
            setMessage("Recuperando consulta desde o início (tentativa " + scanRestarts + " de 2)...");
            await waitDelay(1200 * scanRestarts, controller.signal);
            continue;
          }
          listings += data.listings ?? 0;
          savedListings += data.saved_listings ?? data.listings ?? 0;
          pages += 1;
          scrollId = data.next_scroll_id ?? undefined;
          checkpointRef.current = { phase: "listings", scrollId, offset: 0,
            listings, savedListings, orders, pages };
          setMessage("Consultando anúncios... " + listings + " encontrados; " +
            savedListings + " salvos/atualizados (limite de 3.000 no banco por conta).");
          if (firstPageOnly || !scrollId) break;
          await waitDelay(180, controller.signal);
        }
        scanFinished = true;
      }

      // Orders have a separate pagination state, never reuse a listings cursor.
      let offset = checkpoint?.phase === "orders" ? checkpoint.offset : 0;
      checkpointRef.current = { phase: "orders", offset,
        listings, savedListings, orders, pages };
      while (true) {
        const data = await fetchSyncPage({ accountId, phase: "orders", offset },
          controller.signal);
        orders += data.orders ?? 0;
        pages += 1;
        setMessage("Sincronizando pedidos... " + listings + " anúncios consultados e " + orders + " pedidos.");
        if (data.orders_unavailable) {
          ordersUnavailable = true;
          break;
        }
        const nextOffset = data.next_orders_offset;
        if (firstPageOnly || nextOffset == null) break;
        if (!Number.isSafeInteger(nextOffset) || nextOffset <= offset || nextOffset % 20 !== 0)
          throw new Error("O backend retornou uma página de pedidos inválida.");
        offset = nextOffset;
        checkpointRef.current = { phase: "orders", offset,
          listings, savedListings, orders, pages };
        await waitDelay(180, controller.signal);
      }

      complete = !firstPageOnly && !ordersUnavailable;
      checkpointRef.current = null;
      setMessage(
        listings + " anúncios consultados (" + savedListings + " salvos/atualizados), e " +
        orders + " pedidos sincronizados em " + pages + " lotes." +
        (ordersUnavailable ? " Pedidos temporariamente indisponíveis: tente novamente." :
          firstPageOnly ? " Primeiras páginas importadas; use Atualizar dados para concluir." :
            " Sincronização concluída."),
      );
    } catch (error) {
      const cancelled = controller.signal.aborted;
      const rateLimited = error instanceof SyncRateLimitError;
      setCanResume(rateLimited && !cancelled && checkpointRef.current !== null);
      if (!rateLimited) checkpointRef.current = null;
      setMessage(
        (pages ? "Sincronização parcial: " + listings + " anúncios consultados e " +
          savedListings + " salvos/atualizados. " : "") +
        (cancelled ? "Cancelada; os registros já salvos permanecem no banco." :
          rateLimited ? (error.message + " Use Retomar sincronização para continuar do último lote.") :
            error instanceof Error ? error.message : "Erro de sincronização."),
      );
    } finally {
      inProgress.current = false;
      abortRef.current = null;
      setBusy(false);
      if (pages > 0 || complete) router.refresh();
    }
  }, [accountId, router]);

  useEffect(() => {
    if (!auto || autoStarted.current) return;
    autoStarted.current = true;
    void run(true);
  }, [auto, run]);

  return <div className="fh-sync-action">
    <button className="fh-primary-btn" type="button" onClick={() => void run(false)} disabled={busy}>
      <RefreshCw size={16} className={busy ? "fh-spinning" : ""}/>
      {busy ? "Sincronizando..." : "Atualizar dados do Mercado Livre"}
    </button>
    {busy && <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Cancelar sincronização">
      <X size={16}/> Cancelar
    </button>}
    {canResume && !busy && <button type="button" className="fh-control"
      onClick={() => void run(false, true)}>Retomar sincronização</button>}
    {message && <p className="fh-sync-message" role="status" aria-live="polite">{message}</p>}
  </div>;
}
