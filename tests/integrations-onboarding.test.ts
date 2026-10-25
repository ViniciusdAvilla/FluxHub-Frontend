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

test("assistente simplificado tem seis passos, logo, progresso e botoes", () => {
  const wizard = readFileSync("src/components/mercado-livre-setup-wizard.tsx", "utf8");
  assert.match(wizard, /<dialog ref=\{dialog\}/);
  assert.match(wizard, /fh-wizard-browser-marketplace/);
  assert.match(wizard, /fh-wizard-progress/);
  assert.match(wizard, /fh-wizard-tip/);
  assert.match(wizard, /Próximo passo/);
  assert.match(wizard, /Abrir DevCenter/);
  assert.match(wizard, /mercado-livre-icon\.webp/);
  assert.ok(existsSync("public/marketplaces/mercado-livre-icon.webp"));
  assert.ok(statSync("public/marketplaces/mercado-livre-icon.webp").size > 1000);
});
test("assistente DevCenter so aparece para administrador e abre popup por etapas", () => {
  const wizard = readFileSync("src/components/mercado-livre-setup-wizard.tsx", "utf8");
  assert.match(page, /data\.isAdmin && <div className="fh-ml-setup-trigger"/);
  assert.match(page, /<MercadoLivreSetupWizard\s*\/>/);
  assert.match(wizard, /<dialog ref=\{dialog\}/);
  assert.match(wizard, /showModal\(\)/);
  assert.match(wizard, /current\.title/);
  assert.match(wizard, /steps\.map/);
  assert.match(wizard, /aria-current=\{i === step \? "step"/);
  assert.match(wizard, /https:\/\/developers\.mercadolivre\.com\.br\/devcenter/);
  assert.match(wizard, /https:\/\/myfluxhub\.tech\/api\/v1\/connectors\/mercado-livre\/callback/);
  const etapaNames = [...wizard.matchAll(/\{ name: "([^"]+)", title: /g)].map(match => match[1]);
  assert.deepEqual(etapaNames, ["DevCenter", "Aplicativo", "Callback", "PKCE", "Credenciais", "Teste"]);
  assert.doesNotMatch(wizard, /name: "Backend"|Configure as credenciais privadas na VPS/);
  assert.doesNotMatch(wizard, /<code>MERCADO_LIVRE_CLIENT_SECRET<\/code>/);
  assert.match(page, /configure o aplicativo em seis etapas/);
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
});

test("perfil conectado usa foto e nome oficiais sem inventar avatar", () => {
  const identity = readFileSync("src/components/mercado-livre-identity.tsx","utf8");
  const shell = readFileSync("src/components/modern-shell.tsx","utf8");
  assert.match(page, /MercadoLivreIdentity accountId=\{account\.accountId\}/);
  assert.match(shell, /<MercadoLivreIdentity variant="header"\/>/);
  assert.match(identity, /trustedSellerAvatar/);
  assert.match(identity, /sellerInitials/);
});
