import ModernShell from "@/components/modern-shell";
import OrderExplorer from "@/components/order-explorer";
import { DailyBars, DonutStats } from "@/components/modern-charts";
import { getSellerReport } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const labels: Record<string,string> = {
  paid: "Pago", cancelled: "Cancelado", payment_required: "Aguardando pagamento",
  payment_in_process: "Em processamento", confirmed: "Confirmado",
};

export default async function OrdersPage() {
  const report = await getSellerReport(30, null);
  const statusItems = Object.entries(report.orderStatus?.by_status || {})
    .map(([status,value],i) => ({
      name: labels[status] || status, value,
      color: ["#347dff","#23a9ef","#81bdf7","#adcff6"][i%4],
    }));
  return <ModernShell title="Pedidos" eyebrow="Mercado Livre"
    isAdmin={Boolean(report.user?.is_admin)}>
    <OrderExplorer mode="orders"/>
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
