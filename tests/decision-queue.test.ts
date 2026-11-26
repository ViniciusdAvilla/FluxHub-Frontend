import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionQueue } from "../src/lib/decision-queue";
import type { Snapshot } from "../src/lib/types";

function snapshot(complete: boolean, feeConfigured = true): Snapshot {
  return {
    products: [{
      id: "MLB12345", title: "Filtro", category: "Auto", brand: "Marca",
      price: 100, originalPrice: 100, stock: 4, sales: 30, condition: null,
      rating: null, freeShipping: null, discount: null, raw: { source_key: "ml:123" },
    }],
    finance: [{ productId: "MLB12345", supplier: "Marca", unitCost: 40, feePercent: 15,
      feeConfigured, taxPercent: 5, shippingCost: 5, otherCost: 0 }],
    catalogSales: { paid_orders: 30, enriched_paid_orders: 30, orders_complete: complete },
    schema: { title: "", version: "", endpoints: [], error: null },
    updatedAt: null, error: null,
  };
}

test("fila calcula reposição a partir da duração selecionada", () => {
  const [item] = buildDecisionQueue(snapshot(true), 30);
  assert.equal(item.kind, "restock");
  assert.equal(item.coverage, 4);
  assert.equal(item.quantity, 26);
  assert.equal(item.investment, 1040);
});

test("importação incompleta e comissão ausente suspendem a recomendação de compra", () => {
  for (const source of [snapshot(false), snapshot(true, false)]) {
    const [item] = buildDecisionQueue(source, 30);
    assert.equal(item.kind, "data");
    assert.equal(item.quantity, null);
  }
});

test("margem abaixo da meta tem prioridade sobre reposição imediata", () => {
  const source = snapshot(true);
  source.finance[0].unitCost = 70;
  const [item] = buildDecisionQueue(source, 30);
  assert.equal(item.kind, "margin");
  assert.equal(item.target, 10);
  assert.equal(item.quantity, null);
});
