import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("visão geral consulta vendas de linhas pagas sem o antigo corte de custos", () => {
  const seller = readFileSync("src/lib/seller-data.ts", "utf8");
  const overview = seller.split("export async function getSellerReport")[1] ?? "";
  assert.ok(overview.includes('"/api/v1/analytics/catalog-metrics"'));
  assert.ok(!overview.includes('"/api/v1/analytics/product-costs"'));
  assert.ok(!overview.includes('limit:"1000"'));
});

test("tabela distingue vendas parciais, custos pendentes e Ads sem relatório", () => {
  const home = readFileSync("src/components/seller-home.tsx", "utf8");
  assert.ok(home.includes("salesByItem[p.external_id]"));
  assert.ok(home.includes("adsByItem[p.external_id]"));
  assert.ok(home.includes("ordersComplete"));
  assert.ok(home.includes("importação em massa na Precificação"));
  assert.ok(!home.includes(">Importar custo</Link>"));
  assert.ok(home.includes("Custos de compra cadastrados"));
  assert.ok(home.includes("Sem relatório"));
  const table = home.split("Unid. vendidas (30 dias)")[1] ?? "";
  assert.ok(!table.includes("p.sales_30d"));
});

test("precificação pagina custos completos em vez de cortar após mil registros", () => {
  const database = readFileSync("src/lib/database.ts", "utf8");
  assert.ok(database.includes("pageSize = 10000"));
  assert.ok(database.includes("page * pageSize"));
  assert.ok(database.includes("rows.length < pageSize"));
  assert.ok(!database.includes('limit: "1000"'));
});


test("cadastro de custos fica centralizado na precificação, sem edição por linha", () => {
  const products = readFileSync("src/components/platform-page.tsx", "utf8");
  const panel = readFileSync("src/components/cost-import-panel.tsx", "utf8");
  assert.ok(!products.includes("Editar custos de"));
  assert.ok(!products.includes("Cadastrar custos</button>"));
  assert.ok(!products.includes("fh-smart-edit"));
  assert.ok(products.includes('href="/precificacao"'));
  assert.ok(panel.includes("Importação de custos em massa"));
  for (const extension of [".csv", ".xlsx", ".xls", ".docx", ".pdf", ".txt"]) {
    assert.ok(panel.includes(extension), extension);
  }
  assert.ok(panel.includes('form.set("preview_token", preview.preview_token)'));
});

test("listagem de produtos usa contagem dos pedidos pagos e mostra cobertura", () => {
  const backend = readFileSync("src/lib/backend.ts", "utf8");
  const analytics = readFileSync("src/lib/analytics.ts", "utf8");
  const platform = readFileSync("src/components/platform-page.tsx", "utf8");
  assert.ok(backend.includes('"/api/v1/analytics/catalog-metrics"'));
  assert.ok(backend.includes("applyCatalogPaidSales(baseProducts, paidSales)"));
  assert.ok(analytics.includes("metrics.orders_complete ? 0 : null"));
  assert.ok(platform.includes("Vendas dos últimos 30 dias em sincronização"));
});

test("categorias dos gráficos vêm dos nomes oficiais; vendidos mostra período e total", () => {
  const backend = readFileSync("src/lib/backend.ts", "utf8");
  const page = readFileSync("src/components/platform-page.tsx", "utf8");
  const salesProxy = readFileSync("src/app/api/platform/product-sales/route.ts", "utf8");
  const syncProxy = readFileSync("src/app/api/platform/sync-sales/route.ts", "utf8");
  assert.ok(backend.includes('"/api/v1/analytics/category-names"'));
  assert.ok(backend.includes("applyCategoryDisplayNames(withBrands, categoryNames)"));
  assert.ok(page.includes("Vendidos (30 dias)"));
  assert.ok(page.includes("Total no anúncio"));
  assert.ok(page.includes("/api/platform/product-sales?"));
  assert.ok(page.includes("Sincronizar vendas"));
  assert.ok(salesProxy.includes('"/api/v1/analytics/items/sold-totals"'));
  assert.ok(syncProxy.includes('"/api/v1/analytics/sync-jobs/"'));
});
