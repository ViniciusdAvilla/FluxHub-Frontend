import test from "node:test";
import assert from "node:assert/strict";
import { readCostImportResponse } from "../src/lib/cost-import-response";

test("upload acima do limite Nginx mostra erro amigável em vez de Unexpected token", async () => {
  const response = new Response("<html><h1>413 Request Entity Too Large</h1></html>", {
    status: 413, headers: { "content-type": "text/html" },
  });
  await assert.rejects(readCostImportResponse(response), /HTTP 413.*Nginx/);
});

test("HTML de login e página de erro recebem diagnóstico, sem falha de JSON", async () => {
  for (const status of [200, 401, 502, 503]) {
    const response = new Response("<html><h1>Erro</h1></html>", {
      status, headers: { "content-type": "text/html; charset=utf-8" },
    });
    await assert.rejects(readCostImportResponse(response), /servidor|sessão/i);
  }
});

test("resposta JSON de validação preserva mensagem do backend", async () => {
  const response = Response.json({ error: "Referência duplicada na planilha." }, { status: 422 });
  await assert.rejects(readCostImportResponse(response), /Referência duplicada/);
});

test("resposta válida da prévia é aceita", async () => {
  const response = Response.json({ total: 21872, ready: 100, preview_token: "token" });
  const data = await readCostImportResponse(response);
  assert.equal(data.total, 21872);
  assert.equal(data.ready, 100);
});

test("JSON inválido e resposta JSON nula são tratados", async () => {
  const invalid = new Response("{invalid-json", {
    status: 200, headers: { "content-type": "application/json" },
  });
  await assert.rejects(readCostImportResponse(invalid), /JSON inválido/);
  const empty = Response.json(null);
  await assert.rejects(readCostImportResponse(empty), /resposta.*incompleta/);
});
