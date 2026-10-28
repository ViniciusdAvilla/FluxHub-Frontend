"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  BadgeDollarSign,
  Boxes,
  Calculator,
  ChartNoAxesCombined,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Coins,
  Database,
  Download,
  Gauge,
  Layers3,
  Menu,
  Package,
  Pencil,
  RefreshCw,
  ScanSearch,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Factory,
  X,
} from "lucide-react";
import {
  classifyAbc,
  displayValue,
  enrichProducts,
  genericRows,
  idealPrice,
  marginTone,
  money,
  number,
  percent,
  projectedAtPrice,
  replenishment,
  summarize,
} from "@/lib/analytics";
import type {
  EndpointDefinition,
  Finance,
  ProductRow,
  Snapshot,
  Tone,
} from "@/lib/types";
import { CategoryChart, ManufacturerChart, RevenueChart } from "./charts";
import ModernShell from "./modern-shell";
import RankedBarChart from "./ranked-bar-chart";
import { DonutStats } from "./modern-charts";
import {
  abcRevenue, costCoverage, groupedInsights, pricingGaps,
  stockDistribution, topReplenishment,
} from "@/lib/insight-series";
import FinanceCategoryChart from "./finance-category-chart";
import SmartProductFilters from "./smart-product-filters";
import { abcStrategy, highVolumeThreshold } from "@/lib/abc-strategy";
import { defaultAdvancedProductFilters, filterCatalogProducts, sortCatalogProducts, purchaseUrgency } from "@/lib/product-filters";
import type { ProductSortKey, ProductSortDirection } from "@/lib/product-filters";
const RaioXPanel = dynamic(() => import("./raio-x-panel"));

const FinanceDialog = dynamic(() => import("./finance-dialog"), { ssr: false });
const PricingCalculator = dynamic(() => import("./pricing-calculator"), { ssr: false });

export type View =
  | "overview"
  | "products"
  | "raiox"
  | "inventory"
  | "finance"
  | "manufacturers"
  | "pricing"
  | "replenishment"
  | "abc"
  | "orders"
  | "data";

const titles: Record<View, { eyebrow: string; title: string; text: string }> = {
  overview: {
    eyebrow: "PAINEL DE CONTROLE",
    title: "Dashboard",
    text: "Acesse os resultados e os indicadores da sua operação em um só lugar.",
  },
  products: {
    eyebrow: "CATÁLOGO",
    title: "Produtos",
    text: "Ficha operacional, desempenho e dados disponíveis por item.",
  },
  raiox: {
    eyebrow: "INTELIGÊNCIA DE MERCADO",
    title: "Raio-X de anúncios",
    text: "Compare seus produtos com anúncios similares e encontre oportunidades de preço e qualidade.",
  },
  inventory: {
    eyebrow: "ESTOQUE",
    title: "Saúde do estoque",
    text: "Saldo, giro, cobertura e itens que precisam de ação.",
  },
  finance: {
    eyebrow: "FINANCEIRO",
    title: "Rentabilidade",
    text: "Custos, receita estimada, lucro e margem por produto.",
  },
  manufacturers: {
    eyebrow: "FABRICANTES",
    title: "Performance por fabricante",
    text: "Compare resultado, volume e rentabilidade dos produtos por fabricante.",
  },
  pricing: {
    eyebrow: "PRECIFICAÇÃO",
    title: "Preço ideal",
    text: "Simule preço e margem sem perder de vista os custos reais cadastrados.",
  },
  replenishment: {
    eyebrow: "COMPRAS",
    title: "Planejador de reposição",
    text: "Transforme venda e saldo em uma sugestão objetiva de compra.",
  },
  abc: {
    eyebrow: "PORTFÓLIO",
    title: "Curva ABC",
    text: "Priorize os produtos que concentram a maior parcela da receita estimada.",
  },
  orders: {
    eyebrow: "PEDIDOS",
    title: "Vendas e pedidos",
    text: "Acompanhe as consultas de vendas e pedidos disponíveis na integração atual.",
  },
  data: {
    eyebrow: "CONTRATO OPENAPI",
    title: "Central de dados",
    text: "Encontre e consulte as leituras expostas pela versão atual do backend.",
  },
};

