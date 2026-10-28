import ModernShell from "@/components/modern-shell";
import OrderExplorer from "@/components/order-explorer";
import { DailyBars, DonutStats } from "@/components/modern-charts";
import { getOrdersOverview } from "@/lib/seller-data";
import { orderStatusLabel } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OrdersPage() {
  const report = await getOrdersOverview(30);
  const statusItems = Object.entries(report.orderStatus?.by_status || {})
    .map(([status,value],i) => ({
      name: orderStatusLabel(status), value,
      color: ["#347dff","#23a9ef","#81bdf7","#adcff6"][i%4],
    }));
  return <ModernShell title="Pedidos" eyebrow="Mercado Livre"
    isAdmin={Boolean(report.user?.is_admin)}>
    <OrderExplorer mode="orders" accounts={report.accounts.map(
      account => ({account_id: account.account_id, nickname: account.nickname}))}/>
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
