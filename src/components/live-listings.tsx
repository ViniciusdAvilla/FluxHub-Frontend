"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { money, number } from "@/lib/analytics";

type LiveItem = {
  id: string;
  title: string;
  status: string;
  price: number | null;
  stock: number | null;
};
type LivePage = {
  items: LiveItem[];
  next_scroll_id: string | null;
  total: number | null;
};
type AccountOption = { account_id: number; nickname: string | null };

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
        <p>Inclui os anúncios que não ficam salvos no PostgreSQL. Consulta de 50 por página.</p>
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
            <Link href={`/produtos/${encodeURIComponent(item.id)}?account=${accountId}`}>
              <strong>{item.title || item.id}</strong>
            </Link>
            <small>{item.id}</small>
          </td>
          <td>{item.status}</td><td>{money(item.price)}</td><td>{number(item.stock)}</td>
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
  </section>;
}
