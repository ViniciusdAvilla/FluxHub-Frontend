/**
 * URLs de navegação para fluxos server-side atrás do Nginx.
 * request.url/nextUrl podem conter localhost:3000, mesmo em produção.
 * Nunca construa redirecionamentos com Host ou X-Forwarded-Host recebidos da rede.
 */
export function publicAppUrl(
  path: "/" | "/login" | "/integracoes",
  query?: URLSearchParams,
  environment: string | undefined = process.env.NODE_ENV,
): URL {
  const origin = environment === "development"
    ? "http://localhost:3000"
    : "https://myfluxhub.tech";
  const url = new URL(path, origin);
  if (query) url.search = query.toString();
  return url;
}
