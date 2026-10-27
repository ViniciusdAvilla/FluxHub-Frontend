import Link from "next/link";
import {
  ArrowRight, BadgeDollarSign, Boxes, CircleAlert,
  Eye, Package, Percent, ShoppingBag, ShoppingCart,
  Tag, TrendingUp, Wallet, Zap,
} from "lucide-react";
import { money, number, percent } from "@/lib/analytics";
import type { SellerReport } from "@/lib/seller-data";
import ModernShell from "./modern-shell";
import { DailyBars, DonutStats, PerformanceChart } from "./modern-charts";
import SyncAction from "./sync-action";
import OverviewPeriodFilter from "./overview-period-filter";

function halfPeriodChange(values: number[]):number|null {
  if(values.length<4) return null;
  const cut=Math.floor(values.length/2);
  const previous=values.slice(0,cut).reduce((a,b)=>a+b,0);
  const current=values.slice(-cut).reduce((a,b)=>a+b,0);
  return previous>0 ? (current-previous)/previous*100 : null;
}
function Sparkline({values,color}:{values:number[];color:string}) {
  if(values.length<2) return null;
  const max=Math.max(...values),min=Math.min(...values),range=Math.max(max-min,1);
  const path=values.map((value,i)=>`${i===0?"M":"L"} ${(i/(values.length-1)*74).toFixed(1)} ${(25-(value-min)/range*21).toFixed(1)}`).join(" ");
  return <svg className="fh-sparkline" viewBox="0 0 74 29" role="img" aria-label="Tendência no período">
    <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function Stat({title,value,help,color,icon:Icon,spark,change}:{title:string;value:string;help:string;color:"blue"|"green"|"purple"|"orange"|"rose";icon:typeof ShoppingCart;spark?:number[];change?:number|null}) {
  return <article className={`fh-kpi ${color}`}>
    <div className="fh-kpi-top"><div className="fh-kpi-icon"><Icon size={18}/></div><span className="fh-kpi-label">{title}</span></div>
    <strong className="fh-kpi-value">{value}</strong>
    {spark&&<Sparkline values={spark} color={color==="purple"?"#8358ff":"#277aff"}/>}
    <span className="fh-kpi-foot">
      {change!==null&&change!==undefined&&<span className={`fh-kpi-trend ${change<0?"down":""}`}>{change>0?"↗":change<0?"↘":"→"} {change>0?"+":""}{change.toFixed(1).replace(".",",")}%</span>}
      <span className="fh-kpi-note">{change!==null&&change!==undefined?"vs. metade anterior":help}</span>
    </span>
  </article>;
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
  const statusItems=Object.entries(report.orderStatus?.by_status||{}).map(([name,value],i)=>({
    name,value,color:["#20c58b","#488bfa","#ffbd46","#f2737a","#9878f6"][i%5]
  }));
  const orderedTimeline=[...timeline].sort((a,b)=>a.date.localeCompare(b.date));
  const revenueSeries=orderedTimeline.map(p=>p.gross_non_cancelled);
  const orderSeries=orderedTimeline.map(p=>p.orders);
  const visitSeries=orderedTimeline.map(p=>p.visits??0);
  const conversionSeries=orderedTimeline.map(p=>p.visits&&p.visits>0?p.orders/p.visits*100:0);
  return <ModernShell title="Visão geral" eyebrow="Resumo geral" isAdmin={Boolean(report.user?.is_admin)}
    action={<OverviewPeriodFilter days={days} accountId={accountId} accounts={accounts}/>}>
    {pendingSync.length>0&&<section className="fh-notice" aria-label="Primeira sincronização">
      <strong>Conta conectada: importando dados oficiais do Mercado Livre.</strong>
      <p>O primeiro carregamento pode levar mais tempo. As telas serão atualizadas quando a sincronização terminar.</p>
    </section>}
    {hasData&&<section className="fh-card" aria-label="Sincronização completa do Mercado Livre">
      <div className="fh-card-head"><div><h2>Sincronização de todos os dados</h2>
        <p>O trabalho continua no servidor. Acompanhe anúncios, pedidos, tentativas e conclusão por conta.</p>
      </div></div>
      <div className="fh-inline-actions">
        {accounts.filter(a=>accountId===null||a.account_id===accountId).map(a=>
          <SyncAction key={a.account_id} accountId={a.account_id}
            auto={pendingSync.some(p=>p.account_id===a.account_id)}/>
        )}
      </div>
    </section>}
    {!hasData&&<div className="fh-notice"><strong>Nenhuma conta Mercado Livre conectada.</strong> Consulte o status da conta salva no backend em <Link href="/integracoes" style={{color:"#237af4",fontWeight:750}}>Mercado Livre</Link>. O Client ID e o Client Secret não substituem tokens de vendedor. O painel não usa valores fictícios.</div>}
    {report.failedSources.length>0&&<div className="fh-notice error" role="status">Algumas consultas não responderam: {report.failedSources.join(", ")}. Verifique se o FastAPI está online e autenticado.</div>}
    <div className="fh-kpis fh-overview-kpis" id="resumo">
      <Stat color="blue" icon={BadgeDollarSign} title="Faturamento" value={money(revenue)} help="Valor bruto dos pedidos não cancelados" spark={revenueSeries} change={halfPeriodChange(revenueSeries)}/>
      <Stat color="purple" icon={ShoppingCart} title="Pedidos" value={number(totalOrders)} help="Pedidos registrados no período" spark={orderSeries} change={halfPeriodChange(orderSeries)}/>
      <Stat color="blue" icon={Eye} title="Visitas" value={number(visits)} help="Visitas informadas pelo Mercado Livre" spark={visitSeries} change={halfPeriodChange(visitSeries)}/>
      <Stat color="purple" icon={TrendingUp} title="Conversão" value={visits!==null&&visits>0&&totalOrders!==null?percent(totalOrders/visits*100):"—"} help="Pedidos ÷ visitas disponíveis" spark={conversionSeries} change={halfPeriodChange(conversionSeries)}/>
    </div>
    <div className="fh-hero-grid fh-overview-charts" id="desempenho">
      <Box title="Evolução das vendas"><PerformanceChart points={timeline}/></Box>
      <Box title="Situação da loja">
        <DonutStats items={Object.entries(report.listing?.by_status||{}).map(([name,value],i)=>({
          name:name==="active"?"Ativos":name==="paused"?"Pausados":name==="closed"?"Encerrados":name,
          value,color:["#347cff","#96a3c4","#ffad31","#9775f9"][i%4],
        }))} label="anúncios"/>
        <Link className="fh-status-more" href="/anuncios">Ver todos os anúncios <ArrowRight size={14}/></Link>
      </Box>
    </div>
    <div className="fh-overview-bottom" id="alertas">
      <Box title="Produtos em destaque" href="/produtos">
        {topProducts.length ? <div className="fh-spotlight-list">
          {topProducts.slice(0,3).map(p=><Link className="fh-spotlight-row" key={p.external_id} href={/^ML[A-Z]{1,2}\\d{5,20}$/.test(p.external_id)?`/produtos/${encodeURIComponent(p.external_id)}`:"/produtos"}>
            <span className="fh-spotlight-icon"><Package size={20}/></span>
            <span className="fh-spotlight-copy"><strong>{p.title}</strong><small>{p.category || p.brand || "Produto cadastrado"}</small></span>
            <span className="fh-spotlight-sales"><strong>{number(p.sales_30d)}</strong><small>vendas</small></span>
            <ArrowRight size={15}/>
          </Link>)}
        </div> : <div className="fh-empty">Nenhum produto sincronizado nesta conta.</div>}
      </Box>
      <Box title="Alertas importantes">
        <div className="fh-alert-list">
          <Link href="/estoque" className="fh-overview-alert"><span className="fh-overview-alert-icon"><Boxes size={22}/></span><span><strong>{number(products.filter(p=>p.stock_qty===0).length)} produtos sem estoque</strong><small>Revise o estoque para evitar interrupções nos anúncios.</small></span><ArrowRight size={16}/></Link>
          <Link href="/pedidos" className="fh-overview-alert"><span className="fh-overview-alert-icon"><CircleAlert size={22}/></span><span><strong>{number(canceled)} cancelamentos registrados</strong><small>Acompanhe os pedidos do período selecionado.</small></span><ArrowRight size={16}/></Link>
          <Link href="/integracoes" className="fh-overview-alert"><span className="fh-overview-alert-icon"><Zap size={22}/></span><span><strong>{pendingSync.length ? `${pendingSync.length} conta(s) aguardando sincronização` : "Integração Mercado Livre"}</strong><small>{pendingSync.length?"Confira a sincronização de dados.":"Veja o status e a atualização de seus dados."}</small></span><ArrowRight size={16}/></Link>
        </div>
      </Box>
    </div>
    <div className="fh-overview-secondary">
      <h2>Mais indicadores da loja</h2>
      <p>Detalhes adicionais disponíveis nos dados sincronizados com o Mercado Livre.</p>
      <div className="fh-kpis">
        <Stat color="green" icon={BadgeDollarSign} title="Lucro após Ads" value={money(profit)} help="Somente com custos e Ads completos"/>
        <Stat color="purple" icon={Percent} title="Margem estimada" value={percent(margin)} help="Sobre receita atribuída aos anúncios"/>
        <Stat color="green" icon={Tag} title="Ticket médio" value={money(avgTicket)} help="Receita bruta ÷ pedidos registrados"/>
        <Stat color="purple" icon={Boxes} title="Anúncios no Mercado Livre" value={number(report.liveListingsTotal)} help="Total consultado ao vivo"/>
      </div>
      <div className="fh-card fh-overview-account">
        <div className="fh-card-head"><div><h2>Conta Mercado Livre</h2><p>Integração e sincronização</p></div></div>
        <div className="fh-info-row"><span>Conta</span><strong>{account?.nickname || accounts[0]?.nickname || "Sem conta vinculada"}</strong></div>
        <div className="fh-info-row"><span>Contas conectadas</span><strong>{accounts.length}</strong></div>
        <div className="fh-info-row"><span>Anúncios armazenados no banco</span><strong>{number(accountId===null?report.listing?.total_listings??null:products.length)}</strong></div>
        <div className="fh-info-row"><span>Última sincronização</span><strong>{lastSync?new Date(lastSync).toLocaleString("pt-BR"):"Ainda não sincronizada"}</strong></div>
        <div className="fh-info-row"><span>Reputação</span><strong>{reputation?.level_id||"Não informada pela API"}</strong></div>
        <div className="fh-info-row"><span>Nível MercadoLíder</span><strong>{reputation?.power_seller_status||"Não informado"}</strong></div>
        <div className="fh-info-row"><span>Rentabilidade Ads</span><strong>{ads?.profit_complete?"Calculada":"Dados incompletos"}</strong></div>
        <div className="fh-inline-actions" style={{marginTop:14}}>
          <Link href="/integracoes" className="fh-info-action">Ver dados do Mercado Livre <ArrowRight size={15}/></Link>
        </div>
      </div>
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
      <p style={{fontSize:11,color:"#98a3b6",marginBottom:0}}>A sincronização em segundo plano atualiza os dados armazenados. Margens e lucros dependem de custos e relatórios reais de Ads.</p>
    </Box>
  </ModernShell>;
}
