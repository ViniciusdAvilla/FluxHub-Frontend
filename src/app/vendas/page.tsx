import ModernShell from "@/components/modern-shell";
import OrderExplorer from "@/components/order-explorer";
import { PerformanceChart, DonutStats } from "@/components/modern-charts";
import { getSellerReport } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses: Record<string,string> = {
  paid: "Pago", cancelled: "Cancelado", payment_required: "Aguardando pagamento",
  payment_in_process: "Em processamento", confirmed: "Confirmado",
};

export default async function SalesPage() {
  const report = await getSellerReport(30, null);
  const mapped = new Map<string, number>();
  for (const order of report.orders) {
    const label = statuses[order.status] || order.status;
    mapped.set(label, (mapped.get(label) || 0) + 1);
  }
  return <ModernShell title="Vendas" eyebrow="Pedidos e receita"
    isAdmin={Boolean(report.user?.is_admin)}>
    <OrderExplorer mode="sales"/>
    <div className="fh-hero-grid" style={{marginTop:18}}>
      <section className="fh-card">
        <div className="fh-card-head"><h2>Histórico sincronizado</h2></div>
        <PerformanceChart points={report.timeline}/>
      </section>
      <section className="fh-card">
        <div className="fh-card-head"><h2>Distribuição por status</h2></div>
        <DonutStats label="pedidos" items={[...mapped.entries()].map(
          ([name,value],i)=>({name,value,color:["#20c58b","#4386fc","#ffc34d","#f07887"][i%4]}))}/>
      </section>
    </div>
  </ModernShell>;
}
