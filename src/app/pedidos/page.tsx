import Link from "next/link";
import { CalendarDays, ShoppingCart, Wallet, XCircle, Boxes } from "lucide-react";
import ModernShell from "@/components/modern-shell";
import SyncAction from "@/components/sync-action";
import { money, number } from "@/lib/analytics";
import { getSellerReport, validAccount, validDays } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; account?: string }>;
}) {
  const query = await searchParams;
  const report = await getSellerReport(validDays(query.days), validAccount(query.account));
  const { orders, accounts, accountId, days, sources } = report;
  const visibleOrders = orders.filter(order => {
    const date = Date.parse(order.created_at);
    return Number.isFinite(date) && date >= Date.now() - days * 86400000;
  });
  const gross = visibleOrders.filter(order => !order.is_cancelled)
    .reduce((total, order) => total + order.total_amount, 0);
  const cancelled = visibleOrders.filter(order => order.is_cancelled).length;
  const pendingSync = accounts.filter(account =>
    !sources.some(source => source.account_key === `ml:${account.account_id}` && Boolean(source.last_synced_at))
  );

  return <ModernShell title="Pedidos" eyebrow="Mercado Livre" isAdmin={Boolean(report.user?.is_admin)}>
    <form className="fh-filters" action="/pedidos" method="get">
      <label className="fh-filter"><CalendarDays size={15}/> Período
        <select name="days" defaultValue={String(days)} aria-label="Período">
          <option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option>
        </select>
      </label>
      <label className="fh-filter">Conta
        <select name="account" defaultValue={accountId ?? ""} aria-label="Conta Mercado Livre">
          <option value="">Todas as contas</option>
          {accounts.map(account => <option key={account.account_id} value={account.account_id}>{account.nickname || account.account_id}</option>)}
        </select>
      </label>
      <button className="fh-control" type="submit">Aplicar</button>
    </form>
    {!accounts.length && <div className="fh-notice">
      Nenhuma conta conectada. <Link href="/integracoes" className="fh-card-link">Verificar conta no backend →</Link>
    </div>}
    {pendingSync.length > 0 && <div className="fh-notice">
      <strong>Buscando os pedidos da sua conta conectada.</strong>
      <div className="fh-inline-actions" style={{marginTop:10}}>
        {pendingSync.map(account => <SyncAction key={account.account_id} accountId={account.account_id} auto/>)}
      </div>
    </div>}
    {report.failedSources.length > 0 && <div className="fh-notice error">
      Dados indisponíveis: {report.failedSources.join(", ")}. Confira a conexão com o backend.
    </div>}
    <div className="fh-kpis">
      <article className="fh-kpi blue"><div className="fh-kpi-top"><ShoppingCart size={18}/> Pedidos registrados</div><strong className="fh-kpi-value">{number(visibleOrders.length)}</strong></article>
      <article className="fh-kpi green"><div className="fh-kpi-top"><Wallet size={18}/> Valor bruto não cancelado</div><strong className="fh-kpi-value">{money(visibleOrders.length ? gross : null)}</strong></article>
      <article className="fh-kpi rose"><div className="fh-kpi-top"><XCircle size={18}/> Cancelados</div><strong className="fh-kpi-value">{number(visibleOrders.length ? cancelled : null)}</strong></article>
      <article className="fh-kpi purple"><div className="fh-kpi-top"><Boxes size={18}/> Contas vinculadas</div><strong className="fh-kpi-value">{number(accounts.length)}</strong></article>
    </div>
    <section className="fh-card">
      <div className="fh-card-head">
        <div><h2>Pedidos do Mercado Livre</h2><p>Pedidos reais registrados nas páginas sincronizadas (até 100 registros recentes).</p></div>
        {accounts.length === 1 && <SyncAction accountId={accounts[0].account_id}/>}
      </div>
      <div className="fh-table-wrap"><table className="fh-table"><thead>
        <tr><th>ID do pedido</th><th>Conta</th><th>Data</th><th>Status</th><th>Valor bruto</th></tr>
      </thead><tbody>
        {visibleOrders.map(order => <tr key={order.external_id}>
          <td><strong>{order.external_id}</strong></td>
          <td>{order.seller_id ?? "—"}</td>
          <td>{new Date(order.created_at).toLocaleString("pt-BR")}</td>
          <td><span className={`fh-pill ${order.is_cancelled ? "offline" : ""}`}>{order.status || "Não informado"}</span></td>
          <td>{money(order.total_amount)}</td>
        </tr>)}
        {!visibleOrders.length && <tr><td colSpan={5} style={{textAlign:"center",padding:28}}>
          Nenhum pedido sincronizado neste período.
        </td></tr>}
      </tbody></table></div>
      <p className="fh-sync-message">Os valores correspondem somente aos pedidos capturados na sincronização, não a pagamentos recebidos.</p>
    </section>
  </ModernShell>;
}
