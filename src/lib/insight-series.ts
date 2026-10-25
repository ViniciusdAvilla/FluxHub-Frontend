import type { AbcRow, ProductRow } from "./types";

export type InsightMeasure = "count" | "stock" | "sales" | "revenue" | "profit";
export type InsightGroup = "brand" | "category";
export type InsightPoint = { label: string; value: number };

/** Aggregate real snapshot values only. Null/undefined never count as zero. */
export function groupedInsights(
  rows: ProductRow[],
  group: InsightGroup,
  measure: InsightMeasure,
  limit = 7,
): InsightPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = (group === "brand" ? row.brand : row.category)?.trim();
    if (!label) continue;
    const raw = measure === "count" ? 1 :
      measure === "stock" ? row.stock :
      measure === "sales" ? row.sales :
      measure === "revenue" ? row.revenue : row.profit;
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    totals.set(label, (totals.get(label) ?? 0) + raw);
  }
  return [...totals].map(([label,value]) => ({ label, value }))
    .sort((a,b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}

export function topReplenishment(
  rows: ProductRow[],
  coverageDays: number,
): InsightPoint[] {
  if (!Number.isFinite(coverageDays) || coverageDays <= 0) return [];
  return rows.flatMap(row => {
    if (typeof row.stock !== "number" || row.stock < 0 ||
        typeof row.sales !== "number" || row.sales <= 0) return [];
    const quantity = Math.max(0, Math.ceil(row.sales / 30 * coverageDays - row.stock));
    return quantity > 0 ? [{ label: row.title, value: quantity }] : [];
  }).sort((a,b) => b.value - a.value).slice(0, 7);
}

export function pricingGaps(
  rows: ProductRow[],
  margin: number,
  priceForMargin: (row: ProductRow, margin: number) => number | null,
): InsightPoint[] {
  return rows.flatMap(row => {
    const target = priceForMargin(row, margin);
    if (row.price === null || target === null || !Number.isFinite(target) || target <= row.price)
      return [];
    return [{ label: row.title, value: target - row.price }];
  }).sort((a,b) => b.value - a.value).slice(0, 7);
}

export function abcRevenue(rows: AbcRow[]): InsightPoint[] {
  return (["A","B","C"] as const).map(label => ({
    label: "Classe " + label,
    value: rows.filter(row => row.abcClass === label && row.revenue !== null)
      .reduce((sum,row) => sum + (row.revenue ?? 0), 0),
  })).filter(item => item.value > 0);
}

export function stockDistribution(rows: ProductRow[]): { name:string; value:number; color:string }[] {
  return [
    {name:"Sem estoque / crítico",value:rows.filter(x=>x.stockTone==="bad").length,color:"#e05c83"},
    {name:"Atenção",value:rows.filter(x=>x.stockTone==="warning").length,color:"#f0ad45"},
    {name:"Estoque saudável",value:rows.filter(x=>x.stockTone==="good").length,color:"#3189f6"},
    {name:"Sem classificação",value:rows.filter(x=>x.stockTone==="neutral").length,color:"#9caeca"},
  ];
}

export function costCoverage(rows: ProductRow[]): { name:string; value:number; color:string }[] {
  return [
    {name:"Custo cadastrado",value:rows.filter(r=>r.finance!==null).length,color:"#287efa"},
    {name:"Sem custo",value:rows.filter(r=>r.finance===null).length,color:"#bdd1f2"},
  ];
}
