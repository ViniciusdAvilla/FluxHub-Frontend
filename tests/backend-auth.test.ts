import test from "node:test";
import assert from "node:assert/strict";
import { backendAuthHeaders, assertSecureBackendTransport } from "../src/lib/backend-auth";

test("exige segredo configurado e com tamanho mínimo", () => {
  for (const token of [undefined, "", "fraco", "a".repeat(31), "a".repeat(32) + " ", "a".repeat(32) + "\n"]) {
    assert.throws(() => backendAuthHeaders(token), /BACKEND_TOKEN não configurado/);
  }
});

test("adiciona X-Backend-Token apenas em requisições ao servidor FastAPI", () => {
  const token = "a".repeat(48);
  assert.deepEqual(backendAuthHeaders(token), {
    Accept: "application/json",
    "X-Backend-Token": token,
  });
});

test("usa HTTPS ou loopback; recusa token sobre HTTP público", () => {
  for (const url of [
    "https://api.exemplo.com/backend-api",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://[::1]:8000",
  ]) {
    assert.doesNotThrow(() => assertSecureBackendTransport(new URL(url)));
  }
  for (const url of ["http://187.77.230.250/backend-api", "http://api.exemplo.com"]) {
    assert.throws(() => assertSecureBackendTransport(new URL(url)), /BACKEND_URL inseguro/);
  }
});
