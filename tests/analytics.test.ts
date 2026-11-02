import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCatalogPaidSales,
  applyProductBrands,
  classifyAbc,
  displayValue,
  enrichProducts,
  genericRows,
  idealPrice,
  marginTone,
  money,
  normalizeProducts,
  projectedAtPrice,
  replenishment,
  summarize,
} from "../src/lib/analytics";
import { validateFinance } from "../src/lib/validation";

const raw = {
  external_id: "SKU-TEST",
  title: "Produto de teste",
  category: "Freios",
  brand: "Marca teste",
  original_price: 120,
  promotional_price: 100,
  stock_qty: 30,
  sales_30d: 10,
};
const finance = {
  productId: raw.external_id,
  supplier: "Fornecedor teste",
  unitCost: 40,
  feePercent: 12,
  taxPercent: 6,
  shippingCost: 5,
  otherCost: 2,
};



test("enriquece fabricante pela resposta agrupada da rota by-brands", () => {
  const products = normalizeProducts([
    { ...raw, external_id: "BRAND-1", brand: "Marca antiga" },
    { ...raw, external_id: "BRAND-2", brand: null },
  ]);
  const enriched = applyProductBrands(products, {
    brands: [
      { brand: "Bosch", products: [{ external_id: "BRAND-1" }] },
      { brand: "Valeo", products: [{ external_id: "BRAND-2" }] },
    ],
  });
  assert.deepEqual(enriched.map((product) => product.brand), ["Bosch", "Valeo"]);
});

test("resume performance financeira por fabricante", () => {
  const rows = enrichProducts(
    normalizeProducts([
      raw,
      { ...raw, external_id: "MESMA-MARCA", promotional_price: 80 },
      { ...raw, external_id: "OUTRA-MARCA", brand: "Outra marca" },
    ]),
    [
      finance,
      { ...finance, productId: "MESMA-MARCA" },
      { ...finance, productId: "OUTRA-MARCA" },
    ],
  );
  const manufacturers = summarize(rows).manufacturers;
  assert.equal(manufacturers[0].name, "Marca teste");
  assert.equal(manufacturers[0].count, 2);
  assert.equal(manufacturers[1].name, "Outra marca");
});
test("normaliza produto e prioriza preço promocional positivo", () => {
  const [product] = normalizeProducts([raw]);
  assert.equal(product.id, "SKU-TEST");
  assert.equal(product.price, 100);
  assert.equal(product.originalPrice, 120);
});

test("aceita listas envelopadas em products, items ou results", () => {
  assert.equal(normalizeProducts({ products: [raw] }).length, 1);
  assert.equal(normalizeProducts({ items: [raw] }).length, 1);
  assert.equal(normalizeProducts({ results: [raw] }).length, 1);
});

test("rejeita payload sem lista e IDs duplicados", () => {
  assert.throws(() => normalizeProducts({ foo: [raw] }));
  assert.throws(() => normalizeProducts([raw, raw]));
});

test("mantém campos extras e calcula desconto quando disponível", () => {
  const [product] = normalizeProducts([
    { ...raw, condition: "new", rating: 4.8, free_shipping: true },
  ]);
  assert.equal(product.condition, "new");
  assert.equal(product.rating, 4.8);
  assert.equal(product.freeShipping, true);
  assert.ok((product.discount ?? 0) > 16 && (product.discount ?? 0) < 17);
  assert.equal(product.raw?.external_id, "SKU-TEST");
});

test("receita e lucro deduzem todos os componentes por unidade", () => {
  const [row] = enrichProducts(normalizeProducts([raw]), [finance]);
  assert.equal(row.revenue, 1000);
  assert.equal(row.profit, 350);
  assert.equal(row.margin, 35);
  assert.equal(row.stockDays, 90);
});

test("custos ausentes ficam desconhecidos em vez de virar lucro fictício", () => {
  const rows = enrichProducts(normalizeProducts([raw]), []);
  assert.equal(rows[0].profit, null);
  assert.equal(summarize(rows).profit, null);
  assert.deepEqual(summarize(rows).suppliers, []);
});

test("margem parcial usa somente receita dos produtos com custos", () => {
  const summary = summarize(
    enrichProducts(
      normalizeProducts([raw, { ...raw, external_id: "SEM-CUSTO" }]),
      [finance],
    ),
  );
  assert.equal(summary.revenue, 2000);
  assert.equal(summary.profit, 350);
  assert.equal(summary.margin, 35);
  assert.equal(summary.covered, 1);
});

