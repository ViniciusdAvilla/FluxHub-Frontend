import { money } from "@/lib/analytics";
import type { ProductRow } from "@/lib/types";

export default function FinanceCategoryChart({ rows }: { rows: ProductRow[] }) {
  const grouped = new Map<string, { revenue: number; profit: number; revenueItems: number; profitItems: number }>();
  for (const row of rows) {
    const group = grouped.get(row.category) ?? { revenue: 0, profit: 0, revenueItems: 0, profitItems: 0 };
    if (row.revenue !== null) { group.revenue += row.revenue; group.revenueItems++; }
    if (row.profit !== null) { group.profit += row.profit; group.profitItems++; }
    grouped.set(row.category, group);
  }
  const categories = [...grouped].filter(([, value]) => value.revenueItems > 0)
    .sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6);
  const max = Math.max(1, ...categories.flatMap(([, group]) => [group.revenue, Math.abs(group.profit)]));
  if (!categories.length) return (
    <div className="finance-chart-empty">Ainda não há informações de receita para criar o gráfico. Os valores aparecem assim que produtos com preços e vendas estiverem disponíveis.</div>
  );
  return (
    <div className="finance-chart" role="img" aria-label="Comparativo de receita e lucro estimados por categoria; valores sem custo não são estimados como lucro">
      <div className="finance-chart-legend"><span><i className="legend-revenue" />Receita estimada</span><span><i className="legend-profit" />Lucro estimado</span><span><i className="legend-loss" />Prejuízo</span></div>
      <div className="finance-chart-list">
        {categories.map(([category, data]) => (
          <div key={category} className="finance-chart-row">
            <div className="finance-chart-label" title={category}>{category}</div>
            <div className="finance-chart-tracks">
              <div className="finance-bar-line"><span className="finance-bar revenue" style={{ width: `${(data.revenue / max) * 100}%` }} /><strong>{money(data.revenue)}</strong></div>
              <div className="finance-bar-line"><span className={`finance-bar ${data.profit < 0 ? "loss" : "profit"}`} style={{ width: `${(Math.abs(data.profit) / max) * 100}%` }} /><strong>{data.profitItems ? money(data.profit) : "Sem custos"}</strong></div>
            </div>
          </div>
        ))}
      </div>
      <p className="finance-chart-note">Agrupado por categoria. Valores estimados com preços, vendas e custos disponíveis; não representa uma série histórica.</p>
    </div>
  );
}
