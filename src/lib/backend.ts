import "server-only";
import { applyProductBrands, normalizeProducts } from "./analytics";
import { readFinance } from "./database";
import { parseOpenApi } from "./openapi";
import { backendRequest } from "./backend-transport";
export { backendRequest, backendMutation, serviceLogin, serviceIdentity } from "./backend-transport";
import type { BackendSchema, Snapshot } from "./types";

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

async function financeSnapshot() {
  try {
    return await readFinance();
  } catch (error) {
    console.error(
      "[finance]",
      error instanceof Error ? error.message : "Falha ao ler custos",
    );
    return [];
  }
}

async function ordersRevenueSnapshot(): Promise<Snapshot["sales"]> {
  try {
    const payload = await backendRequest("/api/v1/sales/?days=30");
    if (!payload || typeof payload !== "object") return null;
    const row = payload as Record<string, unknown>;
    if (typeof row.paid_order_count !== "number" ||
        (row.gross_paid_order_amount !== null && typeof row.gross_paid_order_amount !== "number"))
      return null;
    return {
      days: typeof row.days === "number" ? row.days : 30,
      total_orders: typeof row.total_orders === "number" ? row.total_orders : 0,
      paid_order_count: row.paid_order_count,
      gross_paid_order_amount: row.gross_paid_order_amount as number | null,
      data_complete: row.data_complete === true,
      partial_data: row.partial_data !== false,
      note: typeof row.note === "string" ? row.note : "Pedidos cadastrados.",
    };
  } catch (error) {
    console.warn("[orders-revenue]", error instanceof Error ? error.message : "Indisponível");
    return null;
  }
}

/**
 * O formato enviado às páginas deve refletir o que elas realmente usam:
 * - catalog: catálogo/custos, sem relatório de pedidos ou OpenAPI serializado;
 * - data: somente contrato OpenAPI para a Central de Dados;
 * - full: compatibilidade com consumidores que precisam do contrato completo.
 *
 * O schema continua sendo consultado internamente no catálogo para descobrir
 * caminhos e enriquecimento de marcas, preservando integrações existentes.
 */
export type SnapshotScope = "catalog" | "data" | "full";

export async function getSnapshot(scope: SnapshotScope = "catalog"): Promise<Snapshot> {
  if (scope === "data") {
    const schema = await getBackendSchema();
    return {
      products: [],
      finance: [],
      sales: null,
      schema,
      updatedAt: schema.error ? null : new Date().toISOString(),
      error: schema.error,
    };
  }

  const [schema, finance, sales] = await Promise.all([
    getBackendSchema(),
    financeSnapshot(),
    scope === "full" ? ordersRevenueSnapshot() : Promise.resolve(null),
  ]);
  // Somente a Central de Dados precisa da lista de endpoints no navegador.
  const clientSchema = scope === "full" ? schema : { ...schema, endpoints: [] };

  try {
    const baseProducts = normalizeProducts(
      await backendRequest(chooseProductsPath(schema), undefined, 30000),
    );
    const products = await enrichBrandsFromBackend(baseProducts, schema);
    return {
      products,
      finance,
      sales,
      schema: clientSchema,
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
      sales,
      schema: clientSchema,
      updatedAt: null,
      error:
        "Não foi possível atualizar os produtos. Verifique se o serviço local está em execução e tente novamente.",
    };
  }
}
