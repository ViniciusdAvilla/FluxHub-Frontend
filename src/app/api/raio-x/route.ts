import { getSnapshot } from "@/lib/backend";
import { analyzeMarket, marketProviderStatus } from "@/lib/market";
import type { Product } from "@/lib/types";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json(marketProviderStatus(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });
  if (Number(request.headers.get("content-length")) > 16384)
    return Response.json({ error: "Consulta muito grande." }, { status: 413 });
  try {
    const raw = await request.text();
    if (raw.length > 16384) return Response.json({ error: "Consulta muito grande." }, { status: 413 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const snapshot = await getSnapshot();
    if (snapshot.error) return Response.json({ error: snapshot.error }, { status: 502 });

    if (Array.isArray(body.productIds)) {
      const ids = [...new Set(body.productIds.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))].slice(0, 8);
      if (!ids.length) return Response.json({ error: "Selecione ao menos um produto." }, { status: 400 });
      const products = ids.map((id) => snapshot.products.find((item) => item.id === id)).filter((item): item is Product => Boolean(item));
      const results = [];
      for (let index = 0; index < products.length; index += 2) {
        const chunk = products.slice(index, index + 2);
        results.push(...await Promise.all(chunk.map((product) => analyzeMarket(product, body.force === true))));
      }
      return Response.json({ data: results }, { headers: { "Cache-Control": "no-store" } });
    }

    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (!productId || productId.length > 120) return Response.json({ error: "Produto inválido." }, { status: 400 });
    const product = snapshot.products.find((item) => item.id === productId);
    if (!product) return Response.json({ error: "Produto não encontrado no catálogo atual." }, { status: 404 });
    const data = await analyzeMarket(product, body.force === true);
    return Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível executar o Raio-X." }, { status: 500 });
  }
}
