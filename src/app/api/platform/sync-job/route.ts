import { BackendHttpError, backendMutation, backendRequest } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function accountIdFrom(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    return null;
  return value;
}

function errorResponse(error: unknown) {
  const status = error instanceof BackendHttpError &&
    [401, 403, 404, 409, 422].includes(error.status) ? error.status : 502;
  return Response.json({
    error: error instanceof BackendHttpError ? error.message : "Sincronização indisponível.",
  }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("accountId");
  const accountId = raw && /^\d{1,15}$/.test(raw) ? accountIdFrom(Number(raw)) : null;
  if (accountId === null)
    return Response.json({ error: "Conta inválida." }, { status: 422 });
  try {
    const job = await backendRequest(`/api/v1/analytics/sync-jobs/${accountId}`);
    return Response.json(job, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });
  try {
    const raw = await request.text();
    if (raw.length > 1000)
      return Response.json({ error: "Requisição muito grande." }, { status: 413 });
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return Response.json({ error: "Parâmetros inválidos." }, { status: 422 });
    const accountId = accountIdFrom((body as { accountId?: unknown }).accountId);
    if (accountId === null)
      return Response.json({ error: "Conta inválida." }, { status: 422 });
    const action = (body as { action?: unknown }).action ?? "sync";
    if (action !== "sync" && action !== "pause" && action !== "orders")
      return Response.json({ error: "Ação inválida." }, { status: 422 });
    const target = action === "pause"
      ? `/api/v1/analytics/sync-jobs/${accountId}/pause`
      : action === "orders"
        ? `/api/v1/analytics/sync-jobs/${accountId}/orders`
        : "/api/v1/analytics/sync-jobs";
    const query = action === "sync"
      ? new URLSearchParams({ account_id: String(accountId) }) : undefined;
    const result = await backendMutation(target, "POST", undefined, 10000, query);
    return Response.json(result, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
