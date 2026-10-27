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

const isRetryableStatus = (status: number) =>
  status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

async function fetchSyncPage(payload: SyncPayload, signal: AbortSignal): Promise<SyncResult> {
  // A listing scan is stateful: retrying the same cursor can skip a page.
  // The caller restarts the whole scan on failure, relying on database upserts.
  const maxAttempts = payload.phase === "listings" ? 1 : 4;
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
      if (!isRetryableStatus(response.status) || attempt === maxAttempts - 1)
        throw new Error(data.error || "Falha na sincronização.");
    } catch (error) {
      if (signal.aborted) throw error;
      // A page may have been committed before a connection was interrupted.
      // Upserts on the backend make retransmission safe.
      if (attempt === maxAttempts - 1 || (error instanceof Error && error.message !== "Failed to fetch" && error.message !== "fetch failed"))
        throw error;
    }
    // Gradual retry on overload without flooding Mercado Livre.
    await new Promise<void>((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
    if (signal.aborted) throw new DOMException("Sincronização cancelada.", "AbortError");
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
  const router = useRouter();

  const run = useCallback(async (firstPageOnly = false) => {
    if (inProgress.current) return;
    inProgress.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setMessage("Consultando anúncios e pedidos do Mercado Livre...");

    let listings = 0;
    let savedListings = 0;
    let orders = 0;
    let pages = 0;
    let complete = false;
    let ordersUnavailable = false;
    try {
      // The marketplace caps regular listing offset pagination at 1000.
      // Scan/scroll has no artificial item-count ceiling. Its cursor expires
      // after five minutes, so consume pages continuously while the tab is open.
      let scrollId: string | undefined;
      let scanRestarts = 0;
      while (true) {
        let data: SyncResult;
        try {
          data = await fetchSyncPage(
            { accountId, phase: "listings", ...(scrollId ? { scrollId } : {}) },
            controller.signal,
          );
        } catch (error) {
          if (controller.signal.aborted || scanRestarts >= 2) throw error;
          scanRestarts += 1;
          // If a scan page failed after the marketplace advanced its cursor,
          // the only safe recovery is to restart from page one. Previously
          // committed records will be updated (upsert), not duplicated.
          scrollId = undefined;
          listings = 0;
          savedListings = 0;
          setMessage("Recuperando sincronização de anúncios (tentativa " + scanRestarts + " de 2)...");
          await new Promise<void>((resolve) => setTimeout(resolve, 1200 * scanRestarts));
          continue;
        }
        listings += data.listings ?? 0;
        savedListings += data.saved_listings ?? data.listings ?? 0;
        pages += 1;
        setMessage("Consultando anúncios... " + listings + " encontrados; " +
          savedListings + " salvos/atualizados (limite de 3.000 no banco por conta).");
        if (firstPageOnly || data.next_scroll_id == null) break;
        if (typeof data.next_scroll_id !== "string" || data.next_scroll_id.length === 0)
          throw new Error("O Mercado Livre retornou um cursor inválido.");
        scrollId = data.next_scroll_id;
      }

      // Orders have their own pagination and must never be cut short when
      // the listings scan finishes earlier.
      let offset = 0;
      while (true) {
        const data = await fetchSyncPage(
          { accountId, phase: "orders", offset },
          controller.signal,
        );
        orders += data.orders ?? 0;
        pages += 1;
        setMessage("Sincronizando pedidos... " + listings + " anúncios consultados e " + orders + " pedidos.");
        if (data.orders_unavailable) {
          ordersUnavailable = true;
          break;
        }
        if (firstPageOnly || data.next_orders_offset == null) break;
        const nextOffset = data.next_orders_offset;
        if (!Number.isSafeInteger(nextOffset) || nextOffset <= offset || nextOffset % 20 !== 0)
          throw new Error("O backend retornou uma página de pedidos inválida.");
        offset = nextOffset;
      }

      complete = !firstPageOnly && !ordersUnavailable;
      setMessage(
        listings + " anúncios consultados (" + savedListings + " salvos/atualizados), e " + orders + " pedidos sincronizados em " + pages + " lotes." +
        (ordersUnavailable ? " Pedidos temporariamente indisponíveis: tente novamente." :
          firstPageOnly ? " Primeiras páginas importadas; use Atualizar dados para concluir." : " Sincronização concluída."),
      );
    } catch (error) {
      const cancelled = controller.signal.aborted;
      setMessage(
        (pages ? "Sincronização parcial: " + listings + " anúncios consultados, " + savedListings + " salvos/atualizados e " + orders + " pedidos. " : "") +
        (cancelled ? "Cancelada; o que já foi salvo permanece no banco." :
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
    {message && <p className="fh-sync-message" role="status" aria-live="polite">{message}</p>}
  </div>;
}
