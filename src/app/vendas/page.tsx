import Link from "next/link";
import { Wallet, ShoppingCart, Ban, BadgeDollarSign } from "lucide-react";
import ModernShell from "@/components/modern-shell";
import { PerformanceChart, DailyBars, DonutStats } from "@/components/modern-charts";
import { getSellerReport } from "@/lib/seller-data";
import { money,number,percent } from "@/lib/analytics";
export const dynamic="force-dynamic";export const runtime="nodejs";
export default async function SalesPage(){
 const r=await getSellerReport(30,null);
 const revenue=r.timeline.length?r.timeline.reduce((a,p)=>a+p.gross_non_cancelled,0):null;
 const count=r.timeline.length?r.timeline.reduce((a,p)=>a+p.orders,0):null;
 const cancelled=r.timeline.length?r.timeline.reduce((a,p)=>a+p.cancelled_orders,0):null;
 const statuses=new Map<string,number>();
 for(const o of r.orders)statuses.set(o.status,(statuses.get(o.status)||0)+1);
 return <ModernShell title="Vendas" eyebrow="Pedidos e receita" isAdmin={Boolean(r.user?.is_admin)}>
  <div className="fh-notice">Os valores abaixo representam pedidos persistidos durante as sincronizações. Não são valores líquidos recebidos no Mercado Pago nem histórico completo garantido.</div>
  <div className="fh-kpis">
   <article className="fh-kpi blue"><div className="fh-kpi-top"><Wallet className="fh-kpi-icon"/> Valor bruto</div><strong className="fh-kpi-value">{money(revenue)}</strong></article>
   <article className="fh-kpi green"><div className="fh-kpi-top"><ShoppingCart className="fh-kpi-icon"/> Pedidos registrados</div><strong className="fh-kpi-value">{number(count)}</strong></article>
   <article className="fh-kpi rose"><div className="fh-kpi-top"><Ban className="fh-kpi-icon"/> Cancelamentos</div><strong className="fh-kpi-value">{number(cancelled)}</strong></article>
   <article className="fh-kpi purple"><div className="fh-kpi-top"><BadgeDollarSign className="fh-kpi-icon"/> Ticket médio</div><strong className="fh-kpi-value">{revenue!==null&&count?money(revenue/count):"—"}</strong></article>
  </div>
  <div className="fh-hero-grid">
   <section className="fh-card"><div className="fh-card-head"><h2>Histórico de pedidos e visitas</h2></div><PerformanceChart points={r.timeline}/></section>
   <section className="fh-card"><div className="fh-card-head"><h2>Pedidos por status</h2></div><DonutStats label="pedidos" items={[...statuses.entries()].map(([name,value],i)=>({name,value,color:["#20c58b","#4386fc","#ffc34d","#f07887"][i%4]}))}/></section>
  </div>
  <section className="fh-card"><div className="fh-card-head"><div><h2>Pedidos recentes</h2><p>Últimos 100 pedidos consultados no PostgreSQL</p></div><Link className="fh-card-link" href="/pedidos">Detalhes →</Link></div>
  <div className="fh-table-wrap"><table className="fh-table"><thead><tr><th>Pedido</th><th>Conta</th><th>Data</th><th>Status</th><th>Valor</th></tr></thead><tbody>
   {r.orders.map(o=><tr key={o.external_id}><td><strong>{o.external_id}</strong></td><td>{o.seller_id||"—"}</td><td>{o.created_at?new Date(o.created_at).toLocaleString("pt-BR"):"—"}</td><td><span className={`fh-pill ${o.is_cancelled?"offline":""}`}>{o.status}</span></td><td>{money(o.total_amount)}</td></tr>)}
   {!r.orders.length&&<tr><td colSpan={5} style={{textAlign:"center",padding:26}}>Nenhum pedido sincronizado.</td></tr>}
  </tbody></table></div></section>
 </ModernShell>;
}
