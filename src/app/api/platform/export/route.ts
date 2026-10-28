import { BackendHttpError, backendDownload } from "@/lib/backend-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reports = new Set(["complete", "products", "orders", "listings", "costs"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const report = params.get("report") || "complete";
  if (!reports.has(report)) return Response.json({ error: "Relatório inválido." }, { status: 422 });
  const query = new URLSearchParams();
  const accountId = params.get("accountId");
  if (accountId !== null) {
    if (!/^[1-9]\d{0,17}$/.test(accountId))
      return Response.json({ error: "Conta inválida." }, { status: 422 });
    query.set("account_id", accountId);
  }
  const days = params.get("days");
  if (days !== null && days !== "all") {
    const value = Number(days);
    if (!Number.isSafeInteger(value) || value < 1 || value > 365)
      return Response.json({ error: "Período inválido." }, { status: 422 });
    query.set("days", days);
  }
  try {
    const backend = await backendDownload("/api/v1/exports/" + report, query);
    const name = backend.headers.get("content-disposition") ||
      'attachment; filename="fluxhub-report.xlsx"';
    return new Response(backend.body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": name,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json({ error: "Não foi possível exportar os dados." }, {
      status: error instanceof BackendHttpError && [401, 403, 422, 429].includes(error.status)
        ? error.status : 502,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
