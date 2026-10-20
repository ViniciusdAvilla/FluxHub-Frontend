import Link from "next/link";
import {
  ArrowRight, BadgeDollarSign, BarChart3, Boxes, CalendarDays, CircleAlert,
  Eye, FileChartColumnIncreasing, Package, Percent, ShoppingBag, ShoppingCart,
  Tag, TrendingUp, Wallet, Zap,
} from "lucide-react";
import { money, number, percent } from "@/lib/analytics";
import type { SellerReport } from "@/lib/seller-data";
import ModernShell from "./modern-shell";
import { DailyBars, DonutStats, PerformanceChart } from "./modern-charts";
import SyncAction from "./sync-action";

function Stat({title,value,help,color,icon:Icon}:{title:string;value:string;help:string;color:"blue"|"green"|"purple"|"orange"|"rose";icon:typeof ShoppingCart}) {
  return <article className={`fh-kpi ${color}`}><div className="fh-kpi-top"><div className="fh-kpi-icon"><Icon size={18}/></div><span className="fh-kpi-label">{title}</span></div>
    <strong className="fh-kpi-value">{value}</strong><span className="fh-kpi-note">{help}</span></article>;
}
function Box({title,subtitle,children,href}:{title:string;subtitle?:string;children:React.ReactNode;href?:string}) {
  return <section className="fh-card"><div className="fh-card-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{href&&<Link href={href} className="fh-card-link">Ver detalhes →</Link>}</div>{children}</section>;
}
function safeNum(input:unknown):number|null {return typeof input==="number"&&Number.isFinite(input)?input:null;}
export default function SellerHome({report}:{report:SellerReport}){
  const {accounts,accountId,days,products,orders,timeline,costs,ads}=report;
  const hasData=accounts.length>0;
  const revenue=timeline.length?timeline.reduce((a,p)=>a+p.gross_non_cancelled,0):null;
  const totalOrders=timeline.length?timeline.reduce((a,p)=>a+p.orders,0):null;
  const visits=timeline.some(p=>p.visits!==null)?timeline.reduce((a,p)=>a+(p.visits||0),0):null;
  const profit=accountId===null&&ads?.profit_complete?safeNum(ads.net_profit_after_ads):null;
  const margin=profit!==null&&ads?.attributed_revenue&&ads.attributed_revenue>0?profit/ads.attributed_revenue*100:null;
  const countOrders=totalOrders??(orders.length?orders.length:null);
  const avgTicket=revenue!==null&&countOrders&&countOrders>0?revenue/countOrders:null;
  const activeListings=accountId===null?report.listing?.active_listings??null:products.length?products.length:null;
  const canceled=timeline.length?timeline.reduce((a,p)=>a+p.cancelled_orders,0):null;
  const categories=new Map<string,number>();
  for(const p of products) categories.set(p.category||"Sem categoria",(categories.get(p.category||"Sem categoria")||0)+1);
  const sortedCategories=[...categories.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  const account=accounts.find(a=>a.account_id===accountId);
  const reputation=report.profile?.seller_reputation;
  const sources=report.sources.filter(s=>s.provider==="mercado_livre");
  const lastSync=sources.find(s=>s.account_key===`ml:${account?.account_id}`)?.last_synced_at || sources.find(s=>s.provider==="mercado_livre"&&s.last_synced_at)?.last_synced_at;
  const pendingSync = accounts.filter(a => !sources.some(s => s.account_key === `ml:${a.account_id}` && Boolean(s.last_synced_at)));
  const topProducts=[...products].sort((a,b)=>(b.sales_30d??-1)-(a.sales_30d??-1)).slice(0,8);
  const costIndex=new Map(costs.map(c=>[c.external_id,c]));
  const ordersByStatus=new Map<string,number>();
  for(const o of orders) ordersByStatus.set(o.status,(ordersByStatus.get(o.status)||0)+1);
  const statusItems=[...ordersByStatus.entries()].map(([name,value],i)=>({name,value,color:["#20c58b","#488bfa","#ffbd46","#f2737a","#9878f6"][i%5]}));
  return <ModernShell title="Dashboard" eyebrow="Visão geral" isAdmin={Boolean(report.user?.is_admin)}>
    <form className="fh-filters" action="/" method="get">
      <label className="fh-filter"><CalendarDays size={15}/> Período <select name="days" defaultValue={String(days)} aria-label="Período"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label>
      <label className="fh-filter">Mercado Livre</label>
      <label className="fh-filter">Conta <select name="account" defaultValue={accountId??""} aria-label="Conta Mercado Livre"><option value="">Todas as contas</option>{accounts.map(a=><option value={a.account_id} key={a.account_id}>{a.nickname||a.account_id}</option>)}</select></label>
      <button className="fh-control" type="submit">Aplicar filtros</button>
    </form>
    {pendingSync.length>0&&<section className="fh-notice" aria-label="Primeira sincronização">
      <strong>Conta conectada: importando dados oficiais do Mercado Livre.</strong>
      <p>O primeiro carregamento pode levar mais tempo. As telas serão atualizadas quando a sincronização terminar.</p>
      <div className="fh-inline-actions">{pendingSync.map(a=><SyncAction key={a.account_id} accountId={a.account_id} auto/>)}</div>
    </section>}
    {!hasData&&<div className="fh-notice"><strong>Nenhuma conta Mercado Livre conectada.</strong> Autorize uma conta em <Link href="/integracoes" style={{color:"#237af4",fontWeight:750}}>Integrações</Link> para receber seus dados. O painel não usa valores fictícios.</div>}
    {report.failedSources.length>0&&<div className="fh-notice error" role="status">Algumas consultas não responderam: {report.failedSources.join(", ")}. Verifique se o FastAPI está online e autenticado.</div>}
    <div className="fh-kpis">
      <Stat color="blue" icon={ShoppingCart} title="Pedidos · valor bruto" value={money(revenue)} help="Não cancelados, páginas sincronizadas"/>
      <Stat color="green" icon={BadgeDollarSign} title="Lucro após Ads" value={money(profit)} help="Somente com custos e Ads completos"/>
      <Stat color="purple" icon={Percent} title="Margem estimada" value={percent(margin)} help="Sobre receita atribuída aos anúncios"/>
      <Stat color="orange" icon={ShoppingBag} title="Pedidos registrados" value={number(totalOrders)} help="No período e na conta selecionados"/>
      <Stat color="blue" icon={Eye} title="Visitas" value={number(visits)} help="Visitas obtidas da API oficial"/>
      <Stat color="rose" icon={TrendingUp} title="Taxa de conversão" value={visits!==null&&visits>0&&totalOrders!==null?percent(totalOrders/visits*100):"—"} help="Pedidos registrados ÷ visitas disponíveis"/>
      <Stat color="green" icon={Tag} title="Ticket médio" value={money(avgTicket)} help="Receita bruta ÷ pedidos registrados"/>
      <Stat color="purple" icon={Boxes} title="Anúncios ativos" value={number(activeListings)} help="Últimos anúncios sincronizados"/>
    </div>
    <div className="fh-hero-grid">
      <Box title="Desempenho da conta" subtitle="Pedidos brutos registrados e visitas ao longo do período"><PerformanceChart points={timeline}/></Box>
      <Box title="Conta Mercado Livre" subtitle="Integração e sincronização">
        <div className="fh-rowline" style={{marginBottom:8}}><strong style={{fontSize:13}}>{account?.nickname|| (accounts.length>1?"Múltiplas contas":accounts[0]?.nickname||"Sem conta vinculada")}</strong><span className={`fh-pill ${hasData?"":"offline"}`}>{hasData?"Conectada":"Não conectada"}</span></div>
        <div className="fh-info-row"><span>Contas conectadas</span><strong>{accounts.length}</strong></div>
        <div className="fh-info-row"><span>Última sincronização</span><strong>{lastSync?new Date(lastSync).toLocaleString("pt-BR"):"Ainda não sincronizada"}</strong></div>
        <div className="fh-info-row"><span>Reputação</span><strong>{reputation?.level_id||"Não informada pela API"}</strong></div>\n        <div className="fh-info-row"><span>Nível MercadoLíder</span><strong>{reputation?.power_seller_status||"Não informado"}</strong></div>\n        <div className="fh-info-row"><span>Produtos no catálogo</span><strong>{number(products.length)}</strong></div>
        <div className="fh-info-row"><span>Rentabilidade Ads</span><strong>{ads?.profit_complete?"Calculada":"Dados incompletos"}</strong></div>
        <div className="fh-info-row"><span>Sincronização</span><strong>Por página de até 50 itens</strong></div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:14}}>
          {accounts.length===1&&accountId===null&&<SyncAction accountId={accounts[0].account_id}/>}
          {accountId&&<SyncAction accountId={accountId}/>}
          <Link href="/integracoes" className="fh-info-action">Gerenciar integração <ArrowRight size={15}/></Link>
        </div>
      </Box>
    </div>
    <div className="fh-split-grid">
      <Box title="Vendas por dia" href="/vendas"><DailyBars points={timeline}/></Box>
      <Box title="Pedidos por status" href="/pedidos"><DonutStats items={statusItems} label="pedidos"/></Box>
      <Box title="Saúde dos anúncios" href="/anuncios"><DonutStats items={Object.entries(report.listing?.by_status||{}).map(([name,value],i)=>({name,value,color:["#1ac68e","#4c8dff","#ffc75c","#f67c8c"][i%4]}))} label="anúncios"/></Box>
      <Box title="Top categorias" href="/produtos"><div className="fh-mini-list">{sortedCategories.length?sortedCategories.map(([category,value])=><div key={category} className="fh-mini-row"><span style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:110}}>{category}</span><div className="fh-progress"><i style={{width:`${value/Math.max(...sortedCategories.map(c=>c[1]))*100}%`}}/></div><strong>{number(value)}</strong></div>):<div className="fh-empty">Sem produtos classificados.</div>}</div></Box>
    </div>
    <div className="fh-alert-row">
      <div className="fh-alert rose"><span>Cancelamentos registrados</span><strong>{number(canceled)}</strong></div>
      <div className="fh-alert orange"><span>Estoque zerado</span><strong>{number(products.filter(p=>p.stock_qty===0).length)}</strong></div>
      <div className="fh-alert green"><span>Gasto em publicidade</span><strong>{accountId===null?money(ads?.ad_spend??null):"—"}</strong></div>
      <div className="fh-alert"><span>Produtos cadastrados</span><strong>{number(products.length)}</strong></div>
    </div>
    <Box title={products.some(p=>p.sales_30d!==null)?"Produtos por vendas informadas":"Produtos do catálogo"} subtitle="Dados persistidos no PostgreSQL e custos cadastrados" href="/produtos">
      <div className="fh-table-wrap"><table className="fh-table"><thead><tr><th>Produto</th><th>Preço</th><th>Custo</th><th>Vendas (30 dias)</th><th>Estoque</th><th>Fabricante</th></tr></thead><tbody>
        {topProducts.map(p=>{const c=costIndex.get(p.external_id);return <tr key={p.external_id}><td className="fh-table-name"><strong>{p.title}</strong><small>{p.external_id} · {p.category}</small></td><td>{money(p.promotional_price)}</td><td>{money(c?.unit_cost??null)}</td><td>{number(p.sales_30d)}</td><td>{number(p.stock_qty)}</td><td>{c?.manufacturer||p.brand||"—"}</td></tr>})}
        {!topProducts.length&&<tr><td colSpan={6} style={{padding:30,textAlign:"center"}}>Nenhum produto sincronizado. Conecte sua conta e sincronize para começar.</td></tr>}
      </tbody></table></div>
      <p style={{fontSize:11,color:"#98a3b6",marginBottom:0}}>Informações parciais: o backend sincroniza páginas de anúncios e pedidos. Margens e lucros dependem de custos e relatórios reais de Ads.</p>
    </Box>
  </ModernShell>;
}
