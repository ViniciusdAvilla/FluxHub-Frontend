import { BackendHttpError, backendRequest } from "@/lib/backend-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
function validId(raw: string | null) {
  return raw && /^\d{1,18}$/.test(raw) && Number.isSafeInteger(Number(raw))
    ? Number(raw) : null;
}
function failed(error: unknown) {
  return respond({ error: error instanceof BackendHttpError
    ? error.message : "Não foi possível consultar os pedidos." },
  error instanceof BackendHttpError && [401, 403, 404, 409, 422, 429].includes(error.status)
    ? error.status : 502);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const action = params.get("action") || "orders";
  const account = params.get("accountId");
  const accountId = account === null ? null : validId(account);
  if (account !== null && accountId === null)
    return respond({ error: "Conta inválida." }, 422);
  const offset = params.get("offset") || "0";
  if (!/^\d{1,8}$/.test(offset)) return respond({ error: "Página inválida." }, 422);
  const target = new URLSearchParams({
    limit: "30", offset, ...(accountId ? { account_id: String(accountId) } : {}),
  });
  try {
    if (action === "orders") {
      const days = params.get("days");
      if (days && days !== "all" && /^\d{1,3}$/.test(days))
        target.set("days", days);
      if (params.get("status")) target.set("status", params.get("status")!.slice(0, 40));
      if (params.get("search")) target.set("search", params.get("search")!.slice(0, 100));
      for (const field of ["min_amount", "max_amount"]) {
        const raw = params.get(field);
        if (raw !== null && raw !== "") {
          const value = Number(raw);
          if (!Number.isFinite(value) || value < 0 || value > 1000000000)
            return respond({ error: "Faixa de valor inválida." }, 422);
          target.set(field, String(value));
        }
      }
      return respond(await backendRequest("/api/v1/orders/paged", target, 25000));
    }
    if (action === "buyers") {
      return respond(await backendRequest("/api/v1/orders/buyers", target, 25000));
    }
    if (action === "buyer-orders") {
      const buyerId = validId(params.get("buyerId"));
      if (!buyerId || !accountId) return respond({ error: "Comprador ou conta inválida." }, 422);
      return respond(await backendRequest(
        "/api/v1/orders/buyers/" + buyerId, target, 25000));
    }
    if (action === "buyer") {
      const orderId = validId(params.get("orderId"));
      if (!orderId || !accountId) return respond({ error: "Pedido ou conta inválida." }, 422);
      return respond(await backendRequest(
        "/api/v1/orders/" + orderId + "/buyer",
        new URLSearchParams({ account_id: String(accountId) }), 90000));
    }
    return respond({ error: "Consulta desconhecida." }, 422);
  } catch (error) { return failed(error); }
}
