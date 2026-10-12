import test from "node:test";
import assert from "node:assert/strict";
import { backendAuthHeaders } from "../src/lib/backend-auth";

test("exige segredo configurado e com tamanho mínimo", () => {
  for (const token of [undefined, "", "fraco", "a".repeat(31), "a".repeat(32) + " ", "a".repeat(32) + "\n"]) {
    assert.throws(() => backendAuthHeaders(token), /BACKEND_TOKEN não configurado/);
  }
});

test("adiciona Authorization Bearer apenas em requisições ao servidor FastAPI", () => {
  const token = "a".repeat(48);
  assert.deepEqual(backendAuthHeaders(token), {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  });
});
