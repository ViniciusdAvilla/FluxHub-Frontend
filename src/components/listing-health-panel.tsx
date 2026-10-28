"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

type Listing = {
  item_id: string; account_id: number; title: string;
  listing_status: string; price: number; health: string;
  profit: number | null; margin: number | null;
};
type Page = {
  total: number; counts: Record<string,number>;
  items: Listing[]; note: string; basis: string;
};
const money = (value:number|null) =>
  value === null ? "—" : new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value);
const statusLabels: Record<string,string> = {
  healthy:"Saudável", attention:"Margem baixa", loss:"Prejuízo",
  incomplete:"Sem dados de custo/taxa",
};

export default function ListingHealthPanel() {
  const [page,setPage] = useState<Page|null>(null);
  const [query,setQuery] = useState("");
  const [search,setSearch] = useState("");
  const [offset,setOffset] = useState(0);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  useEffect(() => {
    const id = setTimeout(()=>setSearch(query.trim()),350);
    return ()=>clearTimeout(id);
  },[query]);
  useEffect(() => setOffset(0),[search]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);setError("");
    const q = new URLSearchParams({offset:String(offset),limit:"30",search});
    fetch("/api/platform/listing-health?"+q,{signal:controller.signal,cache:"no-store"})
      .then(async response=>{
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Falha na consulta");
        return data as Page;
      }).then(data=>{if(!controller.signal.aborted)setPage(data);})
      .catch(reason=>{if(!controller.signal.aborted)setError(
        reason instanceof Error?reason.message:"Consulta indisponível");})
      .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return ()=>controller.abort();
  },[offset,search]);
  const counts=page?.counts??{};
  return <section className="fh-card fh-listing-health">
    <div className="fh-card-head"><div><h2>Saúde financeira dos anúncios</h2>
      <p>Lucro por unidade estimado com custo, comissão e impostos cadastrados.</p></div>
      <span className="fh-pill">Base estimada</span>
    </div>
    <div className="fh-listing-health-summary" aria-label="Distribuição da saúde dos anúncios">
      {[
        ["healthy","Saudáveis"],["attention","Margem baixa"],
        ["loss","Em prejuízo"],["incomplete","Sem dados suficientes"],
      ].map(([key,label])=><div key={key}><span>{label}</span>
        <strong>{(counts[key]||0).toLocaleString("pt-BR")}</strong></div>)}
    </div>
    <label className="fh-smart-search"><Search size={17}/>
      <input value={query} onChange={event=>setQuery(event.target.value)}
        aria-label="Buscar anúncio por nome ou código" placeholder="Buscar anúncio ou código"/>
    </label>
    {error&&<p className="fh-notice error" role="alert">{error}</p>}
    {busy&&<p role="status" className="fh-profit-hint">Atualizando saúde dos anúncios...</p>}
    {!busy&&page&&!page.items.length&&<p className="fh-notice">Nenhum anúncio encontrado.</p>}
    <div className="table-wrap"><table><thead><tr>
      <th>Anúncio</th><th>Preço</th><th>Lucro estimado/un.</th><th>Margem</th><th>Situação</th>
    </tr></thead>
      <tbody>{(page?.items||[]).map(item=><tr key={item.account_id+":"+item.item_id}>
        <td><Link href={"/produtos/"+encodeURIComponent(item.item_id)+"?account="+item.account_id}>
          <strong>{item.title}</strong><small className="cell-sub">{item.item_id}</small>
        </Link></td>
        <td>{money(item.price)}</td>
        <td>{money(item.profit)}</td>
        <td>{item.margin===null?"—":item.margin.toFixed(2)+"%"}</td>
        <td><span className={"fh-listing-health-badge "+item.health}>
          {statusLabels[item.health]||"Indisponível"}</span></td>
      </tr>)}</tbody>
    </table></div>
    <div className="fh-inline-actions fh-smart-pagination">
      <button className="fh-control" type="button" disabled={offset===0||busy}
        onClick={()=>setOffset(Math.max(0,offset-30))}><ChevronLeft size={16}/> Anterior</button>
      <span>{page? (offset+1)+"–"+(offset+page.items.length)+" de "+page.total.toLocaleString("pt-BR"):"—"}</span>
      <button className="fh-control" type="button" disabled={busy||!page||offset+30>=page.total}
        onClick={()=>setOffset(offset+30)}>Próximos <ChevronRight size={16}/></button>
    </div>
    <p className="fh-profit-hint">{page?.note||"Valores ausentes não são estimados automaticamente."}</p>
  </section>;
}
