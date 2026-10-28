import { backendRequest, BackendHttpError } from "@/lib/backend-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const offset = params.get("offset") || "0";
  const limit = params.get("limit") || "30";
  const search = params.get("search") || "";
  if (!/^\d{1,8}$/.test(offset) || !/^\d{1,3}$/.test(limit) ||
      Number(limit) < 1 || Number(limit) > 100 || search.length > 100)
    return Response.json({ error: "Parâmetros inválidos." }, { status: 422 });
  const target = new URLSearchParams({ offset, limit, search });
  const account = params.get("accountId");
  if (account !== null) {
    if (!/^[1-9]\d{0,17}$/.test(account) || !Number.isSafeInteger(Number(account)))
      return Response.json({ error: "Conta inválida." }, { status: 422 });
    target.set("account_id", account);
  }
  try {
    return Response.json(await backendRequest("/api/v1/listing-health/", target, 25000), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return Response.json({ error: error instanceof BackendHttpError
      ? error.message : "Falha ao consultar saúde dos anúncios." }, {
      status: error instanceof BackendHttpError && [401, 403, 422, 429].includes(error.status)
        ? error.status : 502,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
