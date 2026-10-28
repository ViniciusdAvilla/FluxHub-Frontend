import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync("src/components/order-explorer.tsx", "utf8");
const css = readFileSync("src/app/modern.css", "utf8");

test("resumo de vendas tem quatro cards originais e classe isolada", () => {
  assert.match(component, /<div className="fh-kpis fh-orders-summary-kpis">/);
  for (const text of [
    "Faturamento bruto pago", "Pedidos registrados", "Cancelados", "Pagos",
  ]) assert.ok(component.includes(text));
});

test("cards de vendas ocupam a largura total sem herdar oito colunas", () => {
  const isolated = css.lastIndexOf(".fh-kpis.fh-orders-summary-kpis");
  const oldEightColumns = css.indexOf("@media(min-width:1600px)");
  assert.ok(isolated > oldEightColumns);
  assert.match(css, /\.fh-kpis\.fh-orders-summary-kpis[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:1200px\)\{[\s\S]*?\.fh-kpis\.fh-orders-summary-kpis[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*?\.fh-kpis\.fh-orders-summary-kpis[\s\S]*?grid-template-columns:minmax\(0,1fr\)/);
});
