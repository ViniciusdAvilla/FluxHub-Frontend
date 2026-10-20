import test from "node:test";
import assert from "node:assert/strict";
import { deriveMercadoLivreIntegration, deriveMercadoPagoIntegration } from "../src/lib/integration-model";
import type { Account, SourceStatus } from "../src/lib/seller-data";

const account: Account = {
  account_id: 98765, nickname: "MINHA_LOJA", connected: true,
  expires_at: "2026-10-21T12:00:00Z",
};
const source: SourceStatus = {
  provider: "mercado_livre", account_key: "ml:98765", connected: true,
  enabled: true, display_name: "MINHA_LOJA", last_synced_at: "2026-10-20T13:00:00Z",
};

test("conta OAuth salva no FastAPI aparece conectada e já sincronizada", () => {
  const result = deriveMercadoLivreIntegration(
    {ok:true,data:[account]}, {ok:true,data:[source]},
  );
  assert.equal(result.status, "connected");
  assert.equal(result.accounts[0].nickname, "MINHA_LOJA");
  assert.equal(result.accounts[0].lastSyncedAt, source.last_synced_at);
  assert.equal(result.accounts[0].enabled, true);
  assert.equal(result.accounts[0].canReactivate, false);
});

test("conta OAuth existe mesmo se fonte de dados ainda não foi criada", () => {
  const result = deriveMercadoLivreIntegration(
    {ok:true,data:[account]}, {ok:true,data:[]},
  );
  assert.equal(result.status, "connected");
  assert.equal(result.accounts[0].sourceKnown, false);
  assert.equal(result.accounts[0].lastSyncedAt, null);
});

test("conta OAuth pode ser reativada quando fonte está pausada", () => {
  const result = deriveMercadoLivreIntegration(
    {ok:true,data:[account]}, {ok:true,data:[{...source,enabled:false}]},
  );
  assert.equal(result.status, "connected");
  assert.equal(result.accounts[0].enabled, false);
  assert.equal(result.accounts[0].canReactivate, true);
});

test("backend indisponível nunca é apresentado como conta desconectada", () => {
  const result = deriveMercadoLivreIntegration(
    {ok:false}, {ok:true,data:[source]},
  );
  assert.equal(result.status, "unavailable");
  assert.equal(result.accounts.length, 0);
});

test("falta de autorização é distinta de uma fonte obsoleta", () => {
  const result = deriveMercadoLivreIntegration(
    {ok:true,data:[]}, {ok:true,data:[source]},
  );
  assert.equal(result.status, "not_connected");
  assert.equal(result.orphanSources, 1);
});

test("sem OAuth não inventa conta usando ID de aplicativo", () => {
  const result = deriveMercadoLivreIntegration({ok:true,data:[]}, {ok:true,data:[]});
  assert.equal(result.status, "not_connected");
});

test("duplicidades e contas não vinculadas são ignoradas", () => {
  const result = deriveMercadoLivreIntegration(
    {ok:true,data:[account,account,{...account,account_id:123,connected:false}]},
    {ok:false},
  );
  assert.equal(result.status, "connected");
  assert.equal(result.accounts.length, 1);
  assert.equal(result.sourcesAvailable, false);
});

test("Mercado Pago tem status independente do Mercado Livre", () => {
  assert.equal(deriveMercadoPagoIntegration({ok:true,data:[]}).status,"not_connected");
  assert.equal(deriveMercadoPagoIntegration({ok:false}).status,"unavailable");
  const result=deriveMercadoPagoIntegration({ok:true,data:[
    {account_id:"1234",connected:true},{account_id:"1234",connected:true},
    {account_id:"5678",connected:false},
  ]});
  assert.deepEqual(result.accountIds,["1234"]);
});
