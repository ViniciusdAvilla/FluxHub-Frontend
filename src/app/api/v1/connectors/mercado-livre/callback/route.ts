import { NextRequest, NextResponse } from "next/server";
import { backendRequest } from "@/lib/backend-transport";
import { parseMercadoLivreCallback } from "@/lib/mercado-livre-callback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CallbackResponse = { connected?: boolean; provider?: string; account_id?: number };

function finish(request: NextRequest, status: "connected" | "error" | "cancelled") {
  // A URL final jamais contém state, code, access_token ou refresh_token.
  const url = new URL("/integracoes", request.url);
  url.searchParams.set("ml", status);
  const response = NextResponse.redirect(url, { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

/**
 * A VPS roteia /backend-api/* ao FastAPI e /api/* ao Next.js.
 * A URL de retorno do Mercado Livre pode permanecer
 * https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback
 * exatamente como cadastrada no app, sem expor as credenciais no navegador.
 */
export async function GET(request: NextRequest) {
  const query = parseMercadoLivreCallback(request.nextUrl.searchParams);
  if (!query) return finish(request, "error");

  const cancelled = query.has("error");
  try {
    const result = await backendRequest(
      "/api/v1/connectors/mercado-livre/callback", query,
    ) as CallbackResponse;
    if (result.connected !== true || result.provider !== "mercado_livre" ||
        !Number.isSafeInteger(result.account_id) || Number(result.account_id) <= 0) {
      return finish(request, "error");
    }
    return finish(request, "connected");
  } catch {
    return finish(request, cancelled ? "cancelled" : "error");
  }
}
