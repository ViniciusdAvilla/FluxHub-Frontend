import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "../src/app/login/page";

test("login FluxHub oferece somente acesso autorizado, sem cadastro publico", () => {
  const markup = renderToStaticMarkup(createElement(LoginPage));
  assert.match(markup, /Acesse sua conta/);
  assert.match(markup, /Entrar no FluxHub/);
  assert.match(markup, /Administrador Master/);
  assert.match(markup, /type="email"/);
  assert.match(markup, /type="password"/);
  assert.match(markup, /Lembrar de mim/);
  assert.match(markup, /Esqueci minha senha/);
  assert.doesNotMatch(markup, /Criar minha conta|Cadastre-se|Criar conta gr[aá]tis/i);
  assert.doesNotMatch(markup, /href="\/cadastro"|href="\/register"/);
});

test("fundo animado e ilustrativo nao expoe dados de vendedores nem controls acessiveis", () => {
  const markup = renderToStaticMarkup(createElement(LoginPage));
  assert.match(markup, /class="login-scene" aria-hidden="true"/);
  assert.match(markup, /PRÉVIA ILUSTRATIVA/);
  assert.match(markup, /scene-line-chart/);
  assert.match(markup, /scene-bars/);
  assert.match(markup, /Faturamento por período/);
});

test("animacoes respeitam movimento reduzido e paleta do login dispensa dourado", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const marker = "/* FluxHub login SaaS";
  assert.ok(css.includes(marker));
  const loginStyles = css.slice(css.indexOf(marker));
  assert.match(loginStyles, /prefers-reduced-motion:\s*reduce/);
  assert.match(loginStyles, /login-dashboard-float/);
  assert.match(loginStyles, /login-wave-travel/);
  assert.doesNotMatch(loginStyles, /#ffd439|#ffcf31|#ffcc27|#ffdc52/i);
});

test("cadastro de usuarios permanece na area administrativa protegida", () => {
  const page = readFileSync("src/app/admin/page.tsx", "utf8");
  const clients = readFileSync("src/app/admin/clientes/page.tsx", "utf8");
  const admin = readFileSync("src/components/admin-overview.tsx", "utf8");
  const api = readFileSync("src/app/api/platform/admin/route.ts", "utf8");
  assert.match(page, /!me\?\.is_admin/);
  assert.match(clients, /!me\?\.is_admin/);
  assert.match(admin, /Cadastrar novo usuário/);
  assert.match(api, /\/api\/v1\/admin\/users/);
});
