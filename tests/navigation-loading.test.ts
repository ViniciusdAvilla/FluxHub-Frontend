import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test("navegação preserva o shell e skeleton tardio só ocupa o conteúdo", () => {
  assert.equal(existsSync("src/app/loading.tsx"), true);
  const loading = readFileSync("src/app/loading.tsx", "utf8");
  assert.match(loading, /setTimeout\(\(\) => setSlow\(true\), 180\)/);
  assert.match(loading, /if \(!slow\) return <div className="fh-route-pending"/);
  assert.match(loading, /clearTimeout\(timer\)/);
  assert.doesNotMatch(loading, /<aside|className="fh-sidebar"|modules\.map\(/);
  const shell = readFileSync("src/components/modern-shell.tsx", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(shell, /export function PersistentDashboardFrame/);
  assert.match(shell, /const PageChromeContext = createContext/);
  assert.match(shell, /if \(register\) return <>{children}<\/>/);
  assert.match(shell, /<aside className=\{\`fh-sidebar/);
  assert.match(shell, /modules\.map\(/);
  assert.match(shell, /className="fh-subnav"/);
  assert.match(layout, /<PersistentDashboardFrame>{children}<\/PersistentDashboardFrame>/);
  assert.doesNotMatch(shell, /AppSidebar/);
});

test("funil usa dados do período e ocupa a lacuna à direita dos indicadores", () => {
  const home = readFileSync("src/components/seller-home.tsx", "utf8");
  const funnel = readFileSync("src/components/conversion-funnel.tsx", "utf8");
  const css = readFileSync("src/app/polished-glass.css", "utf8");
  assert.match(home, /<div className="fh-secondary-with-funnel">/);
  assert.match(home, /<ConversionFunnel visits=\{visits\} orders=\{totalOrders\} paidOrders=\{paidOrders\}/);
  assert.ok(home.indexOf("<ConversionFunnel") < home.indexOf('className="fh-alert-row"'));
  assert.match(css, /\.fh-secondary-with-funnel\s*\{\s*display:grid/);
  assert.match(funnel, /formatRate\(orders, visits\)/);
  assert.match(funnel, /formatRate\(paidOrders, orders\)/);
  assert.doesNotMatch(funnel, /69\.616|4\.027|3\.748/);
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
  const shell = readFileSync("src/components/modern-shell.tsx", "utf8");
  assert.match(login, /className="login-page"/);
  assert.match(shell, /pathname === "\/login"/);
  assert.doesNotMatch(login, /AppSidebar/);
});
