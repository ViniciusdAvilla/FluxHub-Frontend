import ModernShell from "@/components/modern-shell";
import OrderExplorer from "@/components/order-explorer";
import { DailyBars, DonutStats } from "@/components/modern-charts";
import { getOrdersOverview, validAccount } from "@/lib/seller-data";
import { orderStatusLabel } from "@/lib/order-status";

import OverviewPeriodFilter from "@/components/overview-period-filter";
import PeriodComparison from "@/components/period-comparison";
import { previousPeriod, readPeriod, reportToday, type PeriodSearch } from "@/lib/report-period";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<PeriodSearch> }) {
  const query = await searchParams;
  const today = reportToday();
  const period = readPeriod(query, today, true);
  const report = await getOrdersOverview(period, validAccount(query.account));
  const statusItems = Object.entries(report.orderStatus?.by_status || {})
    .map(([status,value],i) => ({
      name: orderStatusLabel(status), value,
      color: ["#347dff","#23a9ef","#81bdf7","#adcff6"][i%4],
    }));
  return <ModernShell title="Pedidos" eyebrow="Mercado Livre"
    isAdmin={Boolean(report.user?.is_admin)}
    action={<OverviewPeriodFilter period={period} today={today} accountId={report.accountId}
      accounts={report.accounts} allowAll/>}>
    {period.compare && <PeriodComparison period={previousPeriod(period)} metrics={[
      { label: "Pedidos", current: report.orderStatus?.total_orders ?? null,
        previous: report.previousOrderStatus?.total_orders ?? null, format: "number" },
    ]}/>}
    <OrderExplorer mode="orders" period={period} today={today} accountId={report.accountId}/>
    <div className="fh-insight-grid" style={{marginTop:18}}>
      <section className="fh-card">
        <div className="fh-card-head"><h2>Valor dos pedidos por dia</h2></div>
        <DailyBars points={report.timeline}/>
      </section>
      <section className="fh-card">
        <div className="fh-card-head"><h2>Pedidos por status</h2></div>
        <DonutStats label="pedidos" items={statusItems}/>
      </section>
    </div>
  </ModernShell>;
}
