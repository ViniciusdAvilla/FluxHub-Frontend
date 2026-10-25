import test from "node:test";
import assert from "node:assert/strict";
import { createSession, readSession, isValidSession, authConfigurationIssue } from "../src/lib/auth";

test("sessão cifrada contém JWT validado previamente pelo backend", () => {
  process.env.AUTH_SESSION_SECRET = "a".repeat(64);
  const token = "test.jwt.payload.signature";
  const session = createSession(token, 3000, "CLIENT@EXAMPLE.COM", false);
  assert.equal(isValidSession(session), true);
  assert.equal(readSession(session)?.email, "client@example.com");
  assert.equal(readSession(session)?.accessToken, token);
  assert.equal(session.includes(token), false);
  const parts = session.split(".");
  const tampered = parts[0].replace(/^./, parts[0][0] === "A" ? "B" : "A") + "." + parts[1] + "." + parts[2];
  assert.equal(isValidSession(tampered), false);
  process.env.AUTH_SESSION_SECRET = "b".repeat(64);
  assert.equal(isValidSession(session), false);
});

test("nega sessão expirada e ausência de segredo", () => {
  process.env.AUTH_SESSION_SECRET = "c".repeat(64);
  const savedNow = Date.now;
  try {
    const baseline = savedNow();
    Date.now = () => baseline;
    const session = createSession("test.jwt.payload.signature", 60, "x@y.z", true);
    Date.now = () => baseline + 61_000;
    assert.equal(isValidSession(session), false);
  } finally { Date.now = savedNow; }
  delete process.env.AUTH_SESSION_SECRET;
  assert.equal(authConfigurationIssue(), "AUTH_SESSION_SECRET");
  assert.equal(isValidSession(undefined), false);
});
