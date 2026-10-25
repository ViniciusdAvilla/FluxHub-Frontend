"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";

type Point = { date: string; visits: number };
export default function ProductVisitsChart({ points }: { points: Point[] }) {
  const [focused, setFocused] = useState<number | null>(null);
  if (!points.length) return <div className="fh-empty" role="status">
    <BarChart3 size={27}/> Sem histórico disponível neste período.
  </div>;
  const entries = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const width = 900;
  const height = 230;
  const max = Math.max(1, ...entries.map(p => p.visits));
  const x = (index: number) => entries.length === 1 ? width / 2 :
    index / (entries.length - 1) * width;
  const y = (visits: number) => height - visits / max * (height - 16);
  const line = entries.map((p, i) =>
    (i ? "L" : "M") + x(i).toFixed(2) + " " + y(p.visits).toFixed(2)).join(" ");
  const selected = entries[focused ?? entries.length - 1];
  return <div>
    <div className="fh-chart-wrap" style={{ position: "relative" }}>
      <svg viewBox="0 0 960 300" width="100%" role="img"
        aria-label="Gráfico de visitas diárias por anúncio">
        <defs><linearGradient id="productVisitsGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#367dff" stopOpacity=".2"/>
          <stop offset="1" stopColor="#367dff" stopOpacity=".01"/>
        </linearGradient></defs>
        <g transform="translate(40,16)">
          {[0, .25, .5, .75, 1].map(step =>
            <g key={step}>
              <line y1={height * (1-step)} y2={height * (1-step)}
                x1={0} x2={width} stroke="#e9eff8" strokeDasharray="5 5"/>
              <text x={-8} y={height * (1-step)+4} textAnchor="end"
                fill="#8b99ad" fontSize="12">{Math.round(max*step).toLocaleString("pt-BR")}</text>
            </g>)}
          <path d={line + " L " + x(entries.length-1) + " " + height +
            " L " + x(0) + " " + height + " Z"} fill="url(#productVisitsGradient)"/>
          <path d={line} stroke="#367dff" strokeWidth={3.5} fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
          {focused !== null && <circle cx={x(focused)} cy={y(entries[focused].visits)}
            r={6} fill="white" stroke="#367dff" strokeWidth={3}/>}
          {entries.map((p,i) => <rect key={p.date} x={Math.max(0,x(i)-width/entries.length/2)}
            y={0} width={Math.max(8,width/entries.length)} height={height}
            fill="transparent" onMouseEnter={() => setFocused(i)}
            onMouseLeave={() => setFocused(null)} onFocus={() => setFocused(i)}
            onBlur={() => setFocused(null)} tabIndex={0}
            aria-label={p.date + ": " + p.visits + " visitas"}/>)}
          {entries.filter((_,i) => i % Math.max(1,Math.ceil(entries.length / 7)) === 0)
            .map(p => <text key={p.date} x={x(entries.indexOf(p))} y={height+27}
              textAnchor="middle" fontSize={12} fill="#8997a9">
              {p.date.slice(5).split("-").reverse().join("/")}</text>)}
        </g>
      </svg>
      <div aria-live="polite" style={{ fontSize: 13, color: "#557093", padding: 8 }}>
        {selected.date.split("-").reverse().join("/")} · <strong>{selected.visits.toLocaleString("pt-BR")} visitas</strong>
      </div>
    </div>
    <details style={{ marginTop: 8 }}>
      <summary style={{ cursor: "pointer", fontSize: 13 }}>Ver dados diários em tabela</summary>
      <div className="fh-table-wrap" style={{ maxHeight: 280, overflowY: "auto" }}>
        <table className="fh-table"><thead><tr><th>Data</th><th>Visitas</th></tr></thead>
          <tbody>{entries.map(row => <tr key={row.date}><td>{row.date}</td>
            <td>{row.visits.toLocaleString("pt-BR")}</td></tr>)}</tbody></table>
      </div>
    </details>
  </div>;
}
