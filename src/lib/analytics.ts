import type { AbcRow, CatalogPaidSales, Finance, Product, ProductRow, Tone } from "./types";
import { orderStatusLabels, listingStatusLabels } from "./order-status";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const money = (value: number | null) =>
  value !== null && Number.isFinite(value) ? brl.format(value) : "—";
export const number = (value: number | null) =>
  value !== null && Number.isFinite(value) ? integer.format(value) : "—";
export const percent = (value: number | null) =>
  value !== null && Number.isFinite(value)
    ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
    : "—";
export const marginTone = (margin: number | null): Tone =>
  margin === null
    ? "neutral"
    : margin < 0
      ? "bad"
      : margin < 15
        ? "warning"
        : "good";
export const round = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

function numeric(value: unknown, allowNegative = false): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean"
  )
    return null;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) &&
    (allowNegative || parsed >= 0) &&
    Math.abs(parsed) <= 1e12
    ? parsed
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function productIdentifier(value: Record<string, unknown>): string | null {
  return text(value.external_id) ?? text(value.id) ?? text(value.sku) ?? text(value.item_id) ??
    (typeof value.id === "number" && Number.isFinite(value.id) ? String(value.id) : null);
}

/**
 * Enriquece o catálogo com fabricante/marca recebido por uma rota agrupada
 * (por exemplo, /by-brands). O parser é tolerante a listas, envelopes e grupos
 * no formato { brand, products } ou { Marca: [...] }.
 */
export function applyProductBrands(products: Product[], payload: unknown): Product[] {
  const assignments = new Map<string, string>();
  const seen = new Set<unknown>();

  function walk(value: unknown, inheritedBrand: string | null = null, keyBrand: string | null = null) {
    if (value === null || value === undefined) return;
    if (typeof value === "string" || typeof value === "number") return;
    if (seen.has(value)) return;
    if (typeof value === "object") seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) walk(item, inheritedBrand, keyBrand);
      return;
    }
    if (typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    const ownBrand = text(record.brand) ?? text(record.manufacturer) ?? inheritedBrand ?? keyBrand;
    const id = productIdentifier(record);
    if (id && ownBrand) assignments.set(id, ownBrand);

    for (const [key, child] of Object.entries(record)) {
      if (["brand", "manufacturer"].includes(key)) continue;
      const lower = key.toLowerCase();
      const isEnvelope = ["items", "products", "results", "data", "brands", "manufacturers"].includes(lower);
      const nextKeyBrand = !isEnvelope && Array.isArray(child) ? key : null;
      walk(child, ownBrand, nextKeyBrand);
    }
  }

  walk(payload);
  if (!assignments.size) return products;
  return products.map((product) => {
    const brand = assignments.get(product.id);
    return brand ? { ...product, brand } : product;
  });
}

/**
 * Normaliza somente campos realmente recebidos do serviço. Ausências continuam
 * como null e nunca são convertidas em números fictícios.
 */
