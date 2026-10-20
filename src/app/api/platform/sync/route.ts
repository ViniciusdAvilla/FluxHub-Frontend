import { backendMutation } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });

  try {
    const raw = await request.text();
    if (raw.length > 1024)
      return Response.json({ error: "Requisição muito grande." }, { status: 413 });

    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return Response.json({ error: "Parâmetros inválidos." }, { status: 422 });

    const { accountId, offset = 0 } = body as { accountId?: unknown; offset?: unknown };
    if (typeof accountId !== "number" || !Number.isSafeInteger(accountId) || accountId <= 0)
      return Response.json({ error: "Conta inválida." }, { status: 422 });
    if (typeof offset !== "number" || !Number.isSafeInteger(offset) || offset < 0 || offset > 1000 || offset % 20 !== 0)
      return Response.json({ error: "Página inválida." }, { status: 422 });

    // A consulta múltipla /items/bulk aceita até 20 anúncios por lote.
    const result = await backendMutation(
      `/api/v1/analytics/sync?account_id=${accountId}&limit=20&offset=${offset}`,
      "POST",
      undefined,
      120000,
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Sincronização indisponível.",
    }, { status: 502 });
  }
}
