export const dynamic = "force-dynamic";

export async function GET() {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://myfluxhub.tech").replace(/\/+$/, "");
  return Response.json({
    resource: origin + "/mcp",
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["fluxhub:read"],
  }, { headers: { "Cache-Control": "public, max-age=300" } });
}
