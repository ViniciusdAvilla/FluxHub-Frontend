"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Search,
  ShieldCheck, SlidersHorizontal, Wallet, X } from "lucide-react";
import type { PricingSeed } from "./pricing-calculator";
import { orderStatusLabel } from "@/lib/order-status";

const PricingCalculator = dynamic(() => import("./pricing-calculator"), { ssr: false });

type OrderItem = {
  item_id: string; title: string; sku: string | null; quantity: number;
  unit_price: number; sale_fee: number | null; thumbnail: string | null;
  unit_cost: number | null; tax_percent: number | null;
  configured_shipping: number | null; other_cost: number | null;
};
type Order = {
  external_id: string; seller_id: number; status: string; total_amount: number;
  created_at: string; is_cancelled: boolean; buyer_id: number | null;
  items: OrderItem[];
};
type Page = {
  orders: Order[]; total: number; status_counts: Record<string, number>;
  gross_paid_amount: number; is_complete: boolean;
};
type FinancialLine = {
  item_id: string; title: string; quantity: number; gross: number;
  fee: number | null; fee_source: string; product_cost: number | null;
  taxes_configured: number | null; shipping_configured: number | null;
  other_costs: number | null; estimated_profit: number | null;
  estimated_margin: number | null;
};
type FinancialDetails = {
  order_id: string; seller_id: number; status: string;
  gross_order_amount: number | null; gross_item_amount: number;
  marketplace_fees: number | null; product_cost: number | null;
  taxes_configured: number | null; shipping_configured: number | null;
  other_costs: number | null; estimated_profit: number | null;
  estimated_margin: number | null; complete: boolean; fees_are_estimated: boolean;
  note: string; items: FinancialLine[];
};
type BuyerDetail = {
  buyer: Record<string, unknown>; delivery_address: Record<string, unknown> | null;
  fiscal: Record<string, unknown> | null;
  delivery_data_available: boolean; fiscal_data_available: boolean;
};
type Mode = "sales" | "orders";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const photoAllowed = (url: string | null) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      (parsed.hostname === "mlstatic.com" || parsed.hostname.endsWith(".mlstatic.com"));
  } catch { return false; }
};
function safeText(value: unknown) {
  if (value === null || value === undefined || value === "") return "Não disponibilizado";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && value && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return [obj.area_code, obj.number, obj.extension].filter(Boolean).join(" ") || "Não disponibilizado";
  }
  return "Não disponibilizado";
}
const statusTabs = [
  { code: "", label: "Todos" },
  { code: "paid", label: "Pagos" },
  { code: "cancelled", label: "Cancelados" },
  { code: "payment_required", label: "Pendentes" },
  { code: "payment_in_process", label: "Processando" },
];

