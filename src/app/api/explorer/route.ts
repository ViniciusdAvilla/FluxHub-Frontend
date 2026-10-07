import { executeReadEndpoint } from "@/lib/backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });
  if (Number(request.headers.get("content-length")) > 65536)
    return Response.json({ error: "Consulta muito grande." }, { status: 413 });
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object")
      throw new Error("Consulta inválida.");
    const record = body as Record<string, unknown>;
    if (typeof record.path !== "string" || !record.path.startsWith("/"))
      throw new Error("Selecione uma consulta válida.");
    const values: Record<string, string> = {};
    if (record.values && typeof record.values === "object") {
      for (const [key, value] of Object.entries(
        record.values as Record<string, unknown>,
      )) {
        if (typeof value === "string") values[key] = value;
      }
    }
    const data = await executeReadEndpoint(record.path, values);
    return Response.json(
      { data, receivedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Não foi possível consultar.",
      },
      { status: 400 },
    );
  }
}
