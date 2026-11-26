import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SalesPriority } from "@/lib/sales-priority";
import { money, number, percent } from "@/lib/analytics";
import styles from "./claude-consultations.module.css";

const destinationPaths = {
  purchases: "/reposicao", pricing: "/precificacao", listings: "/anuncios",
  integrations: "/integracoes", queue: "/fila-de-decisoes",
};

function actionUrl(result: SalesPriority) {
  const path = destinationPaths[result.destination];
  const product = result.product;
  if (!product) return path;
  const params = new URLSearchParams();
  if (result.destination === "purchases" || result.destination === "pricing") {
    params.set("produto", product.id);
  }
  if (result.destination === "purchases") {
    params.set("period", "custom");
    params.set("start_date", result.start);
    params.set("end_date", result.end);
  }
  if (result.destination === "pricing" && product.target !== null) params.set("meta", String(product.target));
  return params.size ? `${path}?${params}` : path;
}

export default function ClaudeSalesPriority({ result }: { result: SalesPriority }) {
  const product = result.product;
  const evidence = product ? [
    ["Demanda", `${number(product.units)} un. em pedidos pagos`],
    ["Cobertura de estoque", product.coverage === null ? "Dado indisponível"
      : `${number(Math.round(product.coverage * 10) / 10)} dias`],
    ["Margem estimada", product.margin === null ? "Dado indisponível" : percent(product.margin)],
    ["Meta da classe", product.target === null ? null : percent(product.target)],
    ["Situação do anúncio", result.status],
  ] : [];

  return <section className={styles.result} aria-label="Prioridade de vendas">
    <div className={styles.resultMain}>
      <p className={styles.resultLabel}>Prioridade agora</p>
      <h2>{result.title}</h2>
      {product && <p className={styles.priorityProduct}><strong>{product.name}</strong> · {product.id}</p>}
      <p className={styles.priorityReason}>{result.reason}</p>
      <Link className={styles.priorityAction} href={actionUrl(result)}>{result.action}<ArrowRight size={17} aria-hidden/></Link>
    </div>
    <div className={styles.resultScope}>
      <h3>Por que essa ação</h3>
      {evidence.length > 0 && <dl className={styles.scope}>{evidence.map(([label, value]) => value &&
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      <p className={styles.source}>Fonte: {result.source}</p>
      <details className={styles.details}>
        <summary>Detalhes da análise</summary>
        <p>Período de vendas de {result.start.split("-").reverse().join("/")} a {result.end.split("-").reverse().join("/")}.</p>
        {result.destination === "purchases" && product && product.quantity !== null &&
          <p>{number(product.quantity)} unidades sugeridas · {money(product.investment)} de investimento estimado</p>}
      </details>
    </div>
  </section>;
}
