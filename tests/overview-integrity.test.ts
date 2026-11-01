import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("src/components/seller-home.tsx", "utf8");
const data = readFileSync("src/lib/seller-data.ts", "utf8");
const shell = readFileSync("src/components/modern-shell.tsx", "utf8");
const style = readFileSync("src/app/modern.css", "utf8");

test("dashboard preserva indicadores e gráficos acima dos novos detalhes", () => {
  const positions = ["fh-overview-kpis", "fh-overview-charts", "fh-overview-bottom",
    "fh-overview-detail-grid", "fh-overview-secondary"].map(label=>home.indexOf(label));
  assert.ok(positions.every(p=>p>=0), "Seção obrigatória ausente");
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.match(home,/Situação dos pedidos/);
});

test("destaques usam foto real persistida e unidades de pedidos pagos", () => {
  assert.match(home,/report\.productPhotos\[p\.external_id\]/);
  assert.match(home,/salesByItem\[p\.external_id\]/);
  assert.doesNotMatch(home,/number\(p\.sales_30d\)/);
  assert.match(data,/\/api\/v1\/products\/photos/);
});

test("categorias não exibem IDs brutos e status usam rótulos traduzidos", () => {
  assert.match(data,/\/api\/v1\/analytics\/category-names/);
  assert.match(home,/report\.categoryNames\[category\]/);
  assert.match(home,/orderStatusLabel\(name\)/);
  assert.match(home,/listingStatusLabel\(name\)/);
});

test("tema alternável e vidro suave sem comprometer o layout responsivo", () => {
  assert.match(shell,/fh-theme-toggle/);
  assert.match(shell,/fluxhub-theme/);
  assert.match(shell,/aria-pressed=\{theme === "dark"\}/);
  assert.match(style,/\.fh-liquid-glass\.fh-theme-light/);
  assert.match(style,/\.fh-liquid-glass\.fh-theme-dark/);
  assert.match(style,/fh-overview-detail-grid/);
});
