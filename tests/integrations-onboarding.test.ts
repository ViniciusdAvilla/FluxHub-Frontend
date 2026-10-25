import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

const page = readFileSync("src/app/integracoes/page.tsx", "utf8");
const css = readFileSync("src/app/modern.css", "utf8");

test("cards dos provedores planejados utilizam as três logos locais enviadas", () => {
  const files = ["mercado-pago.webp","shopee.webp","tiktok-shop.webp"];
  for (const name of files) {
    assert.ok(existsSync("public/marketplaces/" + name), "Falta a logo " + name);
    assert.ok(statSync("public/marketplaces/" + name).size > 200, "Logo inválida " + name);
    assert.ok(page.includes("/marketplaces/" + name));
  }
  assert.match(page, /provider\.status === "planned"/);
  assert.match(page, /Conector em preparação/);
  assert.match(page, /Em breve/);
  assert.match(css, /\.fh-marketplace-logo img/);
});

test("novos vendedores recebem passos de autorização sem DevCenter nem Client Secret", () => {
  assert.match(page, /Primeiros passos para conectar o Mercado Livre/);
  assert.match(page, /Conectar Mercado Livre/);
  assert.match(page, /Autorize como titular ou administrador da loja/);
  assert.match(page, /Confira a conta e sincronize/);
});

test("guia para criar app e configurar credenciais aparece somente para o administrador", () => {
  assert.match(page, /data\.isAdmin && <details/);
  assert.match(page, /https:\/\/developers\.mercadolivre\.com\.br\/devcenter/);
  assert.match(page, /https:\/\/myfluxhub\.tech\/api\/v1\/connectors\/mercado-livre\/callback/);
  assert.match(page, /MERCADO_LIVRE_CLIENT_ID/);
  assert.match(page, /MERCADO_LIVRE_CLIENT_SECRET/);
  assert.match(page, /MERCADO_LIVRE_PKCE_ENABLED/);
  assert.match(page, /Não coloque essas credenciais no frontend/);
});
