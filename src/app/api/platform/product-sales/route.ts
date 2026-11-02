import { backendRequest } from "@/lib/backend-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids") || "";
  const values = [...new Set(ids.split(","))];
  if (values.length < 1 || values.length > 100 ||
      values.some(id => !/^ML[A-Z]{1,2}\d{5,20}$/.test(id))) {
    return Response.json({ error: "Lista de anúncios inválida." }, { status: 422 });
  }
  try {
    const result = await backendRequest(
      "/api/v1/analytics/items/sold-totals",
      new URLSearchParams({ ids: values.join(",") }), 30000
    );
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Vendas totais temporariamente indisponíveis." }, {
      status: 502, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