export function normalizeProducts(payload: unknown): Product[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).items ??
        (payload as Record<string, unknown>).products ??
        (payload as Record<string, unknown>).results ??
        (payload as Record<string, unknown>).data)
      : null;
  if (!Array.isArray(list))
    throw new Error("A lista de produtos está em um formato inesperado.");

  const ids = new Set<string>();
  return list.map((value: unknown, index) => {
    if (!value || typeof value !== "object")
      throw new Error(`Há um produto inválido na posição ${index + 1}.`);
    const p = value as Record<string, unknown>;
    const id =
      text(p.external_id) ?? text(p.id) ?? text(p.sku) ?? text(p.item_id);
    const title = text(p.title) ?? text(p.name) ?? text(p.description);
    if (!id || !title)
      throw new Error("Não foi possível identificar um produto do catálogo.");
    if (ids.has(id))
      throw new Error("Existem códigos de produto duplicados no catálogo.");
    ids.add(id);

    const promotional = numeric(
      p.promotional_price ?? p.sale_price ?? p.current_price,
    );
    const original = numeric(p.original_price ?? p.price ?? p.list_price);
    const stock = numeric(p.stock_qty ?? p.stock ?? p.available_quantity);
    const sales = numeric(p.sales_30d ?? p.sold_quantity ?? p.sales);
    const rawDiscount = numeric(
      p.discount_percentage ??
        p.discount_percent ??
        p.discount ??
        p.discount_rate,
    );
    const discountField =
      rawDiscount !== null && rawDiscount <= 1 ? rawDiscount * 100 : rawDiscount;
    const computedDiscount =
      discountField !== null
        ? discountField
        : original !== null && promotional !== null && original > promotional
          ? ((original - promotional) / original) * 100
          : null;

    return {
      id,
      title,
      category:
        text(p.category) ?? text(p.category_name) ?? text(p.category_id) ?? "Sem categoria",
      brand: text(p.brand) ?? text(p.manufacturer) ?? "Sem marca",
      price: promotional !== null && promotional > 0 ? promotional : original,
      originalPrice: original,
      stock: stock !== null && Number.isInteger(stock) ? stock : null,
      sales: sales !== null && Number.isInteger(sales) ? sales : null,
      condition: text(p.condition) ?? text(p.item_condition),
      rating: numeric(p.rating ?? p.reviews_rating ?? p.average_rating),
      freeShipping: boolean(
        p.free_shipping ??
          p.is_free_shipping ??
          (p.shipping && typeof p.shipping === "object"
            ? (p.shipping as Record<string, unknown>).free_shipping
            : null),
      ),
      discount: computedDiscount,
      raw: { ...p },
    };
  });
}

/**
 * Os anúncios sincronizados não trazem vendas dos últimos 30 dias. Esse
 * indicador deve vir das quantidades dos itens de pedidos pagos, nunca do
 * acumulado histórico sold_quantity do anúncio.
 *
 * Enquanto o enriquecimento dos pedidos estiver incompleto, ausência de um
 * item no mapa não significa zero vendas: permanece sem informação.
 */
export function applyCatalogPaidSales(
  products: Product[],
  metrics: CatalogPaidSales | null,
): Product[] {
  return products.map((product) => {
    if (typeof product.raw?.source_key !== "string" ||
        !product.raw.source_key.startsWith("ml:")) {
      return product;
    }

    const id = product.id.toUpperCase();
    if (!metrics || metrics.days !== 30 ||
        !metrics.sales_by_item ||
        typeof metrics.sales_by_item !== "object" ||
        Array.isArray(metrics.sales_by_item)) {
      return { ...product, sales: null };
    }

    if (Object.prototype.hasOwnProperty.call(metrics.sales_by_item, id)) {
      const count = metrics.sales_by_item[id];
      return {
        ...product,
        sales: Number.isSafeInteger(count) && count >= 0 ? count : null,
      };
    }
    return { ...product, sales: metrics.orders_complete ? 0 : null };
  });
}

/** Traduz IDs de categorias com nomes oficiais sem alterar o ID original do anúncio. */
export function applyCategoryDisplayNames(
  products: Product[],
  names: Record<string, string>,
): Product[] {
  return products.map((product) => {
    const label = names[product.category];
    if (typeof label !== "string" || !label.trim() ||
        label.trim().length > 100 || label === product.category) {
      return product;
    }
    return { ...product, category: label.trim() };
  });
}

export function enrichProducts(
  products: Product[],
  finance: Finance[],
): ProductRow[] {
  const costs = new Map(finance.map((item) => [item.productId, item]));
  return products.map((product) => {
    const financial = costs.get(product.id) ?? null;
    const { price, sales, stock } = product;
    const revenue =
      price !== null && sales !== null ? round(price * sales) : null;
    const profit =
      financial && financial.unitCost > 0 && price !== null && sales !== null
        ? round(
            sales *
              (price *
                (1 - (financial.feePercent + financial.taxPercent) / 100) -
                financial.unitCost -
                financial.shippingCost -
                financial.otherCost),
          )
        : null;
    const margin =
      profit !== null && revenue !== null && revenue > 0
        ? (profit / revenue) * 100
        : null;
    const stockDays =
      stock !== null && sales !== null && sales > 0
        ? stock / (sales / 30)
        : null;
    const stockTone: Tone =
      stock === null
        ? "neutral"
        : stock === 0
          ? "bad"
          : sales === 0
            ? "warning"
            : stockDays === null
              ? "neutral"
              : stockDays < 7
                ? "warning"
                : "good";
    const stockLabel =
      stock === null
        ? "Não informado"
        : stock === 0
          ? "Sem estoque"
          : sales === 0
            ? "Sem giro"
            : stockDays === null
              ? "Sem dados de vendas"
              : stockDays < 7
                ? "Repor em breve"
                : "Estoque saudável";
    return {
      ...product,
      finance: financial,
      revenue,
      profit,
      margin,
      stockDays,
      stockTone,
      stockLabel,
    };
  });
}

