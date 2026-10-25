import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test("navegação interna nunca mostra a antiga tela de loading com ícones e sidebar duplicada", () => {
  assert.equal(existsSync("src/app/loading.tsx"), false,
    "O loading global antigo recria AppSidebar durante as transições e causa o flash de ícones.");
  const shell = readFileSync("src/components/modern-shell.tsx", "utf8");
  assert.match(shell, /<aside className=\{`fh-sidebar/);
  assert.match(shell, /modules\.map\(/);
  assert.match(shell, /className="fh-subnav"/);
  assert.doesNotMatch(shell, /AppSidebar/);
});

test("página Produtos usa o mesmo ModernShell sem tela de espera própria", () => {
  const products = readFileSync("src/app/produtos/page.tsx", "utf8");
  const operational = readFileSync("src/components/platform-page.tsx", "utf8");
  assert.match(products, /<PlatformPage /);
  assert.match(operational, /<ModernShell title=\{current.title\}/);
  assert.doesNotMatch(operational, /<AppSidebar/);
  assert.equal(existsSync("src/app/produtos/loading.tsx"), false);
});

test("login continua separado do dashboard operacional", () => {
  const login = readFileSync("src/app/login/page.tsx", "utf8");
  assert.match(login, /className="login-page"/);
  assert.doesNotMatch(login, /AppSidebar/);
});
