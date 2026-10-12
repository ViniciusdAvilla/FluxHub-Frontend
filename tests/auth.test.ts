import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { authConfigurationIssue, createSession, isValidSession, SESSION_MAX_AGE, validCredentials } from "../src/lib/auth";

test("nega sessões ausentes, adulteradas ou com segredo diferente", () => {
  process.env.AUTH_SESSION_SECRET = "a".repeat(64);
  assert.equal(isValidSession(undefined), false);
  const session = createSession();
  assert.equal(isValidSession(session), true);
  assert.equal(isValidSession(session.slice(0, -1) + (session.endsWith("a") ? "b" : "a")), false);
  process.env.AUTH_SESSION_SECRET = "b".repeat(64);
  assert.equal(isValidSession(session), false);
});

test("nega sessões expiradas e além do prazo máximo", () => {
  process.env.AUTH_SESSION_SECRET = "c".repeat(64);
  const originalNow = Date.now;
  try {
    const base = originalNow();
    Date.now = () => base;
    const session = createSession();
    Date.now = () => base + (SESSION_MAX_AGE + 1) * 1000;
    assert.equal(isValidSession(session), false);
  } finally {
    Date.now = originalNow;
  }
});

test("valida hash scrypt sem armazenar senha no projeto", async () => {
  process.env.AUTH_EMAIL = "FluxHub@gmail.com";
  const salt = randomBytes(16);
  const hash = scryptSync("senha-de-teste-nao-e-credencial", salt, 64).toString("hex");
  process.env.AUTH_PASSWORD_HASH = `scrypt:${salt.toString("hex")}:${hash}`;
  assert.equal(await validCredentials("fluxhub@gmail.com", "senha-de-teste-nao-e-credencial"), true);
  assert.equal(await validCredentials("outra@example.com", "senha-de-teste-nao-e-credencial"), false);
  assert.equal(await validCredentials("fluxhub@gmail.com", "senha-errada"), false);
  delete process.env.AUTH_PASSWORD_HASH;
  assert.equal(await validCredentials("fluxhub@gmail.com", "senha-de-teste-nao-e-credencial"), false);
});

test("identifica hash ausente e segredo de sessão não configurado", () => {
  delete process.env.AUTH_PASSWORD_HASH;
  delete process.env.AUTH_SESSION_SECRET;
  assert.equal(authConfigurationIssue(), "AUTH_PASSWORD_HASH");
  process.env.AUTH_PASSWORD_HASH = "scrypt:invalido";
  assert.equal(authConfigurationIssue(), "AUTH_PASSWORD_HASH");
  process.env.AUTH_PASSWORD_HASH = "scrypt:" + "a".repeat(32) + ":" + "b".repeat(128);
  assert.equal(authConfigurationIssue(), "AUTH_SESSION_SECRET");
  process.env.AUTH_SESSION_SECRET = "x".repeat(64);
  assert.equal(authConfigurationIssue(), null);
  delete process.env.AUTH_PASSWORD_HASH;
  delete process.env.AUTH_SESSION_SECRET;
});
