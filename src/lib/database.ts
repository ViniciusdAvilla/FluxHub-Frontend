/** Financial costs are persisted ONLY in the tenant-scoped PostgreSQL backend. */
import "server-only";
import type { Finance } from "./types";
import { backendRequest, backendMutation } from "./backend";

type BackendCost = {
  external_id: string;
  unit_cost: number;
  manufacturer: string | null;
  marketplace_fee_percent: number | null;
  tax_percent: number;
  shipping_cost: number;
  other_cost: number;
};

function fromBackend(row: BackendCost): Finance {
  return {
    productId: row.external_id,
    supplier: row.manufacturer || "Sem fabricante",
    unitCost: row.unit_cost,
    feePercent: row.marketplace_fee_percent ?? 0,
    taxPercent: row.tax_percent,
    shippingCost: row.shipping_cost,
    otherCost: row.other_cost,
  };
}

export async function readFinance(): Promise<Finance[]> {
  const rows = await backendRequest(
    "/api/v1/analytics/product-costs",
    new URLSearchParams({ limit: "1000", offset: "0" }),
  ) as BackendCost[];
  if (!Array.isArray(rows)) throw new Error("O backend não retornou custos válidos.");
  return rows.map(fromBackend);
}

export async function saveFinance(finance: Finance): Promise<Finance> {
  const id = encodeURIComponent(finance.productId);
  await backendMutation(`/api/v1/analytics/product-costs/${id}`, "PUT", {
    unit_cost: finance.unitCost,
    marketplace_fee_percent: finance.feePercent,
    manufacturer: finance.supplier,
    tax_percent: finance.taxPercent,
    shipping_cost: finance.shippingCost,
    other_cost: finance.otherCost,
  });
  return finance;
}
