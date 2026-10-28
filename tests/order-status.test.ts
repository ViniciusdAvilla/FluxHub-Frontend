import test from "node:test";
import assert from "node:assert/strict";
import { orderStatusLabel } from "../src/lib/order-status";

test("status de pedidos estão em português em todos os painéis", () => {
  assert.equal(orderStatusLabel("paid"), "Pago");
  assert.equal(orderStatusLabel("cancelled"), "Cancelado");
  assert.equal(orderStatusLabel("payment_in_process"), "Pagamento em processamento");
  assert.equal(orderStatusLabel(""), "Não informado");
  assert.equal(orderStatusLabel("awaiting_review"), "Outro: awaiting review");
});
