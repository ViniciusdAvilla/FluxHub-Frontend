import { backendMutation, backendRequest, BackendHttpError } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modes = new Set(["sales", "pricing", "inventory", "strategy"]);

export async function GET() {
  try {
    return Response.json(await backendRequest("/api/v1/agents/claude/status"), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ configured: false, model: null, modes: {}, read_only: true },
      { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });
  try {
    const raw = await request.text();
    if (raw.length > 2000) return Response.json({ error: "Solicitação muito longa." }, { status: 413 });
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return Response.json({ error: "Solicitação inválida." }, { status: 422 });
    const data = payload as Record<string, unknown>;
    if (typeof data.agent !== "string" || !modes.has(data.agent) ||
        typeof data.instruction !== "string" || data.instruction.length > 1200)
      return Response.json({ error: "Modo ou instrução inválidos." }, { status: 422 });
    const result = await backendMutation("/api/v1/agents/claude/run",
      "POST", { agent: data.agent, instruction: data.instruction }, 60000);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof BackendHttpError
      ? error.message : "Não foi possível consultar Claude." }, {
      status: error instanceof BackendHttpError && [401, 403, 422, 429, 503].includes(error.status)
        ? error.status : 502,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
