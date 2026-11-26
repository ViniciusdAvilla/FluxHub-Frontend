import { classifyAbc, enrichProducts, replenishment } from "./analytics";
import { abcMarginTargets, highVolumeThreshold } from "./abc-strategy";
import type { AbcRow, Snapshot } from "./types";

export type DecisionKind = "restock" | "margin" | "data";
export type Decision = {
  id: string;
  account: string;
  name: string;
  kind: DecisionKind;
  reason: string;
  units: number;
  coverage: number | null;
  margin: number | null;
  target: number | null;
  abcClass: AbcRow["abcClass"];
  quantity: number | null;
  investment: number | null;
};

const coverageTarget = 30;
const urgentCoverage = 7;

export function buildDecisionQueue(snapshot: Snapshot, days: number): Decision[] {
  if (!snapshot.catalogSales) return [];
  const products = snapshot.products.filter(product => /^ml:\d+$/.test(String(product.raw?.source_key ?? "")));
  const catalog = classifyAbc(enrichProducts(products, snapshot.finance, days));
  const highVolume = highVolumeThreshold(catalog);
  return catalog.flatMap<Decision>(row => {
    const units = row.sales;
    if (units === null || units <= 0) return [];
    const lowCoverage = row.stockDays !== null && row.stockDays <= urgentCoverage;
    const highDemand = highVolume !== null && units >= highVolume;
    if (!lowCoverage && !highDemand) return [];

    const target = row.abcClass ? abcMarginTargets[row.abcClass] : null;
    const margin = row.finance?.feeConfigured === false ? null : row.margin;
    let kind: DecisionKind;
    let reason: string;
    let quantity: number | null = null;

    if (!snapshot.catalogSales?.orders_complete) {
      kind = "data";
      reason = "Conferir a sincronização dos pedidos";
    } else if (!row.finance || row.finance.unitCost <= 0) {
      kind = "data";
      reason = "Cadastrar o custo de compra";
    } else if (row.finance.feeConfigured === false) {
      kind = "data";
      reason = "Cadastrar a comissão do marketplace";
    } else if (margin === null || target === null || row.stock === null) {
      kind = "data";
      reason = row.stock === null ? "Conferir o saldo de estoque" : "Completar os dados para calcular a margem";
    } else if (margin < target) {
      kind = "margin";
      reason = lowCoverage ? "Revisar preço antes de repor" : "Revisar preço para atingir a meta da classe";
    } else if (lowCoverage) {
      kind = "restock";
      reason = "Repor para atingir 30 dias de cobertura";
      quantity = replenishment(row, coverageTarget, days).quantity;
    } else {
      return [];
    }

    return [{
      id: row.id, account: String(row.raw?.source_key).slice(3), name: row.title, kind, reason,
      units, coverage: row.stockDays, margin, target, abcClass: row.abcClass, quantity,
      investment: quantity === null || !row.finance ? null : quantity * row.finance.unitCost,
    }];
  }).sort((a, b) => (a.coverage ?? Infinity) - (b.coverage ?? Infinity) || b.units - a.units || a.id.localeCompare(b.id));
}
