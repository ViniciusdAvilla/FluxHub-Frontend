import { backendMutation } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

/** Reativa uma fonte ML existente, pertencente à empresa autenticada. */
export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });

  try {
    const raw = await request.text();
    if (raw.length > 300) return Response.json({ error: "Solicitação muito grande." }, { status: 413 });
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data))
      return Response.json({ error: "Parâmetros inválidos." }, { status: 422 });
    const accountKey = (data as Record<string, unknown>).accountKey;
    if (typeof accountKey !== "string" || !/^ml:[1-9]\d{0,14}$/.test(accountKey))
      return Response.json({ error: "Conta inválida." }, { status: 422 });
    const result = await backendMutation(
      `/api/v1/connectors/mercado_livre/${accountKey}`,
      "PATCH",
      { enabled: true },
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Não foi possível reativar a fonte no backend." }, { status: 502 });
  }
}
