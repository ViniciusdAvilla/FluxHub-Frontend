import Link from "next/link";
import { Boxes, Package, Tag } from "lucide-react";
import ModernShell from "@/components/modern-shell";
import SyncAction from "@/components/sync-action";
import LiveListings from "@/components/live-listings";
import { DonutStats } from "@/components/modern-charts";
import RankedBarChart from "@/components/ranked-bar-chart";
import { getSellerReport } from "@/lib/seller-data";
import { money,number } from "@/lib/analytics";
export const dynamic="force-dynamic";export const runtime="nodejs";
export default async function ListingsPage(){
 const r=await getSellerReport(30,null);
 const total=r.liveListingsTotal,active=r.listing?.active_listings??null;
 return <ModernShell title="Anúncios" eyebrow="Catálogo e desempenho" isAdmin={Boolean(r.user?.is_admin)}>
  {r.accounts.length>0&&<div className="fh-notice">
    <strong>Contas Mercado Livre conectadas:</strong> atualizar dados oficiais de anúncios e pedidos.
    <div className="fh-inline-actions" style={{marginTop:10}}>
      {r.accounts.map(a=><SyncAction key={a.account_id} accountId={a.account_id}
        auto={!r.sources.some(s=>s.account_key===`ml:${a.account_id}`&&Boolean(s.last_synced_at))}/>)}
    </div>
  </div>}
  <div className="fh-notice">O total de anúncios vem da API ao vivo. Os indicadores de status, estoque e fabricantes abaixo consideram somente os registros salvos (até 3.000 por conta).</div>
  <div className="fh-kpis">
   <article className="fh-kpi blue"><div className="fh-kpi-top">Anúncios no Mercado Livre</div><strong className="fh-kpi-value">{number(total)}</strong></article>
   <article className="fh-kpi green"><div className="fh-kpi-top">Ativos na amostra salva</div><strong className="fh-kpi-value">{number(active)}</strong></article>
   <article className="fh-kpi orange"><div className="fh-kpi-top">Estoque zerado</div><strong className="fh-kpi-value">{number(r.products.filter(p=>p.stock_qty===0).length)}</strong></article>
   <article className="fh-kpi purple"><div className="fh-kpi-top">Marcas cadastradas</div><strong className="fh-kpi-value">{number(new Set(r.products.map(p=>p.brand).filter(Boolean)).size)}</strong></article>
  </div>
  <div className="fh-hero-grid">
   <section className="fh-card"><div className="fh-card-head"><h2>Anúncios por status</h2></div><DonutStats label="anúncios" items={Object.entries(r.listing?.by_status||{}).map(([name,value],i)=>({name,value,color:["#22c58b","#4288fa","#ffc55b","#f67c87"][i%4]}))}/></section>
   <section className="fh-card"><div className="fh-card-head"><h2>Dados sincronizados</h2></div>
    <div className="fh-info-row"><span>Registros mantidos no banco</span><strong>{number(r.products.filter(p=>p.source_key?.startsWith("ml:")).length)}</strong></div>
    <div className="fh-info-row"><span>Anúncios sem estoque</span><strong>{number(r.products.filter(p=>p.stock_qty===0).length)}</strong></div>
    <div className="fh-info-row"><span>Contas Mercado Livre no backend</span><strong>{number(r.accounts.length)}</strong></div>
    <Link href="/integracoes" className="fh-info-action" style={{marginTop:15}}>Sincronizar anúncios →</Link>
   </section>
  </div>
  <section className="fh-card" style={{marginBottom:15}}>
    <div className="fh-card-head"><div><h2>Produtos por fabricante</h2>
      <p>Quantidade de produtos sincronizados com identificação do fabricante.</p></div></div>
    <RankedBarChart values={[...new Map(r.products.filter(p=>p.brand).map(p=>[
      p.brand,r.products.filter(other=>other.brand===p.brand).length
    ] as const))].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,7)}/>
  </section>
  <LiveListings accounts={r.accounts.map(a=>({account_id:a.account_id,nickname:a.nickname}))}/>
 </ModernShell>;
}
