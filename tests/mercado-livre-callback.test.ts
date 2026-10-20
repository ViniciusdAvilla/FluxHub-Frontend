import test from "node:test";
import assert from "node:assert/strict";
import { parseMercadoLivreCallback } from "../src/lib/mercado-livre-callback";

const state = "s".repeat(43);
test("aceita code e state de uma única tentativa OAuth", () => {
  const input = new URLSearchParams({ state, code: "TG-example-123456" });
  assert.equal(parseMercadoLivreCallback(input)?.toString(), input.toString());
});

test("aceita retorno de cancelamento sem expor token", () => {
  const parsed = parseMercadoLivreCallback(
    new URLSearchParams({ state, error: "access_denied" }),
  );
  assert.equal(parsed?.get("error"), "access_denied");
  assert.equal(parsed?.has("code"), false);
});

test("rejeita callback sem state ou code, duplicado e muito longo", () => {
  const invalid = [
    new URLSearchParams({ code: "TG-test" }),
    new URLSearchParams({ state }),
    new URLSearchParams({ state: "curto", code: "TG-test" }),
    new URLSearchParams({ state, code: "x".repeat(2049) }),
    new URLSearchParams({ state, error: "x".repeat(201) }),
    new URLSearchParams({ state, code: "TG-test", error: "access_denied" }),
    new URLSearchParams("state=" + state + "&state=" + state + "&code=TG-test"),
  ];
  for (const params of invalid) assert.equal(parseMercadoLivreCallback(params), null);
});

test("descarta parâmetros extras não permitidos, inclusive token arbitrário", () => {
  const p = new URLSearchParams({ state, code: "TG-example", access_token: "hidden" });
  const validated = parseMercadoLivreCallback(p);
  assert.equal(validated?.has("access_token"), false);
});
