"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { dateAtUtc, isoDate, presets, resolvePeriod, shiftDate, validRange, type ReportPeriod } from "@/lib/report-period";
import styles from "./report-period-filter.module.css";

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" });
const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export default function ReportPeriodFilter({ period, today, onApply, allowAll = false, triggerLabel }: {
  period: ReportPeriod;
  today: string;
  onApply: (value: ReportPeriod) => void;
  allowAll?: boolean;
  triggerLabel?: string;
}) {
  const [draft, setDraft] = useState(period);
  const [month, setMonth] = useState((period.start || today).slice(0, 7) + "-01");
  const [selectingEnd, setSelectingEnd] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useId();
  const monthDate = dateAtUtc(month);
  const firstWeekday = monthDate.getUTCDay();
  const nextMonth = new Date(monthDate);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const lastDay = dateAtUtc(shiftDate(isoDate(nextMonth), -1)).getUTCDate();
  const valid = (allowAll && draft.preset === "all") || validRange(draft.start, draft.end, today);

  function selectPreset(preset: ReportPeriod["preset"]) {
    const next = preset === "custom" && draft.start
      ? { ...draft, preset } : resolvePeriod(preset, today);
    setDraft({ ...next, compare: next.preset !== "all" && draft.compare });
    setMonth((next.start || today).slice(0, 7) + "-01");
    setSelectingEnd(false);
  }

  function selectDate(day: string) {
    setDraft({
      ...draft,
      preset: "custom",
      start: selectingEnd && day > draft.start ? draft.start : day,
      end: selectingEnd && day < draft.start ? draft.start : day,
    });
    setSelectingEnd(!selectingEnd);
  }

  function moveMonth(offset: number) {
    const date = dateAtUtc(month);
    date.setUTCMonth(date.getUTCMonth() + offset);
    setMonth(isoDate(date));
  }

  return <>
    <button ref={trigger} type="button" className={triggerLabel ? styles.columnTrigger : styles.trigger} aria-haspopup="dialog"
      aria-label={triggerLabel ? triggerLabel + " — filtrar por período" : undefined}
      onClick={event => {
        setDraft(period);
        setMonth((period.start || today).slice(0, 7) + "-01");
        setSelectingEnd(false);
        const rect = event.currentTarget.getBoundingClientRect();
        dialog.current?.style.setProperty("--date-filter-top", `${Math.min(rect.bottom, 160) + 8}px`);
        dialog.current?.showModal();
      }}>
      <CalendarDays size={16} aria-hidden />
      {triggerLabel ?? (period.preset === "all" ? "Todo o histórico salvo" :
        `${shortDate.format(dateAtUtc(period.start))} – ${shortDate.format(dateAtUtc(period.end))} ${period.end.slice(0, 4)}`)}
      {!triggerLabel && <ChevronDown size={16} aria-hidden />}
    </button>
    <dialog ref={dialog} aria-labelledby={title} className={styles.dialog}
      onClose={() => trigger.current?.focus()}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={styles.panel}>
        <div className={styles.heading}>
          <h2 id={title}>Período</h2><button type="button" aria-label="Fechar filtro" onClick={() => dialog.current?.close()}>×</button>
        </div>
        <div className={styles.body}>
          <div className={styles.presets}>
            {presets.filter(([key]) => allowAll || key !== "all").map(([key, label]) =>
              <button key={key} type="button" aria-pressed={draft.preset === key} onClick={() => selectPreset(key)}>{label}</button>)}
          </div>
          <div className={styles.calendar}>
            <div className={styles.inputs}>
              {(["start", "end"] as const).map(field =>
                <label key={field}>{field === "start" ? "Data inicial" : "Data final"}
                  <input type="date" min="1900-01-01" max={today} value={draft[field]}
                    onChange={event => {
                      const value = event.target.value;
                      setDraft({ ...draft, preset: "custom", [field]: value });
                      setSelectingEnd(false);
                      if (validRange(value, value, today)) setMonth(value.slice(0, 7) + "-01");
                    }}/>
                </label>)}
            </div>
            <div className={styles.month}>
              <button type="button" aria-label="Mês anterior" disabled={month <= "1900-01-01"} onClick={() => moveMonth(-1)}><ChevronLeft size={18}/></button>
              <strong aria-live="polite">{monthTitle.format(monthDate)}</strong>
              <button type="button" aria-label="Próximo mês" disabled={month.slice(0, 7) >= today.slice(0, 7)} onClick={() => moveMonth(1)}><ChevronRight size={18}/></button>
            </div>
            <div className={styles.days}>
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => <span key={day}>{day}</span>)}
              {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`}/>)}
              {Array.from({ length: lastDay }, (_, index) => {
                const day = shiftDate(month, index);
                const endpoint = day === draft.start || day === draft.end;
                return <button type="button" key={day} aria-label={fullDate.format(dateAtUtc(day))}
                  aria-pressed={endpoint} disabled={day > today}
                  data-in-range={day >= draft.start && day <= draft.end} onClick={() => selectDate(day)}>{index + 1}</button>;
              })}
            </div>
            {!valid && <p role="status">Selecione um período de até 365 dias, com data final até hoje.</p>}
          </div>
        </div>
        <div className={styles.footer}>
          <label><input type="checkbox" checked={draft.compare} disabled={draft.preset === "all"}
            onChange={event => setDraft({ ...draft, compare: event.target.checked })}/> Comparar com período anterior</label>
          <button type="button" onClick={() => { setDraft(resolvePeriod("30", today)); setMonth(today.slice(0, 7) + "-01"); setSelectingEnd(false); }}>Limpar</button>
          <button type="button" className={styles.apply} disabled={!valid}
            onClick={() => { onApply(draft); dialog.current?.close(); }}>Aplicar filtros</button>
        </div>
      </div>
    </dialog>
  </>;
}