test("valores inválidos nunca geram NaN na apresentação", () => {
  const [row] = enrichProducts(
    normalizeProducts([
      {
        ...raw,
        promotional_price: null,
        original_price: "NaN",
        sales_30d: null,
        stock_qty: "inválido",
      },
    ]),
    [],
  );
  assert.equal(row.price, null);
  assert.equal(row.revenue, null);
  assert.equal(money(NaN), "—");
  assert.equal(money(Infinity), "—");
  assert.equal(displayValue(Infinity), "—");
});

test("zero de vendas é válido e não divide por zero", () => {
  const [row] = enrichProducts(normalizeProducts([{ ...raw, sales_30d: 0 }]), [
    finance,
  ]);
  assert.equal(row.revenue, 0);
  assert.equal(row.profit, 0);
  assert.equal(row.margin, null);
  assert.equal(row.stockDays, null);
  assert.equal(row.stockLabel, "Sem giro");
});

test("limiares de estoque aplicam vermelho amarelo e verde de forma consistente", () => {
  const rows = enrichProducts(
    normalizeProducts([
      { ...raw, external_id: "ZERO", stock_qty: 0, sales_30d: 0 },
      { ...raw, external_id: "BAIXO", stock_qty: 6, sales_30d: 30 },
      { ...raw, external_id: "BOM", stock_qty: 7, sales_30d: 30 },
    ]),
    [],
  );
  assert.deepEqual(rows.map((p) => p.stockTone), ["bad", "warning", "good"]);
  assert.deepEqual([-1, 0, 14.99, 15, null].map(marginTone), [
    "bad",
    "warning",
    "warning",
    "good",
    "neutral",
  ]);
});

test("ranking de fornecedores soma resultado e preserva prejuízo", () => {
  const summary = summarize(
    enrichProducts(normalizeProducts([raw, { ...raw, external_id: "LOSS" }]), [
      finance,
      {
        ...finance,
        productId: "LOSS",
        supplier: "Outro fornecedor",
        unitCost: 150,
      },
    ]),
  );
  assert.equal(summary.suppliers[0].profit, 350);
  assert.equal(summary.suppliers[1].profit, -750);
  assert.equal(summary.losses, 1);
});

test("validação financeira aceita cadastro completo", () => {
  assert.deepEqual(validateFinance(finance), finance);
});

test("validação financeira rejeita negativos percentuais impossíveis e fornecedor vazio", () => {
  for (const invalid of [
    { unitCost: null },
    { unitCost: -1 },
    { unitCost: 1.001 },
    { feePercent: 99, taxPercent: 5 },
    { shippingCost: Infinity },
    { supplier: " " },
  ]) assert.throws(() => validateFinance({ ...finance, ...invalid }));
});

test("preço ideal considera custos taxas e margem desejada", () => {
  assert.equal(idealPrice(finance, 20), 75.81);
});

test("preço ideal retorna desconhecido quando percentuais inviabilizam a meta", () => {
  assert.equal(idealPrice({ ...finance, feePercent: 70 }, 30), null);
  assert.equal(idealPrice(null, 20), null);
});

test("simulação no preço atual calcula lucro unitário e margem", () => {
  assert.deepEqual(projectedAtPrice(finance, 100), {
    unitProfit: 35,
    margin: 35,
  });
});

test("reposição calcula venda diária estoque alvo e quantidade de compra", () => {
  const [row] = enrichProducts(
    normalizeProducts([{ ...raw, stock_qty: 6, sales_30d: 30 }]),
    [finance],
  );
  assert.deepEqual(replenishment(row, 30), {
    dailySales: 1,
    targetStock: 30,
    quantity: 24,
  });
});

test("curva ABC classifica por participação acumulada de receita", () => {
  const base = {
    ...raw,
    original_price: null,
    stock_qty: 10,
    sales_30d: 10,
  };
  const rows = enrichProducts(
    normalizeProducts([
      { ...base, external_id: "A", promotional_price: 60 },
      { ...base, external_id: "B", promotional_price: 20 },
      { ...base, external_id: "C", promotional_price: 10 },
      { ...base, external_id: "D", promotional_price: 6 },
      { ...base, external_id: "E", promotional_price: 4 },
    ]),
    [],
  );
  assert.deepEqual(classifyAbc(rows).map((row) => row.abcClass), [
    "A",
    "A",
    "B",
    "B",
    "C",
  ]);
});

