import Link from "next/link";
import { CalendarDays, ShoppingCart, Wallet, XCircle, Boxes } from "lucide-react";
import ModernShell from "@/components/modern-shell";
import SyncAction from "@/components/sync-action";
import { DailyBars, DonutStats } from "@/components/modern-charts";
import { money, number } from "@/lib/analytics";
import { getSellerReport, validAccount, validDays } from "@/lib/seller-data";
import { backendRequest } from "@/lib/backend-transport";
import type { SellerOrder } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; account?: string; offset?: string }>;
}) {
  const query = await searchParams;
  const report = await getSellerReport(validDays(query.days), validAccount(query.account));
  const { accounts, accountId, days, sources } = report;
  const offset = typeof query.offset === "string" && /^\d{1,8}$/.test(query.offset)
    ? Math.min(10_000_000, Number(query.offset)) : 0;
  const orderQuery = new URLSearchParams({ days: String(days), limit: "100", offset: String(offset) });
  if (accountId !== null) orderQuery.set("account_id", String(accountId));
  const fetchedOrders = await backendRequest("/api/v1/orders/", orderQuery)
    .catch(() => null) as SellerOrder[] | null;
  const visibleOrders = Array.isArray(fetchedOrders) ? fetchedOrders : [];
  const totalOrders = report.timeline.length ?
    report.timeline.reduce((sum, item) => sum + item.orders, 0) : report.orderStatus?.total_orders ?? null;
  const gross = report.timeline.length ?
    report.timeline.reduce((sum, item) => sum + item.gross_non_cancelled, 0) : null;
  const cancelled = report.timeline.length ?
    report.timeline.reduce((sum, item) => sum + item.cancelled_orders, 0) : null;
  const statusItems = Object.entries(report.orderStatus?.by_status || {})
    .map(([name, value], i) => ({ name, value,
      color: ["#347dff", "#23a9ef", "#81bdf7", "#adcff6"][i % 4] }));
  const pendingSync = accounts.filter(account =>
    !sources.some(source => source.account_key === `ml:${account.account_id}` && Boolean(source.last_synced_at))
  );
  const pageLink = (nextOffset: number) => {
    const params = new URLSearchParams({ days: String(days), offset: String(nextOffset) });
    if (accountId !== null) params.set("account", String(accountId));
    return "/pedidos?" + params.toString();
  };

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
    {accounts.length > 0 && <div className="fh-notice">
      <strong>Sincronização de anúncios e pedidos por conta.</strong>
      <div className="fh-inline-actions" style={{marginTop:10}}>
        {accounts.filter(a => accountId === null || a.account_id === accountId).map(account =>
          <SyncAction key={account.account_id} accountId={account.account_id}
            auto={pendingSync.some(p=>p.account_id===account.account_id)}/>)}
      </div>
    </div>}
    {report.failedSources.length > 0 && <div className="fh-notice error">
      Dados indisponíveis: {report.failedSources.join(", ")}. Confira a conexão com o backend.
    </div>}
    <div className="fh-kpis">
      <article className="fh-kpi blue"><div className="fh-kpi-top"><ShoppingCart size={18}/> Pedidos registrados</div><strong className="fh-kpi-value">{number(totalOrders)}</strong></article>
      <article className="fh-kpi green"><div className="fh-kpi-top"><Wallet size={18}/> Valor bruto não cancelado</div><strong className="fh-kpi-value">{money(gross)}</strong></article>
      <article className="fh-kpi rose"><div className="fh-kpi-top"><XCircle size={18}/> Cancelados</div><strong className="fh-kpi-value">{number(cancelled)}</strong></article>
      <article className="fh-kpi purple"><div className="fh-kpi-top"><Boxes size={18}/> Contas vinculadas</div><strong className="fh-kpi-value">{number(accounts.length)}</strong></article>
    </div>
    <div className="fh-insight-grid">
      <section className="fh-card">
        <div className="fh-card-head"><div><h2>Valor dos pedidos por dia</h2>
          <p>Pedidos não cancelados já sincronizados neste período.</p></div></div>
        <DailyBars points={report.timeline}/>
      </section>
      <section className="fh-card">
        <div className="fh-card-head"><div><h2>Pedidos por status</h2>
          <p>Distribuição de todos os pedidos armazenados no período.</p></div></div>
        <DonutStats label="pedidos" items={statusItems}/>
      </section>
    </div>
    <section className="fh-card">
      <div className="fh-card-head">
        <div><h2>Pedidos do Mercado Livre</h2><p>Pedidos armazenados no período, 100 por página; use a navegação para consultar todos.</p></div>

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
      <div className="fh-inline-actions" style={{marginTop:14}}>
        {offset > 0 && <Link href={pageLink(Math.max(0, offset - 100))} className="fh-control">100 anteriores</Link>}
        <span>Página {Math.floor(offset / 100) + 1} · {number(totalOrders)} pedidos no período</span>
        {visibleOrders.length === 100 && <Link href={pageLink(offset + 100)} className="fh-primary-btn">Próximos 100</Link>}
      </div>
      <p className="fh-sync-message">Os valores correspondem aos pedidos sincronizados, não a pagamentos recebidos.</p>
    </section>
  </ModernShell>;
}
