"use client";

import { useState, type ReactNode } from "react";
import SortHeading from "./sort-heading";

type Value = string | number | null;
const labels = ["Produto", "Preço", "Custo de compra", "Unid. vendidas no período", "Ads no período", "Estoque", "Fabricante"];
const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

export default function OverviewRankedProducts({ rows }: {
  rows: { values: Value[]; content: ReactNode; id: string }[];
}) {
  const [sort, setSort] = useState<{ column: number; direction: "asc" | "desc" } | null>(null);
  const ordered = sort ? [...rows].sort((a, b) => {
    const left = a.values[sort.column], right = b.values[sort.column];
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    const difference = typeof left === "number" && typeof right === "number"
      ? left - right : collator.compare(String(left), String(right));
    return sort.direction === "asc" ? difference : -difference;
  }) : rows;

  return <div className="fh-table-wrap"><table className="fh-table">
    <thead><tr>{labels.map((label, column) => {
      const direction = sort?.column === column ? sort.direction : undefined;
      return <th key={label} aria-sort={direction === "asc" ? "ascending" : direction ? "descending" : undefined}>
        <SortHeading label={label} direction={direction} onClick={() =>
          setSort({ column, direction: direction === "desc" ? "asc" : "desc" })}/>
      </th>;
    })}</tr></thead>
    <tbody>{ordered.map(row => <tr key={row.id}>{row.content}</tr>)}
      {!ordered.length && <tr><td colSpan={labels.length}>Nenhum produto disponível no catálogo.</td></tr>}
    </tbody>
  </table></div>;
}
