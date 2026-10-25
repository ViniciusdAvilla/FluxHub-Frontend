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

test("assistente DevCenter so aparece para administrador e abre popup por etapas", () => {
  const wizard = readFileSync("src/components/mercado-livre-setup-wizard.tsx", "utf8");
  assert.match(page, /data\.isAdmin && <div className="fh-setup-wizard-entry"/);
  assert.match(page, /<MercadoLivreSetupWizard\s*\/>/);
  assert.match(wizard, /<dialog ref=\{dialog\}/);
  assert.match(wizard, /showModal\(\)/);
  assert.match(wizard, /current\.title/);
  assert.match(wizard, /steps\.map/);
  assert.match(wizard, /aria-current=\{i === step \? "step"/);
  assert.match(wizard, /https:\/\/developers\.mercadolivre\.com\.br\/devcenter/);
  assert.match(wizard, /https:\/\/myfluxhub\.tech\/api\/v1\/connectors\/mercado-livre\/callback/);
  assert.match(wizard, /MERCADO_LIVRE_CLIENT_ID/);
  assert.match(wizard, /MERCADO_LIVRE_CLIENT_SECRET/);
  assert.match(wizard, /MERCADO_LIVRE_PKCE_ENABLED/);
  assert.match(wizard, /Não peça credenciais|não pede nem armazena suas credenciais/i);
});

test("perfil conectado usa foto e nome oficiais sem inventar avatar", () => {
  const identity = readFileSync("src/components/mercado-livre-identity.tsx","utf8");
  const shell = readFileSync("src/components/modern-shell.tsx","utf8");
  assert.match(page, /MercadoLivreIdentity accountId=\{account\.accountId\}/);
  assert.match(shell, /<MercadoLivreIdentity variant="header"\/>/);
  assert.match(identity, /trustedSellerAvatar/);
  assert.match(identity, /sellerInitials/);
});