export function summarize(rows: ProductRow[]) {
  const revenueRows = rows.filter((p) => p.revenue !== null);
  const profitRows = rows.filter((p) => p.profit !== null);
  const revenue = revenueRows.length
    ? round(revenueRows.reduce((sum, p) => sum + p.revenue!, 0))
    : null;
  const profit = profitRows.length
    ? round(profitRows.reduce((sum, p) => sum + p.profit!, 0))
    : null;
  const pricedRevenue = profitRows.reduce(
    (sum, p) => sum + (p.revenue ?? 0),
    0,
  );
  const categories = new Map<
    string,
    { name: string; count: number; revenue: number; revenueCount: number }
  >();
  const suppliers = new Map<
    string,
    {
      name: string;
      profit: number;
      revenue: number;
      count: number;
      covered: number;
      purchaseCost: number;
      sales: number;
    }
  >();
  const manufacturers = new Map<
    string,
    {
      name: string;
      profit: number;
      revenue: number;
      count: number;
      covered: number;
      purchaseCost: number;
      sales: number;
    }
  >();
  for (const p of rows) {
    const category = categories.get(p.category) ?? {
      name: p.category,
      count: 0,
      revenue: 0,
      revenueCount: 0,
    };
    category.count++;
    if (p.revenue !== null) {
      category.revenue += p.revenue;
      category.revenueCount++;
    }
    categories.set(p.category, category);

    if (p.brand && p.brand !== "Sem marca") {
      const manufacturer = manufacturers.get(p.brand) ?? {
        name: p.brand,
        profit: 0,
        revenue: 0,
        count: 0,
        covered: 0,
        purchaseCost: 0,
        sales: 0,
      };
      manufacturer.count++;
      manufacturer.sales += p.sales ?? 0;
      if (p.finance) {
        manufacturer.purchaseCost += p.finance.unitCost * (p.sales ?? 0);
        if (p.profit !== null) {
          manufacturer.covered++;
          manufacturer.profit += p.profit;
          manufacturer.revenue += p.revenue ?? 0;
        }
      }
      manufacturers.set(p.brand, manufacturer);
    }

    if (p.finance) {
      const name = p.finance.supplier;
      const supplier = suppliers.get(name) ?? {
        name,
        profit: 0,
        revenue: 0,
        count: 0,
        covered: 0,
        purchaseCost: 0,
        sales: 0,
      };
      supplier.count++;
      supplier.purchaseCost += p.finance.unitCost * (p.sales ?? 0);
      supplier.sales += p.sales ?? 0;
      if (p.profit !== null) {
        supplier.covered++;
        supplier.profit += p.profit;
        supplier.revenue += p.revenue ?? 0;
      }
      suppliers.set(name, supplier);
    }
  }
  return {
    revenue,
    profit,
    margin:
      pricedRevenue > 0 && profit !== null
        ? (profit / pricedRevenue) * 100
        : null,
    productCount: rows.length,
    covered: profitRows.length,
    revenueCount: revenueRows.length,
    sales: rows.some((p) => p.sales !== null)
      ? rows.reduce((sum, p) => sum + (p.sales ?? 0), 0)
      : null,
    stock: rows.some((p) => p.stock !== null)
      ? rows.reduce((sum, p) => sum + (p.stock ?? 0), 0)
      : null,
    critical: rows.filter((p) => p.stockTone === "bad").length,
    warning: rows.filter((p) => p.stockTone === "warning").length,
    healthy: rows.filter((p) => p.stockTone === "good").length,
    losses: rows.filter((p) => p.profit !== null && p.profit < 0).length,
    categories: [...categories.values()].sort((a, b) => b.revenue - a.revenue),
    manufacturers: [...manufacturers.values()]
      .filter((manufacturer) => manufacturer.covered > 0)
      .map((manufacturer) => ({
        ...manufacturer,
        profit: round(manufacturer.profit),
        purchaseCost: round(manufacturer.purchaseCost),
        margin: manufacturer.revenue > 0 ? (manufacturer.profit / manufacturer.revenue) * 100 : null,
      }))
      .sort((a, b) => b.profit - a.profit),
    suppliers: [...suppliers.values()]
      .filter((s) => s.covered > 0)
      .map((s) => ({
        ...s,
        profit: round(s.profit),
        purchaseCost: round(s.purchaseCost),
        margin: s.revenue > 0 ? (s.profit / s.revenue) * 100 : null,
      }))
      .sort((a, b) => b.profit - a.profit),
  };
}

