import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE, validCredentials } from "@/lib/auth";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Formato inválido." }, { status: 415 });
  }
  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0, 100);
  const now = Date.now();
  if (failures.size > 5000) failures.clear();
  const failure = failures.get(ip);
  if (failure && failure.until > now && failure.count >= 8) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  }

  try {
    const raw = await request.text();
    if (raw.length > 2048) return NextResponse.json({ error: "Solicitação muito grande." }, { status: 413 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const allowed = await validCredentials(email, password);
    if (!allowed) {
      const recent = failure && failure.until > now ? failure.count : 0;
      failures.set(ip, { count: recent + 1, until: now + WINDOW_MS });
      return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
    }
    const session = createSession();
    failures.delete(ip);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    const https = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto")?.split(",")[0] === "https";
    response.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true, secure: https, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
    return NextResponse.json({ error: "Autenticação indisponível. Verifique a configuração do servidor." }, { status: 503 });
  }
}
