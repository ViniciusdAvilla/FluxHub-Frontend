import test from "node:test";
import assert from "node:assert/strict";
import { selectBackendMercadoLivre } from "../src/lib/mercado-livre-single";
import type { Account, SourceStatus } from "../src/lib/seller-data";

const seller: Account = {
  account_id: 12345678,
  nickname: "LOJA_REAL",
  connected: true,
  expires_at: "2026-10-21T01:00:00Z",
};
const source: SourceStatus = {
  provider: "mercado_livre",
  account_key: "ml:12345678",
  connected: true,
  enabled: true,
  display_name: "LOJA_REAL",
  last_synced_at: "2026-10-20T10:00:00Z",
};

test("seleciona conta OAuth única já vinculada no backend sem novo login", () => {
  const state = selectBackendMercadoLivre(
    { ok: true, data: [seller] },
    { ok: true, data: [source] },
  );
  assert.equal(state.kind, "ready");
  if (state.kind !== "ready") return;
  assert.equal(state.account.accountId, 12345678);
  assert.equal(state.account.nickname, "LOJA_REAL");
  assert.equal(state.account.lastSyncedAt, source.last_synced_at);
});

test("não inventa conta só com Client ID e Client Secret configurados", () => {
  const state = selectBackendMercadoLivre(
    { ok: true, data: [] }, { ok: true, data: [] },
  );
  assert.deepEqual(state, { kind: "not_linked", account: null, count: 0 });
});

test("falha de backend não é confundida com ausência de autorização", () => {
  const state = selectBackendMercadoLivre(
    { ok: false }, { ok: false },
  );
  assert.deepEqual(state, { kind: "unavailable", account: null, count: 0 });
});

test("recusa escolher silenciosamente uma dentre várias contas", () => {
  const state = selectBackendMercadoLivre(
    { ok: true, data: [seller, { ...seller, account_id: 87654321 }] },
    { ok: true, data: [source] },
  );
  assert.deepEqual(state, { kind: "multiple", account: null, count: 2 });
});

test("conta única registrada continua identificável se consulta às fontes falhar", () => {
  const state = selectBackendMercadoLivre(
    { ok: true, data: [seller] }, { ok: false },
  );
  assert.equal(state.kind, "ready");
  if (state.kind !== "ready") return;
  assert.equal(state.account.sourceKnown, false);
});

test("fonte desativada não é exibida como sincronização pronta", () => {
  const state = selectBackendMercadoLivre(
    { ok: true, data: [seller] },
    { ok: true, data: [{ ...source, enabled: false }] },
  );
  assert.equal(state.kind, "ready");
  if (state.kind !== "ready") return;
  assert.equal(state.account.enabled, false);
});
