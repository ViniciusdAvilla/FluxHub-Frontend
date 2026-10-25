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

test("tela principal mostra Mercado Livre primeiro, sem lista longa de passos", () => {
  assert.match(page, /Conecte o FluxHub aos seus canais/);
  assert.match(page, /Conecte seu primeiro vendedor/);
  assert.match(page, /<MarketplaceConnectionActions\s*\/>/);
  assert.match(page, /fh-ml-brand-logo/);
  assert.match(page, /mercado-livre-icon\.webp/);
  assert.doesNotMatch(page, /<ol className="fh-guide-steps/);
  assert.ok(page.indexOf("fh-integration-header") < page.indexOf("fh-other-marketplaces"));
});

test("nenhum assistente, popup ou fluxo DevCenter aparece na página Integrações", () => {
  assert.doesNotMatch(page, /MercadoLivreSetupWizard|fh-ml-setup-trigger|Configuração inicial da plataforma/);
  assert.doesNotMatch(page, /configure o aplicativo em seis etapas|<dialog|fh-guide-steps/);
  assert.equal(existsSync("src/components/mercado-livre-setup-wizard.tsx"), false);
  assert.equal(css.includes(".fh-wizard"), false);
  assert.equal(css.includes(".fh-ml-setup-trigger"), false);
  assert.match(page, /MercadoLivreIdentity accountId=/);
  assert.ok(page.includes("<MarketplaceConnectionActions/>"));
  assert.match(page, /fh-other-marketplaces/);
});

test("perfil conectado usa foto e nome oficiais sem inventar avatar", () => {
  const identity = readFileSync("src/components/mercado-livre-identity.tsx","utf8");
  const shell = readFileSync("src/components/modern-shell.tsx","utf8");
  assert.match(page, /MercadoLivreIdentity accountId=\{account\.accountId\}/);
  assert.match(shell, /<MercadoLivreIdentity variant="header"\/>/);
  assert.match(identity, /trustedSellerAvatar/);
  assert.match(identity, /sellerInitials/);
});
