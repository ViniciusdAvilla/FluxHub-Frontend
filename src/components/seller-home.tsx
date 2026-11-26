import Link from "next/link";
import {
  ArrowRight, BadgeDollarSign, Boxes, CircleAlert,
  Eye, Package, Percent, ShoppingCart,
  Tag, TrendingUp,
} from "lucide-react";
import { money, number, percent } from "@/lib/analytics";
import { listingStatusLabel, orderStatusLabel } from "@/lib/order-status";
import type { SellerReport } from "@/lib/seller-data";
import ModernShell from "./modern-shell";
import ConversionFunnel from "./conversion-funnel";
import { DailyBars, DonutStats, PerformanceChart } from "./modern-charts";
import PeriodComparison from "./period-comparison";
import { periodSearchParams, previousPeriod, type ReportPeriod } from "@/lib/report-period";
import OverviewRankedProducts from "./overview-ranked-products";
import OverviewPeriodFilter from "./overview-period-filter";

const listingColors: Record<string, string> = {
  active: "#009e8b", paused: "#2463eb", under_review: "#d88908",
  inactive: "#71809b", closed: "#7952cc", deleted: "#ad3650",
};

function Stat({ title, value, help, color, icon: Icon }: {
  title: string; value: string; help: string; color: "blue" | "green" | "purple"; icon: typeof ShoppingCart;
}) {
  return <article className={`fh-kpi ${color}`}>
    <div className="fh-kpi-top"><div className="fh-kpi-icon"><Icon size={18}/></div><span className="fh-kpi-label">{title}</span></div>
    <strong className="fh-kpi-value">{value}</strong>
    <span className="fh-kpi-foot"><span className="fh-kpi-note">{help}</span></span>
  </article>;
}
function Box({ title, subtitle, children, href, action }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  href?: string;
  action?: React.ReactNode;
}) {
  return <section className="fh-card">
    <div className="fh-card-head">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {action ? <div className="fh-inline-actions">{action}
        {href && <Link href={href} className="fh-card-link">Ver detalhes →</Link>}
      </div> : href && <Link href={href} className="fh-card-link">Ver detalhes →</Link>}
    </div>
    {children}
  </section>;
}
function safeNum(input:unknown):number|null {return typeof input==="number"&&Number.isFinite(input)?input:null;}
export default function SellerHome({ report, period, today }: { report: SellerReport; period: ReportPeriod; today: string }){
  const {accounts,accountId,products,timeline,costs,ads}=report;
  const revenue=report.paidRevenue?.gross_paid_order_amount??null;
  const totalOrders=timeline.length?timeline.reduce((a,p)=>a+p.orders,0):null;
  const visits=timeline.some(p=>p.visits!==null)?timeline.reduce((a,p)=>a+(p.visits||0),0):null;
  const profit=accountId===null&&ads?.profit_complete?safeNum(ads.net_profit_after_ads):null;
  const margin=profit!==null&&ads?.attributed_revenue&&ads.attributed_revenue>0?profit/ads.attributed_revenue*100:null;
  const paidOrders=report.paidRevenue?.paid_order_count??null;
  const avgTicket=revenue!==null&&paidOrders&&paidOrders>0?revenue/paidOrders:null;
  const orderQuery = periodSearchParams(period);
  if (accountId !== null) orderQuery.set("account", String(accountId));
  const canceled=timeline.length?timeline.reduce((a,p)=>a+p.cancelled_orders,0):null;
  const categories=new Map<string,number>();
  for(const p of products) categories.set(p.category||"Sem categoria",(categories.get(p.category||"Sem categoria")||0)+1);
  const sortedCategories=[...categories.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  const catalogMetrics=report.catalogMetrics;
  const salesByItem=catalogMetrics?.sales_by_item??{};
  const adsByItem=catalogMetrics?.ads_by_item??{};
  const ordersComplete=Boolean(catalogMetrics?.orders_complete);
  const topProducts=[...products].sort((a,b)=>
    (salesByItem[b.external_id]??-1)-(salesByItem[a.external_id]??-1)
  ).slice(0,8);
  const costIndex=new Map(costs.map(c=>[c.external_id,c]));
  const costsCovered=products.filter(p=>{
    const amount=costIndex.get(p.external_id)?.unit_cost;
    return typeof amount==="number" && Number.isFinite(amount) && amount>0;
  }).length;
  const statusItems=Object.entries(report.orderStatus?.by_status||{}).map(([name,value],i)=>({
    name:orderStatusLabel(name),value,color:["#20c58b","#488bfa","#ffbd46","#f2737a","#9878f6"][i%5]
  }));
  return <ModernShell title="Visão geral" eyebrow="Resumo geral" isAdmin={Boolean(report.user?.is_admin)}
    action={<OverviewPeriodFilter period={period} today={today} accountId={accountId} accounts={accounts}/>}>
    {report.failedSources.length>0&&<div className="fh-notice error" role="status">Algumas consultas não responderam: {report.failedSources.join(", ")}. Verifique se o FastAPI está online e autenticado.</div>}
    <div className="fh-kpis fh-overview-kpis" id="resumo">
      <Stat color="blue" icon={BadgeDollarSign} title="Faturamento bruto" value={money(revenue)} help={report.paidRevenue?.partial_data?"Dados parciais: histórico de pedidos em sincronização":"Pedidos pagos no período selecionado"}/>
      <Stat color="purple" icon={ShoppingCart} title="Pedidos" value={number(totalOrders)} help="Pedidos registrados no período"/>
      <Stat color="blue" icon={Eye} title="Visitas" value={number(visits)} help="Visitas informadas pelo Mercado Livre"/>
      <Stat color="purple" icon={TrendingUp} title="Conversão" value={visits!==null&&visits>0&&totalOrders!==null?percent(totalOrders/visits*100):"—"} help="Pedidos ÷ visitas disponíveis"/>
    </div>
    {report.comparison && <PeriodComparison period={previousPeriod(period)} metrics={[
      { label: "Faturamento bruto", current: revenue, previous: report.comparison.revenue, format: "money" },
      { label: "Pedidos", current: report.orderStatus?.total_orders ?? null, previous: report.comparison.orders, format: "number" },
    ]}/>}
    <div className="fh-hero-grid fh-overview-charts" id="desempenho">
      <Box title="Evolução das vendas"><PerformanceChart points={timeline}/></Box>
      <Box title="Situação da loja">
        <DonutStats items={Object.entries(report.listing?.by_status||{}).map(([name,value])=>({
          name:listingStatusLabel(name),
          value,color:listingColors[name] ?? "#71809b",
        }))} label="anúncios"/>
        <Link className="fh-status-more" href="/anuncios">Ver todos os anúncios <ArrowRight size={14}/></Link>
      </Box>
    </div>
    <div className="fh-overview-bottom" id="alertas">
      <Box title="Produtos em destaque" href="/produtos">
        {topProducts.length ? <div className="fh-spotlight-list">
          {topProducts.slice(0,3).map(p=><Link className="fh-spotlight-row" key={p.external_id} href={/^ML[A-Z]{1,2}\d{5,20}$/.test(p.external_id)?`/produtos/${encodeURIComponent(p.external_id)}`:"/produtos"}>
            <span className="fh-spotlight-icon">
              {report.productPhotos[p.external_id]
                ? <img src={report.productPhotos[p.external_id]} width={46} height={46}
                    alt={`Foto de ${p.title}`} loading="lazy" decoding="async"/>
                : <Package size={20} aria-label="Foto não disponível"/>}
            </span>
            <span className="fh-spotlight-copy"><strong>{p.title}</strong>
              <small>{report.categoryNames[p.category] ||
                (/^ML[A-Z]{1,2}\d{3,15}$/.test(p.category) ? "Categoria não identificada" :
                  p.category || p.brand || "Produto cadastrado")}</small>
            </span>
            <span className="fh-spotlight-sales">
              <strong>{salesByItem[p.external_id]!==undefined ? number(salesByItem[p.external_id]) :
                ordersComplete ? "0" : "—"}</strong>
              <small>{salesByItem[p.external_id]===undefined && !ordersComplete ? "Em apuração" : "unid. vendidas"}</small>
            </span>
            <ArrowRight size={15}/>
          </Link>)}
        </div> : <div className="fh-empty">Nenhum produto sincronizado nesta conta.</div>}
      </Box>
      <Box title="Alertas importantes">
        <div className="fh-alert-list">
          <Link href="/estoque" className="fh-overview-alert"><span className="fh-overview-alert-icon"><Boxes size={22}/></span><span><strong>{number(products.filter(p=>p.stock_qty===0).length)} produtos sem estoque</strong></span><span className="fh-overview-alert-action">Revisar estoque <ArrowRight size={16}/></span></Link>
          <Link href={`/pedidos?${orderQuery}`} className="fh-overview-alert"><span className="fh-overview-alert-icon"><CircleAlert size={22}/></span><span><strong>{number(canceled)} cancelamentos registrados</strong></span><span className="fh-overview-alert-action">Ver pedidos <ArrowRight size={16}/></span></Link>
        </div>
      </Box>
    </div>
    <div className="fh-overview-detail-grid">
      <Box title="Situação dos pedidos" href="/pedidos">
        <DonutStats items={statusItems} label="pedidos"/>
      </Box>
      <Box title="Top categorias" href="/produtos">
        <div className="fh-mini-list">
          {sortedCategories.length ? sortedCategories.map(([category,value])=><div key={category} className="fh-mini-row fh-category-row">
            <span title={report.categoryNames[category] || "Categoria do catálogo"}>
              {report.categoryNames[category] ||
                (/^ML[A-Z]{1,2}\d{3,15}$/.test(category) ? "Nome indisponível" : category)}
            </span>
            <div className="fh-progress"><i style={{width:`${value/Math.max(...sortedCategories.map(c=>c[1]))*100}%`}}/></div>
            <strong>{number(value)}</strong>
          </div>) : <div className="fh-empty">Sem produtos classificados.</div>}
        </div>
        {sortedCategories.some(([id])=>/^ML[A-Z]{1,2}\d{3,15}$/.test(id) && !report.categoryNames[id]) &&
          <p className="fh-category-hint">Alguns nomes ainda não foram retornados pelo Mercado Livre.</p>}
      </Box>
    </div>
    <div className="fh-secondary-with-funnel">
      <div className="fh-secondary-left">
    <div className="fh-overview-secondary">
      <h2>Mais indicadores da loja</h2>
      <p>Detalhes adicionais disponíveis nos dados sincronizados com o Mercado Livre.</p>
      <div className="fh-kpis">
        <Stat color="green" icon={BadgeDollarSign} title="Lucro após Ads" value={money(profit)} help="Somente com custos e Ads completos"/>
        <Stat color="purple" icon={Percent} title="Margem estimada" value={percent(margin)} help="Sobre receita atribuída aos anúncios"/>
        <Stat color="green" icon={Tag} title="Ticket médio" value={money(avgTicket)} help="Receita bruta ÷ pedidos pagos"/>
        <Stat color="purple" icon={Boxes} title="Anúncios armazenados" value={number(report.liveListingsTotal)} help="Total persistido no PostgreSQL"/>
      </div>
    </div>
    <div className="fh-split-grid">
      <Box title="Vendas por dia" href="/vendas"><DailyBars points={timeline}/></Box>
      <Box title="Saúde dos anúncios" href="/anuncios"><DonutStats items={Object.entries(report.listing?.by_status||{}).map(([name,value],i)=>({name:listingStatusLabel(name),value,color:["#1ac68e","#4c8dff","#ffc75c","#f67c8c"][i%4]}))} label="anúncios"/></Box>
    </div>
      </div>
      <ConversionFunnel visits={visits} orders={totalOrders} paidOrders={paidOrders}/>
    </div>
    <div className="fh-alert-row">
      <div className="fh-alert rose"><span>Cancelamentos registrados</span><strong>{number(canceled)}</strong></div>
      <div className="fh-alert orange"><span>Estoque zerado</span><strong>{number(products.filter(p=>p.stock_qty===0).length)}</strong></div>
      <div className="fh-alert green"><span>Gasto em publicidade</span><strong>{accountId===null?money(ads?.ad_spend??null):"—"}</strong></div>
      <div className="fh-alert"><span>Custos de compra cadastrados</span><strong>{number(costsCovered)} de {number(products.length)}</strong></div>
    </div>
    <Box title={Object.keys(salesByItem).length?"Produtos mais vendidos":"Produtos do catálogo"} subtitle="Vendas de pedidos pagos, custos cadastrados e Ads reportados" href="/produtos"
      action={<OverviewPeriodFilter period={period} today={today} accountId={accountId} accounts={[]}/>}>
      <OverviewRankedProducts rows={topProducts.map(p=>{
          const c=costIndex.get(p.external_id);
          const units=salesByItem[p.external_id];
          const ad=adsByItem[p.external_id];
          const manufacturer = c?.manufacturer || p.brand || null;
          return { id: p.external_id, values: [
            p.title, p.promotional_price, c && Number.isFinite(c.unit_cost) && c.unit_cost > 0 ? c.unit_cost : null,
            units ?? (ordersComplete ? 0 : null), ad?.ad_spend ?? null, p.stock_qty, manufacturer,
          ], content: <>
            <td className="fh-table-name"><strong>{p.title}</strong><small>{p.external_id} · {p.category}</small></td>
            <td>{money(p.promotional_price)}</td>
            <td>{c && Number.isFinite(c.unit_cost) && c.unit_cost>0 ? money(c.unit_cost) :
              <span title="Cadastre os custos pela importação em massa na Precificação">—</span>}</td>
            <td title={!ordersComplete?"Dados parciais: a importação de pedidos ou de seus itens ainda está em andamento.":undefined}>{units!==undefined?`${number(units)}${ordersComplete?"":" *"}`:ordersComplete?"0":"Em apuração"}</td>
            <td title={ad?"Gasto publicitário presente em relatório importado.":"Sem relatório Product Ads importado para este anúncio."}>{ad?money(ad.ad_spend):"Sem relatório"}</td>
            <td>{number(p.stock_qty)}</td>
            <td>{manufacturer ?? "Não informado"}</td>
          </> };
        })}/>
      <p style={{fontSize:11,color:"#66758b",marginBottom:0}}>
        {catalogMetrics?(ordersComplete?
          "Vendas calculadas pelos itens dos pedidos pagos sincronizados.":
          `* Dados parciais: ${number(catalogMetrics.enriched_paid_orders)} de ${number(catalogMetrics.paid_orders)} pedidos pagos têm itens detalhados; a sincronização precisa concluir.`
        ):"Não foi possível consultar o detalhamento de vendas; tente novamente após atualizar o backend."}
        {" "}A tabela usa custos de compra cadastrados, sem modificar os preços anunciados. O gasto Ads só aparece quando há relatórios reais importados.{" "}
        <Link href="/integracoes" style={{color:"#2563eb",fontWeight:600}}>Consultar integrações</Link>.
      </p>
    </Box>
  </ModernShell>;
}
