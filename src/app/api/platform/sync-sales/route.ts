import { backendMutation } from "@/lib/backend-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Solicitação inválida." }, { status: 400 });
  }
  const row = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown> : {};
  const accountIds = row.account_ids;
  if (!Array.isArray(accountIds) || accountIds.length < 1 || accountIds.length > 5 ||
      accountIds.some(id => !Number.isSafeInteger(id) || id <= 0) ||
      new Set(accountIds).size !== accountIds.length) {
    return Response.json({ error: "Contas Mercado Livre inválidas." }, { status: 422 });
  }
  const queued: number[] = [];
  const errors: string[] = [];
  for (const accountId of accountIds as number[]) {
    try {
      await backendMutation("/api/v1/analytics/sync-jobs/" + accountId + "/orders", "POST");
      queued.push(accountId);
    } catch (reason) {
      errors.push("Conta " + accountId + ": " +
        (reason instanceof Error ? reason.message : "Falha ao agendar pedidos."));
    }
  }
  return Response.json({ queued, errors, message: queued.length
    ? "Sincronização de pedidos agendada. Atualize os dados após a conclusão."
    : "Não foi possível iniciar a sincronização." }, {
      status: queued.length ? 202 : 409,
      headers: { "Cache-Control": "private, no-store" },
    });
}
