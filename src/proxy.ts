import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { publicAppUrl } from "@/lib/public-app-url";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const signedIn = isValidSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(publicAppUrl("/")) : NextResponse.next();
  }
  if (pathname === "/api/auth/login" || pathname === "/api/auth/logout" ||
      pathname === "/api/v1/connectors/mercado-livre/callback") {
    // Callback OAuth validado pelo state de uso único no FastAPI, não pelo cookie.
    // Mesmo se a sessão expirou durante o consentimento, o callback pode finalizar.
    return NextResponse.next();
  }
  if (signedIn) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const login = publicAppUrl("/login");
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|robots.txt|sitemap.xml).*)"],
};
