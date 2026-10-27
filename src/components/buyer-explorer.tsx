"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, ShoppingBag, Users } from "lucide-react";

type Buyer = {
  account_id: number; buyer_id: number; orders_count: number;
  gross_order_total: number;
};
type Order = { external_id: string; seller_id: number; status: string;
  created_at: string; total_amount: number; items: { title: string }[] };
type Contact = { buyer: Record<string, unknown>;
  delivery_address: Record<string, unknown> | null;
  fiscal: Record<string, unknown> | null };
const money = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const text = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entry = value as Record<string, unknown>;
    return [entry.area_code, entry.number, entry.extension].filter(Boolean).join(" ") || "Não informado";
  }
  return "Não informado";
};

export default function BuyerExplorer() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Buyer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const detailsRequest = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch("/api/platform/orders?action=buyers&offset=" + offset, {
      cache: "no-store", signal: controller.signal,
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Falha ao consultar clientes.");
      return d as Buyer[];
    }).then(value => { if(!controller.signal.aborted) setBuyers(value); })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Consulta indisponível.");
      }).finally(() => { if(!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [offset]);

  async function selectBuyer(buyer: Buyer) {
    const requestNumber = ++detailsRequest.current;
    setSelected(buyer); setOrders([]); setContact(null); setDetailLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ action:"buyer-orders",
        accountId:String(buyer.account_id), buyerId:String(buyer.buyer_id) });
      const r = await fetch("/api/platform/orders?" + q, { cache:"no-store" });
      const list = await r.json();
      if (!r.ok) throw new Error(list.error || "Histórico indisponível.");
      if (detailsRequest.current === requestNumber) setOrders(list as Order[]);
    } catch (e) {
      if (detailsRequest.current === requestNumber)
        setError(e instanceof Error ? e.message : "Falha no histórico.");
    } finally { if (detailsRequest.current === requestNumber) setDetailLoading(false); }
  }

  async function loadContact(order: Order) {
    const requestNumber = ++detailsRequest.current;
    setDetailLoading(true); setContact(null); setError("");
    try {
      const q = new URLSearchParams({ action:"buyer",
        accountId:String(order.seller_id), orderId:order.external_id });
      const r = await fetch("/api/platform/orders?" + q, { cache:"no-store" });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || "Dados privados não disponíveis.");
      if (detailsRequest.current === requestNumber) setContact(result as Contact);
    } catch (e) {
      if (detailsRequest.current === requestNumber)
        setError(e instanceof Error ? e.message : "Consulta não autorizada.");
    } finally { if (detailsRequest.current === requestNumber) setDetailLoading(false); }
  }

  const shown = buyers.filter(b => !search.trim() ||
    String(b.buyer_id).includes(search.trim()));
  return <>
    <section className="fh-card">
      <div className="fh-card-head">
        <div><h2>Compradores com pedidos registrados</h2>
          <p>Clientes da sua operação; dados privados aparecem somente após consulta explícita.</p></div>
      </div>
      <label className="fh-orders-search" style={{maxWidth:440}}>
        <Search size={17}/>
        <input aria-label="Buscar por ID do comprador" placeholder="Buscar por ID do comprador"
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </label>
      {error && <div className="fh-notice error" role="alert">{error}</div>}
      {loading && <p role="status">Carregando compradores...</p>}
      {!loading && buyers.length === 0 && <p>Nenhum comprador indexado.
        Sincronize os pedidos em Integrações para preencher esta seção.</p>}
      <div className="fh-buyers-grid">
        {shown.map(buyer => <button type="button" key={buyer.account_id+"-"+buyer.buyer_id}
          className="fh-buyer-card" onClick={() => void selectBuyer(buyer)}>
          <span className="fh-buyer-icon"><Users size={20}/></span>
          <span><strong>Comprador #{buyer.buyer_id}</strong>
            <small>{buyer.orders_count} compra(s) registrada(s)</small></span>
          <span className="fh-buyer-total">{money.format(buyer.gross_order_total)}</span>
        </button>)}
      </div>
      <div className="fh-inline-actions" style={{marginTop:16}}>
        <button className="fh-control" disabled={!offset||loading}
          onClick={()=>setOffset(Math.max(0,offset-50))}>Anterior</button>
        <span>Página {Math.floor(offset/50)+1}</span>
        <button className="fh-control" disabled={loading||buyers.length<50}
          onClick={()=>setOffset(offset+50)}>Próxima</button>
      </div>
    </section>
    {selected && <section className="fh-card" style={{marginTop:16}}>
      <div className="fh-card-head"><div>
        <h2>Histórico do comprador #{selected.buyer_id}</h2>
        <p>{selected.orders_count} pedido(s) na conta autorizada.</p>
      </div><button className="fh-control" onClick={()=>{
        detailsRequest.current++; setSelected(null);setOrders([]);setContact(null);
      }}>Fechar</button></div>
      {detailLoading && <p role="status">Consultando dados autorizados...</p>}
      {orders.map(order=><div className="fh-buyer-order" key={order.external_id}>
        <div><strong>{order.items.map(i=>i.title).filter(Boolean).join(", ")||"Itens não indexados"}</strong>
          <small>Pedido {order.external_id} · {new Date(order.created_at).toLocaleDateString("pt-BR")}
            {" · "}{order.status==="paid"?"Pago":order.status==="cancelled"?"Cancelado":order.status}</small></div>
        <strong>{money.format(order.total_amount)}</strong>
        <button className="fh-control" disabled={detailLoading} onClick={()=>void loadContact(order)}>
          <ShieldCheck size={15}/> Dados do comprador
        </button>
      </div>)}
      {contact && <div className="fh-profit-card" style={{marginTop:16}}>
        <h3>Dados disponibilizados pelo Mercado Livre</h3>
        <dl className="fh-buyer-fields">
          <div><dt>Nome</dt><dd>{[contact.buyer.first_name,contact.buyer.last_name].filter(Boolean).join(" ")||"Não informado"}</dd></div>
          <div><dt>E-mail</dt><dd>{text(contact.buyer.email)}</dd></div>
          <div><dt>Telefone</dt><dd>{text(contact.buyer.phone)}</dd></div>
          <div><dt>CPF/CNPJ</dt><dd>{text(contact.fiscal?.document_number)}</dd></div>
          <div><dt>Documento</dt><dd>{text(contact.fiscal?.document_type)}</dd></div>
          <div><dt>CEP</dt><dd>{text(contact.delivery_address?.zip_code)}</dd></div>
          <div><dt>Endereço</dt><dd>{text(contact.delivery_address?.address_line)}</dd></div>
          <div><dt>Cidade</dt><dd>{text(contact.delivery_address?.city)}</dd></div>
          <div><dt>Estado</dt><dd>{text(contact.delivery_address?.state)}</dd></div>
        </dl>
        <p className="fh-profit-hint">Dados consultados apenas agora, sem armazenamento local pelo FluxHub.</p>
      </div>}
      <p className="fh-profit-hint"><ShoppingBag size={15}/> Valores são brutos, incluindo
        pedidos cancelados. <Link href="/pedidos">Abrir página de Pedidos</Link></p>
    </section>}
  </>;
}
