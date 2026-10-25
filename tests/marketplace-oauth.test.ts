import test from "node:test";
import assert from "node:assert/strict";
import { parseOfficialMercadoLivreOAuthUrl } from "../src/lib/marketplace-oauth";

const state = "state-alphanum1234567890123456789";
const callback = "https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback";
function url(options: Record<string,string> = {}) {
  const qs = new URLSearchParams({
    response_type:"code", client_id:"1234567", redirect_uri:callback, state, ...options,
  });
  return "https://auth.mercadolivre.com.br/authorization?" + qs;
}
test("permite exclusivamente a URL oficial e callback configurado", () => {
  assert.equal(parseOfficialMercadoLivreOAuthUrl(url()), url());
  assert.equal(parseOfficialMercadoLivreOAuthUrl(url({
    code_challenge:"a".repeat(43),code_challenge_method:"S256"}))?.includes("S256"), true);
});
test("recusa hosts falsos, callback divergente, state e credenciais inválidos", () => {
  for (const bad of [
    url().replace("auth.mercadolivre.com.br","auth.mercadolivre.com.br.evil.example"),
    url().replace("https://auth.", "http://auth."),
    url({redirect_uri:"https://attacker.example/steal"}),
    url({state:"short"}),
    url({client_id:"invalid"}),
    url({response_type:"token"}),
    url({code_challenge_method:"plain",code_challenge:"x".repeat(43)}),
    "javascript:alert(1)",
    null,
    12345,
  ]) assert.equal(parseOfficialMercadoLivreOAuthUrl(bad), null);
});
