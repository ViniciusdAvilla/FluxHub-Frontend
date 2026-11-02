import "server-only";
import { applyCatalogPaidSales, applyCategoryDisplayNames, applyProductBrands, normalizeProducts } from "./analytics";
import { readFinance } from "./database";
import { parseOpenApi } from "./openapi";
import { backendRequest } from "./backend-transport";
export { backendRequest, backendMutation, serviceLogin, serviceIdentity } from "./backend-transport";
import type { BackendSchema, CatalogPaidSales, Snapshot } from "./types";

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

const officialCategoryCache = new Map<string, { name: string; expiresAt: number }>();

/** Nomes oficiais no gráfico sem consultar individualmente milhares de anúncios. */
async function categoryLabelsForCharts(products: ReturnType<typeof normalizeProducts>) {
  const stats = new Map<string, { count: number; revenue: number }>();
  for (const product of products) {
    const categoryId = product.category;
    if (!/^ML[A-Z]{1,2}\d{3,15}$/.test(categoryId)) continue;
    const current = stats.get(categoryId) ?? { count: 0, revenue: 0 };
    current.count++;
    current.revenue += (product.price ?? 0) * (product.sales ?? 0);
    stats.set(categoryId, current);
  }
  const entries = [...stats.entries()];
  const byCount = [...entries].sort((a, b) => b[1].count - a[1].count).slice(0, 20);
  const byRevenue = [...entries].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 12);
  const categoryIds = [...new Set([...byCount, ...byRevenue].map(([id]) => id))];
  const names: Record<string, string> = {};
  const missing: string[] = [];
  const stamp = Date.now();
  for (const id of categoryIds) {
    const cached = officialCategoryCache.get(id);
    if (cached && cached.expiresAt > stamp) names[id] = cached.name;
    else missing.push(id);
  }

  const groups: string[][] = [];
  for (let i = 0; i < missing.length; i += 5) {
    groups.push(missing.slice(i, i + 5));
  }
  // Máximo de três chamadas simultâneas à API de categorias.
  for (let index = 0; index < groups.length; index += 3) {
    const response = await Promise.all(groups.slice(index, index + 3).map(async (ids) => {
      try {
        const payload = await backendRequest(
          "/api/v1/analytics/category-names",
          new URLSearchParams({ ids: ids.join(",") }), 10000
        );
        return payload && typeof payload === "object" && !Array.isArray(payload)
          ? payload as Record<string, unknown> : {};
      } catch (error) {
        console.warn("[category-names]", error instanceof Error ? error.message : "Indisponível");
        return {};
      }
    }));
    for (const result of response) {
      for (const [id, label] of Object.entries(result)) {
        if (categoryIds.includes(id) && typeof label === "string" &&
            label.trim().length >= 1 && label.trim().length <= 100) {
          names[id] = label.trim();
          officialCategoryCache.set(id, { name: label.trim(), expiresAt: Date.now() + 7 * 86400000 });
        }
      }
    }
  }
  if (officialCategoryCache.size > 3000) officialCategoryCache.clear();
  return names;
}

async function catalogPaidSalesSnapshot(): Promise<CatalogPaidSales | null> {
  try {
    const query = new URLSearchParams({ days: "30" });
    const payload = await backendRequest("/api/v1/analytics/catalog-metrics", query, 20000);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    const row = payload as Record<string, unknown>;
    if (row.days !== 30 || typeof row.orders_complete !== "boolean" ||
        !row.sales_by_item || typeof row.sales_by_item !== "object" ||
        Array.isArray(row.sales_by_item) ||
        typeof row.paid_orders !== "number" ||
        typeof row.enriched_paid_orders !== "number") {
      return null;
    }
    return row as CatalogPaidSales;
  } catch (error) {
    // Sem os dados reais de vendas, a listagem permanece consultável.
    console.warn("[catalog-paid-sales]", error instanceof Error ? error.message : "Indisponível");
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
      catalogSales: null,
      sales: null,
      schema,
      updatedAt: schema.error ? null : new Date().toISOString(),
      error: schema.error,
    };
  }

  const [schema, finance, sales, paidSales] = await Promise.all([
    getBackendSchema(),
    financeSnapshot(),
    scope === "full" ? ordersRevenueSnapshot() : Promise.resolve(null),
    catalogPaidSalesSnapshot(),
  ]);
  // Somente a Central de Dados precisa da lista de endpoints no navegador.
  const clientSchema = scope === "full" ? schema : { ...schema, endpoints: [] };

  try {
    const baseProducts = normalizeProducts(
      await backendRequest(chooseProductsPath(schema), undefined, 30000),
    );
    const withSales = applyCatalogPaidSales(baseProducts, paidSales);
    const [withBrands, categoryNames] = await Promise.all([
      enrichBrandsFromBackend(withSales, schema),
      categoryLabelsForCharts(withSales),
    ]);
    const products = applyCategoryDisplayNames(withBrands, categoryNames);
    return {
      products,
      finance,
      catalogSales: paidSales ? {
        paid_orders: paidSales.paid_orders,
        enriched_paid_orders: paidSales.enriched_paid_orders,
        orders_complete: paidSales.orders_complete,
      } : null,
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
      catalogSales: null,
      sales,
      schema: clientSchema,
      updatedAt: null,
      error:
        "Não foi possível atualizar os produtos. Verifique se o serviço local está em execução e tente novamente.",
    };
  }
}