export default function OrderExplorer({
  mode, accounts = [],
}: { mode: Mode; accounts?: {account_id: number; nickname: string | null}[] }) {
  const [page, setPage] = useState<Page | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [days, setDays] = useState("30");
  const [accountId, setAccountId] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<{ seed: PricingSeed; account: number } | null>(null);
  const [buyerOrder, setBuyerOrder] = useState<Order | null>(null);
  const [financialOrder, setFinancialOrder] = useState<Order | null>(null);
  const [financialDetails, setFinancialDetails] = useState<FinancialDetails | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialError, setFinancialError] = useState("");
  const financialRequest = useRef(0);
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [buyerError, setBuyerError] = useState("");
  const [buyer, setBuyer] = useState<BuyerDetail | null>(null);
  const buyerRequest = useRef(0);
  const [refreshingItemOrder, setRefreshingItemOrder] = useState<string | null>(null);
  const [itemRepairError, setItemRepairError] = useState<{ key: string; error: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { setOffset(0); }, [status, days, debounced, accountId, minAmount, maxAmount, sortBy, sortDir]);
  useEffect(() => {
    const controller = new AbortController();
    const q = new URLSearchParams({ action: "orders", days, status,
      search: debounced, offset: String(offset), sort_by: sortBy, sort_dir: sortDir });
    if (accountId) q.set("accountId", accountId);
    if (minAmount) q.set("min_amount", minAmount);
    if (maxAmount) q.set("max_amount", maxAmount);
    setLoading(true); setError("");
    fetch("/api/platform/orders?" + q, {
      cache: "no-store", signal: controller.signal,
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Não foi possível carregar os pedidos.");
      return data as Page;
    }).then(value => { if (!controller.signal.aborted) setPage(value); })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Falha na consulta.");
          setPage(null);
        }
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, status, debounced, offset, accountId, minAmount, maxAmount, sortBy, sortDir]);

  const openFinancial = useCallback(async (order: Order) => {
    const request = ++financialRequest.current;
    setFinancialOrder(order); setFinancialDetails(null);
    setFinancialLoading(true); setFinancialError("");
    const q = new URLSearchParams({ action: "details",
      orderId: order.external_id, accountId: String(order.seller_id) });
    try {
      const response = await fetch("/api/platform/orders?" + q, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Detalhamento indisponível.");
      if (financialRequest.current === request) setFinancialDetails(data as FinancialDetails);
    } catch (reason) {
      if (financialRequest.current === request)
        setFinancialError(reason instanceof Error ? reason.message : "Consulta indisponível.");
    } finally {
      if (financialRequest.current === request) setFinancialLoading(false);
    }
  }, []);
  const closeFinancial = () => {
    financialRequest.current++;
    setFinancialOrder(null); setFinancialDetails(null); setFinancialError("");
  };
  const formatOptional = (amount: number | null) => amount === null ? "Não disponível" : currency.format(amount);

  const openBuyer = useCallback(async (order: Order) => {
    const requestNumber = ++buyerRequest.current;
    setBuyerOrder(order); setBuyer(null); setBuyerError(""); setBuyerLoading(true);
    const q = new URLSearchParams({ action: "buyer",
      orderId: order.external_id, accountId: String(order.seller_id) });
    try {
      const response = await fetch("/api/platform/orders?" + q, { cache: "no-store" });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "Dados do comprador indisponíveis.");
      if (buyerRequest.current === requestNumber) setBuyer(value as BuyerDetail);
    } catch (reason) {
      if (buyerRequest.current === requestNumber)
        setBuyerError(reason instanceof Error ? reason.message : "Consulta não autorizada.");
    } finally { if (buyerRequest.current === requestNumber) setBuyerLoading(false); }
  }, []);
  const closeBuyer = () => { buyerRequest.current++; setBuyer(null); setBuyerOrder(null); setBuyerError(""); };
  const repairItems = useCallback(async (order: Order) => {
    const key = order.seller_id + ":" + order.external_id;
    setRefreshingItemOrder(key);
    setItemRepairError(null);
    try {
      const response = await fetch("/api/platform/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refresh-items",
          accountId: order.seller_id,
          orderId: order.external_id,
        }),
        cache: "no-store",
      });
      const data: Order & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível buscar os itens.");
      setPage(previous => previous ? {
        ...previous,
        orders: previous.orders.map(saved =>
          saved.seller_id === order.seller_id && saved.external_id === order.external_id
            ? data : saved),
      } : previous);
    } catch (reason) {
      setItemRepairError({
        key,
        error: reason instanceof Error ? reason.message : "Falha ao consultar os itens.",
      });
    } finally {
      setRefreshingItemOrder(null);
    }
  }, []);


  function chooseProduct(item: OrderItem, order: Order) {
    setSelected({ account: order.seller_id, seed: {
      item_id: item.item_id, title: item.title,
      thumbnail: item.thumbnail, unit_price: item.unit_price,
      quantity: item.quantity, sale_fee: item.sale_fee,
      unit_cost: item.unit_cost, tax_percent: item.tax_percent,
      configured_shipping: item.configured_shipping, other_cost: item.other_cost,
      sku: item.sku, order_id: order.external_id, order_date: order.created_at,
    } });
  }
  const setOrderSort = (column: "date" | "amount" | "status") => {
    if (sortBy === column) setSortDir(current => current === "asc" ? "desc" : "asc");
    else { setSortBy(column); setSortDir("desc"); }
  };
  const count = (key: string) => page?.status_counts[key] || 0;
  const allCount = Object.values(page?.status_counts || {}).reduce((sum, n) => sum + n, 0);
  return <>
    <div className="fh-kpis">
      <article className="fh-kpi green">
        <div className="fh-kpi-top"><Wallet size={18}/> Faturamento bruto pago</div>
        <strong className="fh-kpi-value">{page ? currency.format(page.gross_paid_amount) : "—"}</strong>
        <p>Pedidos pagos armazenados no período; não é lucro líquido.</p>
      </article>
      <article className="fh-kpi blue">
        <div className="fh-kpi-top"><ClipboardList size={18}/> Pedidos registrados</div>
        <strong className="fh-kpi-value">{allCount.toLocaleString("pt-BR")}</strong>
      </article>
      <article className="fh-kpi rose">
        <div className="fh-kpi-top">Cancelados</div>
        <strong className="fh-kpi-value">{count("cancelled").toLocaleString("pt-BR")}</strong>
      </article>
      <article className="fh-kpi purple">
        <div className="fh-kpi-top">Pagos</div>
        <strong className="fh-kpi-value">{count("paid").toLocaleString("pt-BR")}</strong>
      </article>
    </div>
    <section className="fh-card fh-orders-explorer">
      <div className="fh-card-head">
        <div><h2>{mode === "sales" ? "Produtos vendidos" : "Todos os pedidos"}</h2>
          <p>Foto e nome do produto em destaque. Clique para precificar e apurar lucro.</p>
        </div>
        <a className="fh-control" href={"/api/platform/export?report=orders&days=" + days +
          (accountId ? "&accountId=" + accountId : "")}>
          Exportar Excel
        </a>
      </div>
      <div className="fh-orders-filters">
        <label className="fh-orders-search">
          <Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar produto, SKU ou pedido" aria-label="Pesquisar produto, SKU ou pedido"/>
        </label>
        <label className="fh-orders-period"><CalendarDays size={16}/>
          <select aria-label="Período" value={days} onChange={e => setDays(e.target.value)}>
            <option value="7">7 dias</option><option value="30">30 dias</option>
            <option value="90">90 dias</option><option value="365">365 dias</option>
            <option value="all">Todo o histórico salvo</option>
          </select>
        </label>
        {accounts.length > 1 && <label className="fh-orders-period">
          <select aria-label="Conta do Mercado Livre" value={accountId}
            onChange={event => setAccountId(event.target.value)}>
            <option value="">Todas as contas</option>
            {accounts.map(account => <option key={account.account_id}
              value={String(account.account_id)}>{account.nickname || account.account_id}</option>)}
          </select>
        </label>}
      </div>
      <div className="fh-smart-order-toolbar">
        <span><SlidersHorizontal size={15} aria-hidden="true"/> Ordenar resultados</span>
        <label>Coluna
          <select value={sortBy} aria-label="Ordenar pedidos por"
            onChange={event => setSortBy(event.target.value as "date" | "amount" | "status")}>
            <option value="date">Data da compra</option>
            <option value="amount">Valor da venda</option>
            <option value="status">Situação do pedido</option>
          </select>
        </label>
        <button type="button" className="fh-smart-order-dir"
          aria-label={sortDir === "desc" ? "Ordenar crescente" : "Ordenar decrescente"}
          onClick={() => setSortDir(dir => dir === "asc" ? "desc" : "asc")}>
          {sortDir === "desc" ? "↓ Maior primeiro" : "↑ Menor primeiro"}
        </button>
        <span className="fh-smart-order-hint">Ordenação aplicada a todos os pedidos do período.</span>
      </div>
      <details className="fh-orders-advanced"><summary>Filtros avançados de valor</summary>
        <div>
          <label>Venda mínima (R$)<input type="number" min="0" step="0.01"
            value={minAmount} onChange={e => setMinAmount(e.target.value)}/></label>
          <label>Venda máxima (R$)<input type="number" min="0" step="0.01"
            value={maxAmount} onChange={e => setMaxAmount(e.target.value)}/></label>
          <button className="fh-control" type="button"
            onClick={() => { setMinAmount(""); setMaxAmount(""); }}>Limpar valores</button>
        </div>
      </details>
      <div className="fh-orders-status-tabs" aria-label="Filtrar por status">
        {statusTabs.map(tab => <button type="button" key={tab.code}
          className={tab.code === status ? "is-active" : ""}
          aria-pressed={tab.code === status}
          onClick={() => { setStatus(tab.code); setOffset(0); }}>
          {tab.label} <span>{tab.code ? count(tab.code) : allCount}</span>
        </button>)}
        <button type="button" className={status === "__other" ? "is-active" : ""}
          onClick={() => setStatus("")} title="Mostrar todos">
          <SlidersHorizontal size={15}/> Limpar
        </button>
      </div>
      {error && <div className="fh-notice error" role="alert">{error}</div>}
      {itemRepairError && <div className="fh-notice error" role="alert">{itemRepairError.error}</div>}
      {loading && <p role="status" className="fh-orders-loading">Consultando pedidos sincronizados...</p>}
      {!loading && !error && page?.orders.length === 0 &&
        <div className="fh-orders-empty">Nenhum pedido armazenado neste período. Ajuste os filtros ou <Link href="/integracoes">atualize pedidos e faturamento</Link>.</div>}
      <div className={mode === "sales" ? "fh-orders-list fh-orders-cards-mobile" : "fh-orders-list"}>
        {(page?.orders || []).map(order => <article className="fh-orders-card"
          key={order.seller_id + "-" + order.external_id}>
          <div className="fh-orders-card-top">
            <span>{new Date(order.created_at).toLocaleString("pt-BR")}</span>
            <button type="button" onClick={() => { setStatus(order.status); setOffset(0); }}
              className={"fh-orders-pill " + (order.status === "paid" ? "success" :
                order.status === "cancelled" ? "danger" : "neutral")}>
              {orderStatusLabel(order.status)}
            </button>
          </div>
          {order.items.length === 0 && <div className="fh-orders-product">
            <span className="fh-orders-image-fallback">—</span>
            <span className="fh-orders-title">
              <strong>Detalhes dos produtos ainda não importados</strong>
              <small>O pedido está salvo, mas falta o detalhe dos produtos.
                {" "}<Link href="/integracoes">Sincronizar pedidos</Link>
              </small>
              <button type="button" className="fh-control"
                disabled={refreshingItemOrder === order.seller_id + ":" + order.external_id}
                onClick={() => void repairItems(order)}>
                {refreshingItemOrder === order.seller_id + ":" + order.external_id
                  ? "Buscando itens..." : "Buscar itens deste pedido"}
              </button>
              {itemRepairError?.key === order.seller_id + ":" + order.external_id &&
                <small role="alert">{itemRepairError.error}</small>}
            </span>
            <strong className="fh-orders-price">—</strong>
          </div>}
          {order.items.map((item, index) => <div className="fh-orders-product"
            key={order.external_id + "-" + index}>
            <button type="button" className="fh-orders-product-button"
              disabled={!item.item_id}
              onClick={() => chooseProduct(item, order)}
              title={item.item_id ? "Abrir calculadora de lucro" : "Produto ainda não importado"}>
              {photoAllowed(item.thumbnail) ?
                <img src={item.thumbnail!} alt="" width={64} height={64}/> :
                <span className="fh-orders-image-fallback">Sem foto</span>}
              <span className="fh-orders-title">
                <strong>{item.title}</strong>
                <small>{item.sku ? "SKU: " + item.sku + " · " : ""}
                  {item.quantity || "—"} unidade(s)</small>
                {item.item_id && <small className="fh-orders-calc-link">Precificar e ver lucro</small>}
              </span>
            </button>
            <strong className="fh-orders-price">
              {currency.format(item.item_id ? item.unit_price * item.quantity : order.total_amount)}
            </strong>
          </div>)}
          <div className="fh-orders-bottom">
            <span>Venda: {currency.format(order.total_amount)}</span>
            <button type="button" className="fh-control" onClick={() => void openFinancial(order)}>
              <Wallet size={15}/> Detalhe financeiro
            </button>
            <button type="button" className="fh-control" onClick={() => void openBuyer(order)}>
              <ShieldCheck size={15}/> Dados do comprador
            </button>
          </div>
        </article>)}
      </div>
      {mode === "sales" && !!page?.orders.length && <div className="fh-smart-sales-table table-wrap">
        <table>
          <thead><tr>
            <th>Produto vendido</th>
            <th>Qtd.</th>
            <th aria-sort={sortBy === "amount" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
              <button type="button" className={"fh-smart-column " + (sortBy === "amount" ? "is-active" : "")}
                onClick={() => setOrderSort("amount")}>Valor bruto<span aria-hidden="true">{sortBy === "amount" ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}</span></button>
            </th>
            <th aria-sort={sortBy === "status" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
              <button type="button" className={"fh-smart-column " + (sortBy === "status" ? "is-active" : "")}
                onClick={() => setOrderSort("status")}>Status<span aria-hidden="true">{sortBy === "status" ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}</span></button>
            </th>
            <th aria-sort={sortBy === "date" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
              <button type="button" className={"fh-smart-column " + (sortBy === "date" ? "is-active" : "")}
                onClick={() => setOrderSort("date")}>Data<span aria-hidden="true">{sortBy === "date" ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}</span></button>
            </th>
            <th>Ações</th>
          </tr></thead>
          <tbody>{page.orders.flatMap(order => order.items.length
            ? order.items.map((item, index) => <tr key={order.seller_id + ":" + order.external_id + ":" + index}>
              <td><button className="fh-orders-product-button" type="button"
                disabled={!item.item_id} onClick={() => chooseProduct(item, order)}>
                {photoAllowed(item.thumbnail) ? <img src={item.thumbnail!} alt="" width={54} height={54}/> :
                  <span className="fh-orders-image-fallback">Sem foto</span>}
                <span className="fh-orders-title"><strong>{item.title}</strong>
                  <small>SKU: {item.sku || "—"}</small>
                  <small className="fh-orders-calc-link">Ver precificação e lucro</small>
                </span>
              </button></td>
              <td>{item.quantity.toLocaleString("pt-BR")}</td>
              <td><strong>{currency.format(item.unit_price * item.quantity)}</strong></td>
              <td><button className={"fh-orders-pill " + (order.status === "paid" ? "success" :
                order.status === "cancelled" ? "danger" : "neutral")}
                onClick={() => setStatus(order.status)}>{orderStatusLabel(order.status)}</button></td>
              <td>{new Date(order.created_at).toLocaleDateString("pt-BR")}</td>
              <td><div className="fh-inline-actions">
                <button type="button" className="fh-control" onClick={() => void openFinancial(order)}>
                  <Wallet size={14}/> Custos
                </button>
                <button type="button" className="fh-control" onClick={() => void openBuyer(order)}>
                  <ShieldCheck size={14}/> Comprador
                </button>
              </div></td>
            </tr>)
            : [<tr key={order.seller_id + ":" + order.external_id + ":missing"}>
              <td><span className="fh-orders-title"><strong>Produtos ainda não importados</strong>
                <small>Pedido salvo, itens pendentes</small></span></td>
              <td>—</td><td>{currency.format(order.total_amount)}</td>
              <td>{orderStatusLabel(order.status)}</td>
              <td>{new Date(order.created_at).toLocaleDateString("pt-BR")}</td>
              <td><button className="fh-control" disabled={refreshingItemOrder === order.seller_id + ":" + order.external_id}
                onClick={() => void repairItems(order)}>
                {refreshingItemOrder === order.seller_id + ":" + order.external_id ? "Buscando..." : "Buscar produtos"}
              </button></td>
            </tr>])}</tbody>
        </table>
      </div>}
      <div className="fh-inline-actions fh-orders-pagination">
        <button className="fh-control" disabled={loading || offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 30))}>
          <ChevronLeft size={16}/> Anterior
        </button>
        <span>{page ? "Exibindo " + (page.orders.length ? (offset + 1) : 0) +
          "–" + (offset + page.orders.length) + " de " + page.total.toLocaleString("pt-BR") : "—"}</span>
        <button className="fh-primary-btn" disabled={loading || !page || page.is_complete}
          onClick={() => setOffset(offset + 30)}>
          Próximos <ChevronRight size={16}/>
        </button>
      </div>
      <p className="fh-sync-message">
        Os dados pessoais são consultados somente ao abrir os detalhes de um comprador.
        Faturamento bruto não é saldo liquidado nem lucro líquido.
      </p>
    </section>
    {selected && <PricingCalculator seed={selected.seed} accountId={selected.account}
      onClose={() => setSelected(null)}/>}
    {financialOrder && <div className="fh-profit-backdrop" role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) closeFinancial(); }}>
      <section className="fh-buyer-panel" role="dialog" aria-modal="true"
        aria-label="Detalhamento financeiro do pedido">
        <header className="fh-profit-head">
          <div><span className="fh-profit-eyebrow">FLUXHUB · RECEITA E CUSTOS</span>
            <h2>Detalhe do pedido</h2>
            <p>Pedido {financialOrder.external_id} · {orderStatusLabel(financialOrder.status)}</p></div>
          <button type="button" className="fh-control" onClick={closeFinancial}
            aria-label="Fechar detalhamento"><X size={18}/></button>
        </header>
        <div className="fh-profit-body">
          {financialLoading && <p role="status">Calculando indicadores do pedido...</p>}
          {financialError && <div className="fh-notice error" role="alert">{financialError}</div>}
          {financialDetails && <>
            <section className="fh-profit-card fh-profit-results">
              <div><span>Venda bruta</span><strong>{formatOptional(financialDetails.gross_order_amount)}</strong></div>
              <div><span>Lucro estimado</span><strong>{formatOptional(financialDetails.estimated_profit)}</strong></div>
              <div><span>Margem estimada</span><strong>{financialDetails.estimated_margin === null
                ? "Indisponível" : financialDetails.estimated_margin.toFixed(2) + "%"}</strong></div>
            </section>
            <section className="fh-profit-card">
              <h3>Composição de custos</h3>
              <dl className="fh-profit-totals">
                <div><dt>Comissões do marketplace</dt><dd>{formatOptional(financialDetails.marketplace_fees)}</dd></div>
                <div><dt>Custo de mercadorias</dt><dd>{formatOptional(financialDetails.product_cost)}</dd></div>
                <div><dt>Tributos cadastrados</dt><dd>{formatOptional(financialDetails.taxes_configured)}</dd></div>
                <div><dt>Frete cadastrado</dt><dd>{formatOptional(financialDetails.shipping_configured)}</dd></div>
                <div><dt>Outros custos</dt><dd>{formatOptional(financialDetails.other_costs)}</dd></div>
              </dl>
              {financialDetails.fees_are_estimated &&
                <p className="fh-profit-hint">Uma ou mais comissões vieram da porcentagem cadastrada, não da tarifa realizada.</p>}
            </section>
            <section className="fh-profit-card"><h3>Produtos desta venda</h3>
              <div className="fh-financial-lines">
                {financialDetails.items.map((item, index) =>
                  <article key={item.item_id + ":" + index}>
                    <strong>{item.title}</strong><small>{item.quantity} un. · Bruto: {currency.format(item.gross)}</small>
                    <dl>
                      <div><dt>Comissão</dt><dd>{formatOptional(item.fee)}</dd></div>
                      <div><dt>Custo</dt><dd>{formatOptional(item.product_cost)}</dd></div>
                      <div><dt>Lucro estimado</dt><dd>{formatOptional(item.estimated_profit)}</dd></div>
                    </dl>
                  </article>)}
              </div>
            </section>
            <p className="fh-profit-hint">{financialDetails.note}</p>
          </>}
        </div>
      </section>
    </div>}
    {buyerOrder && <div className="fh-profit-backdrop" role="presentation"
      onMouseDown={e => { if (e.target === e.currentTarget) closeBuyer(); }}>
      <section className="fh-buyer-panel" role="dialog" aria-modal="true"
        aria-label="Dados do comprador">
        <header className="fh-profit-head">
          <div><span className="fh-profit-eyebrow">DADOS DE COMPRADOR · CONSULTA AUTORIZADA</span>
            <h2>Comprador do pedido</h2><p>Pedido {buyerOrder.external_id}</p></div>
          <button className="fh-control" type="button" onClick={closeBuyer} aria-label="Fechar">
            <X size={18}/>
          </button>
        </header>
        <div className="fh-profit-body">
          {buyerLoading && <p role="status">Buscando dados autorizados na API do Mercado Livre...</p>}
          {buyerError && <div className="fh-notice error" role="alert">{buyerError}</div>}
          {buyer && <>
            <section className="fh-profit-card">
              <h3>Identificação</h3>
              <dl className="fh-buyer-fields">
                <div><dt>ID</dt><dd>{safeText(buyer.buyer?.id)}</dd></div>
                <div><dt>Nome</dt><dd>{[buyer.buyer?.first_name,buyer.buyer?.last_name].filter(Boolean).join(" ") || "Não disponibilizado"}</dd></div>
                <div><dt>Usuário</dt><dd>{safeText(buyer.buyer?.nickname)}</dd></div>
                <div><dt>E-mail</dt><dd>{safeText(buyer.buyer?.email)}</dd></div>
                <div><dt>Telefone</dt><dd>{safeText(buyer.buyer?.phone)}</dd></div>
              </dl>
            </section>
            <section className="fh-profit-card">
              <h3>Entrega</h3>
              {buyer.delivery_address ? <dl className="fh-buyer-fields">
                {Object.entries(buyer.delivery_address).map(([key,value]) =>
                  <div key={key}><dt>{({
                    receiver_name:"Destinatário",receiver_phone:"Telefone",
                    contact:"Contato",street:"Rua",number:"Número",
                    address_line:"Endereço",zip_code:"CEP",neighborhood:"Bairro",
                    city:"Cidade",state:"Estado",country:"País",
                  } as Record<string,string>)[key] || key}</dt><dd>{safeText(value)}</dd></div>)}
              </dl> : <p>Dados de entrega não disponibilizados pela API para esta conta.</p>}
            </section>
            <section className="fh-profit-card">
              <h3>Dados fiscais</h3>
              {buyer.fiscal ? <dl className="fh-buyer-fields">
                <div><dt>Nome fiscal</dt><dd>{safeText(buyer.fiscal.name)}</dd></div>
                <div><dt>Tipo de documento</dt><dd>{safeText(buyer.fiscal.document_type)}</dd></div>
                <div><dt>CPF/CNPJ</dt><dd>{safeText(buyer.fiscal.document_number)}</dd></div>
              </dl> : <p>CPF/CNPJ indisponível ou não autorizado neste pedido.</p>}
            </section>
            <p className="fh-profit-hint">Informações privadas consultadas sob demanda;
              não são salvas pelo FluxHub neste fluxo. Utilize apenas para entrega,
              atendimento e obrigações fiscais autorizadas.</p>
          </>}
        </div>
      </section>
    </div>}
  </>;
}
