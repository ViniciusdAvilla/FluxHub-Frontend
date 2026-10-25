import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, BadgeDollarSign, Boxes, Eye, Package,
  ShieldCheck, ShoppingCart, TrendingUp } from "lucide-react";
import ModernShell from "@/components/modern-shell";
import ProductVisitsChart from "@/components/product-visits-chart";
import { backendRequest } from "@/lib/backend-transport";
import { sellerIdentity } from "@/lib/seller-data";
import { money, number, percent } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Performance = {
  item: { id: string; account_id: number; title: string | null; status: string | null;
    price: number | null; stock: number | null; sold_lifetime: number | null;
    thumbnail: string | null; permalink: string | null; category_id: string | null };
  visits: { total: number | null; daily: { date: string; visits: number }[]; source: string };
  quality: { score: number | null; level: string | null;
    opportunities: { title: string; status: string }[] } | null;
  ads: { attributed_sales: number; attributed_revenue: number; ad_spend: number; source: string } | null;
  unit_margin: { estimated_unit_profit: number; estimated_margin_percent: number; source: string } | null;
  sales_period: null; conversion_period: null; revenue_period: null; days: number; note: string;
};
const periods = [7, 30, 90] as const;
function safelyAccount(raw?: string) {
  return raw && /^\d{1,15}$/.test(raw) && Number.isSafeInteger(Number(raw))
    ? Number(raw) : null;
}
function KPI({ label, value, note, Icon }: {
  label: string; value: string; note: string; Icon: typeof Eye;
}) {
  return <article className="fh-kpi blue">
    <div className="fh-kpi-top"><Icon size={18}/><span>{label}</span></div>
    <strong className="fh-kpi-value">{value}</strong>
    <span className="fh-kpi-note">{note}</span>
  </article>;
}
export default async function ProductPerformancePage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string; account?: string }>;
}) {
  const [{ id }, query, identity] = await Promise.all([params, searchParams, sellerIdentity()]);
  if (!/^ML[A-Z]{1,2}\d{5,20}$/.test(id)) notFound();
  const days = periods.find(value => String(value) === query.days) || 30;
  const account = safelyAccount(query.account);
  const paramsQuery = new URLSearchParams({ days: String(days) });
  if (account) paramsQuery.set("account_id", String(account));
  let report: Performance | null = null;
  let error = "";
  try {
    report = await backendRequest(
      "/api/v1/analytics/items/" + id + "/performance", paramsQuery, 60000,
    ) as Performance;
  } catch (e) {
    error = e instanceof Error ? e.message : "Métricas temporariamente indisponíveis.";
  }
  const item = report?.item;
  const periodLink = (value: number) => "/produtos/" + id + "?" +
    new URLSearchParams({ days: String(value), ...(account ? { account: String(account) } : {}) });
  return <ModernShell title="Desempenho do produto" eyebrow="Mercado Livre"
    isAdmin={Boolean(identity?.is_admin)}>
    <div style={{ display: "grid", gap: 18 }}>
      <Link href="/produtos" className="fh-card-link"
        style={{ display: "inline-flex", alignItems: "center", gap: 7, width: "fit-content" }}>
        <ArrowLeft size={16}/> Voltar aos produtos
      </Link>
      {error && <div className="fh-notice error" role="alert">
        <strong>Não foi possível carregar o anúncio.</strong>
        <p>{error}</p>
        <p>Verifique sua conta vinculada, a sincronização e as permissões da API.</p>
      </div>}
      {item && report && <>
        <section className="fh-card" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {item.thumbnail && <img src={item.thumbnail} alt=""
            width={100} height={100} style={{ objectFit: "contain", borderRadius: 12, background: "#f7f9fc" }}/>}
          <div style={{ flex: 1, minWidth: 200 }}>
            <span className="fh-pill">{item.status === "active" ? "Anúncio ativo" : item.status || "Status indisponível"}</span>
            <h2 style={{ margin: "9px 0 5px", fontSize: "clamp(18px,2.4vw,25px)" }}>
              {item.title || item.id}</h2>
            <p style={{ color: "#728198", margin: 0 }}>{item.id} · Vendedor {item.account_id}</p>
            <strong style={{ fontSize: 22, display: "block", marginTop: 8 }}>{money(item.price)}</strong>
          </div>
          {item.permalink?.startsWith("https://") && <a href={item.permalink} target="_blank"
            rel="noopener noreferrer" className="fh-control">Ver anúncio oficial ↗</a>}
        </section>
        <nav className="fh-filters" aria-label="Selecionar período">
          <span>Período analisado</span>
          {periods.map(value => <Link key={value} href={periodLink(value)}
            className={days === value ? "fh-control fh-control-active" : "fh-control"}
            aria-current={days === value ? "page" : undefined}
            style={days === value ? { background: "#2879f7", color: "white", borderRadius: 10 } :
              { borderRadius: 10 }}>
            {value} dias
          </Link>)}
        </nav>
        <div className="fh-kpis">
          <KPI Icon={Eye} label="Visitas ao anúncio" value={number(report.visits.total)}
            note={report.visits.total === null ? "API de visitas indisponível" : "Total oficial no período"}/>
          <KPI Icon={ShoppingCart} label="Vendas no período" value="—"
            note="Não disponíveis de forma completa por anúncio"/>
          <KPI Icon={TrendingUp} label="Conversão do período" value="—"
            note="Depende das vendas individuais no período"/>
          <KPI Icon={BadgeDollarSign} label="Receita total do período" value="—"
            note="Não inferida do preço ou vendas vitalícias"/>
          <KPI Icon={Boxes} label="Estoque disponível" value={number(item.stock)}
            note="Quantidade atual do anúncio"/>
          <KPI Icon={Package} label="Vendidos desde a publicação" value={number(item.sold_lifetime)}
            note="Acumulado vitalício; não corresponde ao filtro"/>
          <KPI Icon={ShieldCheck} label="Qualidade do anúncio"
            value={report.quality?.score === null || report.quality?.score === undefined
              ? "—" : String(report.quality.score) + "/100"}
            note={report.quality?.level || "Avaliação indisponível"}/>
          <KPI Icon={Activity} label="Margem unitária estimada"
            value={percent(report.unit_margin?.estimated_margin_percent ?? null)}
            note={report.unit_margin ? "Baseada nos seus custos cadastrados" : "Cadastre custos e taxas para estimar"}/>
        </div>
        <div className="fh-insight-grid">
          <section className="fh-card">
            <div className="fh-card-head"><div><h2>Evolução das visitas</h2>
              <p>Histórico diário retornado pelo Mercado Livre nos últimos {days} dias.</p></div></div>
            <ProductVisitsChart points={report.visits.daily}/>
          </section>
          <section className="fh-card">
            <div className="fh-card-head"><div><h2>Qualidade e oportunidades</h2>
              <p>Recomendações reais do recurso de qualidade do Mercado Livre.</p></div></div>
            {report.quality?.opportunities.length ? <ul style={{ display: "grid", gap: 12, paddingLeft: 22 }}>
              {report.quality.opportunities.map((row, i) =>
                <li key={i}>{row.title || "Melhoria pendente"}</li>)}
            </ul> : <div className="fh-empty">Nenhuma oportunidade retornada pela API.</div>}
          </section>
        </div>
        <section className="fh-card">
          <div className="fh-card-head"><div><h2>Indicadores de publicidade</h2>
            <p>Somente quando há relatórios reais de Ads importados para este produto e período.</p></div></div>
          <div className="fh-kpis" style={{ margin: 0 }}>
            <KPI Icon={ShoppingCart} label="Vendas atribuídas aos Ads"
              value={number(report.ads?.attributed_sales ?? null)} note="Não representam todas as vendas"/>
            <KPI Icon={BadgeDollarSign} label="Receita atribuída aos Ads"
              value={money(report.ads?.attributed_revenue ?? null)} note="Relatório de Ads importado"/>
            <KPI Icon={Activity} label="Investimento em Ads"
              value={money(report.ads?.ad_spend ?? null)} note="Relatório de Ads importado"/>
          </div>
        </section>
        <div className="fh-notice" role="note">
          <strong>Origem das métricas:</strong> visitas e qualidade via API oficial; estoque,
          preço e vendas acumuladas pela ficha do anúncio; Ads por relatórios importados.
          Dados ausentes aparecem como “—” e não são estimados.
        </div>
      </>}
    </div>
  </ModernShell>;
}
