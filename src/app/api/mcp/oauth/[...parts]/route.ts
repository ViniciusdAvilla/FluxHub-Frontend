import { forwardMcp } from "@/lib/mcp-server-proxy";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ parts: string[] }> };

function route(parts: string[]): { path: string; login: boolean; publicWrite: boolean } | null {
  const path = parts.join("/");
  if (path === "authorize" || path === "register" || path === "token")
    return { path, login: false, publicWrite: true };
  if (path === "approve" || path === "revoke-all" || path === "status")
    return { path, login: true, publicWrite: false };
  if (parts.length === 2 && parts[0] === "request" && /^[A-Za-z0-9_-]{30,100}$/.test(parts[1]))
    return { path, login: true, publicWrite: false };
  return null;
}

export async function GET(request: Request, context: Context) {
  const target = route((await context.params).parts);
  if (!target || !["authorize", "status"].includes(target.path) && !target.path.startsWith("request/"))
    return Response.json({ error: "Rota desconhecida." }, { status: 404 });
  const result = await forwardMcp(request, "/api/v1/mcp/oauth/" + target.path, { login: target.login });
  if (target.path !== "authorize" || !result.ok) return result;
  const data = await result.json() as { consent_url?: string };
  const origin = new URL(request.url).origin;
  const canonical = (process.env.NEXT_PUBLIC_SITE_URL || "https://myfluxhub.tech").replace(/\/+$/, "");
  try {
    const url = new URL(data.consent_url || "");
    if (![origin, canonical].includes(url.origin) || url.pathname !== "/mcp/autorizar")
      throw new Error("URL inválida");
    return Response.redirect(url, 303);
  } catch {
    return Response.json({ error: "Autorização MCP indisponível." }, { status: 502 });
  }
}

export async function POST(request: Request, context: Context) {
  const target = route((await context.params).parts);
  if (!target || !["register", "token", "approve", "revoke-all"].includes(target.path))
    return Response.json({ error: "Rota desconhecida." }, { status: 404 });
  if (!target.publicWrite && (
    !request.headers.get("origin") || !isTrustedRequestOrigin(request)))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  return forwardMcp(request, "/api/v1/mcp/oauth/" + target.path,
    { login: target.login, allowBody: true });
}
