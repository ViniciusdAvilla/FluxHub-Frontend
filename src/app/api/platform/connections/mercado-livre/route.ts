import { NextResponse } from "next/server";
import { backendMutation } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";
import { parseOfficialMercadoLivreOAuthUrl } from "@/lib/marketplace-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

function allowed(request: Request) {
  return Boolean(request.headers.get("origin") && isTrustedRequestOrigin(request));
}

/** Only a logged-in FluxHub customer can start an ML OAuth grant for their user ID. */
export async function POST(request: Request) {
  if (!allowed(request)) return NextResponse.json(
    { error: "Origem não autorizada." }, { status: 403, headers });
  try {
    const data = await backendMutation(
      "/api/v1/connectors/mercado-livre/authorize", "POST",
    ) as { authorization_url?: unknown; expires_in?: unknown };
    const authorizationUrl = parseOfficialMercadoLivreOAuthUrl(data?.authorization_url);
    if (!authorizationUrl) return NextResponse.json(
      { error: "O backend retornou uma URL de autorização inválida." },
      { status: 502, headers });
    return NextResponse.json(
      { authorization_url: authorizationUrl, expires_in: 600 },
      { headers });
  } catch {
    // Do not disclose backend URLs, cookies, service token or OAuth errors to browser.
    return NextResponse.json(
      { error: "Não foi possível iniciar a conexão. Faça login novamente ou verifique a API." },
      { status: 502, headers });
  }
}

/** Disconnect only a seller account owned by the authenticated FluxHub user. */
export async function DELETE(request: Request) {
  if (!allowed(request)) return NextResponse.json(
    { error: "Origem não autorizada." }, { status: 403, headers });
  try {
    const content = request.headers.get("content-type");
    if (!content?.startsWith("application/json")) return NextResponse.json(
      { error: "Formato inválido." }, { status: 415, headers });
    const raw = await request.text();
    if (raw.length > 256) return NextResponse.json(
      { error: "Requisição muito grande." }, { status: 413, headers });
    const body: unknown = JSON.parse(raw);
    const id = body && typeof body === "object" && "accountId" in body
      ? (body as { accountId?: unknown }).accountId : undefined;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return NextResponse.json(
      { error: "Conta inválida." }, { status: 422, headers });
    const query = new URLSearchParams({ account_id: String(id) });
    await backendMutation(
      "/api/v1/connectors/mercado-livre", "DELETE", undefined, 10000, query);
    return NextResponse.json({ disconnected: true, account_id: id }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível desconectar essa conta. Verifique o login e tente novamente." },
      { status: 502, headers });
  }
}
