"use client";

import { useMemo, useState } from "react";
import { Boxes, ExternalLink, RefreshCw, ScanSearch, Search, Store, TriangleAlert } from "lucide-react";
import { money, percent } from "@/lib/analytics";
import type { ProductRow, RaioXResult, Tone } from "@/lib/types";

function Status({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`status ${tone}`}><i />{children}</span>;
}

function pricePosition(result: RaioXResult) {
  if (result.market.pricePosition === "above") return "Acima do mercado";
  if (result.market.pricePosition === "below") return "Abaixo da mediana";
  if (result.market.pricePosition === "competitive") return "Preço competitivo";
  return "Sem base suficiente";
}

export default function RaioXPanel({ products }: { products: ProductRow[] }) {
  const [activeTab, setActiveTab] = useState<"ads" | "catalog">("ads");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [result, setResult] = useState<RaioXResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [catalogResults, setCatalogResults] = useState<RaioXResult[]>([]);
  const [error, setError] = useState("");
  const [marketplace, setMarketplace] = useState("");
  const selected = products.find((item) => item.id === productId) ?? products[0];
  const marketplaces = useMemo(() => result ? [...new Set(result.listings.map((item) => item.marketplace))] : [], [result]);
  const listings = useMemo(() => result?.listings.filter((item) => !marketplace || item.marketplace === marketplace) ?? [], [result, marketplace]);

  async function run(force = false) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/raio-x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selected.id, force }),
        signal: AbortSignal.timeout(35000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível analisar o anúncio.");
      setResult(body.data as RaioXResult);
      setMarketplace("");
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "Não foi possível analisar o anúncio.");
    } finally {
      setBusy(false);
    }
  }

  async function runBatch() {
    const ids = products.slice(0, 8).map((item) => item.id);
    if (!ids.length) return;
    setBatchBusy(true);
    setError("");
    try {
      const response = await fetch("/api/raio-x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids }),
        signal: AbortSignal.timeout(120000),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível analisar o catálogo.");
      setCatalogResults(body.data as RaioXResult[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível analisar o catálogo.");
    } finally {
      setBatchBusy(false);
    }
  }

  const catalogSummary = useMemo(() => {
    if (!catalogResults.length) return null;
    const average = Math.round(catalogResults.reduce((sum, item) => sum + item.score, 0) / catalogResults.length);
    return {
      average,
      good: catalogResults.filter((item) => item.tone === "good").length,
      warning: catalogResults.filter((item) => item.tone === "warning").length,
      bad: catalogResults.filter((item) => item.tone === "bad").length,
      above: catalogResults.filter((item) => item.market.pricePosition === "above").length,
    };
  }, [catalogResults]);

  if (!products.length) return <div className="empty-state"><TriangleAlert size={28} /><h3>Sem produtos</h3><p>Não há produtos disponíveis para análise.</p></div>;

  return <div className="raiox-stack">
    <div className="subtabs" role="tablist" aria-label="Seções do Raio-X">
      <button role="tab" aria-selected={activeTab === "ads"} className={activeTab === "ads" ? "active" : ""} onClick={() => { setActiveTab("ads"); setError(""); }}><ScanSearch size={15} /> Anúncios</button>
      <button role="tab" aria-selected={activeTab === "catalog"} className={activeTab === "catalog" ? "active" : ""} onClick={() => { setActiveTab("catalog"); setError(""); }}><Boxes size={15} /> Catálogo</button>
    </div>

    {activeTab === "ads" && <>
      <div className="raiox-selector single-analysis">
        <label className="field"><span>Produto do seu catálogo</span><select value={productId} onChange={(event) => { setProductId(event.target.value); setResult(null); setError(""); }}>
          {products.map((product) => <option key={product.id} value={product.id}>{product.title} · {product.brand} · {product.id}</option>)}
        </select></label>
        <div className="raiox-product-price"><span>Seu preço</span><strong>{money(selected?.price ?? null)}</strong></div>
        <div className="raiox-actions"><button className="button primary" onClick={() => run(false)} disabled={busy}><ScanSearch size={16} />{busy ? "Analisando mercado" : "Executar Raio-X"}</button></div>
      </div>

      {error && <div className="notice bad">{error}</div>}

      {result && <>
        {result.warnings.map((warning) => <div className="notice warning" key={warning}>{warning}</div>)}
        <div className="metric-grid four">
          <article className="metric-card"><div className="metric-top"><span>Nota do anúncio</span><ScanSearch size={18} /></div><strong className={`metric-value text-${result.tone}`}>{result.score}/100</strong><small>Qualidade + competitividade</small></article>
          <article className="metric-card"><div className="metric-top"><span>Preço de mercado</span><Store size={18} /></div><strong className="metric-value">{money(result.market.medianPrice)}</strong><small>Mediana de {result.market.matches} anúncio(s)</small></article>
          <article className="metric-card"><div className="metric-top"><span>Diferença</span><Search size={18} /></div><strong className={`metric-value text-${result.market.priceTone}`}>{result.market.priceDeltaPercent === null ? "—" : `${result.market.priceDeltaPercent > 0 ? "+" : ""}${percent(result.market.priceDeltaPercent)}`}</strong><small>{pricePosition(result)}</small></article>
          <article className="metric-card"><div className="metric-top"><span>Marketplaces</span><Store size={18} /></div><strong className="metric-value">{result.market.marketplaces}</strong><small>{result.providers.join(" + ") || "Nenhum provedor configurado"}</small></article>
        </div>

        <div className="raiox-grid">
          <section className="panel raiox-checks"><header className="panel-head"><div><h2>Diagnóstico do anúncio</h2><p>O que está bom e o que deve ser corrigido.</p></div><button className="button small" onClick={() => run(true)} disabled={busy}><RefreshCw className={busy ? "spin" : ""} size={15} /> Reconsultar</button></header>
            <div className="check-list">{result.checks.map((check) => <div className="check-row" key={check.key}><div><strong>{check.label}</strong><p>{check.detail}</p></div><div className="check-score"><Status tone={check.tone}>{check.tone === "good" ? "Bom" : check.tone === "warning" ? "Atenção" : check.tone === "bad" ? "Ruim" : "Sem dado"}</Status><span>{check.score}/{check.maxScore}</span></div></div>)}</div>
          </section>
          <section className="panel"><header className="panel-head"><div><h2>Faixa de preço encontrada</h2><p>Comparação apenas entre anúncios com similaridade mínima.</p></div></header>
            <div className="market-price-grid"><div><span>Menor</span><strong>{money(result.market.minPrice)}</strong></div><div><span>Mediana</span><strong>{money(result.market.medianPrice)}</strong></div><div><span>Média</span><strong>{money(result.market.averagePrice)}</strong></div><div><span>Maior</span><strong>{money(result.market.maxPrice)}</strong></div></div>
            <div className="query-box"><span>Busca usada</span><code>{result.query}</code></div>
          </section>
        </div>

        <section className="panel"><header className="panel-head"><div><h2>Concorrentes encontrados</h2><p>Shopee, Mercado Livre, Amazon, Magalu e outras lojas aparecem quando estiverem presentes na busca.</p></div>{marketplaces.length > 1 && <select value={marketplace} onChange={(event) => setMarketplace(event.target.value)}><option value="">Todos os marketplaces</option>{marketplaces.map((item) => <option key={item}>{item}</option>)}</select>}</header>
          {listings.length ? <div className="market-list">{listings.map((item) => <article className="market-card" key={`${item.marketplace}-${item.id}-${item.url}`}>
            <div className="market-thumb">{item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" /> : <Store size={22} />}</div>
            <div className="market-info"><div className="market-source"><span>{item.marketplace}</span><small>{item.source}</small></div><strong>{item.title}</strong><div className="market-meta"><b>{money(item.price)}</b>{item.rating !== null && <span>★ {item.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>}<span>{Math.round(item.similarity * 100)}% compatível</span>{item.freeShipping === true && <span>Frete grátis</span>}</div></div>
            <a className="icon-button" href={item.url} target="_blank" rel="noreferrer" aria-label="Abrir anúncio"><ExternalLink size={16} /></a>
          </article>)}</div> : <div className="empty-state"><Search size={28} /><h3>Nenhum concorrente compatível</h3><p>Refine título, fabricante e Part Number do produto ou configure os provedores externos.</p></div>}
        </section>
      </>}
    </>}

    {activeTab === "catalog" && <>
      <section className="panel catalog-action-panel">
        <header className="panel-head"><div><h2>Raio-X do catálogo</h2><p>Analisa até {Math.min(products.length, 8)} produtos do recorte atual para comparar qualidade e competitividade dos anúncios.</p></div><button className="button primary" onClick={runBatch} disabled={batchBusy}><Search size={16} />{batchBusy ? "Analisando catálogo" : `Analisar ${Math.min(products.length, 8)} produtos`}</button></header>
        {!catalogResults.length && !batchBusy && <div className="empty-state compact-empty"><Boxes size={28} /><h3>Catálogo pronto para análise</h3><p>Use os filtros da página para definir os produtos e execute o Raio-X em lote.</p></div>}
      </section>

      {error && <div className="notice bad">{error}</div>}

      {catalogSummary && <section className="panel"><header className="panel-head"><div><h2>Resumo do catálogo</h2><p>Resultado dos primeiros {catalogResults.length} produtos filtrados; as consultas ficam em cache para evitar custo repetido.</p></div></header>
        <div className="catalog-raiox-summary"><div><Status tone={catalogSummary.average >= 75 ? "good" : catalogSummary.average >= 50 ? "warning" : "bad"}>Nota média</Status><strong>{catalogSummary.average}/100</strong></div><div><Status tone="good">Bom</Status><strong>{catalogSummary.good}</strong></div><div><Status tone="warning">Atenção</Status><strong>{catalogSummary.warning}</strong></div><div><Status tone="bad">Ruim</Status><strong>{catalogSummary.bad}</strong></div><div><Status tone={catalogSummary.above ? "bad" : "good"}>Preço alto</Status><strong>{catalogSummary.above}</strong></div></div>
        <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Fabricante</th><th>Nota</th><th>Seu preço</th><th>Mediana mercado</th><th>Diferença</th><th>Concorrentes</th><th>Situação</th></tr></thead><tbody>{catalogResults.map((item) => { const product = products.find((p) => p.id === item.productId); return <tr key={item.productId} className="click-row" onClick={() => { setProductId(item.productId); setResult(item); setMarketplace(""); setActiveTab("ads"); }}><td><strong>{item.productTitle}</strong><small className="cell-sub">{item.productId}</small></td><td>{product?.brand ?? "—"}</td><td className={`text-${item.tone}`}><strong>{item.score}/100</strong></td><td>{money(product?.price ?? null)}</td><td>{money(item.market.medianPrice)}</td><td className={`text-${item.market.priceTone}`}>{item.market.priceDeltaPercent === null ? "—" : `${item.market.priceDeltaPercent > 0 ? "+" : ""}${percent(item.market.priceDeltaPercent)}`}</td><td>{item.market.matches}</td><td><Status tone={item.tone}>{item.tone === "good" ? "Bom" : item.tone === "warning" ? "Atenção" : "Ruim"}</Status></td></tr>; })}</tbody></table></div>
      </section>}
    </>}
  </div>;
}
