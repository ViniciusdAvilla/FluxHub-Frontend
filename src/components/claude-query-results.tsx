import { listingStatusLabel } from "@/lib/order-status";
import styles from "./claude-consultations.module.css";

export type QuerySection = { query: string; result: Record<string, unknown> };

const names: Record<string, string> = {
  contar_anuncios: "Anúncios cadastrados",
  consultar_catalogo: "Catálogo e custos",
  diagnosticar_dados: "Cobertura da sincronização",
  desempenho_periodo: "Desempenho do período",
  consultar_vendas: "Vendas e pedidos",
  resumo_operacao: "Resumo da operação",
  produtos_mais_vendidos: "Unidades vendidas por anúncio",
  consultar_estoque: "Estoque baixo",
  resumo_product_ads: "Product Ads",
};
const bases: Record<string, string> = {
  contar_anuncios: "Anúncios sincronizados",
  consultar_catalogo: "Catálogo e custos cadastrados",
  consultar_estoque: "Catálogo sincronizado",
  produtos_mais_vendidos: "Itens de pedidos pagos",
};

const labels: Record<string, string> = {
  total_anuncios: "Total de anúncios",
  total_no_status: "Total no status",
  total_encontrado: "Total encontrado",
  faturamento_pago_bruto_brl: "Faturamento bruto de pedidos pagos",
  faturamento_bruto_pedidos_pagos_brl: "Faturamento bruto de pedidos pagos",
  pedidos_registrados: "Pedidos registrados",
  pedidos_armazenados: "Pedidos armazenados",
  pedidos_pagos: "Pedidos pagos",
  pedidos_cancelados: "Pedidos cancelados",
  visitas: "Visitas",
  gasto_ads_brl: "Gasto com Product Ads",
  gasto_publicidade_brl: "Gasto com Product Ads",
  receita_atribuida_ads_brl: "Receita atribuída a Product Ads",
  anuncios_por_status: "Anúncios por status",
  inicio: "Início", fim: "Fim", periodo_dias: "Período em dias",
  categoria_id: "ID da categoria", id_anuncio: "ID do anúncio",
  taxa_marketplace_pct: "Comissão do marketplace (%)",
};

function label(key: string) {
  return labels[key] ?? key.replace(/_brl$/, " (R$)").replace(/_pct$/, " (%)")
    .replaceAll("_", " ").replace(/^./, char => char.toUpperCase());
}

function showValue(value: unknown, key: string): string {
  if (value == null) return "Dado indisponível";
  if (typeof value === "number") {
    return key.endsWith("_brl") ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : value.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") return value;
  return "Dado indisponível";
}

function Fields({ data, field }: { data: Record<string, unknown>; field?: string }) {
  const fields = Object.entries(data).filter(([key]) => key !== "origem" && key !== "aviso");
  if (!fields.length) return <p>Nenhum registro retornado pela consulta.</p>;
  return <dl className={styles.fields}>{fields.map(([key, value]) => <div key={key}>
    <dt>{field === "anuncios_por_status" ? listingStatusLabel(key) : label(key)}</dt>
    <dd>{Array.isArray(value)
      ? value.length ? <ol>{value.map((item, index) => <li key={index}>
          {item && typeof item === "object" ? <Fields data={item as Record<string, unknown>}/> : showValue(item, key)}
        </li>)}</ol> : "Nenhum registro retornado pela consulta."
      : value && typeof value === "object" ? <Fields data={value as Record<string, unknown>} field={key}/>
      : showValue(value, key)}</dd>
  </div>)}</dl>;
}

const primaryFields = [
  "total_no_status", "total_anuncios", "total_encontrado",
  "faturamento_pago_bruto_brl", "faturamento_bruto_pedidos_pagos_brl",
  "pedidos_pagos", "pedidos_cancelados", "pedidos_registrados",
  "pedidos_armazenados", "visitas", "gasto_ads_brl", "gasto_publicidade_brl",
  "receita_atribuida_ads_brl",
];

function isoDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value.split("-").reverse().join("/") : null;
}

function resultStatus(result: Record<string, unknown>) {
  const statuses = result.anuncios_por_status;
  if (!Object.hasOwn(result, "total_no_status") || !statuses || typeof statuses !== "object") return null;
  const [key] = Object.keys(statuses);
  return key ? listingStatusLabel(key) : null;
}

export default function ClaudeQueryResults({ sections }: { sections: QuerySection[] }) {
  return <div className={styles.results}>{sections.map(({ query, result }, index) => {
    const primary = primaryFields.find(key => Object.hasOwn(result, key));
    const status = resultStatus(result);
    const title = status ? `Anúncios ${status.toLocaleLowerCase("pt-BR")}`
      : primary && primary !== "total_encontrado" ? label(primary)
      : names[query] ?? "Resultado da consulta";
    const value = primary ? result[primary] : undefined;
    const start = isoDate(result.inicio);
    const end = isoDate(result.fim);
    const scope = [
      ["Status", status],
      ["Período", start && end ? (start === end ? start : `${start} a ${end}`)
        : typeof result.periodo_dias === "number" ? `Últimos ${result.periodo_dias} dias` : null],
      ["Produto", typeof result.produto_consultado === "string" ? result.produto_consultado : null],
      ["Estoque máximo", typeof result.estoque_baixo_ate === "number" ? showValue(result.estoque_baixo_ate, "estoque") : null],
      ["Base", Object.hasOwn(bases, query) ? bases[query] : null],
      ["Fonte", typeof result.origem === "string" ? result.origem : null],
    ];
    const details = Object.fromEntries(Object.entries(result).filter(([key]) =>
      key !== primary && !["inicio", "fim", "periodo_dias", "produto_consultado", "estoque_baixo_ate"].includes(key)));
    const hasDetails = Object.keys(details).some(key => key !== "origem" && key !== "aviso");
    return <section key={index} className={styles.result} aria-label={title}>
      <div className={styles.resultMain}>
        <p className={styles.resultLabel}>Resultado da consulta</p>
        <h2>{title}</h2>
        {primary && <div className={styles.value}>{value == null
          ? primary.endsWith("_brl") ? "R$ —" : "—"
          : showValue(value, primary)}</div>}
        {primary && value == null && <span className={styles.unavailable}>Dado indisponível</span>}
        {!primary && <Fields data={details}/>}
        {typeof result.aviso === "string" && <p className={styles.source}>{result.aviso}</p>}
      </div>
      <div className={styles.resultScope}>
        <h3>Escopo e fonte</h3>
        <dl className={styles.scope}>{scope.map(([field, entry]) => entry &&
          <div key={field}><dt>{field}</dt><dd>{entry}</dd></div>)}</dl>
        {primary && hasDetails && <details className={styles.details}>
          <summary>Detalhes da consulta</summary>
          <Fields data={details}/>
        </details>}
      </div>
    </section>;
  })}</div>;
}