test("resultado genérico extrai linhas para tabela e CSV", () => {
  assert.deepEqual(genericRows({ items: [{ id: 1 }, { id: 2 }] }), [
    { id: 1 },
    { id: 2 },
  ]);
  assert.deepEqual(genericRows([{ id: 3 }]), [{ id: 3 }]);
  assert.equal(displayValue(true), "Sim");
});

test("valida custos sem armazenamento local SQLite", () => {
  const valid = validateFinance({ ...finance, unitCost: 51 });
  assert.equal(valid.productId, finance.productId);
  assert.equal(valid.unitCost, 51);
});

test("normaliza exatamente os campos do backend FastAPI atual", () => {
  const [product] = normalizeProducts([
    {
      id: 1,
      external_id: "SDU-1001",
      title: "Radiador",
      category: "Arrefecimento & Elétrica",
      brand: "Valeo",
      original_price: 625.55,
      promotional_price: 512.95,
      discount_rate: 0.18,
      stock_qty: 191,
      sales_30d: 109,
      rating: 4.7,
      is_free_shipping: true,
      item_condition: "Novo",
    },
  ]);

  assert.equal(product.id, "SDU-1001");
  assert.equal(product.price, 512.95);
  assert.equal(product.discount, 18);
  assert.equal(product.stock, 191);
  assert.equal(product.sales, 109);
  assert.equal(product.freeShipping, true);
  assert.equal(product.condition, "Novo");
});

test("vendas pagas preenchem métricas do produto do Mercado Livre", () => {
  const [product] = normalizeProducts([{
    ...raw,
    external_id: "MLB111222333",
    source_key: "ml:436667093",
    sales_30d: null,
    stock_qty: 62,
  }]);
  const [withPaidSales] = applyCatalogPaidSales([product], {
    days: 30,
    sales_by_item: { MLB111222333: 5 },
    paid_orders: 4,
    enriched_paid_orders: 4,
    orders_complete: true,
  });
  const [row] = enrichProducts([withPaidSales], [{
    ...finance,
    productId: "MLB111222333",
  }]);
  assert.equal(withPaidSales.sales, 5);
  assert.equal(row.revenue, 500);
  assert.equal(row.profit, 175);
  assert.equal(row.margin, 35);
  assert.equal(row.stockDays, 372);
});

test("não transforma ausência de vendas em zero com pedidos incompletos", () => {
  const [product] = normalizeProducts([{
    ...raw,
    external_id: "MLB888",
    source_key: "ml:436667093",
    sales_30d: null,
    sold_quantity: 800,
  }]);
  const incomplete = applyCatalogPaidSales([product], {
    days: 30,
    sales_by_item: {},
    paid_orders: 50,
    enriched_paid_orders: 30,
    orders_complete: false,
  })[0];
  assert.equal(incomplete.sales, null);
  assert.equal(enrichProducts([incomplete], [finance])[0].stockLabel, "Sem dados de vendas");
  const noMetrics = applyCatalogPaidSales([product], null)[0];
  assert.equal(noMetrics.sales, null);
});

test("somente pedidos completos permitem vendas zero; produtos não-ML não mudam", () => {
  const products = normalizeProducts([
    { ...raw, external_id: "MLB987", source_key: "ml:436667093", sales_30d: null },
    { ...raw, external_id: "SKU-LOCAL", source_key: "excel", sales_30d: 10 },
  ]);
  const result = applyCatalogPaidSales(products, {
    days: 30,
    sales_by_item: {},
    paid_orders: 10,
    enriched_paid_orders: 10,
    orders_complete: true,
  });
  assert.equal(result[0].sales, 0);
  assert.equal(result[1].sales, 10);
});

test("não calcula lucro ou margem sem custo de compra válido", () => {
  const [product] = normalizeProducts([raw]);
  const [row] = enrichProducts([product], [{ ...finance, unitCost: 0 }]);
  assert.equal(row.revenue, 1000);
  assert.equal(row.profit, null);
  assert.equal(row.margin, null);
});
