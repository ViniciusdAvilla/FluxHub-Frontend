import { money, number, percent } from "@/lib/analytics";
import { dateAtUtc, type ReportPeriod } from "@/lib/report-period";
import styles from "./report-period-filter.module.css";

const dateLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", dateStyle: "short" });

export default function PeriodComparison({ period, metrics }: {
  period: ReportPeriod;
  metrics: { label: string; current: number | null; previous: number | null; format: "money" | "number" }[];
}) {
  return <section className="fh-card" style={{ marginBlock: 16 }} aria-label="Comparação de períodos">
    <div className="fh-card-head">
      <div><h2>Comparação com o período anterior</h2>
        <p>{dateLabel.format(dateAtUtc(period.start))} a {dateLabel.format(dateAtUtc(period.end))}</p></div>
    </div>
    <dl className={styles.comparison}>
      {metrics.map(({ label, current, previous, format }) => {
        const display = format === "money" ? money : number;
        const delta = current !== null && previous !== null && previous > 0 ? (current - previous) * 100 / previous : null;
        return <div key={label}>
          <dt>{label}</dt>
          <dd><strong>{display(current)}</strong> <span>vs. {display(previous)}</span>
            {delta !== null && <span> ({delta > 0 ? "+" : ""}{percent(delta)})</span>}</dd>
        </div>;
      })}
    </dl>
  </section>;
}
