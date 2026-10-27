"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Save, X } from "lucide-react";

export type PricingSeed = {
  item_id: string;
  title: string;
  thumbnail?: string | null;
  unit_price: number;
  quantity?: number;
  sale_fee?: number | null;
  unit_cost?: number | null;
  tax_percent?: number | null;
  configured_shipping?: number | null;
  other_cost?: number | null;
  sku?: string | null;
  order_id?: string;
  order_date?: string;
};
type Quote = {
  title?: string;
  thumbnail?: string | null;
  price?: number;
  fee_quote?: number | null;
  fee_estimate_unavailable?: boolean;
  cost?: {
    unit_cost: number; tax_percent: number; shipping_cost: number;
    other_cost: number; marketplace_fee_percent: number | null;
  } | null;
};
const states: Record<string, number> = {
  AC: 12, AL: 11, AM: 12, AP: 12, BA: 13, CE: 13, DF: 13,
  ES: 10, GO: 12, MA: 13, MG: 11, MS: 10, MT: 10, PA: 12,
  PB: 13, PE: 13, PI: 13, PR: 12, RJ: 13, RN: 13, RO: 12,
  RR: 12, RS: 12, SC: 10, SE: 13, SP: 11, TO: 12,
};
const brazilian = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL",
});
const format = (value: number | null) =>
  value === null || !Number.isFinite(value) ? "—" : brazilian.format(value);
const positive = (n: number) => Number.isFinite(n) && n >= 0 ? n : 0;
const validPhoto = (url: string | null | undefined) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" &&
      (u.hostname === "mlstatic.com" || u.hostname.endsWith(".mlstatic.com"));
  } catch { return false; }
};

