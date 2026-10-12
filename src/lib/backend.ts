import "server-only";
import { applyProductBrands, normalizeProducts } from "./analytics";
import { readFinance } from "./database";
import { parseOpenApi } from "./openapi";
import { resolveBackendUrl } from "./backend-url";
import { assertSecureBackendTransport, backendAuthHeaders } from "./backend-auth";
import type { BackendSchema, Snapshot } from "./types";

function backendBase() {
  const base = new URL(process.env.BACKEND_URL || "http://127.0.0.1:8000");
  if (!/^https?:$/.test(base.protocol))
    throw new Error("Endereço do serviço inválido.");
  assertSecureBackendTransport(base);
  return base;
}

async function requestAbsolute(url: URL) {
  const base = backendBase();
  if (url.origin !== base.origin)
    throw new Error("Destino de consulta não autorizado.");
  const headers = backendAuthHeaders(process.env.BACKEND_TOKEN);
  const response = await fetch(url, {
    headers,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
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
    throw new Error(detail);
  }
  return body;
}

export async function backendRequest(path: string, query?: URLSearchParams) {
  if (!path.startsWith("/")) throw new Error("Caminho inválido.");
  const url = resolveBackendUrl(backendBase(), path, query);
  return requestAbsolute(url);
}

export async function getBackendSchema(): Promise<BackendSchema> {
  try {
    return parseOpenApi(await backendRequest("/openapi.json"));
  } catch (error) {
    return {
      title: "Serviço local",
      version: "—",
      endpoints: [],
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o contrato de dados.",
    };
  }
}

function chooseProductsPath(schema: BackendSchema) {
  if (process.env.PRODUCTS_PATH) return process.env.PRODUCTS_PATH;
  const gets = schema.endpoints.filter((endpoint) => endpoint.method === "GET");
  const exact = gets.find((endpoint) => endpoint.path === "/api/v1/products/");
  if (exact) return exact.path;
  const candidates = gets.filter(
    (endpoint) =>
      /(?:^|\/)products?\/?$/i.test(endpoint.path) &&
      !endpoint.path.includes("{") &&
      endpoint.parameters.every((p) => !p.required || p.in !== "query"),
  );
  return candidates[0]?.path ?? "/api/v1/products/";
}

function chooseProductsByBrandsPath(schema: BackendSchema) {
  if (process.env.PRODUCTS_BY_BRANDS_PATH) return process.env.PRODUCTS_BY_BRANDS_PATH;
  const gets = schema.endpoints.filter((endpoint) => endpoint.method === "GET");
  const candidates = gets
    .filter(
      (endpoint) =>
        /by[-_]?brands?/i.test(endpoint.path) &&
        !endpoint.path.includes("{") &&
        endpoint.parameters.every((parameter) => !parameter.required || parameter.in !== "query"),
    )
    .sort((a, b) => Number(/products?/i.test(b.path)) - Number(/products?/i.test(a.path)));
  return candidates[0]?.path ?? null;
}

async function enrichBrandsFromBackend(products: ReturnType<typeof normalizeProducts>, schema: BackendSchema) {
  const path = chooseProductsByBrandsPath(schema);
  if (!path) return products;
  try {
    return applyProductBrands(products, await backendRequest(path));
  } catch (error) {
    console.warn(
      "[brands]",
      error instanceof Error ? error.message : "Falha ao carregar fabricantes por marca",
    );
    return products;
  }
}

export async function executeReadEndpoint(
  pathTemplate: string,
  values: Record<string, string>,
) {
  const schema = await getBackendSchema();
  if (schema.error) throw new Error(schema.error);
  const endpoint = schema.endpoints.find(
    (item) => item.method === "GET" && item.path === pathTemplate,
  );
  if (!endpoint) throw new Error("Consulta não disponível no contrato atual.");

  const inputs = endpoint.parameters.filter((parameter) =>
    parameter.in === "path" || parameter.in === "query",
  );
  const allowed = new Set(inputs.map((parameter) => parameter.name));
  for (const key of Object.keys(values)) {
    if (!allowed.has(key)) throw new Error(`Parâmetro não permitido: ${key}.`);
  }

  let path = endpoint.path;
  const query = new URLSearchParams();
  for (const parameter of inputs) {
    const value = values[parameter.name]?.trim() ?? "";
    if (parameter.required && !value)
      throw new Error(`Preencha o parâmetro obrigatório “${parameter.name}”.`);
    if (!value) continue;
    if (parameter.in === "path") {
      path = path.replace(
        `{${parameter.name}}`,
        encodeURIComponent(value).replace(/%2F/gi, "%252F"),
      );
    } else if (parameter.in === "query") {
      query.set(parameter.name, value);
    }
  }
  if (/\{[^}]+\}/.test(path))
    throw new Error("Existem parâmetros de caminho não preenchidos.");
  return backendRequest(path, query);
}

function financeSnapshot() {
  try {
    return readFinance();
  } catch (error) {
    console.error(
      "[finance]",
      error instanceof Error ? error.message : "Falha ao ler custos",
    );
    return [];
  }
}

export async function getSnapshot(): Promise<Snapshot> {
  const schema = await getBackendSchema();
  const finance = financeSnapshot();
  try {
    const baseProducts = normalizeProducts(
      await backendRequest(chooseProductsPath(schema)),
    );
    const products = await enrichBrandsFromBackend(baseProducts, schema);
    return {
      products,
      finance,
      schema,
      updatedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    console.error(
      "[dashboard]",
      error instanceof Error ? error.message : "Falha na atualização",
    );
    return {
      products: [],
      finance,
      schema,
      updatedAt: null,
      error:
        "Não foi possível atualizar os produtos. Verifique se o serviço local está em execução e tente novamente.",
    };
  }
}
