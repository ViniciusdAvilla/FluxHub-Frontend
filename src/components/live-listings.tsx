"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { money, number } from "@/lib/analytics";
import { listingStatusLabel } from "@/lib/order-status";
import PricingCalculator, { type PricingSeed } from "./pricing-calculator";

type LiveItem = {
  id: string;
  title: string;
  status: string;
  price: number | null;
  stock: number | null;
  thumbnail?: string | null;
};
type LivePage = {
  items: LiveItem[];
  next_scroll_id: string | null;
  total: number | null;
};
type AccountOption = { account_id: number; nickname: string | null };
const trustedPhoto = (src: string | null | undefined) => {
  if (!src) return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" &&
      (url.hostname === "mlstatic.com" || url.hostname.endsWith(".mlstatic.com"));
  } catch { return false; }
};

async function loadPage(accountId: number, cursor?: string, signal?: AbortSignal): Promise<LivePage> {
  const query = new URLSearchParams({ accountId: String(accountId) });
  if (cursor) query.set("scrollId", cursor);
  const response = await fetch("/api/platform/items?" + query, {
    cache: "no-store", signal,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Não foi possível consultar os anúncios.");
  if (!Array.isArray(body.items)) throw new Error("Resposta de anúncios inválida.");
  return body as LivePage;
}

export default function LiveListings({ accounts }: { accounts: AccountOption[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.account_id ?? 0);
  const [pages, setPages] = useState<LivePage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPrice, setSelectedPrice] = useState<PricingSeed | null>(null);

  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    setPages([]);
    setPageIndex(0);
    setError("");
    setLoading(true);
    void loadPage(accountId, undefined, controller.signal)
      .then((page) => { if (!controller.signal.aborted) setPages([page]); })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : "Falha ao carregar anúncios.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accountId]);

  const current = pages[pageIndex];
  async function next() {
    if (pageIndex + 1 < pages.length) {
      setPageIndex(pageIndex + 1);
      return;
    }
    if (!current?.next_scroll_id || loading) return;
    setLoading(true);
    setError("");
    try {
      const nextPage = await loadPage(accountId, current.next_scroll_id);
      setPages((existing) => [...existing, nextPage]);
      setPageIndex((currentIndex) => currentIndex + 1);
    } catch (reason) {
      setError(
        (reason instanceof Error ? reason.message : "Falha na consulta.") +
        " O cursor pode ter expirado; selecione novamente a conta para reiniciar.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!accounts.length) return null;
  return <section className="fh-card">
    <div className="fh-card-head">
      <div>
        <h2>Todos os anúncios · consulta ao vivo</h2>
        <p>Consulta oficial ao vivo em páginas de 50; a sincronização em segundo plano também salva todos os anúncios no PostgreSQL.</p>
      </div>
      <label style={{ display: "grid", gap: 5, fontSize: 12 }}>
        Conta Mercado Livre
        <select className="fh-control" value={accountId}
          onChange={(event) => setAccountId(Number(event.target.value))}>
          {accounts.map((account) => <option key={account.account_id} value={account.account_id}>
            {account.nickname || "Vendedor " + account.account_id}
          </option>)}
        </select>
      </label>
    </div>
    {error && <div className="fh-notice error" role="alert">{error}</div>}
    {current?.total !== null && current?.total !== undefined &&
      <p>Total informado pelo Mercado Livre: <strong>{number(current.total)}</strong></p>}
    <div className="fh-table-wrap"><table className="fh-table">
      <thead><tr><th>Anúncio</th><th>Status</th><th>Preço</th><th>Estoque</th></tr></thead>
      <tbody>
        {(current?.items || []).map((item) => <tr key={item.id}>
          <td className="fh-table-name">
            <button type="button" className="fh-orders-product-button"
              onClick={() => setSelectedPrice({
                item_id: item.id, title: item.title || item.id,
                thumbnail: item.thumbnail, unit_price: item.price ?? 0,
              })}>
              {trustedPhoto(item.thumbnail) ?
                <img src={item.thumbnail!} width={58} height={58} alt=""/> :
                <span className="fh-orders-image-fallback">Sem foto</span>}
              <span className="fh-orders-title"><strong>{item.title || item.id}</strong>
                <small>Precificar e calcular lucro</small></span>
            </button>
            <Link href={`/produtos/${encodeURIComponent(item.id)}?account=${accountId}`}>
              <small>Ver ficha · {item.id}</small>
            </Link>
          </td>
          <td>{listingStatusLabel(item.status)}</td><td>{money(item.price)}</td><td>{number(item.stock)}</td>
        </tr>)}
        {!loading && current?.items.length === 0 &&
          <tr><td colSpan={4}>Nenhum anúncio nesta página.</td></tr>}
      </tbody>
    </table></div>
    <div className="fh-inline-actions" style={{ marginTop: 16, alignItems: "center" }}>
      <button type="button" className="fh-control" disabled={loading || pageIndex === 0}
        onClick={() => setPageIndex((value) => value - 1)}>Anterior</button>
      <span>Página {pageIndex + 1}</span>
      <button type="button" className="fh-primary-btn"
        disabled={loading || !current || !(pageIndex + 1 < pages.length || current.next_scroll_id)}
        onClick={() => void next()}>{loading ? "Consultando..." : "Próximos 50"}</button>
      {loading && <span role="status">Carregando dados do Mercado Livre...</span>}
    </div>
    <p style={{ fontSize: 12, opacity: 0.8 }}>
      As páginas são mantidas somente na memória desta tela. O cursor da API expira
      em aproximadamente cinco minutos; reabra a conta para iniciar nova consulta.
    </p>
    {selectedPrice && <PricingCalculator seed={selectedPrice} accountId={accountId}
      onClose={() => setSelectedPrice(null)}/>}
  </section>;
}
