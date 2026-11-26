import ModernShell from "@/components/modern-shell";
import OrderExplorer from "@/components/order-explorer";
import { PerformanceChart, DonutStats } from "@/components/modern-charts";
import { getOrdersOverview, validAccount } from "@/lib/seller-data";
import { orderStatusLabel } from "@/lib/order-status";

import OverviewPeriodFilter from "@/components/overview-period-filter";
import PeriodComparison from "@/components/period-comparison";
import { previousPeriod, readPeriod, reportToday, type PeriodSearch } from "@/lib/report-period";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SalesPage({ searchParams }: { searchParams: Promise<PeriodSearch> }) {
  const query = await searchParams;
  const today = reportToday();
  const period = readPeriod(query, today, true);
  const report = await getOrdersOverview(period, validAccount(query.account), true);
  const statuses = Object.entries(report.orderStatus?.by_status ?? {}).map(
    ([status, value], index) => ({
      name: orderStatusLabel(status),
      value,
      color: ["#20c58b", "#4386fc", "#ffc34d", "#f07887"][index % 4],
    }),
  );
  return <ModernShell title="Vendas" eyebrow="Pedidos e receita"
    isAdmin={Boolean(report.user?.is_admin)}
    action={<OverviewPeriodFilter period={period} today={today} accountId={report.accountId}
      accounts={report.accounts} allowAll/>}>
    {period.compare && <PeriodComparison period={previousPeriod(period)} metrics={[
      { label: "Faturamento bruto", current: report.revenue, previous: report.previousRevenue, format: "money" },
      { label: "Pedidos", current: report.orderStatus?.total_orders ?? null,
        previous: report.previousOrderStatus?.total_orders ?? null, format: "number" },
    ]}/>}
    <OrderExplorer mode="sales" period={period} accountId={report.accountId}/>
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
