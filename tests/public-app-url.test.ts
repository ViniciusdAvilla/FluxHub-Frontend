import test from "node:test";
import assert from "node:assert/strict";
import { publicAppUrl } from "../src/lib/public-app-url";

test("callback OAuth em produção nunca redireciona para localhost", () => {
  for (const environment of ["production", "test", undefined]) {
    const url = publicAppUrl(
      "/integracoes",
      new URLSearchParams({ ml: "error", ml_reason: "backend" }),
      environment,
    );
    assert.equal(url.href, "https://myfluxhub.tech/integracoes?ml=error&ml_reason=backend");
    assert.equal(url.hostname, "myfluxhub.tech");
    assert.equal(url.protocol, "https:");
  }
});

test("redirecionamento do login usa domínio público em produção", () => {
  assert.equal(publicAppUrl("/login", undefined, "production").href, "https://myfluxhub.tech/login");
  assert.equal(publicAppUrl("/", undefined, "production").href, "https://myfluxhub.tech/");
});

test("desenvolvimento local mantém localhost apenas para a navegação interna", () => {
  assert.equal(publicAppUrl("/login", undefined, "development").href, "http://localhost:3000/login");
});
