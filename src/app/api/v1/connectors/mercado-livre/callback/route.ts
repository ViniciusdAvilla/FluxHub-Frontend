import { NextRequest, NextResponse } from "next/server";
import { backendRequest } from "@/lib/backend-transport";
import { parseMercadoLivreCallback } from "@/lib/mercado-livre-callback";
import { publicAppUrl } from "@/lib/public-app-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CallbackResponse = { connected?: boolean; provider?: string; account_id?: number };

type ErrorReason = "invalid" | "state" | "backend" | "exchange" | "unknown";

function finish(status: "connected" | "error" | "cancelled", reason?: ErrorReason) {
  // Host público fixo: Nginx pode apresentar request.url como localhost:3000.
  // A URL final jamais contém state, code, access_token ou refresh_token.
  const params = new URLSearchParams({ ml: status });
  if (status === "error" && reason) params.set("ml_reason", reason);
  const url = publicAppUrl("/integracoes", params);
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
function classifyError(error: unknown): ErrorReason {
  // Categorias seguras, sem expor os parâmetros OAuth ou o corpo de erros do provedor.
  const message = error instanceof Error ? error.message : "";
  if (/expirada|já utilizada|estado oauth inválido/i.test(message)) return "state";
  if (/BACKEND_TOKEN|Não autorizado|Autenticação do backend|Endereço do serviço|fetch failed|timeout|ECONNREFUSED/i.test(message))
    return "backend";
  if (/Falha ao concluir a autorização Mercado Livre/i.test(message)) return "exchange";
  return "unknown";
}

export async function GET(request: NextRequest) {
  const query = parseMercadoLivreCallback(request.nextUrl.searchParams);
  if (!query) return finish("error", "invalid");

  const cancelled = query.has("error");
  try {
    const result = await backendRequest(
      "/api/v1/connectors/mercado-livre/callback", query,
    ) as CallbackResponse;
    if (result.connected !== true || result.provider !== "mercado_livre" ||
        !Number.isSafeInteger(result.account_id) || Number(result.account_id) <= 0) {
      return finish("error", "unknown");
    }
    return finish("connected");
  } catch (error) {
    const reason = classifyError(error);
    // Log somente a categoria; nunca registre state, code ou segredos no terminal.
    console.warn("[mercado-livre-oauth] Falha no callback:", reason);
    return cancelled ? finish("cancelled") : finish("error", reason);
  }
}
