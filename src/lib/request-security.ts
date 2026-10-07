const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeHost(host: string) {
  return host.replace(/^\[|\]$/g, "").toLowerCase();
}

function sameLocalOriginAlias(a: URL, b: URL) {
  const aHost = normalizeHost(a.hostname);
  const bHost = normalizeHost(b.hostname);
  if (!LOCAL_HOSTS.has(aHost) || !LOCAL_HOSTS.has(bHost)) return false;
  const aPort = a.port || (a.protocol === "https:" ? "443" : "80");
  const bPort = b.port || (b.protocol === "https:" ? "443" : "80");
  return a.protocol === b.protocol && aPort === bPort;
}

export function isTrustedRequestOrigin(request: Request) {
  const originHeader = request.headers.get("origin");

  // Requests without Origin normally come from server-to-server tools/curl.
  // This route does not use cookie authentication, so they can be accepted.
  if (!originHeader) return true;

  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return false;
  }

  const requestUrl = new URL(request.url);
  if (origin.origin === requestUrl.origin) return true;
  if (sameLocalOriginAlias(origin, requestUrl)) return true;

  // Reverse proxies (Vercel, Nginx, Cloudflare, etc.) may rewrite request.url.
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
    try {
      const forwardedOrigin = new URL(`${forwardedProto}://${forwardedHost}`);
      if (origin.origin === forwardedOrigin.origin) return true;
      if (sameLocalOriginAlias(origin, forwardedOrigin)) return true;
    } catch {
      // Ignore malformed proxy headers and continue with browser metadata.
    }
  }

  // Browsers set this header and scripts cannot override it. It is a reliable
  // fallback when a development proxy rewrites the request host internally.
  return request.headers.get("sec-fetch-site") === "same-origin";
}
