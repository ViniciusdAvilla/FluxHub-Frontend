"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

type SyncResult = {
  error?: string;
  listings?: number;
  orders?: number;
  next_offset?: number | null;
};

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
  const router = useRouter();

  const run = useCallback(async (firstPageOnly = false) => {
    if (inProgress.current) return;
    inProgress.current = true;
    setBusy(true);
    setMessage("Consultando anúncios e pedidos do Mercado Livre...");

    let listings = 0;
    let orders = 0;
    let pages = 0;
    try {
      let offset = 0;
      let complete = false;
      while (offset <= 1000) {
        const response = await fetch("/api/platform/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, offset }),
          cache: "no-store",
        });
        const data = await response.json() as SyncResult;
        if (!response.ok) throw new Error(data.error || "Falha na sincronização.");

        listings += data.listings ?? 0;
        orders += data.orders ?? 0;
        pages += 1;
        setMessage(`Sincronizando... ${pages} página(s), ${listings} anúncios e ${orders} pedidos.`);

        if (data.next_offset === null || data.next_offset === undefined) {
          complete = true;
          break;
        }
        // O carregamento inicial busca apenas um lote para liberar o dashboard rapidamente.
        // O botão manual percorre as demais páginas.
        if (firstPageOnly) break;
        if (!Number.isSafeInteger(data.next_offset) || data.next_offset <= offset || data.next_offset % 20 !== 0)
          throw new Error("O backend retornou uma página de sincronização inválida.");
        offset = data.next_offset;
      }
      setMessage(
        `${listings} anúncios e ${orders} pedidos sincronizados em ${pages} página(s).` +
        (complete ? "" : firstPageOnly ? " Primeira página importada; use Atualizar dados para continuar." : " Limite de 1.020 itens atingido; existem mais anúncios para importar."),
      );
    } catch (error) {
      setMessage(
        (pages ? `Sincronização parcial: ${listings} anúncios e ${orders} pedidos. ` : "") +
        (error instanceof Error ? error.message : "Erro de sincronização."),
      );
    } finally {
      inProgress.current = false;
      setBusy(false);
      if (pages > 0) router.refresh();
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
    {message && <p className="fh-sync-message" role="status" aria-live="polite">{message}</p>}
  </div>;
}
