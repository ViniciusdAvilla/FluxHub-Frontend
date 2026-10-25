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

test("assistente volta no cartão Mercado Livre somente para o Administrador Master", () => {
  const wizard = readFileSync("src/components/mercado-livre-setup-wizard.tsx", "utf8");
  assert.ok(page.includes('data.isAdmin && <div className="fh-ml-setup-trigger"'));
  assert.ok(page.includes("<MercadoLivreSetupWizard />"));
  assert.ok(wizard.includes("<dialog"));
  assert.ok(wizard.includes("showModal()"));
  assert.ok(wizard.includes("Próximo passo"));
  assert.ok(wizard.includes("Voltar"));
  assert.ok(wizard.includes("Abrir DevCenter"));
  assert.ok(wizard.includes("https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback"));
  assert.ok(css.includes(".fh-wizard-progress"));
  assert.ok(css.includes(".fh-ml-setup-trigger"));
  assert.ok(css.includes("grid-template-columns:repeat(6,minmax(0,1fr))"));
  const labels = [...wizard.matchAll(/\{ name: "([^"]+)", title: /g)].map(x => x[1]);
  assert.deepEqual(labels, ["DevCenter","Aplicativo","Callback","PKCE","Credenciais","Teste"]);
  assert.doesNotMatch(wizard, /backend|\bVPS\b|name: "Backend"|MERCADO_LIVRE_CLIENT_SECRET/i);
  assert.doesNotMatch(page, /<ol className="fh-guide-steps/);
});

test("perfil conectado usa foto e nome oficiais sem inventar avatar", () => {
  const identity = readFileSync("src/components/mercado-livre-identity.tsx","utf8");
  const shell = readFileSync("src/components/modern-shell.tsx","utf8");
  assert.match(page, /MercadoLivreIdentity accountId=\{account\.accountId\}/);
  assert.match(shell, /<MercadoLivreIdentity variant="header"\/>/);
  assert.match(identity, /trustedSellerAvatar/);
  assert.match(identity, /sellerInitials/);
});
