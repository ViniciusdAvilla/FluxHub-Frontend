"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Save, X } from "lucide-react";
import { comparePurchaseOrigins, priceForNetMargin, simulateTaxProfit } from "@/lib/tax-engine";

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
  listing_type_id?: string | null;
  fee_source?: string;
  cost?: {
    unit_cost: number; tax_percent: number; shipping_cost: number;
    other_cost: number; marketplace_fee_percent: number | null;
  } | null;
};
// UF is context only; no fixed DIFAL is assumed from an address alone.
const brazilStates = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" ");
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
  const [icms, setIcms] = useState(seed.tax_percent ?? 0);
  const [destination, setDestination] = useState("");
  const [difal, setDifal] = useState(0);
  const [credit, setCredit] = useState(0);
  const [corporateTax, setCorporateTax] = useState<"none" | "lucro-real-projection">("none");
  const [monthlyProfit, setMonthlyProfit] = useState(0);
  const [spCost, setSpCost] = useState("");
  const [esCost, setEsCost] = useState("");
  const [spCreditRate, setSpCreditRate] = useState(0);
  const [esCreditRate, setEsCreditRate] = useState(0);
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
    setIcms(seed.tax_percent ?? 0);
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
    const input = {
      grossSale: sale, quantity: qty, feeAmount: fee, freight,
      sellerReimbursements: reimburse, unitCost: cost,
      otherCosts: otherCost, icmsRate: icms, difalRate: difal,
      icmsCredit: credit, corporateTax,
      monthlyTaxableProfitBeforeSale: monthlyProfit,
      irpjRate: 15, irpjAdditionalRate: 10, csllRate: 9,
      additionalIrpjMonthlyThreshold: 20000,
    } as const;
    const summary = simulateTaxProfit(input);
    const commissionPct = feePct || (sale > 0 ? fee * 100 / sale : 0);
    const recommended = knownCost ? priceForNetMargin(input, target, commissionPct) : null;
    return {
      fees: summary.feeAmount,
      taxes: summary.icms + summary.difal, received: summary.afterMarketplace,
      productCost: summary.productCost, preIr: summary.beforeCorporate,
      incomeTax: summary.corporateTaxes, net: summary.netProfit,
      margin: summary.netMargin ?? 0, recommended, irpj: summary.irpj,
      irpjAdditional: summary.irpjAdditional, csll: summary.csll,
    };
  }, [sale, fee, feePct, freight, reimburse, cost, qty, icms, difal, credit,
    otherCost, corporateTax, monthlyProfit, target, knownCost]);
  const purchaseComparison = useMemo(() => comparePurchaseOrigins({
    quantity: qty, spUnitCost: spCost === "" ? null : Number(spCost),
    esUnitCost: esCost === "" ? null : Number(esCost),
    spCreditRate, esCreditRate,
  }), [qty, spCost, esCost, spCreditRate, esCreditRate]);
  const officialFeeAvailable = seed.sale_fee != null || quote?.fee_quote != null;
  const hasFee = officialFeeAvailable || feePct > 0;
  const status = !knownCost || !hasFee ? "Dados incompletos" :
    result.net < 0 ? "Prejuízo" : result.margin < 10 ? "Atenção" : "Saudável";

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
              <div className="fh-inline-actions">
                <button type="button" className="fh-control" onClick={() => {
                  setFeePct(12); setFee(sale * 0.12);
                }}>Simular Clássico 12%</button>
                <button type="button" className="fh-control" onClick={() => {
                  setFeePct(17); setFee(sale * 0.17);
                }}>Simular Premium 17%</button>
              </div>
              <p className="fh-profit-hint">12%/17% são cenários manuais de referência;
                a tarifa oficial varia por categoria, preço e modalidade.
                Prefira sempre a cotação atualizada pela API.</p>
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
                  <select value={destination} onChange={(e) => setDestination(e.target.value)}>
                    <option value="">Selecione a UF</option>{brazilStates.map(uf => <option value={uf} key={uf}>{uf}</option>)}
                  </select>
                </label>
                {numberInput("DIFAL (configurável)", difal, setDifal, "%")}
                {numberInput("Crédito de ICMS na compra", credit, setCredit)}
                {numberInput("Outros custos", otherCost, setOtherCost)}
                <label className="fh-profit-field"><span>Tributação sobre lucro (projeção)</span>
                  <select value={corporateTax} onChange={event =>
                    setCorporateTax(event.target.value as "none" | "lucro-real-projection")}>
                    <option value="none">Não configurada — excluir IRPJ/CSLL</option>
                    <option value="lucro-real-projection">Lucro Real — projeção</option>
                  </select>
                </label>
                {corporateTax === "lucro-real-projection" && numberInput(
                  "Lucro tributável mensal prévio (estimado)", monthlyProfit, setMonthlyProfit)}
                <p className="fh-profit-hint">No Lucro Real projetamos IRPJ 15%,
                  adicional de 10% apenas sobre a parcela acima de R$ 20 mil/mês,
                  e CSLL 9%. Não use esta simulação como apuração fiscal oficial.</p>
                {numberInput("Meta de lucro líquido", target, setTarget, "%")}
              </div>
              <p className="fh-profit-hint">
                A UF selecionada não determina sozinha o DIFAL: o cálculo depende de origem,
                destino, NCM, contribuinte, FCP e benefício fiscal. Preencha a alíquota
                efetiva validada pelo seu contador.
              </p>
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
                <div><dt>IRPJ estimado (15%)</dt><dd>- {format(result.irpj)}</dd></div>
                <div><dt>Adicional IRPJ (faixa mensal)</dt><dd>- {format(result.irpjAdditional)}</dd></div>
                <div><dt>CSLL estimada (9%)</dt><dd>- {format(result.csll)}</dd></div>
              </dl>
            </section>
            <section className="fh-profit-card">
              <h3>Comparar compras SP × ES</h3>
              <p className="fh-profit-hint">Simulação comercial por fornecedor; custos e
                créditos de ICMS precisam ser informados e validados.</p>
              <div className="fh-profit-grid">
                <label className="fh-profit-field"><span>Custo por unidade em SP</span>
                  <span className="fh-profit-input-wrap"><input type="number" min="0" step="0.01"
                    value={spCost} onChange={e => setSpCost(e.target.value)}/><small>R$</small></span>
                </label>
                <label className="fh-profit-field"><span>Custo por unidade no ES</span>
                  <span className="fh-profit-input-wrap"><input type="number" min="0" step="0.01"
                    value={esCost} onChange={e => setEsCost(e.target.value)}/><small>R$</small></span>
                </label>
                {numberInput("Crédito estimado na compra SP", spCreditRate, setSpCreditRate, "%")}
                {numberInput("Crédito estimado na compra ES", esCreditRate, setEsCreditRate, "%")}
              </div>
              <dl className="fh-profit-totals">
                <div><dt>Custo líquido simulado SP</dt><dd>{format(purchaseComparison.spTotal)}</dd></div>
                <div><dt>Custo líquido simulado ES</dt><dd>{format(purchaseComparison.esTotal)}</dd></div>
                <div><dt>Melhor origem nesta simulação</dt>
                  <dd>{purchaseComparison.cheaper ?
                    purchaseComparison.cheaper + " (diferença de " + format(purchaseComparison.difference) + ")"
                    : "Dados insuficientes ou empate"}</dd></div>
              </dl>
            </section>
            <section className="fh-profit-card fh-profit-results">
              <div><span>{corporateTax === "none" ? "Resultado antes de IRPJ/CSLL" : "Lucro líquido projetado"}</span><strong className={result.net >= 0 ? "positive" : "negative"}>
                {knownCost ? format(result.net) : "Informe o custo"}
              </strong></div>
              <div><span>Margem {corporateTax === "none" ? "antes IRPJ/CSLL" : "líquida projetada"}</span><strong>{knownCost ? result.margin.toFixed(2).replace(".", ",") + "%" : "—"}</strong></div>
              <div><span>Preço projetado para {target}% de margem</span><strong>{format(result.recommended)}</strong></div>
              <p>Saúde do anúncio: <strong>{status}</strong>. Simulação financeira: o preço-alvo usa a tarifa proporcional
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