function Status({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`status ${tone}`}>
      <i />
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  note,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  tone?: Tone;
  icon: typeof Coins;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon"><Icon size={19} /></span>
      </div>
      <strong className={`metric-value text-${tone}`}>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function SortableColumn({
  label, field, selected, direction, onSelect,
}: {
  label: string; field: ProductSortKey; selected: ProductSortKey;
  direction: ProductSortDirection; onSelect: (field: ProductSortKey) => void;
}) {
  return <th aria-sort={selected === field ? (direction === "asc" ? "ascending" : "descending") : "none"}>
    <button type="button" className={"fh-smart-column " + (selected === field ? "is-active" : "")}
      onClick={() => onSelect(field)}
      aria-label={"Ordenar " + label + (selected === field ? (direction === "asc" ? " decrescente" : " crescente") : "")}>
      {label}<span aria-hidden="true">{selected === field ? (direction === "asc" ? " ↑" : " ↓") : " ↕"}</span>
    </button>
  </th>;
}

function ProductTable({
  rows,
  onEdit,
  onInspect,
  onPrice,
  sortKey = "title",
  sortDirection = "asc",
  onSort,
}: {
  rows: ProductRow[];
  onEdit: (id: string) => void;
  onInspect?: (row: ProductRow) => void;
  onPrice?: (row: ProductRow) => void;
  sortKey?: ProductSortKey;
  sortDirection?: ProductSortDirection;
  onSort?: (field: ProductSortKey) => void;
}) {
  const [page, setPage] = useState(0);
  const sortedRows = useMemo(() => onSort ? rows : sortCatalogProducts(rows, sortKey, sortDirection), [rows, sortKey, sortDirection, onSort]);
  useEffect(() => setPage(0), [rows, sortKey, sortDirection]);
  const pageSize = 100;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visiblePage = Math.min(page, totalPages - 1);
  const visibleRows = sortedRows.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  useEffect(() => {
    const mlRows = visibleRows.filter(row =>
      typeof row.raw?.source_key === "string" &&
      /^ml:\d+$/.test(row.raw.source_key) && /^[A-Z0-9]{3,100}$/i.test(row.id));
    const ids = [...new Set(mlRows.map(row => row.id))];
    if (!ids.length) return;
    const controller = new AbortController();
    const q = new URLSearchParams({ ids: ids.join(",") });
    fetch("/api/platform/product-photos?" + q, { cache: "no-store", signal: controller.signal })
      .then(async response => response.ok ? await response.json() : [])
      .then((data: unknown) => {
        if (controller.signal.aborted || !Array.isArray(data)) return;
        const map: Record<string, string> = {};
        for (const row of data as { account_id: number; item_id: string; thumbnail: string | null }[]) {
          if (row.thumbnail?.startsWith("https://"))
            map[String(row.account_id) + ":" + row.item_id] = row.thumbnail;
        }
        setPhotos(map);
      }).catch(() => {});
    return () => controller.abort();
  }, [visiblePage, sortedRows]);
  return (
    <div>
      <div className="table-wrap fh-smart-product-table">
      <table>
        <thead>
          <tr>
            <SortableColumn label="Produto" field="title" selected={sortKey} direction={sortDirection} onSelect={onSort ?? (() => {})}/>
            <SortableColumn label="Preço" field="price" selected={sortKey} direction={sortDirection} onSelect={onSort ?? (() => {})}/>
            <SortableColumn label="Vendidos" field="sales" selected={sortKey} direction={sortDirection} onSelect={onSort ?? (() => {})}/>
            <SortableColumn label="Estoque" field="stock" selected={sortKey} direction={sortDirection} onSelect={onSort ?? (() => {})}/>
            <SortableColumn label="Receita estimada" field="revenue" selected={sortKey} direction={sortDirection} onSelect={onSort ?? (() => {})}/>
            <SortableColumn label="Lucro" field="profit" selected={sortKey} direction={sortDirection} onSelect={onSort ?? (() => {})}/>
            <SortableColumn label="Margem" field="margin" selected={sortKey} direction={sortDirection} onSelect={onSort ?? (() => {})}/>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.id}>
              <td>
                {typeof row.raw?.source_key === "string" && /^ml:\d+$/.test(row.raw.source_key)
                  ? <div>
                      <button className="fh-orders-product-button" type="button"
                        onClick={() => onPrice?.(row)}>
                        {photos[row.raw.source_key.slice(3) + ":" + row.id] ?
                          <img alt="" width={54} height={54}
                            src={photos[row.raw.source_key.slice(3) + ":" + row.id]}/> :
                          <span className="fh-orders-image-fallback">Sem foto</span>}
                        <span className="fh-orders-title"><strong>{row.title}</strong>
                          <small>{row.id} · {row.brand} · {row.category}</small>
                          <small className="fh-orders-calc-link">Abrir calculadora de lucro</small>
                        </span>
                      </button>
                      <Link href={`/produtos/${encodeURIComponent(row.id)}?account=${row.raw.source_key.slice(3)}`}>
                        <small>Ver ficha do anúncio</small>
                      </Link>
                    </div>
                  : <button className="product-cell" onClick={() => onInspect?.(row)}>
                      <strong>{row.title}</strong>
                      <span>{row.id} · {row.brand} · {row.category}</span>
                    </button>}
              </td>
              <td>{money(row.price)}</td>
              <td>{number(row.sales)}</td>
              <td>
                <div className="status-stack">
                  <b>{number(row.stock)}</b>
                  <Status tone={row.stockTone}>{row.stockLabel}</Status>
                </div>
              </td>
              <td>{money(row.revenue)}</td>
              <td className={`text-${marginTone(row.margin)}`}>{money(row.profit)}</td>
              <td className={`text-${marginTone(row.margin)}`}>{percent(row.margin)}</td>
              <td>
                <button className="icon-button" onClick={() => onEdit(row.id)} aria-label={`Editar custos de ${row.title}`}>
                  <Pencil size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="fh-smart-mobile-cards" aria-label="Produtos do catálogo">
        {visibleRows.map(row => {
          const source = typeof row.raw?.source_key === "string" ? row.raw.source_key : "";
          const account = /^ml:\d+$/.test(source) ? source.slice(3) : "";
          const photo = account ? photos[account + ":" + row.id] : null;
          return <article key={row.id} className="fh-smart-mobile-card">
            <button type="button" className="fh-smart-mobile-title"
              onClick={() => account ? onPrice?.(row) : onInspect?.(row)}>
              {photo ? <img src={photo} alt="" width={60} height={60}/> :
                <span className="fh-orders-image-fallback">Sem foto</span>}
              <span><strong>{row.title}</strong><small>{row.id} · {row.brand}</small></span>
            </button>
            <div className="fh-smart-mobile-stats">
              <div><small>Preço</small><strong>{money(row.price)}</strong></div>
              <div><small>Vendidos</small><strong>{number(row.sales)}</strong></div>
              <div><small>Estoque</small><strong>{number(row.stock)}</strong></div>
              <div><small>Receita</small><strong>{money(row.revenue)}</strong></div>
            </div>
            <footer>
              <Status tone={row.stockTone}>{row.stockLabel}</Status>
              <span className={"text-" + marginTone(row.margin)}>Margem: {percent(row.margin)}</span>
              <button type="button" className="fh-smart-edit" onClick={() => onEdit(row.id)}>
                <Pencil size={14}/> Custos
              </button>
            </footer>
          </article>;
        })}
      </div>
      {rows.length > pageSize && <div className="fh-inline-actions" style={{marginTop:12}}>
        <button type="button" className="fh-control" disabled={visiblePage === 0}
          onClick={() => setPage(visiblePage - 1)}>Anterior</button>
        <span>Página {visiblePage + 1} de {totalPages} · {number(rows.length)} produtos</span>
        <button type="button" className="fh-control" disabled={visiblePage + 1 >= totalPages}
          onClick={() => setPage(visiblePage + 1)}>Próximos 100</button>
      </div>}
    </div>
  );
}

