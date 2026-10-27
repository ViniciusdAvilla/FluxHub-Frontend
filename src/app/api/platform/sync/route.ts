import { backendMutation } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });

  try {
    // scroll_id is an opaque cursor issued by Mercado Livre (potentially > 1 KiB).
    const raw = await request.text();
    if (raw.length > 8192)
      return Response.json({ error: "Requisição muito grande." }, { status: 413 });

    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return Response.json({ error: "Parâmetros inválidos." }, { status: 422 });

    const { accountId, phase, offset = 0, scrollId } = body as {
      accountId?: unknown;
      phase?: unknown;
      offset?: unknown;
      scrollId?: unknown;
    };
    if (typeof accountId !== "number" || !Number.isSafeInteger(accountId) || accountId <= 0)
      return Response.json({ error: "Conta inválida." }, { status: 422 });
    if (phase !== "listings" && phase !== "orders")
      return Response.json({ error: "Etapa de sincronização inválida." }, { status: 422 });
    if (typeof offset !== "number" || !Number.isSafeInteger(offset) || offset < 0 || offset > 2_147_483_647 || offset % 20 !== 0)
      return Response.json({ error: "Página inválida." }, { status: 422 });
    if (scrollId !== undefined && (phase !== "listings" || typeof scrollId !== "string" || scrollId.length < 1 || scrollId.length > 4096))
      return Response.json({ error: "Cursor de sincronização inválido." }, { status: 422 });

    // Listings: Mercado Livre's scan/scroll API is independent of numeric offsets.
    // Orders: paginate with offset; both stages persist bounded database batches.
    const query = new URLSearchParams({
      account_id: String(accountId),
      phase,
      limit: "20",
    });
    if (phase === "orders") query.set("offset", String(offset));
    if (typeof scrollId === "string") query.set("scroll_id", scrollId);

    const result = await backendMutation(
      "/api/v1/analytics/sync", "POST", undefined, 120000, query,
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Sincronização indisponível.",
    }, { status: 502 });
  }
}