export function idealPrice(
  finance: Finance | null,
  desiredMarginPercent: number,
): number | null {
  if (!finance || !Number.isFinite(desiredMarginPercent)) return null;
  const fixed = finance.unitCost + finance.shippingCost + finance.otherCost;
  const variable =
    (finance.feePercent + finance.taxPercent + desiredMarginPercent) / 100;
  const denominator = 1 - variable;
  return denominator > 0 ? round(fixed / denominator) : null;
}

export function projectedAtPrice(
  finance: Finance | null,
  price: number | null,
): { unitProfit: number | null; margin: number | null } {
  if (!finance || price === null || !Number.isFinite(price) || price <= 0)
    return { unitProfit: null, margin: null };
  const unitProfit = round(
    price * (1 - (finance.feePercent + finance.taxPercent) / 100) -
      finance.unitCost -
      finance.shippingCost -
      finance.otherCost,
  );
  return { unitProfit, margin: (unitProfit / price) * 100 };
}

export function replenishment(
  row: ProductRow,
  targetCoverageDays = 30,
): {
  quantity: number | null;
  dailySales: number | null;
  targetStock: number | null;
} {
  if (
    row.sales === null ||
    row.stock === null ||
    !Number.isFinite(targetCoverageDays) ||
    targetCoverageDays <= 0
  )
    return { quantity: null, dailySales: null, targetStock: null };
  const dailySales = row.sales / 30;
  const targetStock = Math.ceil(dailySales * targetCoverageDays);
  return {
    dailySales,
    targetStock,
    quantity: Math.max(0, targetStock - row.stock),
  };
}

export function classifyAbc(rows: ProductRow[]): AbcRow[] {
  const total = rows.reduce((sum, row) => sum + (row.revenue ?? 0), 0);
  let cumulative = 0;
  return [...rows]
    .sort((a, b) => (b.revenue ?? -1) - (a.revenue ?? -1))
    .map((row) => {
      if (row.revenue === null || total <= 0)
        return {
          ...row,
          abcClass: null,
          revenueShare: null,
          cumulativeShare: null,
        };
      const share = (row.revenue / total) * 100;
      cumulative += share;
      const before = cumulative - share;
      const abcClass: "A" | "B" | "C" =
        before < 80 ? "A" : before < 95 ? "B" : "C";
      return {
        ...row,
        abcClass,
        revenueShare: share,
        cumulativeShare: Math.min(100, cumulative),
      };
    });
}

export function genericRows(payload: unknown): Record<string, unknown>[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).items ??
        (payload as Record<string, unknown>).results ??
        (payload as Record<string, unknown>).data ??
        [payload])
      : [];
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Record<string, unknown>);
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number")
    return Number.isFinite(value)
      ? value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
      : "—";
  if (typeof value === "string") return orderStatusLabels[value] || listingStatusLabels[value] || value || "—";
  try {
    const json = JSON.stringify(value);
    return json.length > 120 ? `${json.slice(0, 117)}…` : json;
  } catch {
    return "—";
  }
}
