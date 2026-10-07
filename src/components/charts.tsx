import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Package,
  Factory,
} from "lucide-react";
import { marginTone, money, number, percent, summarize } from "@/lib/analytics";
type Summary = ReturnType<typeof summarize>;

export function EmptyChart({
  kind,
  children,
}: {
  kind: "revenue" | "manufacturer" | "category";
  children: React.ReactNode;
}) {
  const Icon =
    kind === "manufacturer"
      ? Factory
      : kind === "category"
        ? Package
        : ChartNoAxesCombined;
  return (
    <div className="empty-chart">
      <div className="empty-icon">
        <Icon size={25} strokeWidth={1.4} />
      </div>
      {children}
    </div>
  );
}

export function RevenueChart({
  categories,
  onSelect,
}: {
  categories: Summary["categories"];
  onSelect: (name: string) => void;
}) {
  const values = categories.filter((c) => c.revenueCount > 0).slice(0, 6);
  const max = Math.max(...values.map((c) => c.revenue), 1);
  if (!values.length)
    return (
      <EmptyChart kind="revenue">
        <p>Nenhuma receita neste recorte.</p>
      </EmptyChart>
    );
  return (
    <div className="revenue-chart">
      <div className="chart-grid" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((n) => (
          <div key={n}>
            <span>
              {new Intl.NumberFormat("pt-BR", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(max * n)}
            </span>
            <i />
          </div>
        ))}
      </div>
      <div className="columns">
        {values.map((category, i) => (
          <button
            className="chart-column"
            key={category.name}
            onClick={() => onSelect(category.name)}
            aria-label={`${category.name}: ${money(category.revenue)}. Filtrar categoria.`}
            title={`${category.name}: ${money(category.revenue)}`}
          >
            <span className="column-space">
              <span className="column-value">{money(category.revenue)}</span>
              <span
                className={`column-fill ${i === 0 ? "leading" : ""}`}
                style={{
                  height: `${(category.revenue / max) * 100}%`,
                  minHeight: category.revenue > 0 ? 3 : 0,
                }}
              />
            </span>
            <span className="column-label">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ManufacturerChart({
  manufacturers,
  onSelect,
}: {
  manufacturers: Summary["manufacturers"];
  onSelect: (name: string) => void;
}) {
  const top = manufacturers.slice(0, 5);
  if (!top.length)
    return (
      <EmptyChart kind="manufacturer">
        <p>Cadastre custos para comparar a performance financeira por fabricante.</p>
      </EmptyChart>
    );
  const max = Math.max(...top.map((s) => Math.abs(s.profit)), 1);
  const hasLoss = top.some((s) => s.profit < 0);
  return (
    <div className="supplier-ranking">
      {top.map((s, i) => {
        const tone = s.profit < 0 ? "bad" : marginTone(s.margin);
        return (
          <button
            className="supplier-row"
            key={s.name}
            onClick={() => onSelect(s.name)}
            title={`${s.name}: ${money(s.profit)}; margem ${percent(s.margin)}`}
          >
            <div className="supplier-label">
              <span>
                <span className="rank-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.name}
              </span>
              <strong className={`text-${tone}`}>{money(s.profit)}</strong>
            </div>
            <div className={`supplier-track ${hasLoss ? "signed" : ""}`}>
              <span
                className={`supplier-fill bg-${tone}`}
                style={{
                  width: `${(Math.abs(s.profit) / max) * (hasLoss ? 50 : 100)}%`,
                  left: hasLoss
                    ? s.profit < 0
                      ? `${50 - (Math.abs(s.profit) / max) * 50}%`
                      : "50%"
                    : 0,
                }}
              />
            </div>
            <div className="supplier-meta">
              <span>
                {number(s.count)} produto{s.count === 1 ? "" : "s"}
              </span>
              <span>
                Margem {percent(s.margin)} <ArrowUpRight size={12} />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const shades = [
  "#272d37",
  "#616a77",
  "#8c95a2",
  "#b7bdc7",
  "#d4d8df",
  "#eceef1",
];
export function CategoryChart({
  categories,
  onSelect,
}: {
  categories: Summary["categories"];
  onSelect: (name: string) => void;
}) {
  const sorted = [...categories].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((sum, c) => sum + c.count, 0);
  if (!total)
    return (
      <EmptyChart kind="category">
        <p>Nenhum produto neste recorte.</p>
      </EmptyChart>
    );
  const segments = sorted
    .slice(0, sorted.length > 6 ? 5 : 6)
    .map((c) => ({ name: c.name, count: c.count }));
  if (sorted.length > 6)
    segments.push({
      name: "Outras categorias",
      count: sorted.slice(5).reduce((sum, c) => sum + c.count, 0),
    });
  let offset = 0;
  const gradient = segments
    .map((c, i) => {
      const start = offset;
      offset += (c.count / total) * 100;
      return `${shades[i]} ${start}% ${offset}%`;
    })
    .join(",");
  return (
    <div className="category-content">
      <div
        className="donut"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label={`Distribuição de ${number(total)} produtos por categoria`}
      >
        <div className="donut-center">
          <strong>{number(total)}</strong>
          <span>produtos</span>
        </div>
      </div>
      <div className="category-list">
        {segments.map((category, i) => (
          <button
            key={category.name}
            disabled={i === 5 && sorted.length > 6}
            onClick={() => onSelect(category.name)}
          >
            <span className="category-name">
              <i style={{ background: shades[i] }} />
              {category.name}
            </span>
            <strong>{number(category.count)}</strong>
            <span>{percent((category.count / total) * 100)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
