import { backendMutation, BackendHttpError } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedModels = new Set([
  "claude-sonnet-5", "claude-sonnet-4-6",
  "claude-opus-4-6", "claude-haiku-4-5-20251001",
]);

export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });
  try {
    const raw = await request.text();
    if (raw.length > 1500) return Response.json({ error: "Solicitação muito longa." }, { status: 413 });
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return Response.json({ error: "Solicitação inválida." }, { status: 422 });
    const body = payload as Record<string, unknown>;
    if (typeof body.model !== "string" || !allowedModels.has(body.model) ||
      (body.api_key !== undefined && (typeof body.api_key !== "string" ||
        body.api_key.length > 512)))
      return Response.json({ error: "Chave ou modelo inválidos." }, { status: 422 });
    const result = await backendMutation("/api/v1/agents/claude/config", "POST", {
      model: body.model,
      api_key: typeof body.api_key === "string" ? body.api_key : null,
    }, 25000);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof BackendHttpError
      ? error.message : "Não foi possível salvar a configuração." }, {
      status: error instanceof BackendHttpError && [401, 403, 422, 429, 503, 504].includes(error.status)
        ? error.status : 502,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
