import test from "node:test";
import assert from "node:assert/strict";
import { validateAuthorizationUrl } from "../src/lib/marketplace-authorization";

const callback = "https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback";
const state = "AbCd_12345678901234567890tokenXY";
function link(host = "auth.mercadolivre.com.br", redirect = callback) {
  const url = new URL(`https://${host}/authorization`);
  url.searchParams.set("response_type","code");
  url.searchParams.set("client_id","5625649550325980");
  url.searchParams.set("state",state);
  url.searchParams.set("redirect_uri",redirect);
  return url.toString();
}
test("aceita URL oficial com callback do FastAPI já cadastrado", () => {
  assert.equal(validateAuthorizationUrl("mercado-livre",link()), link());
});
test("rejeita callback diferente do cadastrado sem mostrar token", () => {
  assert.throws(() => validateAuthorizationUrl("mercado-livre",
    link("auth.mercadolivre.com.br","https://myfluxhub.tech/backend-api/api/v1/connectors/mercado-livre/callback")),
    /callback do FastAPI/);
});
test("não permite página de login falsa nem redirecionamento HTTP", () => {
  assert.throws(() => validateAuthorizationUrl("mercado-livre",link("evil.example")),/provedor oficial/);
  assert.throws(() => validateAuthorizationUrl("mercado-livre",link().replace("https:","http:")),/provedor oficial/);
});
test("precisa de state gerado no backend e client_id", () => {
  const invalid = new URL(link());
  invalid.searchParams.delete("state");
  assert.throws(() => validateAuthorizationUrl("mercado-livre",invalid.toString()),/incompleta/);
});
test("Mercado Pago continua independente, com host oficial", () => {
  const url=new URL(link("auth.mercadopago.com"));
  assert.equal(validateAuthorizationUrl("mercado-pago",url.toString()),url.toString());
});
