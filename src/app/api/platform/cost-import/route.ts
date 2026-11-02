import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession } from "@/lib/auth";
import { assertSecureBackendTransport, backendAuthHeaders } from "@/lib/backend-auth";
import { resolveBackendUrl } from "@/lib/backend-url";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 16 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = /\.(csv|tsv|txt|xlsx|xls|docx|pdf)$/i;

function reply(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return reply("Origem não autorizada.", 403);
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode !== "preview" && mode !== "apply")
    return reply("Ação de importação inválida.", 422);
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return reply("Entre no FluxHub para importar custos.", 401);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BYTES + 10000) return reply("Arquivo maior que 16 MB.", 413);
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !ACCEPTED_EXTENSIONS.test(file.name))
      return reply("Selecione CSV, Excel, Word (.docx), PDF, TXT ou TSV.", 415);
    if (file.size === 0 || file.size > MAX_BYTES)
      return reply("Arquivo vazio ou maior que 16 MB.", 413);
    const token = form.get("preview_token");
    if (mode === "apply" && (typeof token !== "string" || token.length > 2000 || !token))
      return reply("Faça a prévia antes de confirmar.", 422);

    const upstream = new FormData();
    upstream.set("file", file, file.name);
    if (mode === "apply") upstream.set("preview_token", String(token));

    const base = new URL(process.env.BACKEND_URL || "http://127.0.0.1:8000");
    assertSecureBackendTransport(base);
    const target = resolveBackendUrl(base, "/api/v1/pricing/cost-import/" + mode);
    const headers = backendAuthHeaders(process.env.BACKEND_TOKEN);
    headers.Authorization = "Bearer " + session.accessToken;
    const response = await fetch(target, {
      method: "POST", headers, body: upstream,
      redirect: "error", cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });
    const data = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      const message = typeof data?.detail === "string" ? data.detail : "Falha ao importar custos.";
      return reply(message, [400, 401, 403, 409, 413, 415, 422, 429].includes(response.status)
        ? response.status : 502);
    }
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return reply("Servidor de importação indisponível.", 503);
  }
}
