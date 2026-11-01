import { ArrowDown, CheckCircle2, Eye, ShoppingCart } from "lucide-react";

type FunnelProps = {
  visits: number | null;
  orders: number | null;
  paidOrders: number | null;
};

const formatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function formatCount(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : formatter.format(value);
}

function formatRate(part: number | null, total: number | null): string {
  if (part === null || total === null || total <= 0 || !Number.isFinite(part)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1,
  }).format(part / total);
}

/**
 * Totais agregados do mesmo período; não afirmamos atribuição individual de visita a pedido.
 * Largura das faixas ilustrativa; as taxas numéricas são calculadas dos dados recebidos.
 */
export default function ConversionFunnel({ visits, orders, paidOrders }: FunnelProps) {
  const visitRate = formatRate(orders, visits);
  const paymentRate = formatRate(paidOrders, orders);

  return <section className="fh-card fh-conversion-funnel" aria-labelledby="fh-conversion-title">
    <header className="fh-card-head">
      <div>
        <h2 id="fh-conversion-title">Funil de conversão</h2>
        <p>Indicativo do período selecionado</p>
      </div>
    </header>
    <div className="fh-funnel-visual" role="group" aria-label="Comparação de visitas, pedidos e pagamentos">
      <div className="fh-funnel-stage fh-funnel-visits">
        <span className="fh-funnel-icon"><Eye size={21} aria-hidden="true" /></span>
        <div className="fh-funnel-label"><span>Visitas</span><strong>{formatCount(visits)}</strong></div>
        <div className="fh-funnel-shape" aria-hidden="true"/>
      </div>
      <div className="fh-funnel-stage fh-funnel-orders">
        <span className="fh-funnel-icon"><ShoppingCart size={21} aria-hidden="true" /></span>
        <div className="fh-funnel-label"><span>Pedidos</span><strong>{formatCount(orders)}</strong></div>
        <div className="fh-funnel-shape" aria-hidden="true"/>
      </div>
      <div className="fh-funnel-stage fh-funnel-paid">
        <span className="fh-funnel-icon"><CheckCircle2 size={21} aria-hidden="true" /></span>
        <div className="fh-funnel-label"><span>Pagos</span><strong>{formatCount(paidOrders)}</strong></div>
        <div className="fh-funnel-shape" aria-hidden="true"/>
      </div>
    </div>
    <div className="fh-funnel-rates">
      <div className="fh-funnel-rate">
        <span className="fh-funnel-rate-value">{visitRate}</span>
        <span>pedidos ÷ visitas no período</span>
        <ArrowDown size={13} aria-hidden="true"/>
      </div>
      <div className="fh-funnel-rate">
        <span className="fh-funnel-rate-value">{paymentRate}</span>
        <span>pagos ÷ pedidos no período</span>
        <ArrowDown size={13} aria-hidden="true"/>
      </div>
    </div>
    <p className="fh-funnel-disclaimer">Comparação de totais agregados, sem atribuição individual de visitas a pedidos. Faixas ilustrativas, sem escala proporcional.</p>
  </section>;
}
