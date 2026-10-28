import ModernShell from "@/components/modern-shell";
import OrderExplorer from "@/components/order-explorer";
import { PerformanceChart, DonutStats } from "@/components/modern-charts";
import { getOrdersOverview } from "@/lib/seller-data";
import { orderStatusLabel } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SalesPage() {
  const report = await getOrdersOverview(30);
  const statuses = Object.entries(report.orderStatus?.by_status ?? {}).map(
    ([status, value], index) => ({
      name: orderStatusLabel(status),
      value,
      color: ["#20c58b", "#4386fc", "#ffc34d", "#f07887"][index % 4],
    }),
  );
  return <ModernShell title="Vendas" eyebrow="Pedidos e receita"
    isAdmin={Boolean(report.user?.is_admin)}>
    <OrderExplorer mode="sales" accounts={report.accounts.map(
      account => ({account_id: account.account_id, nickname: account.nickname}))}/>
    <div className="fh-hero-grid" style={{marginTop:18}}>
      <section className="fh-card">
        <div className="fh-card-head"><h2>Histórico sincronizado</h2></div>
        <PerformanceChart points={report.timeline}/>
      </section>
      <section className="fh-card">
        <div className="fh-card-head"><h2>Distribuição por status</h2></div>
        <DonutStats label="pedidos" items={statuses}/>
      </section>
    </div>
  </ModernShell>;
}
