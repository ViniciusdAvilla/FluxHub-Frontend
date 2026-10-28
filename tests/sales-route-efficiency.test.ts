import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("pedidos e vendas não carregam o catálogo completo para exibir gráficos", () => {
  const seller = readFileSync("src/lib/seller-data.ts", "utf8");
  const overview = seller.split("export async function getOrdersOverview")[1]
    ?.split("export async function getSellerReport")[0] ?? "";
  assert.ok(overview.includes("/api/v1/analytics/timeline"));
  assert.ok(overview.includes("/api/v1/analytics/order-status"));
  assert.ok(!overview.includes("/api/v1/products/"));
  assert.ok(!overview.includes("/api/v1/analytics/product-costs"));
  assert.ok(!overview.includes("/api/v1/orders/"));
  for (const route of ["vendas", "pedidos"]) {
    const page = readFileSync(`src/app/${route}/page.tsx`, "utf8");
    assert.ok(page.includes("getOrdersOverview(30)"), route);
    assert.ok(page.includes("orderStatusLabel("), route);
    assert.ok(!page.includes("getSellerReport("), route);
  }
});

test("calculadora só é importada quando o usuário abre um produto", () => {
  const orderExplorer = readFileSync("src/components/order-explorer.tsx", "utf8");
  assert.match(orderExplorer, /dynamic\(\(\) => import\("\.\/pricing-calculator"\)/);
  assert.match(orderExplorer, /\{selected && <PricingCalculator/);
  const products = readFileSync("src/components/platform-page.tsx", "utf8");
  assert.match(products, /dynamic\(\(\) => import\("\.\/raio-x-panel"\)/);
});

test("anúncios buscam somente catálogo e status persistido", () => {
  const seller = readFileSync("src/lib/seller-data.ts", "utf8");
  const overview = seller.split("export async function getListingsOverview")[1]
    ?.split("export async function getSellerReport")[0] ?? "";
  assert.ok(overview.includes("/api/v1/products/"));
  assert.ok(overview.includes("/api/v1/analytics/ads-performance"));
  for (const path of ["/api/v1/orders/", "/api/v1/analytics/product-costs", "/api/v1/sales/"]) {
    assert.ok(!overview.includes(path));
  }
  const page = readFileSync("src/app/anuncios/page.tsx", "utf8");
  assert.ok(page.includes("getListingsOverview()"));
  assert.ok(!page.includes("getSellerReport("));
});
