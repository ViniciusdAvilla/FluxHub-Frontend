import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession } from "./auth";
import { resolveBackendUrl } from "./backend-url";
import { assertSecureBackendTransport, backendAuthHeaders } from "./backend-auth";

export class BackendHttpError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryAfter: string | null) {
    super(message);
    this.name = "BackendHttpError";
  }
}

function backendBase() {
  const base = new URL(process.env.BACKEND_URL || "http://127.0.0.1:8000");
  if (!/^https?:$/.test(base.protocol))
    throw new Error("Endereço do serviço inválido.");
  assertSecureBackendTransport(base);
  return base;
}

async function requestAbsolute(
  url: URL, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  payload?: unknown, includeUser = true, timeoutMs = 10000,
) {
  const base = backendBase();
  if (url.origin !== base.origin)
    throw new Error("Destino de consulta não autorizado.");
  const headers = backendAuthHeaders(process.env.BACKEND_TOKEN);
  if (includeUser) {
    const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
    if (session) headers.Authorization = `Bearer ${session.accessToken}`;
  }
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method,
    body: payload === undefined ? undefined : JSON.stringify(payload),
    headers,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as Record<string, unknown>).detail)
        : `Falha na consulta (${response.status}).`;
    throw new BackendHttpError(detail, response.status, response.headers.get("Retry-After"));
  }
  return body;
}

/**
 * Consultas rápidas normalmente encerram em 10s. Endpoints que consultam
 * serviços externos podem solicitar um limite maior explicitamente:
 * /profile pode precisar renovar o OAuth (20s) e consultar /users/me (20-25s).
 */
export async function backendRequest(
  path: string,
  query?: URLSearchParams,
  timeoutMs = 10000,
) {
  if (!path.startsWith("/")) throw new Error("Caminho inválido.");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000)
    throw new Error("Tempo limite inválido.");
  const url = resolveBackendUrl(backendBase(), path, query);
  return requestAbsolute(url, "GET", undefined, true, timeoutMs);
}

export async function backendMutation(
  path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", payload?: unknown, timeoutMs = 10000, query?: URLSearchParams,
): Promise<unknown> {
  if (!path.startsWith("/")) throw new Error("Caminho inválido.");
  return requestAbsolute(resolveBackendUrl(backendBase(), path, query), method, payload, true, timeoutMs);
}

export async function serviceLogin(email: string, password: string) {
  const url = resolveBackendUrl(backendBase(), "/api/v1/auth/login");
  return requestAbsolute(url, "POST", { email, password }, false) as Promise<{
    access_token: string; token_type: string; expires_in: number;
  }>;
}

export async function serviceIdentity(token: string) {
  const url = resolveBackendUrl(backendBase(), "/api/v1/auth/me");
  const headers = {
    ...backendAuthHeaders(process.env.BACKEND_TOKEN),
    Authorization: `Bearer ${token}`,
  };
  const response = await fetch(url, {
    headers, cache: "no-store", redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Não foi possível validar a conta no backend.");
  return response.json() as Promise<{ id: number; email: string; is_admin: boolean; is_active: boolean }>;
}

