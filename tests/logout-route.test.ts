import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/auth/logout/route";

test("logout usa domínio público mesmo quando Next.js recebe localhost do Nginx", async () => {
  const request = new NextRequest("http://127.0.0.1:3000/api/auth/logout", {
    method: "POST",
    headers: {
      origin: "https://myfluxhub.tech",
      "x-forwarded-host": "myfluxhub.tech",
      "x-forwarded-proto": "https",
    },
  });
  const response = await POST(request);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://myfluxhub.tech/login");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const cookie = response.headers.get("set-cookie") ?? "";
  assert.match(cookie, /fluxhub_session=/);
  assert.match(cookie, /Max-Age=0/i);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
});

test("logout não aceita Origin de site diferente", async () => {
  const request = new NextRequest("http://127.0.0.1:3000/api/auth/logout", {
    method: "POST",
    headers: {
      origin: "https://site-malicioso.example",
      "x-forwarded-host": "myfluxhub.tech",
      "x-forwarded-proto": "https",
      "sec-fetch-site": "cross-site",
    },
  });
  const response = await POST(request);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("set-cookie"), null);
});