export default function PricingCalculator({
  seed, accountId, onClose,
}: { seed: PricingSeed; accountId: number; onClose: () => void }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshingFee, setRefreshingFee] = useState(false);
  const [sale, setSale] = useState(seed.unit_price * (seed.quantity || 1));
  const [fee, setFee] = useState(seed.sale_fee ?? 0);
  const [feePct, setFeePct] = useState(0);
  const [cost, setCost] = useState(seed.unit_cost ?? 0);
  const [knownCost, setKnownCost] = useState(seed.unit_cost !== null && seed.unit_cost !== undefined);
  const [freight, setFreight] = useState(seed.configured_shipping ?? 0);
  const [otherCost, setOtherCost] = useState(seed.other_cost ?? 0);
  const [reimburse, setReimburse] = useState(0);
  const [icms, setIcms] = useState(seed.tax_percent ?? 7);
  const [destination, setDestination] = useState("PR");
  const [difal, setDifal] = useState(states.PR);
  const [credit, setCredit] = useState(0);
  const [ir, setIr] = useState(34);
  const [target, setTarget] = useState(10);
  const [pasted, setPasted] = useState("");
  const qty = seed.quantity || 1;

  useEffect(() => {
    const controller = new AbortController();
    setQuote(null);
    setLoading(true);
    setNotice("");
    setSale(seed.unit_price * (seed.quantity || 1));
    setFee(seed.sale_fee ?? 0);
    setCost(seed.unit_cost ?? 0);
    setKnownCost(seed.unit_cost !== null && seed.unit_cost !== undefined);
    setFreight(seed.configured_shipping ?? 0);
    setOtherCost(seed.other_cost ?? 0);
    setIcms(seed.tax_percent ?? 7);
    const q = new URLSearchParams({
      itemId: seed.item_id, accountId: String(accountId),
    });
    fetch("/api/platform/pricing?" + q, { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Cotação indisponível.");
        return data as Quote;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setQuote(data);
        if (data.cost) {
          setCost(data.cost.unit_cost);
          setKnownCost(true);
          setFreight(data.cost.shipping_cost);
          setOtherCost(data.cost.other_cost);
          setIcms(data.cost.tax_percent);
        }
        if (typeof data.fee_quote === "number" && Number(data.price) > 0) {
          setFeePct(data.fee_quote / Number(data.price) * 100);
          if (seed.sale_fee === null || seed.sale_fee === undefined)
            setFee(data.fee_quote * (seed.quantity || 1));
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setNotice(
          (err instanceof Error ? err.message : "Cotação indisponível.") +
          " É possível calcular manualmente.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [seed.item_id, seed.unit_price, seed.quantity, seed.sale_fee, seed.unit_cost,
      seed.configured_shipping, seed.other_cost, seed.tax_percent, accountId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const result = useMemo(() => {
    const fees = positive(fee);
    const taxes = sale * (positive(icms) + positive(difal)) / 100;
    const productCost = positive(cost) * qty;
    const received = sale - fees - positive(freight) + positive(reimburse);
    const preIr = received - productCost - taxes + positive(credit) - positive(otherCost);
    const incomeTax = Math.max(0, preIr) * positive(ir) / 100;
    const net = preIr - incomeTax;
    const margin = sale > 0 ? net / sale * 100 : 0;
    const commissionPct = positive(feePct) || (sale > 0 ? fees / sale * 100 : 0);
    const combined = (commissionPct + positive(icms) + positive(difal)) / 100;
    const factor = 1 - positive(ir) / 100;
    const fixed = positive(freight) + productCost + positive(otherCost) -
      positive(credit) - positive(reimburse);
    const denominator = factor * (1 - combined) - positive(target) / 100;
    const recommended = denominator > 0 && knownCost ? Math.max(0, factor * fixed / denominator) : null;
    return { fees, taxes, received, productCost, preIr, incomeTax, net, margin, recommended };
  }, [sale, fee, feePct, freight, reimburse, cost, qty, icms, difal, credit, otherCost, ir, target, knownCost]);

  function applyPastedSale() {
    const extract = (key: RegExp) => pasted.match(key)?.[1]?.trim() || "";
    const readMoney = (raw: string) => {
      if (!raw) return null;
      const number = Number(raw.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", "."));
      return Number.isFinite(number) ? number : null;
    };
    const saleText = extract(/(?:preço de venda|valor da venda|total da venda|valor pago)\s*[:=]\s*(?:R\$\s*)?([\d.,]+)/i);
    const freightText = extract(/(?:frete|custo do envio)\s*[:=]\s*(?:R\$\s*)?([\d.,]+)/i);
    const reimburseText = extract(/(?:estorno|reembolso ao vendedor)\s*[:=]\s*(?:R\$\s*)?([\d.,]+)/i);
    const nextSale = readMoney(saleText);
    const nextFreight = readMoney(freightText);
    const nextReimburse = readMoney(reimburseText);
    if (nextSale !== null) setSale(nextSale);
    if (nextFreight !== null) setFreight(nextFreight);
    if (nextReimburse !== null) setReimburse(nextReimburse);
    setNotice(nextSale !== null || nextFreight !== null || nextReimburse !== null
      ? "Dados reconhecidos foram preenchidos. Confira antes de calcular."
      : "Nenhum valor identificado. Use linhas como Valor da venda: R$ 199,90.");
  }

  async function reprice() {
    if (sale <= 0 || qty <= 0) return;
    setRefreshingFee(true); setNotice("");
    const q = new URLSearchParams({
      itemId: seed.item_id, accountId: String(accountId),
      price: String(sale / qty),
    });
    try {
      const response = await fetch("/api/platform/pricing?" + q, { cache: "no-store" });
      const data = await response.json() as Quote & { error?: string };
      if (!response.ok || typeof data.fee_quote !== "number")
        throw new Error(data.error || "Cotação não disponível para este valor.");
      setQuote(data);
      setFee(data.fee_quote * qty);
      setFeePct(data.fee_quote / (sale / qty) * 100);
      setNotice("Comissão atualizada conforme cotação do Mercado Livre para o preço informado.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível recotar.");
    } finally { setRefreshingFee(false); }
  }

  async function saveCost() {
    setSaving(true); setNotice("");
    try {
      const response = await fetch("/api/platform/pricing", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: seed.item_id, accountId, unit_cost: positive(cost),
          marketplace_fee_percent: feePct || null,
          tax_percent: positive(icms), shipping_cost: positive(freight),
          other_cost: positive(otherCost),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível salvar.");
      setKnownCost(true);
      setNotice("Custos atualizados no FluxHub. Parâmetros fiscais avançados ficam nesta simulação.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally { setSaving(false); }
  }

  const numberInput = (label: string, value: number, setter: (n: number) => void,
                       suffix = "R$") => <label className="fh-profit-field">
    <span>{label}</span>
    <span className="fh-profit-input-wrap"><input type="number" min="0" step="0.01"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => setter(Number(e.target.value))}/><small>{suffix}</small></span>
  </label>;
  const thumbnail = quote?.thumbnail || seed.thumbnail;
  return <div className="fh-profit-backdrop" role="presentation"
    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="fh-profit-panel" role="dialog" aria-modal="true"
      aria-label="Calculadora de Precificação e Lucro Líquido">
      <header className="fh-profit-head">
        <div><span className="fh-profit-eyebrow"><Calculator size={16}/> FLUXHUB · MERCADO LIVRE</span>
          <h2>Calculadora de Precificação e Lucro Líquido</h2>
          <p>Dados do anúncio e da venda preenchidos quando disponíveis.</p></div>
        <button type="button" className="fh-control" aria-label="Fechar calculadora"
          onClick={onClose}><X size={18}/></button>
      </header>
      <div className="fh-profit-body">
        <section className="fh-profit-card fh-profit-product">
          {validPhoto(thumbnail) ? <img src={thumbnail!} alt={seed.title} width={76} height={76}/> :
            <span className="fh-profit-image-placeholder">Foto indisponível</span>}
          <div><strong>{quote?.title || seed.title}</strong>
            <small>ML: {seed.item_id} {seed.sku ? "· SKU: " + seed.sku : ""}
              {seed.order_id ? " · Pedido: " + seed.order_id : ""}</small>
            {loading && <span role="status">Consultando tarifas do Mercado Livre...</span>}
          </div>
        </section>
        {notice && <div className="fh-notice" role="status">{notice}</div>}
        <details className="fh-profit-card fh-profit-paste">
          <summary>Colar dados do Mercado Livre (opcional)</summary>
          <p className="fh-profit-hint">A integração preenche a venda automaticamente.
            Se tiver um resumo copiado, cole abaixo para conferir os valores.</p>
          <textarea rows={4} aria-label="Dados da venda copiados do Mercado Livre"
            placeholder={"Valor da venda: R$ 199,90\nFrete: R$ 12,00\nEstorno: R$ 0,00"}
            value={pasted} onChange={event => setPasted(event.target.value)}/>
          <button className="fh-control" type="button" onClick={applyPastedSale}>Interpretar dados</button>
        </details>
        <div className="fh-profit-columns">
          <div className="fh-profit-stack">
            <section className="fh-profit-card">
              <h3>Venda Mercado Livre</h3>
              <div className="fh-profit-grid">
                {numberInput("Preço da venda", sale, setSale)}
                {numberInput("Comissão cobrada ou estimada", fee, setFee)}
                {numberInput("Frete do vendedor", freight, setFreight)}
                {numberInput("Estornos e reembolsos ao vendedor", reimburse, setReimburse)}
                {numberInput("Taxa equivalente para simulações", feePct, setFeePct, "%")}
              </div>
              <button className="fh-control" type="button" disabled={refreshingFee}
                onClick={() => void reprice()}>
                {refreshingFee ? "Consultando tarifa..." : "Atualizar tarifa para este preço"}
              </button>
              <p className="fh-profit-hint">
                {seed.sale_fee !== null && seed.sale_fee !== undefined
                  ? "Comissão recebida no item do pedido pela API."
                  : quote?.fee_quote != null
                    ? "Comissão cotada pela API. Pode variar se o preço mudar."
                    : "Comissão não disponível; informe a tarifa real ou estimada."}
              </p>
            </section>
            <section className="fh-profit-card">
              <h3>Custo e tributação</h3>
              <div className="fh-profit-grid">
                {numberInput("Custo de compra (por unidade)", cost, setCost)}
                {numberInput("ICMS próprio", icms, setIcms, "%")}
                <label className="fh-profit-field"><span>UF de destino</span>
                  <select value={destination} onChange={(e) => {
                    setDestination(e.target.value); setDifal(states[e.target.value] ?? 0);
                  }}>{Object.keys(states).sort().map(uf=><option value={uf} key={uf}>{uf}</option>)}</select>
                </label>
                {numberInput("DIFAL (configurável)", difal, setDifal, "%")}
                {numberInput("Crédito de ICMS na compra", credit, setCredit)}
                {numberInput("Outros custos", otherCost, setOtherCost)}
                {numberInput("IRPJ + CSLL sobre resultado positivo", ir, setIr, "%")}
                {numberInput("Meta de lucro líquido", target, setTarget, "%")}
              </div>
              <p className="fh-profit-hint">Percentuais fiscais são parâmetros editáveis e
                precisam ser validados para o regime da sua empresa. O Mercado Livre não
                fornece o custo de compra nem a apuração tributária completa.</p>
              <button className="fh-primary-btn" type="button"
                disabled={saving} onClick={() => void saveCost()}>
                <Save size={15}/> {saving ? "Salvando..." : "Salvar custo e configurações básicas"}
              </button>
            </section>
          </div>
          <div className="fh-profit-stack">
            <section className="fh-profit-card">
              <h3>Fechamento da venda</h3>
              <dl className="fh-profit-totals">
                <div><dt>Preço da venda</dt><dd>{format(sale)}</dd></div>
                <div><dt>Comissão Mercado Livre</dt><dd>- {format(result.fees)}</dd></div>
                <div><dt>Frete</dt><dd>- {format(freight)}</dd></div>
                <div><dt>Estornos recebidos</dt><dd>+ {format(reimburse)}</dd></div>
                <div><dt>Total após descontos ML</dt><dd>{format(result.received)}</dd></div>
                <div><dt>Custo dos produtos ({qty} un.)</dt><dd>- {format(result.productCost)}</dd></div>
                <div><dt>ICMS + DIFAL</dt><dd>- {format(result.taxes)}</dd></div>
                <div><dt>Créditos fiscais</dt><dd>+ {format(credit)}</dd></div>
                <div><dt>Outros custos</dt><dd>- {format(otherCost)}</dd></div>
                <div><dt>Lucro antes de IRPJ/CSLL</dt><dd>{format(result.preIr)}</dd></div>
                <div><dt>IRPJ/CSLL projetados</dt><dd>- {format(result.incomeTax)}</dd></div>
              </dl>
            </section>
            <section className="fh-profit-card fh-profit-results">
              <div><span>Lucro líquido calculado</span><strong className={result.net >= 0 ? "positive" : "negative"}>
                {knownCost ? format(result.net) : "Informe o custo"}
              </strong></div>
              <div><span>Margem líquida</span><strong>{knownCost ? result.margin.toFixed(2).replace(".", ",") + "%" : "—"}</strong></div>
              <div><span>Preço para {target}% líquido</span><strong>{format(result.recommended)}</strong></div>
              <p>Simulação financeira. O preço-alvo usa a tarifa proporcional
                informada; confirme a tarifa oficial para o novo preço.
                Lucro efetivamente realizado exige frete, impostos, custo
                e eventuais devoluções conciliados.</p>
            </section>
          </div>
        </div>
      </div>
    </section>
  </div>;
}
