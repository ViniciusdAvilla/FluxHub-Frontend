import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { isTrustedRequestOrigin } from "@/lib/request-security";
import { publicAppUrl } from "@/lib/public-app-url";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 });
  }
  // Nginx pode entregar request.url com localhost:3000.
  // Redirecione sempre para o host público do FluxHub em produção.
  const loginUrl = publicAppUrl("/login");
  const response = NextResponse.redirect(loginUrl, 303);
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: loginUrl.protocol === "https:" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
