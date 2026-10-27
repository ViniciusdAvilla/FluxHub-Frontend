"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Search,
  ShieldCheck, SlidersHorizontal, Wallet, X } from "lucide-react";
import PricingCalculator, { type PricingSeed } from "./pricing-calculator";

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
type BuyerDetail = {
  buyer: Record<string, unknown>; delivery_address: Record<string, unknown> | null;
  fiscal: Record<string, unknown> | null;
  delivery_data_available: boolean; fiscal_data_available: boolean;
};
type Mode = "sales" | "orders";
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const labels: Record<string, string> = {
  paid: "Pago", cancelled: "Cancelado", confirmed: "Confirmado",
  payment_required: "Aguardando pagamento",
  payment_in_process: "Pagamento em processamento",
  partially_paid: "Parcialmente pago", refunded: "Reembolsado",
  invalid: "Inválido",
};
const prettyStatus = (value: string) =>
  labels[value] || (value ? "Outro: " + value.replaceAll("_", " ") : "Não informado");
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
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<{ seed: PricingSeed; account: number } | null>(null);
  const [buyerOrder, setBuyerOrder] = useState<Order | null>(null);
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [buyerError, setBuyerError] = useState("");
  const [buyer, setBuyer] = useState<BuyerDetail | null>(null);
  const buyerRequest = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { setOffset(0); }, [status, days, debounced, accountId, minAmount, maxAmount]);
  useEffect(() => {
    const controller = new AbortController();
    const q = new URLSearchParams({ action: "orders", days, status,
      search: debounced, offset: String(offset) });
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
  }, [days, status, debounced, offset, accountId, minAmount, maxAmount]);

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
      {loading && <p role="status" className="fh-orders-loading">Consultando pedidos sincronizados...</p>}
      {!loading && !error && page?.orders.length === 0 &&
        <div className="fh-orders-empty">Nenhum pedido armazenado neste período. Ajuste os filtros ou <Link href="/integracoes">atualize pedidos e faturamento</Link>.</div>}
      <div className="fh-orders-list">
        {(page?.orders || []).map(order => <article className="fh-orders-card"
          key={order.seller_id + "-" + order.external_id}>
          <div className="fh-orders-card-top">
            <span>{new Date(order.created_at).toLocaleString("pt-BR")}</span>
            <button type="button" onClick={() => { setStatus(order.status); setOffset(0); }}
              className={"fh-orders-pill " + (order.status === "paid" ? "success" :
                order.status === "cancelled" ? "danger" : "neutral")}>
              {prettyStatus(order.status)}
            </button>
          </div>
          {order.items.length === 0 && <div className="fh-orders-product">
            <span className="fh-orders-image-fallback">—</span>
            <span className="fh-orders-title">
              <strong>Detalhes dos produtos ainda não importados</strong>
              <small>O pedido está no banco, mas seus itens precisam de uma atualização.
                {" "}<Link href="/integracoes">Atualizar pedidos e faturamento</Link>
              </small>
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
            <button type="button" className="fh-control" onClick={() => void openBuyer(order)}>
              <ShieldCheck size={15}/> Dados do comprador
            </button>
          </div>
        </article>)}
      </div>
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
