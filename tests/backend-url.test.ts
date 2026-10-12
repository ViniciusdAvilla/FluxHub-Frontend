import test from "node:test";
import assert from "node:assert/strict";
import { resolveBackendUrl } from "../src/lib/backend-url";

test("resolve OpenAPI e produtos diretamente na raiz da API", () => {
  const base = new URL("http://127.0.0.1:8000");
  assert.equal(
    resolveBackendUrl(base, "/openapi.json").href,
    "http://127.0.0.1:8000/openapi.json",
  );
  assert.equal(
    resolveBackendUrl(base, "/api/v1/products/").href,
    "http://127.0.0.1:8000/api/v1/products/",
  );
});

test("preserva o prefixo de um proxy reverso do Swagger", () => {
  for (const address of [
    "http://187.77.230.250/backend-api",
    "http://187.77.230.250/backend-api/",
  ]) {
    const base = new URL(address);
    assert.equal(
      resolveBackendUrl(base, "/openapi.json").href,
      "http://187.77.230.250/backend-api/openapi.json",
    );
    assert.equal(
      resolveBackendUrl(base, "/api/v1/products/").href,
      "http://187.77.230.250/backend-api/api/v1/products/",
    );
  }
});

test("codifica parâmetros sem alterar o caminho base", () => {
  const query = new URLSearchParams({ page: "2", search: "café com leite" });
  const result = resolveBackendUrl(
    new URL("https://api.exemplo.com/backend-api"),
    "/api/v1/products/",
    query,
  );
  assert.equal(result.pathname, "/backend-api/api/v1/products/");
  assert.equal(result.searchParams.get("page"), "2");
  assert.equal(result.searchParams.get("search"), "café com leite");
});

test("rejeita destino externo e tentativas de sair do prefixo", () => {
  const base = new URL("https://api.exemplo.com/backend-api");
  for (const path of ["//malicioso.example/rota", "/../rota", "/%2e%2e/rota", "/rota?x=1", "/rota#abc"]) {
    assert.throws(() => resolveBackendUrl(base, path), /Caminho inválido/);
  }
  assert.throws(
    () => resolveBackendUrl(new URL("ftp://api.exemplo.com/"), "/openapi.json"),
    /Endereço do serviço inválido/,
  );
});
