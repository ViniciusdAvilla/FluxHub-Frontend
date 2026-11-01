import test from "node:test";
import assert from "node:assert/strict";
import { orderStatusLabel, listingStatusLabel } from "../src/lib/order-status";

test("status de pedidos aparecem em português, inclusive estornos parciais", () => {
  assert.equal(orderStatusLabel("paid"), "Pago");
  assert.equal(orderStatusLabel("partially_refunded"), "Parcialmente reembolsado");
  assert.equal(orderStatusLabel("cancelled"), "Cancelado");
  assert.equal(orderStatusLabel("payment_in_process"), "Pagamento em processamento");
  assert.equal(orderStatusLabel(""), "Não informado");
  assert.equal(orderStatusLabel("awaiting_review"), "Outro status");
});

test("status de anúncios possuem tradução consistente", () => {
  assert.equal(listingStatusLabel("under_review"), "Em análise");
  assert.equal(listingStatusLabel("inactive"), "Inativos");
  assert.equal(listingStatusLabel("active"), "Ativos");
  assert.equal(listingStatusLabel("closed"), "Encerrados");
  assert.equal(listingStatusLabel("paused"), "Pausados");
});
