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
  assert.ok(home.includes('href="/precificacao"'));
  assert.ok(home.includes("Importar custo"));
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
