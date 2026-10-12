import test from "node:test";
import assert from "node:assert/strict";
import { isTrustedRequestOrigin } from "../src/lib/request-security";

test("aceita mesma origem", () => {
  const request = new Request("http://127.0.0.1:3000/api/raio-x", {
    headers: { origin: "http://127.0.0.1:3000" },
  });
  assert.equal(isTrustedRequestOrigin(request), true);
});

test("aceita localhost e 127.0.0.1 como aliases locais na mesma porta", () => {
  const request = new Request("http://127.0.0.1:3000/api/raio-x", {
    headers: { origin: "http://localhost:3000" },
  });
  assert.equal(isTrustedRequestOrigin(request), true);
});

test("aceita origem encaminhada por proxy", () => {
  const request = new Request("http://127.0.0.1:3000/api/raio-x", {
    headers: {
      origin: "https://painel.exemplo.com",
      "x-forwarded-host": "painel.exemplo.com",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(isTrustedRequestOrigin(request), true);
});

test("rejeita origem externa", () => {
  const request = new Request("http://127.0.0.1:3000/api/raio-x", {
    headers: { origin: "https://site-malicioso.example" },
  });
  assert.equal(isTrustedRequestOrigin(request), false);
});

test("aceita origem pública quando Next.js vê endereço interno atrás do proxy", () => {
  const request = new Request("http://127.0.0.1:3000/api/explorer", {
    method: "POST",
    headers: {
      origin: "https://painel.exemplo.com",
      host: "127.0.0.1:3000",
      "x-forwarded-host": "painel.exemplo.com",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(isTrustedRequestOrigin(request), true);
});

test("rejeita domínio externo mesmo se a requisição atravessar um proxy", () => {
  const request = new Request("http://127.0.0.1:3000/api/explorer", {
    method: "POST",
    headers: {
      origin: "https://site-malicioso.example",
      "x-forwarded-host": "painel.exemplo.com",
      "x-forwarded-proto": "https",
      "sec-fetch-site": "cross-site",
    },
  });
  assert.equal(isTrustedRequestOrigin(request), false);
});

test("reconhece same-origin informado pelo navegador atrás de um proxy", () => {
  const request = new Request("http://127.0.0.1:3000/api/explorer", {
    method: "POST",
    headers: {
      origin: "https://painel.exemplo.com",
      "sec-fetch-site": "same-origin",
    },
  });
  assert.equal(isTrustedRequestOrigin(request), true);
});
