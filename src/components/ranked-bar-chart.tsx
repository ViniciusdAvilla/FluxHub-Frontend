import type { InsightPoint } from "@/lib/insight-series";

export default function RankedBarChart({
  values, unit = "count", empty = "Ainda não há dados suficientes para este gráfico.",
}: {
  values: InsightPoint[];
  unit?: "count" | "money";
  empty?: string;
}) {
  const available = values.filter(x => Number.isFinite(x.value));
  if (!available.length) return <div className="fh-empty" role="status">{empty}</div>;
  const max = Math.max(1, ...available.map(x => Math.abs(x.value)));
  const format = (value: number) => unit === "money"
    ? new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(value)
    : new Intl.NumberFormat("pt-BR", {maximumFractionDigits:1}).format(value);
  return <div className="fh-ranked-bars" role="img"
    aria-label={available.map(x=>x.label + ": " + format(x.value)).join("; ")}>
    {available.map(item=><div key={item.label} className="fh-ranked-row">
      <div className="fh-ranked-label"><span title={item.label}>{item.label}</span><strong>{format(item.value)}</strong></div>
      <div className="fh-ranked-track">
        <span className={item.value < 0 ? "fh-ranked-negative" : "fh-ranked-positive"}
          style={{ width: Math.max(item.value !== 0 ? 2 : 0, Math.abs(item.value) / max * 100) + "%" }}/>
      </div>
    </div>)}
  </div>;
}
