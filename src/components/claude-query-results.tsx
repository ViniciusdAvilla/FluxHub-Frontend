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
const labels: Record<string, string> = {
  total_anuncios: "Total de anúncios",
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

export default function ClaudeQueryResults({ sections }: { sections: QuerySection[] }) {
  return <div className={styles.results}>{sections.map(({ query, result }, index) =>
    <section key={index} className={styles.result} aria-label={names[query] ?? "Resultado da consulta"}>
      <h3>{names[query] ?? "Resultado da consulta"}</h3>
      <Fields data={result}/>
      {typeof result.origem === "string" && <p className={styles.source}>{result.origem}</p>}
      {typeof result.aviso === "string" && <p className={styles.source}>{result.aviso}</p>}
    </section>)}</div>;
}
