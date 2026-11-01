export const dynamic = "force-dynamic";

export async function GET() {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://myfluxhub.tech").replace(/\/+$/, "");
  return Response.json({
    issuer: origin,
    authorization_endpoint: origin + "/api/mcp/oauth/authorize",
    token_endpoint: origin + "/api/mcp/oauth/token",
    registration_endpoint: origin + "/api/mcp/oauth/register",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["fluxhub:read"],
  }, { headers: { "Cache-Control": "public, max-age=300" } });
}
