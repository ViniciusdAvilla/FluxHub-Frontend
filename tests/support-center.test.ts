import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/mensagens/page.tsx", "utf8");
const component = readFileSync("src/components/support-center.tsx", "utf8");
const route = readFileSync("src/app/api/platform/support/route.ts", "utf8");
const shell = readFileSync("src/components/modern-shell.tsx", "utf8");

test("Central de Atendimento usa contas OAuth do usuario logado", () => {
  assert.match(page, /getMarketplaceOverview\(\)/);
  assert.match(page, /accounts=\{ml\.accounts\.map/);
  assert.match(shell, /href: "\/mensagens"/);
  assert.match(component, /account_id:String\(accountId\)/);
  assert.match(component, /kind==="questions"/);
  assert.match(component, /kind==="messages"/);
});

test("Envio manual exige confirmação explícita e não é acionado pela IA", () => {
  assert.match(component, /window\.confirm/);
  assert.match(component, /confirmed:true/);
  assert.match(component, /"suggest"/);
  assert.match(component, /"reply"/);
  assert.match(component, /Ao solicitar uma sugestão/);
  assert.match(route, /isTrustedRequestOrigin/);
  assert.match(route, /request\.headers\.get\("origin"\)/);
  assert.match(route, /input\.confirmed !== true/);
  assert.match(route, /backendMutation/);
  assert.doesNotMatch(component, /NEXT_PUBLIC_OPENAI_API_KEY|MERCADO_LIVRE_CLIENT_SECRET/);
});

test("Interface e proxy não recebem nem solicitam tokens diretamente", () => {
  assert.match(route, /backendRequest/);
  assert.match(route, /backendMutation/);
  assert.ok(route.includes("^[0-9]{1,22}$"));
  assert.match(component, /loadJson/);
  assert.match(component, /can_reply/);
  assert.doesNotMatch(route, /process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(route, /api\.mercadolibre\.com/);
});
