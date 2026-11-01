import type { ProductRow } from "@/lib/types";

export type ProductSortKey = "title" | "price" | "sales" | "stock" | "revenue" | "profit" | "margin" | "stockDays" | "brand";
export type ProductSortDirection = "asc" | "desc";
export type ProductQuickFilter = "" | "with-stock" | "out-of-stock" | "top-revenue" | "low-margin" | "top-sales";
export type PurchaseUrgency = "" | "critical" | "warning" | "healthy";

export type AdvancedProductFilters = {
  minPrice: string;
  maxPrice: string;
  minSales: string;
  maxSales: string;
  brands: string[];
  onlyWithSales: boolean;
  onlyWithCost: boolean;
  urgency: PurchaseUrgency;
  quick: ProductQuickFilter;
  sortKey: ProductSortKey;
  sortDirection: ProductSortDirection;
};

export const defaultAdvancedProductFilters: AdvancedProductFilters = {
  minPrice: "", maxPrice: "", minSales: "", maxSales: "", brands: [],
  onlyWithSales: false, onlyWithCost: false, urgency: "", quick: "",
  sortKey: "title", sortDirection: "asc",
};

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

/** Uma única regra de busca para preservar acentos e resultados entre telas. */
export function normalizeCatalogSearch(value: string): string {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** No estado inicial não aloca nem normaliza milhares de nomes desnecessariamente. */
export function matchesCatalogSearch(
  row: Pick<ProductRow, "id" | "title" | "brand" | "category">,
  normalizedTerm: string,
): boolean {
  if (!normalizedTerm) return true;
  return normalizeCatalogSearch(
    row.title + " " + row.id + " " + row.brand + " " + row.category,
  ).includes(normalizedTerm);
}

export function sortCatalogProducts(
  products: ProductRow[], key: ProductSortKey, direction: ProductSortDirection,
): ProductRow[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return [...products].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === null || av === undefined) return bv === null || bv === undefined ? collator.compare(a.id, b.id) : 1;
    if (bv === null || bv === undefined) return -1;
    const order = typeof av === "string" && typeof bv === "string"
      ? collator.compare(av, bv)
      : Number(av) - Number(bv);
    return order === 0 ? collator.compare(a.id, b.id) : order * multiplier;
  });
}

function numericRangeMatches(value: number | null, min: string, max: string): boolean {
  if (min === "" && max === "") return true;
  if (value === null) return false;
  const lower = min === "" ? null : Number(min);
  const upper = max === "" ? null : Number(max);
  if (lower !== null && Number.isFinite(lower) && value < lower) return false;
  if (upper !== null && Number.isFinite(upper) && value > upper) return false;
  return true;
}

export function purchaseUrgency(row: ProductRow): Exclude<PurchaseUrgency, ""> | null {
  if (row.stock === 0) return "critical";
  if (row.stockDays === null) return null;
  if (row.stockDays <= 7) return "critical";
  if (row.stockDays <= 30) return "warning";
  return "healthy";
}

export function filterCatalogProducts(
  rows: ProductRow[], filters: AdvancedProductFilters,
): ProductRow[] {
  return rows.filter(row => {
    if (!numericRangeMatches(row.price, filters.minPrice, filters.maxPrice)) return false;
    if (!numericRangeMatches(row.sales, filters.minSales, filters.maxSales)) return false;
    if (filters.brands.length && !filters.brands.includes(row.brand)) return false;
    if (filters.onlyWithSales && !(row.sales !== null && row.sales > 0)) return false;
    if (filters.onlyWithCost && !row.finance) return false;
    if (filters.urgency && purchaseUrgency(row) !== filters.urgency) return false;
    switch (filters.quick) {
      case "with-stock": return row.stock !== null && row.stock > 0;
      case "out-of-stock": return row.stock === 0;
      case "low-margin": return row.margin !== null && row.margin < 10;
      default: return true;
    }
  });
}

export function activeAdvancedCount(filters: AdvancedProductFilters): number {
  return [
    filters.minPrice, filters.maxPrice, filters.minSales, filters.maxSales,
    filters.brands.length, filters.onlyWithSales, filters.onlyWithCost, filters.urgency,
  ].filter(Boolean).length;
}
