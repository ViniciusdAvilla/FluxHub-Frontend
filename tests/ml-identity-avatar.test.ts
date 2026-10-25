import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { trustedSellerAvatar, sellerInitials } from "../src/components/mercado-livre-identity";

test("foto do vendedor aceita somente imagens oficiais HTTPS mlstatic", () => {
  assert.equal(trustedSellerAvatar("https://http2.mlstatic.com/minha-loja.jpg"),
    "https://http2.mlstatic.com/minha-loja.jpg");
  assert.equal(trustedSellerAvatar("https://mlstatic.com.attacker.tld/trap"), null);
  assert.equal(trustedSellerAvatar("https://user:pass@mlstatic.com/foto.png"), null);
  assert.equal(trustedSellerAvatar("data:image/svg+xml,<svg/>"), null);
  assert.equal(trustedSellerAvatar("http://mlstatic.com/foto.png"), null);
  assert.equal(trustedSellerAvatar(null), null);
});

test("sem foto real o fallback exibe as iniciais de nome recebido", () => {
  assert.equal(sellerInitials("Maria Silva"), "MS");
  assert.equal(sellerInitials(" LOJA  "), "LO");
  assert.equal(sellerInitials(""), "ML");
});

test("API intermediaria so retorna informacao publica de conta autenticada", () => {
  const content = readFileSync("src/app/api/platform/mercado-livre/identity/route.ts","utf8");
  assert.match(content, /backendRequest/);
  assert.match(content, /account_id/);
  assert.match(content, /private, no-store/);
  assert.doesNotMatch(content, /access_token|refresh_token|client_secret/);
});
