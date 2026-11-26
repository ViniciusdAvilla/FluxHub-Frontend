"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Database, Package, Tag } from "lucide-react";
import { money, number, percent } from "@/lib/analytics";
import type { Decision, DecisionKind } from "@/lib/decision-queue";
import styles from "./decision-queue.module.css";

const categories = {
  restock: { label: "Repor estoque", tab: "Reposição", icon: Package },
  margin: { label: "Revisar margem", tab: "Margem", icon: Tag },
  data: { label: "Conferir dados", tab: "Dados", icon: Database },
};
const kinds = Object.keys(categories) as DecisionKind[];
const itemKey = (item: Decision) => `${item.account}:${item.id}`;
const coverage = (value: number | null) => value === null ? "—" : number(Math.round(value * 10) / 10);
const pageSize = 20;

function ProductPhoto({ src }: { src?: string }) {
  return <span className={styles.photo}>{src
    ? <img src={src} alt="" width={92} height={76} loading="lazy"/>
    : <Package size={30} aria-hidden />}</span>;
}

export default function DecisionQueue({ items, photos, periodQuery, available, complete }: {
  items: Decision[];
  photos: Record<string, string>;
  periodQuery: string;
  available: boolean;
  complete: boolean;
}) {
  const detail = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState<DecisionKind | "all">("all");
  const [selected, setSelected] = useState("");
  const [page, setPage] = useState(0);
  const filtered = filter === "all" ? items : items.filter(item => item.kind === filter);
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const current = visible.find(item => itemKey(item) === selected) ?? visible[0];

  function chooseFilter(kind: DecisionKind | "all") {
    setFilter(kind);
    setPage(0);
    setSelected("");
  }

  const product = current ? new URLSearchParams({ produto: current.id }) : null;
  const purchases = new URLSearchParams(periodQuery);
  if (current) purchases.set("produto", current.id);
  if (current?.target && product) product.set("meta", String(current.target));

  return <div className={styles.queue}>
    {available && !complete && <div className="fh-notice" role="status">
      O histórico está em apuração. Confira a sincronização antes de decidir compras. <Link href="/integracoes">Ver integrações</Link>
    </div>}
    <div className={styles.cards}>
      {kinds.map(kind => {
        const { label, icon: Icon } = categories[kind];
        return <button type="button" className={styles.card} key={kind} aria-pressed={filter === kind}
          onClick={() => chooseFilter(kind)}>
          <span className={styles.cardIcon}><Icon size={26} aria-hidden /></span>
          <span>{label}<strong>{available ? number(items.filter(item => item.kind === kind).length) : "—"}</strong></span>
        </button>;
      })}
    </div>
    <div className={styles.filters} role="group" aria-label="Filtrar decisões">
      {(["all", ...kinds] as const).map(kind =>
        <button type="button" key={kind} aria-pressed={filter === kind} onClick={() => chooseFilter(kind)}>
          {kind === "all" ? "Todas" : categories[kind].tab}
        </button>)}
    </div>
    {!current ? <div className={styles.panel} role="status">{available
      ? complete ? "Nenhuma decisão identificada para este filtro e período."
        : "Sem produtos suficientes para sugerir ações neste período."
      : "Vendas do período indisponíveis. Confira a sincronização em Integrações."}</div>
      : <div className={styles.grid}>
        <section className={styles.panel} aria-label="Produtos com ações sugeridas">
          <ul className={styles.list}>
            {visible.map(item => <li key={itemKey(item)}>
              <button type="button" className={styles.row} aria-pressed={current === item}
                onClick={() => {
                  setSelected(itemKey(item));
                  if (window.matchMedia("(max-width: 1000px)").matches) detail.current?.scrollIntoView({ block: "start" });
                }}>
                <ProductPhoto src={photos[itemKey(item)]}/>
                <span className={styles.rowContent}>
                  <strong>{item.name}</strong>
                  <span className={styles.badge}>{categories[item.kind].label}</span>
                  <small>{item.kind === "data" ? item.reason : `${number(item.units)} un. vendidas · ${coverage(item.coverage)} dias de cobertura`}</small>
                </span>
                <ChevronRight size={19} aria-hidden />
              </button>
            </li>)}
          </ul>
          {filtered.length > pageSize && <div className={styles.pagination}>
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
            <span>Página {page + 1} de {Math.ceil(filtered.length / pageSize)}</span>
            <button type="button" disabled={(page + 1) * pageSize >= filtered.length}
              onClick={() => setPage(page + 1)}>Próxima</button>
          </div>}
        </section>
        <section ref={detail} className={styles.panel} aria-label="Detalhes da decisão" aria-live="polite">
          <div className={styles.product}><ProductPhoto src={photos[itemKey(current)]}/>
            <div><h2>{current.name}</h2><small>{current.id}</small></div>
          </div>
          <h3>{current.reason}</h3>
          <dl className={styles.metrics}>
            <div><dt>Un. vendidas</dt><dd>{number(current.units)}</dd></div>
            <div><dt>Dias de cobertura</dt><dd>{coverage(current.coverage)}</dd></div>
            <div><dt>Margem estimada</dt><dd>{percent(current.margin)}</dd></div>
          </dl>
          {complete && current.target !== null && <p><strong>Meta da classe {current.abcClass} de {percent(current.target)}</strong></p>}
          {current.quantity !== null && <p><strong>{number(current.quantity)} unidades sugeridas</strong> · {money(current.investment)} de investimento estimado</p>}
          <p className={styles.source}>Pedidos pagos · Estoque sincronizado · Custos cadastrados</p>
          <div className={styles.actions}>
            {current.kind === "data" && !complete
              ? <Link className={styles.primary} href="/integracoes">Conferir sincronização</Link>
              : <Link className={styles.primary} href={current.kind === "restock" ? `/reposicao?${purchases}` : `/precificacao?${product}`}>
                {current.kind === "restock" ? "Ver plano de compras" : "Abrir precificação"}
              </Link>}
            {complete && current.kind !== "restock" &&
              <Link className={styles.secondary} href={`/reposicao?${purchases}`}>Ver plano de compras</Link>}
          </div>
        </section>
      </div>}
  </div>;
}
