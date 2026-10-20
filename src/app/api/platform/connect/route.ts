import { backendRequest } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";
import { validateAuthorizationUrl, type MarketplaceProvider } from "@/lib/marketplace-authorization";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });

  let provider: MarketplaceProvider;
  try {
    const raw = await request.text();
    if (raw.length > 300)
      return Response.json({ error: "Solicitação muito grande." }, { status: 413 });
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data))
      return Response.json({ error: "Parâmetros inválidos." }, { status: 422 });
    const input = (data as Record<string, unknown>).provider;
    if (input !== "mercado-livre" && input !== "mercado-pago")
      return Response.json({ error: "Provedor não autorizado." }, { status: 422 });
    provider = input;
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const response = await backendRequest(`/api/v1/connectors/${provider}/authorize`) as {authorization_url?: string};
    const authorizationUrl = validateAuthorizationUrl(provider, response?.authorization_url);
    return Response.json({ authorization_url: authorizationUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Não foi possível solicitar autorização ao backend.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
