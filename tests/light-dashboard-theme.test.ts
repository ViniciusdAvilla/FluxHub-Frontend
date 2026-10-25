import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const globals = readFileSync("src/app/globals.css", "utf8");
const modern = readFileSync("src/app/modern.css", "utf8");

test("remove o tema global escuro herdado do dashboard antigo", () => {
  assert.doesNotMatch(globals, /Nova identidade dark SaaS/);
  assert.doesNotMatch(globals, /color-scheme:\s*dark/);
  assert.doesNotMatch(globals, /\.endpoint-list\s*\{\s*background:\s*#11191c/);
  assert.doesNotMatch(globals, /\.search-field,.search-field.compact\s*\{\s*background:\s*#0c1215/);
  assert.doesNotMatch(globals, /\.finance-dialog,.detail-drawer\s*\{\s*background:\s*#11191d/);
});

test("central de dados usa fundo claro, texto legivel e destaque azul", () => {
  for (const selector of [
    ".fh-legacy-module .endpoint-list",
    ".fh-legacy-module .endpoint-item.active",
    ".fh-legacy-module .endpoint-item strong",
    ".fh-legacy-module .endpoint-title code",
    ".fh-legacy-module .result-toolbar",
    ".fh-legacy-module .json-view",
    ".fh-legacy-module .filterbar .search-field",
    ".fh-legacy-module select option",
  ]) {
    assert.ok(modern.includes(selector), "Falta estilo claro para " + selector);
  }
  assert.match(modern, /endpoint-list\s*\{[^}]*background:\s*#f8fbff/s);
  assert.match(modern, /endpoint-item\.active\s*\{[^}]*background:\s*#e3efff/s);
  assert.match(modern, /select option\s*\{\s*background:\s*#fff/s);
});

test("campos, filtros e janelas de edicao mantem visual branco", () => {
  assert.match(modern, /\.fh-legacy-module input::placeholder\s*\{\s*color:\s*#687f9d/s);
  assert.match(modern, /\.finance-dialog,\s*\.detail-drawer\s*\{[^}]*background:\s*#fff/s);
  assert.match(modern, /\.fh-legacy-module\s+\.filterbar\s+select/);
  assert.match(modern, /\.fh-legacy-module\s+\.search-field\s+input/);
  assert.match(modern, /color-scheme:\s*light/);
});

test("login animado azul continua isolado do tema claro da dashboard", () => {
  assert.match(globals, /FluxHub login SaaS — somente azul e branco/);
  assert.match(globals, /\.login-scene\s*\{[^}]*background:/s);
  assert.match(globals, /\.login-card\s*\{[^}]*background:/s);
});
