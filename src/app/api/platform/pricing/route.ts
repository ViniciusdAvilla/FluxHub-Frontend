import { BackendHttpError, backendMutation, backendRequest } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(body: unknown, status = 200) {
  return Response.json(body, { status,
    headers: { "Cache-Control": "private, no-store" } });
}
function errorResponse(error: unknown) {
  return respond({ error: error instanceof BackendHttpError
    ? error.message : "Calculadora indisponível." },
    error instanceof BackendHttpError && [401, 403, 404, 422, 429].includes(error.status)
      ? error.status : 502);
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const itemId = q.get("itemId");
  const account = q.get("accountId");
  if (!itemId || !/^[A-Z0-9]{3,100}$/i.test(itemId) ||
      !account || !/^\d{1,15}$/.test(account))
    return respond({ error: "Produto ou conta inválida." }, 422);
  const params = new URLSearchParams({ account_id: account });
  const price = q.get("price");
  if (price !== null) {
    const number = Number(price);
    if (!Number.isFinite(number) || number <= 0 || number > 1000000000)
      return respond({ error: "Preço inválido." }, 422);
    params.set("price", String(number));
  }
  try {
    return respond(await backendRequest("/api/v1/pricing/" + encodeURIComponent(itemId),
      params, 90000));
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return respond({ error: "Origem não autorizada." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return respond({ error: "Formato inválido." }, 415);
  try {
    const raw = await request.text();
    if (raw.length > 3000) return respond({ error: "Requisição muito grande." }, 413);
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return respond({ error: "Dados inválidos." }, 422);
    const { itemId, accountId, unit_cost, marketplace_fee_percent, tax_percent,
      shipping_cost, other_cost } = body as Record<string, unknown>;
    if (typeof itemId !== "string" || !/^[A-Z0-9]{3,100}$/i.test(itemId))
      return respond({ error: "Produto inválido." }, 422);
    if (typeof accountId !== "number" || !Number.isSafeInteger(accountId) || accountId <= 0)
      return respond({ error: "Conta inválida." }, 422);
    const fields = [unit_cost, tax_percent, shipping_cost, other_cost];
    if (fields.some(v => typeof v !== "number" || !Number.isFinite(v) || v < 0) ||
        (marketplace_fee_percent !== null && marketplace_fee_percent !== undefined &&
         (typeof marketplace_fee_percent !== "number" ||
          !Number.isFinite(marketplace_fee_percent) ||
          marketplace_fee_percent < 0 || marketplace_fee_percent > 100)))
      return respond({ error: "Custos inválidos." }, 422);
    const result = await backendMutation(
      "/api/v1/pricing/" + encodeURIComponent(itemId) + "/cost", "PATCH",
      { unit_cost, marketplace_fee_percent: marketplace_fee_percent ?? null,
        tax_percent, shipping_cost, other_cost }, 25000,
      new URLSearchParams({ account_id: String(accountId) }));
    return respond(result);
  } catch (error) { return errorResponse(error); }
}
