import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession } from "@/lib/auth";
import { backendAuthHeaders, assertSecureBackendTransport } from "@/lib/backend-auth";
import { resolveBackendUrl } from "@/lib/backend-url";

const ALLOWED_RESPONSE_HEADERS = [
  "content-type", "www-authenticate", "retry-after",
  "mcp-session-id", "mcp-protocol-version", "allow",
];

export async function forwardMcp(
  request: Request,
  backendPath: string,
  options: { login?: boolean; allowBody?: boolean } = {},
): Promise<Response> {
  try {
    const base = new URL(process.env.BACKEND_URL || "http://127.0.0.1:8000");
    assertSecureBackendTransport(base);
    const source = new URL(request.url);
    const url = resolveBackendUrl(base, backendPath, source.searchParams);
    const headers: Record<string, string> = backendAuthHeaders(process.env.BACKEND_TOKEN);
    headers.Accept = request.headers.get("accept") || "application/json";
    const bearer = request.headers.get("authorization");
    if (bearer?.startsWith("Bearer ") && bearer.length <= 4096)
      headers.Authorization = bearer;
    if (options.login) {
      const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
      if (!session) return Response.json({ error: "Faça login no FluxHub." }, { status: 401 });
      headers.Authorization = "Bearer " + session.accessToken;
    }
    const ct = request.headers.get("content-type");
    if (ct) headers["Content-Type"] = ct;
    const version = request.headers.get("mcp-protocol-version");
    if (version) headers["MCP-Protocol-Version"] = version;
    let body: string | undefined;
    if (options.allowBody) {
      body = await request.text();
      if (body.length > 50_000)
        return Response.json({ error: "Solicitação muito grande." }, { status: 413 });
    }
    const response = await fetch(url, {
      method: request.method, headers, body, cache: "no-store",
      redirect: "manual", signal: AbortSignal.timeout(60_000),
    });
    const out = new Headers({ "Cache-Control": "private, no-store" });
    for (const key of ALLOWED_RESPONSE_HEADERS) {
      const value = response.headers.get(key);
      if (value) out.set(key, value);
    }
    if (response.status >= 300 && response.status < 400)
      return Response.json({ error: "Redirecionamento do backend não autorizado." }, { status: 502 });
    return new Response(await response.arrayBuffer(), { status: response.status, headers: out });
  } catch {
    return Response.json({ error: "Servidor MCP indisponível." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
