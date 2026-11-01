import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchesCatalogSearch, normalizeCatalogSearch } from "../src/lib/product-filters";

test("busca de catálogo mantém resultado com e sem acentuação", () => {
  const product = { id: "MLB12345", title: "Óleo de Câmbio 80W", brand: "Peças SP", category: "Automotivos" };
  for (const query of ["oleo", "CÂMBIO", "MLB12345", "pecas", "automotivos"]) {
    assert.equal(matchesCatalogSearch(product, normalizeCatalogSearch(query.trim())), true, query);
  }
  assert.equal(matchesCatalogSearch(product, normalizeCatalogSearch("celular")), false);
});

test("sem busca, milhares de produtos dispensam normalização de texto", () => {
  const row = {
    id: "MLB9", brand: "Marca", category: "Categoria",
    get title(): string { throw new Error("Não deveria acessar o título sem busca."); },
  };
  assert.equal(matchesCatalogSearch(row, ""), true);
});

test("visão geral descarta apenas consultas redundantes", () => {
  const source = readFileSync("src/lib/seller-data.ts", "utf8");
  const overview = source.split("export async function getSellerReport")[1] ?? "";
  assert.ok(!overview.includes('"/api/v1/orders/"'));
  assert.ok(!overview.includes('"/api/v1/analytics/cancellations"'));
  for (const required of [
    "/api/v1/analytics/timeline", "/api/v1/analytics/order-status",
    "/api/v1/sales/", "/api/v1/analytics/catalog-metrics",
    "/api/v1/analytics/category-names", "/api/v1/products/photos",
  ]) assert.ok(overview.includes(required), required);
  assert.match(overview, /\.slice\(0,3\)\.map\(p=>p\.external_id\)/);
});

test("Central de Dados pede somente esquema; rotas de catálogo não carregam vendas extras", () => {
  const backend = readFileSync("src/lib/backend.ts", "utf8");
  const data = readFileSync("src/app/dados/page.tsx", "utf8");
  const proxy = readFileSync("src/app/api/dashboard/route.ts", "utf8");
  const platform = readFileSync("src/components/platform-page.tsx", "utf8");
  assert.match(backend,/scope === "data"/);
  assert.match(backend,/scope === "full" \? ordersRevenueSnapshot\(\) : Promise\.resolve\(null\)/);
  assert.match(backend,/schema: clientSchema/);
  assert.match(data,/getSnapshot\("data"\)/);
  assert.match(proxy,/getSnapshot\(scope\)/);
  assert.match(platform,/\/api\/dashboard\?scope=/);
});

test("otimizações não modificam a folha de estilos nem alteram markup dos cards", () => {
  const page = readFileSync("src/components/platform-page.tsx", "utf8");
  assert.match(page,/matchesCatalogSearch\(row, term\)/);
  assert.match(page,/<ModernShell title=\{current\.title\}/);
  const styles = readFileSync("src/app/modern.css", "utf8");
  assert.match(styles,/fh-theme-light/);
  assert.match(styles,/fh-theme-dark/);
});