function PurchasePlanTable({ rows, coverageDays }: { rows: ProductRow[]; coverageDays: number }) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<ProductSortKey>("stockDays");
  const [sortDirection, setSortDirection] = useState<ProductSortDirection>("asc");
  const sorted = useMemo(() => sortCatalogProducts(rows, sortKey, sortDirection), [rows, sortKey, sortDirection]);
  useEffect(() => setPage(0), [rows, sortKey, sortDirection]);
  const size = 50;
  const totalPages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(page, totalPages - 1);
  const show = sorted.slice(current * size, (current + 1) * size);
  const sort = (key: ProductSortKey) => {
    if (sortKey === key) setSortDirection(previous => previous === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection(key === "title" || key === "brand" ? "asc" : "desc"); }
  };
  return <>
    <div className="table-wrap">
      <table>
        <thead><tr>
          <SortableColumn label="Produto" field="title" selected={sortKey} direction={sortDirection} onSelect={sort}/>
          <SortableColumn label="Fabricante" field="brand" selected={sortKey} direction={sortDirection} onSelect={sort}/>
          <SortableColumn label="Saldo" field="stock" selected={sortKey} direction={sortDirection} onSelect={sort}/>
          <SortableColumn label="Vendas 30d" field="sales" selected={sortKey} direction={sortDirection} onSelect={sort}/>
          <SortableColumn label="Cobertura" field="stockDays" selected={sortKey} direction={sortDirection} onSelect={sort}/>
          <th>Comprar</th><th>Investimento</th><th>Prioridade</th>
        </tr></thead>
        <tbody>{show.map(row => {
          const plan = replenishment(row, coverageDays);
          const investment = plan.quantity !== null && row.finance ? plan.quantity * row.finance.unitCost : null;
          const urgency = purchaseUrgency(row);
          return <tr key={row.id}>
            <td><strong>{row.title}</strong><small className="cell-sub">{row.id}</small></td>
            <td>{row.brand !== "Sem marca" ? row.brand : "—"}</td>
            <td>{number(row.stock)}</td><td>{number(row.sales)}</td>
            <td>{row.stockDays === null ? "Sem dados" : Math.round(row.stockDays) + " dias"}</td>
            <td>{plan.quantity === null ? "—" : <strong>{number(plan.quantity)}</strong>}</td>
            <td>{money(investment)}</td>
            <td><span className={"fh-smart-priority " + (urgency || "unknown")}>
              {urgency === "critical" ? "Urgente" : urgency === "warning" ? "Atenção" :
                urgency === "healthy" ? "Saudável" : "Sem dados"}
            </span></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <TablePager page={current} totalPages={totalPages} totalItems={rows.length} pageSize={size}
      onChange={setPage}/>
  </>;
}

function TablePager({ page, totalPages, totalItems, pageSize, onChange }: {
  page: number; totalPages: number; totalItems: number; pageSize: number; onChange: (page: number) => void;
}) {
  if (totalItems <= pageSize) return null;
  return <nav className="fh-inline-actions fh-smart-pagination" aria-label="Paginação da tabela">
    <button type="button" className="fh-control" disabled={page === 0} onClick={() => onChange(page - 1)}>Anterior</button>
    <span>Página {page + 1} de {totalPages} · {number(totalItems)} itens</span>
    <button type="button" className="fh-control" disabled={page + 1 >= totalPages}
      onClick={() => onChange(page + 1)}>Próximos {pageSize}</button>
  </nav>;
}

function PagedTableRows<T>({ items, render, pageSize = 100 }: {
  items: T[]; render: (visible: T[]) => ReactNode; pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [items]);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages - 1);
  return <>
    {render(items.slice(current * pageSize, (current + 1) * pageSize))}
    <TablePager page={current} totalPages={totalPages} totalItems={items.length} pageSize={pageSize}
      onChange={setPage}/>
  </>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <CircleAlert size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function rawEntries(row: ProductRow) {
  const hidden = new Set([
    "external_id",
    "id",
    "sku",
    "item_id",
    "title",
    "name",
    "description",
    "category",
    "category_name",
    "brand",
    "manufacturer",
    "promotional_price",
    "original_price",
    "price",
    "stock_qty",
    "stock",
    "available_quantity",
    "sales_30d",
    "sold_quantity",
    "sales",
  ]);
  return Object.entries(row.raw ?? {}).filter(([key]) => !hidden.has(key)).slice(0, 18);
}

function GenericTable({ payload }: { payload: unknown }) {
  const rows = genericRows(payload).slice(0, 100);
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].slice(0, 12);
  if (!rows.length)
    return <pre className="json-view">{JSON.stringify(payload, null, 2)}</pre>;
  return (
    <div className="table-wrap data-table">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => <td key={column}>{displayValue(row[column])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function endpointLabel(endpoint: EndpointDefinition) {
  return `${endpoint.method} ${endpoint.path}`;
}

function DataExplorer({
  endpoints,
  initialFilter = "",
}: {
  endpoints: EndpointDefinition[];
  initialFilter?: string;
}) {
  const reads = endpoints.filter((endpoint) => endpoint.method === "GET");
  const preferred =
    reads.find((endpoint) => new RegExp(initialFilter, "i").test(`${endpoint.path} ${endpoint.tag} ${endpoint.summary}`)) ??
    reads[0];
  const [selectedPath, setSelectedPath] = useState(preferred?.path ?? "");
  const selected = reads.find((endpoint) => endpoint.path === selectedPath) ?? preferred;
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState(initialFilter);
  const filterTerms = filter.toLowerCase().split("|").map((term) => term.trim()).filter(Boolean);
  const visible = reads.filter((endpoint) => {
    const haystack = `${endpoint.path} ${endpoint.summary} ${endpoint.tag}`.toLowerCase();
    return !filterTerms.length || filterTerms.some((term) => haystack.includes(term));
  });

  async function run() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/explorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selected.path, values }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível consultar.");
      setResult(body.data);
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar.");
    } finally {
      setBusy(false);
    }
  }

  function download(format: "json" | "csv") {
    if (result === null) return;
    let content: string;
    let type: string;
    if (format === "json") {
      content = JSON.stringify(result, null, 2);
      type = "application/json";
    } else {
      const rows = genericRows(result);
      const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      const escape = (value: unknown) => `"${displayValue(value).replaceAll('"', '""')}"`;
      content = [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
      type = "text/csv;charset=utf-8";
    }
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consulta-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!reads.length)
    return <Empty title="Nenhuma leitura disponível" text="Inicie o backend local para carregar as consultas disponíveis." />;

  return (
    <div className="explorer-grid">
      <div className="endpoint-list">
        <label className="search-field compact">
          <Search size={16} />
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filtrar consultas" />
        </label>
        <div className="endpoint-scroll">
          {visible.map((endpoint) => (
            <button
              key={`${endpoint.method}-${endpoint.path}`}
              className={`endpoint-item ${selected?.path === endpoint.path ? "active" : ""}`}
              onClick={() => {
                setSelectedPath(endpoint.path);
                setValues({});
                setResult(null);
                setError("");
              }}
            >
              <span className="method get">GET</span>
              <strong>{endpoint.path}</strong>
              <small>{endpoint.summary}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="endpoint-workspace">
        {selected && (
          <>
            <div className="endpoint-title">
              <div>
                <span>{selected.tag}</span>
                <h3>{selected.summary}</h3>
                <code>{endpointLabel(selected)}</code>
              </div>
              <button className="button primary" onClick={run} disabled={busy}>
                <RefreshCw className={busy ? "spin" : ""} size={16} />
                {busy ? "Consultando" : "Consultar"}
              </button>
            </div>
            {selected.parameters.length > 0 && (
              <div className="parameter-grid">
                {selected.parameters.filter((parameter) => ["path", "query"].includes(parameter.in)).map((parameter) => (
                  <label className="field" key={`${parameter.in}-${parameter.name}`}>
                    <span>
                      {parameter.name}
                      {parameter.required && <b> obrigatório</b>}
                    </span>
                    <input
                      value={values[parameter.name] ?? ""}
                      onChange={(event) => setValues((current) => ({ ...current, [parameter.name]: event.target.value }))}
                      placeholder={`${parameter.in} · ${parameter.type}`}
                    />
                    {parameter.description && <small>{parameter.description}</small>}
                  </label>
                ))}
              </div>
            )}
            {error && <div className="notice bad" role="alert">{error}</div>}
            {result !== null && (
              <div className="result-block">
                <div className="result-toolbar">
                  <strong>Resultado</strong>
                  <div>
                    <button className="button small" onClick={() => download("csv")}><Download size={15} /> CSV</button>
                    <button className="button small" onClick={() => download("json")}><Download size={15} /> JSON</button>
                  </div>
                </div>
                <GenericTable payload={result} />
                <details className="raw-json">
                  <summary>Ver JSON completo</summary>
                  <pre className="json-view">{JSON.stringify(result, null, 2)}</pre>
                </details>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PlatformPage({ initial, view, isAdmin = false }: { initial: Snapshot; view: View; syncAccounts?: { accountId: number; auto: boolean }[]; isAdmin?: boolean }) {
  const [snapshot, setSnapshot] = useState(initial);
  useEffect(() => { setSnapshot(initial); }, [initial]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [stockTone, setStockTone] = useState("");
  const [advanced, setAdvanced] = useState(defaultAdvancedProductFilters);
  const [editProduct, setEditProduct] = useState<string | null | undefined>(undefined);
  const [inspected, setInspected] = useState<ProductRow | null>(null);
  const [pricingItem, setPricingItem] = useState<ProductRow | null>(null);
  const [desiredMargin, setDesiredMargin] = useState(20);
  const [coverageDays, setCoverageDays] = useState(30);

  const rows = useMemo(() => enrichProducts(snapshot.products, snapshot.finance), [snapshot.products, snapshot.finance]);
  const categories = useMemo(() => [...new Set(rows.map((row) => row.category))].sort((a, b) => a.localeCompare(b, "pt-BR")), [rows]);
  const manufacturers = useMemo(() => [...new Set(rows.filter((row) => row.brand !== "Sem marca").map((row) => row.brand))].sort((a, b) => a.localeCompare(b, "pt-BR")), [rows]);
  const filtered = useMemo(() => {
    const term = deferredQuery.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matches = rows.filter(row => {
      const searchable = (row.title + " " + row.id + " " + row.brand + " " + row.category)
        .toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return (!term || searchable.includes(term)) &&
        (!category || row.category === category) &&
        (!manufacturer || row.brand === manufacturer || (manufacturer === "__missing" && row.brand === "Sem marca")) &&
        (!stockTone || row.stockTone === stockTone);
    });
    return sortCatalogProducts(filterCatalogProducts(matches, advanced),
      advanced.sortKey, advanced.sortDirection);
  }, [rows, deferredQuery, category, manufacturer, stockTone, advanced]);
  const setSort = (key: ProductSortKey) => setAdvanced(current => ({
    ...current, sortKey: key, quick: "",
    sortDirection: key === current.sortKey
      ? (current.sortDirection === "asc" ? "desc" : "asc")
      : (key === "title" || key === "brand" ? "asc" : "desc"),
  }));
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const paidRevenue = snapshot.sales?.gross_paid_order_amount ?? null;
  const paidRevenueNote = !snapshot.sales
    ? "Consulta de pedidos indisponível"
    : snapshot.sales.partial_data
      ? `Parcial: ${number(snapshot.sales.paid_order_count)} pedidos pagos importados`
      : `${number(snapshot.sales.paid_order_count)} pedidos pagos em 30 dias`;
  const abc = useMemo(() => classifyAbc(filtered), [filtered]);
  const abcThreshold = useMemo(() => highVolumeThreshold(abc), [abc]);

  async function refresh() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store", signal: AbortSignal.timeout(20000) });
      const next = (await response.json()) as Snapshot;
      if (!response.ok || next.error) throw new Error(next.error || "Falha na atualização.");
      setSnapshot(next);
      setNotice("Dados atualizados.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Não foi possível atualizar.");
    } finally {
      setBusy(false);
    }
  }

  function saved(finance: Finance) {
    setSnapshot((current) => ({
      ...current,
      finance: [...current.finance.filter((item) => item.productId !== finance.productId), finance],
    }));
    setNotice("Custos salvos e indicadores recalculados.");
  }

  const current = titles[view];
  const orderEndpoints = snapshot.schema.endpoints.filter((endpoint) => /order|pedido|sale|venda/i.test(`${endpoint.path} ${endpoint.tag} ${endpoint.summary}`));

  return (
    <>
      <ModernShell title={current.title} eyebrow={current.eyebrow}
        isAdmin={isAdmin}
        action={<div className="fh-inline-actions">
          <a className="fh-control" href={"/api/platform/export?report=" +
            (view === "finance" ? "costs" : view === "overview" ? "complete" : "products")}>
            <Download size={16}/> Exportar Excel
          </a>
          <button className="fh-control fh-module-refresh" type="button" onClick={refresh} disabled={busy}>
            <RefreshCw className={busy ? "spin" : ""} size={16} />
            {busy ? "Atualizando..." : "Atualizar dados"}
          </button>
        </div>}>
        <div className="fh-legacy-module">
          <div className="fh-module-intro">
            <p>{current.text}</p>
            {snapshot.updatedAt && <span><CircleCheck size={14}/> Consulta em {new Date(snapshot.updatedAt).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</span>}
          </div>

          {(snapshot.error || notice) && <div className={`notice ${snapshot.error ? "warning" : "good"}`} role="status">{snapshot.error || notice}</div>}

          {!(["orders", "data"] as View[]).includes(view) && (
            <SmartProductFilters
              query={query} onQueryChange={setQuery}
              category={category} onCategoryChange={setCategory}
              manufacturer={manufacturer} onManufacturerChange={setManufacturer}
              stockTone={stockTone} onStockToneChange={setStockTone}
              categories={categories} manufacturers={manufacturers}
              advanced={advanced} onAdvancedChange={setAdvanced}
              count={filtered.length} total={rows.length}
              purchaseMode={view === "replenishment"}/>
          )}

          {view === "overview" && (
            <>
              <div className="metric-grid five">
                <Metric label="Pedidos pagos — bruto (30 dias)" value={money(paidRevenue)} note={paidRevenueNote} icon={Coins} />
                <Metric label="Lucro estimado" value={money(summary.profit)} note={`${summary.covered}/${summary.productCount} produtos com custos`} icon={BadgeDollarSign} tone={marginTone(summary.margin)} />
                <Metric label="Margem estimada" value={percent(summary.margin)} note={summary.losses ? `${summary.losses} produto(s) no prejuízo` : "Sem prejuízo entre itens calculados"} icon={Gauge} tone={marginTone(summary.margin)} />
                <Metric label="Unidades vendidas" value={number(summary.sales)} note="Volume informado para 30 dias" icon={ShoppingCart} />
                <Metric label="Produtos no catálogo" value={number(summary.productCount)} note="Itens disponíveis na operação" icon={Package} />
              </div>
              <div className="chart-layout">
                <Section title="Resumo de vendas por categoria" subtitle="Receita estimada por categoria. Selecione uma barra para filtrar."><RevenueChart categories={summary.categories} onSelect={setCategory} /></Section>
                <Section title="Fabricante com mais lucro" subtitle="Resultado dos produtos com custos cadastrados, agrupados pelo fabricante recebido do catálogo."><ManufacturerChart manufacturers={summary.manufacturers} onSelect={setManufacturer} /></Section>
                <Section title="Produtos por categoria" subtitle="Distribuição do catálogo filtrado."><CategoryChart categories={summary.categories} onSelect={setCategory} /></Section>
              </div>
              <div className="status-strip">
                <div><Status tone="bad">Ruim</Status><strong>{summary.critical}</strong><span>sem estoque</span></div>
                <div><Status tone="warning">Atenção</Status><strong>{summary.warning}</strong><span>baixo giro/cobertura</span></div>
                <div><Status tone="good">Bom</Status><strong>{summary.healthy}</strong><span>estoque saudável</span></div>
              </div>
              <Section title="Produtos em destaque" subtitle="Ordenados pela maior receita estimada." action={<button className="button primary" onClick={() => setEditProduct(null)}><Pencil size={15} /> Cadastrar custos</button>}>
                {filtered.length ? <ProductTable rows={[...filtered].sort((a, b) => (b.revenue ?? -1) - (a.revenue ?? -1)).slice(0, 8)} onEdit={setEditProduct} onInspect={setInspected} onPrice={setPricingItem} sortKey={advanced.sortKey} sortDirection={advanced.sortDirection} onSort={setSort} /> : <Empty title="Nenhum produto encontrado" text="Ajuste os filtros para visualizar o catálogo." />}
              </Section>
            </>
          )}

          {view === "products" && (
            <>
              <div className="fh-insight-grid">
                <Section title="Produtos por fabricante" subtitle="Quantidade de produtos por fabricante do catálogo filtrado.">
                  <RankedBarChart values={groupedInsights(filtered, "brand", "count")} />
                </Section>
                <Section title="Saúde do estoque" subtitle="Classificação dos produtos carregados.">
                  <DonutStats items={stockDistribution(filtered)} label="produtos"/>
                </Section>
              </div>
              <Section title={`${filtered.length} produtos`} subtitle="Clique no nome para abrir a ficha completa." action={<button className="button primary" onClick={() => setEditProduct(null)}><Pencil size={15} /> Cadastrar custos</button>}>
              {filtered.length ? <ProductTable rows={filtered} onEdit={setEditProduct} onInspect={setInspected} onPrice={setPricingItem} sortKey={advanced.sortKey} sortDirection={advanced.sortDirection} onSort={setSort} /> : <Empty title="Nenhum produto encontrado" text="Ajuste os filtros para visualizar o catálogo." />}
              </Section>
            </>
          )}

          {view === "raiox" && (
            <>
              <div className="fh-insight-grid">
                <Section title="Produtos por categoria" subtitle="Quantidade de itens da operação para análise.">
                  <RankedBarChart values={groupedInsights(filtered, "category", "count")}/>
                </Section>
                <Section title="Produtos por fabricante" subtitle="Distribuição do catálogo carregado.">
                  <RankedBarChart values={groupedInsights(filtered, "brand", "count")}/>
                </Section>
              </div>
              <RaioXPanel products={filtered}/>
            </>
          )}

          {view === "inventory" && (
            <>
              <div className="metric-grid four">
                <Metric label="Saldo total" value={number(summary.stock)} note="Soma do estoque informado" icon={Boxes} />
                <Metric label="Sem estoque" value={number(summary.critical)} note="Ação prioritária" icon={CircleAlert} tone={summary.critical ? "bad" : "good"} />
                <Metric label="Atenção" value={number(summary.warning)} note="Baixa cobertura ou sem giro" icon={Gauge} tone={summary.warning ? "warning" : "good"} />
                <Metric label="Saudável" value={number(summary.healthy)} note="Cobertura de pelo menos 7 dias" icon={CircleCheck} tone="good" />
              </div>
              <div className="fh-insight-grid">
                <Section title="Situação do estoque" subtitle="Distribuição dos produtos por situação calculada.">
                  <DonutStats items={stockDistribution(filtered)} label="produtos"/>
                </Section>
                <Section title="Estoque por fabricante" subtitle="Soma de unidades com saldo informado.">
                  <RankedBarChart values={groupedInsights(filtered, "brand", "stock")}/>
                </Section>
              </div>
              <Section title="Controle de estoque" subtitle="Cobertura calculada a partir das vendas informadas nos últimos 30 dias.">
                <PagedTableRows items={filtered} render={(pagedRows) => <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Saldo</th><th>Vendas 30d</th><th>Cobertura</th><th>Situação</th></tr></thead><tbody>{pagedRows.map((row) => <tr key={row.id}><td><strong>{row.title}</strong><small className="cell-sub">{row.id}</small></td><td>{number(row.stock)}</td><td>{number(row.sales)}</td><td>{row.stockDays === null ? "—" : `${Math.round(row.stockDays)} dias`}</td><td><Status tone={row.stockTone}>{row.stockLabel}</Status></td></tr>)}</tbody></table></div>}/>
              </Section>
            </>
          )}

          {view === "finance" && (
            <>
              <div className="metric-grid four">
                <Metric label="Pedidos pagos — bruto (30 dias)" value={money(paidRevenue)} note={paidRevenueNote} icon={Coins} />
                <Metric label="Lucro estimado" value={money(summary.profit)} note={`${summary.covered} produtos calculados`} icon={BadgeDollarSign} tone={marginTone(summary.margin)} />
                <Metric label="Margem" value={percent(summary.margin)} note="Sobre produtos com custos" icon={Gauge} tone={marginTone(summary.margin)} />
                <Metric label="Cobertura de custos" value={summary.productCount ? percent((summary.covered / summary.productCount) * 100) : "—"} note={`${summary.productCount - summary.covered} sem custo cadastrado`} icon={Database} tone={summary.covered === summary.productCount && summary.productCount > 0 ? "good" : "warning"} />
              </div>
              <div className="fh-insight-grid">
                <Section title="Lucro por fabricante" subtitle="Apenas produtos com dados suficientes para calcular o lucro.">
                  <RankedBarChart values={groupedInsights(filtered, "brand", "profit")} unit="money"/>
                </Section>
                <Section title="Cobertura de custos" subtitle="Produtos com custo cadastrado em comparação aos demais.">
                  <DonutStats items={costCoverage(filtered)} label="produtos"/>
                </Section>
              </div>
              <Section title="Receita e lucro por categoria" subtitle="Comparativo dos resultados disponíveis no catálogo filtrado.">
                <FinanceCategoryChart rows={filtered} />
              </Section>
              <Section title="Resultado por produto" subtitle="Vermelho = prejuízo, amarelo = margem abaixo de 15%, verde = margem a partir de 15%." action={<button className="button primary" onClick={() => setEditProduct(null)}><Pencil size={15} /> Cadastrar custos</button>}>
                <ProductTable rows={filtered} onEdit={setEditProduct} onInspect={setInspected} onPrice={setPricingItem} sortKey={advanced.sortKey} sortDirection={advanced.sortDirection} onSort={setSort} />
              </Section>
            </>
          )}

          {view === "manufacturers" && (
            <>
              <div className="metric-grid four">
                <Metric label="Fabricantes" value={number(manufacturers.length)} note="Identificados no catálogo / by-brands" icon={Factory} />
                <Metric label="Produtos com fabricante" value={number(filtered.filter((row) => row.brand !== "Sem marca").length)} note={`de ${filtered.length} produtos`} icon={Package} />
                <Metric label="Melhor lucro" value={money(summary.manufacturers[0]?.profit ?? null)} note={summary.manufacturers[0]?.name ?? "Sem resultado"} icon={BadgeDollarSign} tone={marginTone(summary.manufacturers[0]?.margin ?? null)} />
                <Metric label="Custo de compra estimado" value={money(summary.manufacturers.length ? summary.manufacturers.reduce((sum, item) => sum + item.purchaseCost, 0) : null)} note="Custos cadastrados × unidades vendidas" icon={ShoppingCart} />
              </div>
              <div className="fh-insight-grid">
                <Section title="Receita estimada por fabricante" subtitle="Calculada onde existem preços e vendas disponíveis.">
                  <RankedBarChart values={groupedInsights(filtered, "brand", "revenue")} unit="money"/>
                </Section>
                <Section title="Lucro estimado por fabricante" subtitle="Considera apenas produtos com custos suficientes.">
                  <RankedBarChart values={groupedInsights(filtered, "brand", "profit")} unit="money"/>
                </Section>
              </div>
              <Section title="Performance por fabricante" subtitle="Ordenado pelo lucro estimado; o fabricante vem de brand/manufacturer e é enriquecido pela rota by-brands quando disponível.">
                {summary.manufacturers.length ? <div className="table-wrap"><table><thead><tr><th>Fabricante</th><th>Produtos</th><th>Vendidos</th><th>Custo de compra</th><th>Lucro</th><th>Margem</th></tr></thead><tbody>{summary.manufacturers.map((item) => <tr key={item.name}><td><strong>{item.name}</strong></td><td>{number(item.count)}</td><td>{number(item.sales)}</td><td>{money(item.purchaseCost)}</td><td className={`text-${marginTone(item.margin)}`}>{money(item.profit)}</td><td><Status tone={marginTone(item.margin)}>{percent(item.margin)}</Status></td></tr>)}</tbody></table></div> : <Empty title="Sem performance por fabricante" text="Os fabricantes já podem ser filtrados, mas é necessário cadastrar custos para calcular lucro e margem." />}
              </Section>
            </>
          )}

          {view === "pricing" && (
            <>
              <div className="tool-control"><div><span className="eyebrow">META DE MARGEM</span><strong>{desiredMargin}%</strong><p>Preço mínimo estimado para alcançar a margem desejada.</p></div><input aria-label="Margem desejada" type="range" min="1" max="50" value={desiredMargin} onChange={(event) => setDesiredMargin(Number(event.target.value))} /></div>
              <div className="fh-insight-grid">
                <Section title="Maiores ajustes de preço" subtitle="Diferença positiva até a margem desejada. Somente produtos com custos cadastrados.">
                  <RankedBarChart values={pricingGaps(filtered, desiredMargin, (row, margin) => idealPrice(row.finance, margin))} unit="money" empty="Nenhum preço precisa de ajuste calculável com os dados atuais."/>
                </Section>
                <Section title="Preços por categoria" subtitle="Receita estimada, quando houver preço e volume de vendas.">
                  <RankedBarChart values={groupedInsights(filtered, "category", "revenue")} unit="money"/>
                </Section>
              </div>
              <Section title="Simulador de preço" subtitle="Considera custo, comissão, imposto, frete e outras despesas cadastradas.">
                <PagedTableRows items={filtered} render={(pagedRows) => <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Preço atual</th><th>Margem atual</th><th>Preço para meta</th><th>Diferença</th><th>Situação</th></tr></thead><tbody>{pagedRows.map((row) => { const target = idealPrice(row.finance, desiredMargin); const diff = target !== null && row.price !== null ? target - row.price : null; const projection = projectedAtPrice(row.finance, row.price); return <tr key={row.id}><td><strong>{row.title}</strong><small className="cell-sub">{row.brand !== "Sem marca" ? row.brand : "Sem fabricante"}</small></td><td>{money(row.price)}</td><td className={`text-${marginTone(projection.margin)}`}>{percent(projection.margin)}</td><td><strong>{money(target)}</strong></td><td className={diff !== null && diff > 0 ? "text-warning" : "text-good"}>{diff === null ? "—" : `${diff > 0 ? "+" : ""}${money(diff)}`}</td><td>{target === null || row.price === null ? <Status tone="neutral">Sem base</Status> : row.price >= target ? <Status tone="good">Meta atendida</Status> : <Status tone="warning">Revisar preço</Status>}</td></tr>; })}</tbody></table></div>}/>
              </Section>
            </>
          )}

          {view === "replenishment" && (
            <>
              <div className="tool-control"><div><span className="eyebrow">COBERTURA ALVO</span><strong>{coverageDays} dias</strong><p>Quantidade sugerida para recompor o estoque até a cobertura definida.</p></div><input aria-label="Cobertura alvo" type="range" min="7" max="90" step="1" value={coverageDays} onChange={(event) => setCoverageDays(Number(event.target.value))} /></div>
              <div className="fh-insight-grid">
                <Section title="Itens prioritários para reposição" subtitle="Quantidade sugerida com base na meta de cobertura e vendas de 30 dias.">
                  <RankedBarChart values={topReplenishment(filtered, coverageDays)} empty="Sem necessidade de reposição calculável para os dados e período selecionados."/>
                </Section>
                <Section title="Saldo atual por fabricante" subtitle="Unidades de estoque informado por fabricante.">
                  <RankedBarChart values={groupedInsights(filtered, "brand", "stock")}/>
                </Section>
              </div>
              <Section title="Plano de compras" subtitle="A sugestão usa somente saldo e venda de 30 dias já disponíveis.">
                <PurchasePlanTable rows={filtered} coverageDays={coverageDays}/>
              </Section>
            </>
          )}

          {view === "abc" && (
            <>
              <div className="abc-summary"><div><span className="abc-badge a">A</span><strong>{abc.filter((row) => row.abcClass === "A").length}</strong><p>prioridade máxima de receita</p></div><div><span className="abc-badge b">B</span><strong>{abc.filter((row) => row.abcClass === "B").length}</strong><p>faixa intermediária</p></div><div><span className="abc-badge c">C</span><strong>{abc.filter((row) => row.abcClass === "C").length}</strong><p>cauda do portfólio</p></div></div>
              <div className="fh-insight-grid">
                <Section title="Receita estimada por classe" subtitle="Distribuição dos produtos classificados conforme a receita.">
                  <RankedBarChart values={abcRevenue(abc)} unit="money"/>
                </Section>
                <Section title="Produtos por categoria" subtitle="Quantidade dos itens carregados em cada categoria.">
                  <RankedBarChart values={groupedInsights(filtered, "category", "count")}/>
                </Section>
              </div>
              <Section title="Classificação ABC" subtitle="Classes por participação da receita; metas de margem A 10%, B 15%, C 20% são orientativas e não substituem lucro líquido fiscal.">
                <PagedTableRows items={abc} render={(pagedRows) => <div className="table-wrap"><table><thead><tr><th>Classe</th><th>Produto</th><th>Receita</th><th>Participação</th><th>Acumulado</th><th>Margem estimada</th><th>Meta da classe</th><th>Estratégia</th></tr></thead><tbody>{pagedRows.map((row) => <tr key={row.id}><td>{row.abcClass ? <span className={`abc-badge ${row.abcClass.toLowerCase()}`}>{row.abcClass}</span> : "—"}</td><td><strong>{row.title}</strong><small className="cell-sub">{row.id}</small></td><td>{money(row.revenue)}</td><td>{percent(row.revenueShare)}</td><td>{percent(row.cumulativeShare)}</td><td className={`text-${marginTone(row.margin)}`}>{percent(row.margin)}</td>
                  <td>{abcStrategy(row, abcThreshold).target === null ? "—" : abcStrategy(row, abcThreshold).target + "%"}</td>
                  <td>{abcStrategy(row, abcThreshold).attraction
                    ? <span className="fh-abc-attraction">Boi de Piranha</span>
                    : abcStrategy(row, abcThreshold).state === "loss" ? "Prejuízo"
                    : abcStrategy(row, abcThreshold).state === "below-target" ? "Abaixo da meta"
                    : abcStrategy(row, abcThreshold).state === "healthy" ? "Meta atingida"
                    : "Sem base"}</td></tr>)}</tbody></table></div>}/>
              </Section>
            </>
          )}

          {view === "orders" && (
            <Section title="Consultas de pedidos" subtitle={`${orderEndpoints.filter((endpoint) => endpoint.method === "GET").length} consulta(s) de pedidos ou vendas disponíveis.`}>
              {orderEndpoints.length ? <DataExplorer endpoints={orderEndpoints} initialFilter="order|pedido|sale|venda" /> : <Empty title="Nenhuma rota de pedidos identificada" text="A Central de dados ainda mostra todas as rotas da versão atual para consulta manual." />}
            </Section>
          )}

          {view === "data" && (
            <>
              <div className="metric-grid four">
                <Metric label="Rotas mapeadas" value={number(snapshot.schema.endpoints.length)} note="Todos os métodos do contrato" icon={Database} />
                <Metric label="Consultas GET" value={number(snapshot.schema.endpoints.filter((endpoint) => endpoint.method === "GET").length)} note="Disponíveis para consulta segura" icon={Search} />
                <Metric label="Grupos" value={number(new Set(snapshot.schema.endpoints.map((endpoint) => endpoint.tag)).size)} note="Tags do contrato" icon={Layers3} />
                <Metric label="Versão" value={snapshot.schema.version || "—"} note={snapshot.schema.title} icon={Activity} />
              </div>
              <div className="fh-insight-grid">
                <Section title="Consultas GET por grupo" subtitle="Rotas documentadas pelo OpenAPI, não representa consultas executadas.">
                  <RankedBarChart values={[...new Map(snapshot.schema.endpoints.filter(endpoint => endpoint.method === "GET")
                    .map(endpoint => [endpoint.tag, snapshot.schema.endpoints.filter(other => other.tag === endpoint.tag && other.method === "GET").length] as const))]
                    .map(([label,value]) => ({label,value})).sort((a,b)=>b.value-a.value).slice(0,7)}/>
                </Section>
              </div>
              <Section title="Explorador de dados" subtitle="As rotas GET são executáveis; operações de escrita ficam apenas catalogadas para evitar alterações acidentais.">
                <DataExplorer endpoints={snapshot.schema.endpoints} />
              </Section>
              <Section title="Mapa completo de endpoints" subtitle="Inventário de todos os métodos expostos na versão atual.">
                <div className="endpoint-catalog">{snapshot.schema.endpoints.map((endpoint) => <div className="catalog-row" key={`${endpoint.method}-${endpoint.path}`}><span className={`method ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span><code>{endpoint.path}</code><strong>{endpoint.summary}</strong><span>{endpoint.tag}</span></div>)}</div>
              </Section>
            </>
          )}
        </div>
      </ModernShell>

      {pricingItem && typeof pricingItem.raw?.source_key === "string" &&
        /^ml:\d+$/.test(pricingItem.raw.source_key) &&
        <PricingCalculator accountId={Number(pricingItem.raw.source_key.slice(3))}
          seed={{ item_id: pricingItem.id, title: pricingItem.title,
            unit_price: pricingItem.price ?? 0,
            unit_cost: pricingItem.finance?.unitCost ?? null,
            tax_percent: pricingItem.finance?.taxPercent ?? null,
            configured_shipping: pricingItem.finance?.shippingCost ?? null,
            other_cost: pricingItem.finance?.otherCost ?? null,
          }}
          onClose={() => setPricingItem(null)}/>}
      {editProduct !== undefined && <FinanceDialog products={rows} selected={editProduct} onClose={() => setEditProduct(undefined)} onSaved={saved} />}
      {inspected && (
        <div className="drawer-backdrop" onClick={() => setInspected(null)}>
          <aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-head"><div><span className="eyebrow">FICHA DO PRODUTO</span><h2>{inspected.title}</h2><p>{inspected.id}</p></div><button className="icon-button" onClick={() => setInspected(null)} aria-label="Fechar ficha"><X size={19} /></button></div>
            <div className="detail-grid"><div><span>Fabricante</span><strong>{inspected.brand}</strong></div><div><span>Categoria</span><strong>{inspected.category}</strong></div><div><span>Preço</span><strong>{money(inspected.price)}</strong></div><div><span>Desconto</span><strong>{percent(inspected.discount)}</strong></div><div><span>Avaliação</span><strong>{inspected.rating?.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) ?? "—"}</strong></div><div><span>Condição</span><strong>{inspected.condition ?? "—"}</strong></div><div><span>Frete grátis</span><strong>{inspected.freeShipping === null ? "—" : inspected.freeShipping ? "Sim" : "Não"}</strong></div><div><span>Custos cadastrados</span><strong>{inspected.finance ? "Sim" : "Não"}</strong></div></div>
            {rawEntries(inspected).length > 0 && <><h3 className="drawer-section-title">Outros campos recebidos</h3><dl className="raw-fields">{rawEntries(inspected).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{displayValue(value)}</dd></div>)}</dl></>}
            <button className="button primary full" onClick={() => { setEditProduct(inspected.id); setInspected(null); }}><Pencil size={16} /> Editar custos</button>
          </aside>
        </div>
      )}
    </>
  );
}
