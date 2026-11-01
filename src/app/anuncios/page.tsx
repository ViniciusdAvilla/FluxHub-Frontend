import Link from "next/link";
import { Boxes, Package, Tag } from "lucide-react";
import ModernShell from "@/components/modern-shell";
import SyncAction from "@/components/sync-action";
import LiveListings from "@/components/live-listings";
import ListingHealthPanel from "@/components/listing-health-panel";
import { DonutStats } from "@/components/modern-charts";
import RankedBarChart from "@/components/ranked-bar-chart";
import { getListingsOverview } from "@/lib/seller-data";
import { money,number } from "@/lib/analytics";
import { listingStatusLabel } from "@/lib/order-status";
export const dynamic="force-dynamic";export const runtime="nodejs";
export default async function ListingsPage(){
 const r=await getListingsOverview();
 const total=r.liveListingsTotal,active=r.listing?.active_listings??null;
 const brandCounts=new Map<string,number>();
 for(const product of r.products) if(product.brand) {
   brandCounts.set(product.brand,(brandCounts.get(product.brand)||0)+1);
 }
 const topBrands=[...brandCounts.entries()].map(([label,value])=>({label,value}))
   .sort((a,b)=>b.value-a.value).slice(0,7);
 return <ModernShell title="Anúncios" eyebrow="Catálogo e desempenho" isAdmin={Boolean(r.user?.is_admin)}>
  {r.accounts.length>0&&<div className="fh-notice">
    <strong>Contas Mercado Livre conectadas:</strong> atualizar dados oficiais de anúncios e pedidos.
    <div className="fh-inline-actions" style={{marginTop:10}}>
      {r.accounts.map(a=><SyncAction key={a.account_id} accountId={a.account_id}
        auto/>)}
    </div>
  </div>}
  <div className="fh-notice">O total de anúncios vem da API ao vivo. Os indicadores de status, estoque e fabricantes são recalculados com os registros persistidos; acompanhe o andamento da importação acima.</div>
  <div className="fh-kpis">
   <article className="fh-kpi blue"><div className="fh-kpi-top">Anúncios no Mercado Livre</div><strong className="fh-kpi-value">{number(total)}</strong></article>
   <article className="fh-kpi green"><div className="fh-kpi-top">Ativos sincronizados</div><strong className="fh-kpi-value">{number(active)}</strong></article>
   <article className="fh-kpi orange"><div className="fh-kpi-top">Estoque zerado</div><strong className="fh-kpi-value">{number(r.products.filter(p=>p.stock_qty===0).length)}</strong></article>
   <article className="fh-kpi purple"><div className="fh-kpi-top">Marcas cadastradas</div><strong className="fh-kpi-value">{number(new Set(r.products.map(p=>p.brand).filter(Boolean)).size)}</strong></article>
  </div>
  <div className="fh-hero-grid">
   <section className="fh-card"><div className="fh-card-head"><h2>Anúncios por status</h2></div><DonutStats label="anúncios" items={Object.entries(r.listing?.by_status||{}).map(([name,value],i)=>({name:listingStatusLabel(name),value,color:["#22c58b","#4288fa","#ffc55b","#f67c87"][i%4]}))}/></section>
   <section className="fh-card"><div className="fh-card-head"><h2>Dados sincronizados</h2></div>
    <div className="fh-info-row"><span>Registros mantidos no banco</span><strong>{number(r.products.filter(p=>p.source_key?.startsWith("ml:")).length)}</strong></div>
    <div className="fh-info-row"><span>Anúncios sem estoque</span><strong>{number(r.products.filter(p=>p.stock_qty===0).length)}</strong></div>
    <div className="fh-info-row"><span>Contas Mercado Livre no backend</span><strong>{number(r.accounts.length)}</strong></div>
    <Link href="/integracoes" className="fh-info-action" style={{marginTop:15}}>Sincronizar anúncios →</Link>
   </section>
  </div>
  <div className="fh-inline-actions" style={{marginBottom:16}}>
    <a href="/api/platform/export?report=listings" className="fh-control">
      Exportar anúncios em Excel
    </a>
  </div>
  <section className="fh-card" style={{marginBottom:15}}>
    <div className="fh-card-head"><div><h2>Produtos por fabricante</h2>
      <p>Quantidade de produtos sincronizados com identificação do fabricante.</p></div></div>
    <RankedBarChart values={topBrands}/>
  </section>
  <ListingHealthPanel/>
  <LiveListings accounts={r.accounts.map(a=>({account_id:a.account_id,nickname:a.nickname}))}/>
 </ModernShell>;
}
