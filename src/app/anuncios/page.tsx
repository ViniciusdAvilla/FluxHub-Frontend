import Link from "next/link";
import { Boxes, Package, Tag } from "lucide-react";
import ModernShell from "@/components/modern-shell";
import SyncAction from "@/components/sync-action";
import { DonutStats } from "@/components/modern-charts";
import { getSellerReport } from "@/lib/seller-data";
import { money,number } from "@/lib/analytics";
export const dynamic="force-dynamic";export const runtime="nodejs";
export default async function ListingsPage(){
 const r=await getSellerReport(30,null);
 const total=r.listing?.total_listings??null,active=r.listing?.active_listings??null;
 return <ModernShell title="Anúncios" eyebrow="Catálogo e desempenho" isAdmin={Boolean(r.user?.is_admin)}>
  {r.accounts.length>0&&<div className="fh-notice">
    <strong>Contas Mercado Livre conectadas:</strong> atualizar dados oficiais de anúncios e pedidos.
    <div className="fh-inline-actions" style={{marginTop:10}}>
      {r.accounts.map(a=><SyncAction key={a.account_id} accountId={a.account_id}
        auto={!r.sources.some(s=>s.account_key===`ml:${a.account_id}`&&Boolean(s.last_synced_at))}/>)}
    </div>
  </div>}
  <div className="fh-notice">Indicadores dos anúncios capturados do Mercado Livre. O catálogo pode estar parcial até todas as páginas serem sincronizadas.</div>
  <div className="fh-kpis">
   <article className="fh-kpi blue"><div className="fh-kpi-top">Anúncios registrados</div><strong className="fh-kpi-value">{number(total)}</strong></article>
   <article className="fh-kpi green"><div className="fh-kpi-top">Anúncios ativos</div><strong className="fh-kpi-value">{number(active)}</strong></article>
   <article className="fh-kpi orange"><div className="fh-kpi-top">Estoque zerado</div><strong className="fh-kpi-value">{number(r.products.filter(p=>p.stock_qty===0).length)}</strong></article>
   <article className="fh-kpi purple"><div className="fh-kpi-top">Marcas cadastradas</div><strong className="fh-kpi-value">{number(new Set(r.products.map(p=>p.brand).filter(Boolean)).size)}</strong></article>
  </div>
  <div className="fh-hero-grid">
   <section className="fh-card"><div className="fh-card-head"><h2>Anúncios por status</h2></div><DonutStats label="anúncios" items={Object.entries(r.listing?.by_status||{}).map(([name,value],i)=>({name,value,color:["#22c58b","#4288fa","#ffc55b","#f67c87"][i%4]}))}/></section>
   <section className="fh-card"><div className="fh-card-head"><h2>Dados sincronizados</h2></div>
    <div className="fh-info-row"><span>Catálogo total disponível</span><strong>{number(r.products.length)}</strong></div>
    <div className="fh-info-row"><span>Anúncios sem estoque</span><strong>{number(r.products.filter(p=>p.stock_qty===0).length)}</strong></div>
    <div className="fh-info-row"><span>Contas Mercado Livre no backend</span><strong>{number(r.accounts.length)}</strong></div>
    <Link href="/integracoes" className="fh-info-action" style={{marginTop:15}}>Sincronizar anúncios →</Link>
   </section>
  </div>
  <section className="fh-card"><div className="fh-card-head"><div><h2>Catálogo de anúncios</h2><p>Preços, produtos e estoque disponível</p></div></div>
   <div className="fh-table-wrap"><table className="fh-table"><thead><tr><th>Anúncio</th><th>Marca</th><th>Preço</th><th>Estoque</th><th>Origem</th></tr></thead><tbody>
    {r.products.slice(0,100).map(p=><tr key={p.external_id}><td className="fh-table-name"><strong>{p.title}</strong><small>{p.external_id}</small></td><td>{p.brand||"—"}</td><td>{money(p.promotional_price)}</td><td>{number(p.stock_qty)}</td><td>{p.source_key||"—"}</td></tr>)}
    {!r.products.length&&<tr><td colSpan={5} style={{textAlign:"center",padding:25}}>Nenhum anúncio sincronizado.</td></tr>}
   </tbody></table></div>
  </section>
 </ModernShell>;
}
