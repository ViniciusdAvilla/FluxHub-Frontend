/** Validate official ML OAuth redirect before opening browser or returning URL. */
const AUTH_ORIGIN = "https://auth.mercadolivre.com.br";
const CALLBACK = "https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback";

export function parseOfficialMercadoLivreOAuthUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    if (url.origin !== AUTH_ORIGIN || url.pathname !== "/authorization" || url.hash ||
        url.username || url.password) return null;
    if (url.searchParams.getAll("state").length !== 1 ||
        !/^[a-zA-Z0-9_-]{16,200}$/.test(url.searchParams.get("state") ?? "")) return null;
    if (url.searchParams.getAll("client_id").length !== 1 ||
        !/^\d+$/.test(url.searchParams.get("client_id") ?? "")) return null;
    if (url.searchParams.getAll("redirect_uri").length !== 1 ||
        url.searchParams.get("redirect_uri") !== CALLBACK ||
        url.searchParams.get("response_type") !== "code") return null;
    if (url.searchParams.has("code_challenge") &&
        url.searchParams.get("code_challenge_method") !== "S256") return null;
    return url.toString();
  } catch { return null; }
}
