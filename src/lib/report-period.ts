export const presets = [
  ["today", "Hoje"], ["yesterday", "Ontem"],
  ["7", "Últimos 7 dias"], ["30", "Últimos 30 dias"],
  ["month", "Este mês"], ["last-month", "Mês passado"],
  ["90", "Últimos 90 dias"], ["365", "Últimos 365 dias"],
  ["all", "Todo o histórico salvo"], ["custom", "Personalizado"],
] as const;

type Preset = typeof presets[number][0];
export type ReportPeriod = { preset: Preset; start: string; end: string; compare: boolean };

const dayMs = 86_400_000;
export const reportToday = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

export const dateAtUtc = (value: string) => new Date(value + "T00:00:00Z");
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
export const shiftDate = (value: string, days: number) => isoDate(new Date(dateAtUtc(value).getTime() + days * dayMs));

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = dateAtUtc(value);
  return Number.isFinite(date.getTime()) && isoDate(date) === value;
}

export function validRange(start: unknown, end: unknown, today: string) {
  return isDate(start) && isDate(end) && start >= "1900-01-01" && end <= today &&
    start <= end && dateAtUtc(end).getTime() - dateAtUtc(start).getTime() < 365 * dayMs;
}

export function resolvePeriod(preset: Preset, today: string): ReportPeriod {
  const month = today.slice(0, 7) + "-01";
  const lastMonthEnd = shiftDate(month, -1);
  let start = today;
  let end = today;
  switch (preset) {
    case "yesterday": start = end = shiftDate(today, -1); break;
    case "month": start = month; break;
    case "last-month": start = lastMonthEnd.slice(0, 7) + "-01"; end = lastMonthEnd; break;
    case "7": case "30": case "90": case "365": start = shiftDate(today, 1 - Number(preset)); break;
    case "all": start = end = ""; break;
  }
  return { preset, start, end, compare: false };
}

export type PeriodSearch = { period?: string; days?: string; start_date?: string; end_date?: string; compare?: string; account?: string };

export function readPeriod(query: PeriodSearch, today: string, extended = false): ReportPeriod {
  const requested = presets.find(([key]) => key === (query.period ?? query.days))?.[0];
  if (!requested || (!extended && requested === "all")) return resolvePeriod("30", today);
  if (requested === "custom") {
    const { start_date, end_date } = query;
    if (!start_date || !end_date || !validRange(start_date, end_date, today)) return resolvePeriod("30", today);
    return { preset: requested, start: start_date, end: end_date, compare: query.compare === "1" };
  }
  return { ...resolvePeriod(requested, today), compare: requested !== "all" && query.compare === "1" };
}

export function backendPeriod(period: ReportPeriod) {
  return new URLSearchParams(period.preset === "all"
    ? { all_history: "true" } : { start_date: period.start, end_date: period.end });
}

export function previousPeriod(period: ReportPeriod) {
  const length = (dateAtUtc(period.end).getTime() - dateAtUtc(period.start).getTime()) / dayMs + 1;
  return { ...period, start: shiftDate(period.start, -length), end: shiftDate(period.start, -1) };
}
