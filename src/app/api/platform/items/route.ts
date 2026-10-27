import { backendRequest } from "@/lib/backend-transport";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const account = url.searchParams.get("accountId");
  const cursor = url.searchParams.get("scrollId");
  if (!account || !/^\d{1,15}$/.test(account) ||
      !Number.isSafeInteger(Number(account)) || Number(account) <= 0)
    return Response.json({ error: "Conta inválida." }, { status: 422 });
  if (cursor !== null && (cursor.length < 1 || cursor.length > 4096))
    return Response.json({ error: "Cursor inválido." }, { status: 422 });
  const query = new URLSearchParams({ account_id: account });
  if (cursor !== null) query.set("scroll_id", cursor);
  try {
    const result = await backendRequest(
      "/api/v1/connectors/mercado-livre/items/live", query, 120000,
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Consulta indisponível.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
