import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

test("tema escuro respeita os mesmos componentes em todas as rotas", () => {
  const style = readFileSync("src/app/dark-theme.css", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const shell = readFileSync("src/components/modern-shell.tsx", "utf8");
  assert.match(layout, /import "\.\/dark-theme\.css"/);
  assert.match(layout, /import "\.\/route-loading\.css"/);
  assert.match(layout, /<PersistentDashboardFrame>/);
  assert.match(shell, /document\.documentElement\.dataset\.fluxhubTheme = stored/);
  assert.match(shell, /document\.documentElement\.dataset\.fluxhubTheme = next/);
  for (const token of [
    ".fh-card::before", ".fh-kpi::before", ".fh-orders-search", ".fh-smart-order-toolbar",
    ".fh-table th", ".fh-legacy-module .endpoint-list", ".fh-claude-chat",
    ".fh-cost-import", ".fh-profit-panel", ".fh-chart-tooltip",
    ".fh-donut-center", "html[data-fluxhub-theme=\"dark\"] .fh-smart-overlay",
  ]) assert.ok(style.includes(token), "Falta cobertura no tema escuro: " + token);
});

test("skeleton só aparece após atraso e herda o tema do painel persistente", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {url:"http://localhost:3000"});
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    MutationObserver: dom.window.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  document.documentElement.dataset.fluxhubTheme = "dark";
  const React = await import("react");
  const { render, waitFor, cleanup } = await import("@testing-library/react");
  const { default: Loading } = await import("../src/app/loading");

  try {
    const view = render(React.createElement("div",
      { className: "fh-app fh-liquid-glass fh-theme-dark" }, React.createElement(Loading)));
    assert.equal(view.container.querySelector(".fh-route-loading"), null);
    await waitFor(() => assert.ok(view.container.querySelector(".fh-route-loading")),
      {timeout:1500});
    assert.ok(view.container.querySelector(".fh-theme-dark .fh-route-loading"));
    assert.equal(document.documentElement.dataset.fluxhubTheme, "dark");
    assert.equal(view.container.querySelector(".fh-route-loading .fh-sidebar"), null);
    assert.ok(view.getByRole("status", {name:/Carregando informações da página/}));
    view.unmount();
  } finally {
    cleanup();
    dom.window.close();
  }
});
