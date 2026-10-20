import "server-only";
import { backendRequest } from "./backend-transport";

export type Account = { account_id: number; nickname: string | null; expires_at: string; connected: boolean };
export type SellerIdentity = { id: number; email: string; is_admin: boolean; is_active: boolean };
export type SellerOrder = { external_id: string; seller_id: number | null; status: string; total_amount: number; created_at: string; is_cancelled: boolean };
export type SellerProduct = { id: number; external_id: string; title: string; brand: string; category: string; promotional_price: number | null; stock_qty: number | null; sales_30d: number | null; rating: number | null; source_key: string | null };
export type TimelinePoint = { date: string; orders: number; cancelled_orders: number; gross_non_cancelled: number; visits: number | null };
export type SourceStatus = { provider: string; account_key: string; connected: boolean; enabled: boolean; display_name: string; last_synced_at: string | null };
export type SellerReport = {
  user: SellerIdentity | null;
  accounts: Account[];
  sources: SourceStatus[];
  orders: SellerOrder[];
  products: SellerProduct[];
  timeline: TimelinePoint[];
  listing: { total_listings: number; active_listings: number; by_status: Record<string,number> } | null;
  cancellations: { total_orders: number; cancelled_orders: number; cancellation_rate_percent: number | null } | null;
  ads: { has_ads_data: boolean; attributed_revenue: number | null; ad_spend: number | null; net_profit_after_ads: number | null; roas: number | null; profit_complete: boolean } | null;
  accountId: number | null;
  days: number;
  failedSources: string[];
};

async function optional<T>(path: string, query?: URLSearchParams): Promise<T | null> {
  try { return await backendRequest(path, query) as T; } catch { return null; }
}
export function validDays(value: unknown): 7 | 30 | 90 {
  return value === "7" ? 7 : value === "90" ? 90 : 30;
}
export function validAccount(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,15}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function sellerIdentity(): Promise<SellerIdentity | null> {
  return optional<SellerIdentity>("/api/v1/auth/me");
}
export async function getSellerReport(days: number, requestedAccount: number | null): Promise<SellerReport> {
  const [user, accounts, sources, allProducts, listings, orders, cancellations, ads] = await Promise.all([
    sellerIdentity(),
    optional<Account[]>("/api/v1/connectors/mercado-livre"),
    optional<SourceStatus[]>("/api/v1/connectors"),
    optional<SellerProduct[]>("/api/v1/products/"),
    optional<SellerReport["listing"]>("/api/v1/analytics/ads-performance"),
    optional<SellerOrder[]>("/api/v1/orders/", new URLSearchParams({limit:"100",offset:"0"})),
    optional<SellerReport["cancellations"]>("/api/v1/analytics/cancellations",new URLSearchParams({days:String(days)})),
    optional<SellerReport["ads"]>("/api/v1/analytics/ads-profitability",new URLSearchParams({days:String(days)})),
  ]);
  const authorizedIds = new Set((accounts || []).map(a=>a.account_id));
  const accountId = requestedAccount !== null && authorizedIds.has(requestedAccount) ? requestedAccount : null;
  const timeQuery = new URLSearchParams({days:String(days)});
  if (accountId !== null) timeQuery.set("account_id",String(accountId));
  const timelineData = await optional<{data: TimelinePoint[]}>("/api/v1/analytics/timeline",timeQuery);
  const products = Array.isArray(allProducts) ? allProducts.filter(p=>accountId === null || p.source_key === `ml:${accountId}`) : [];
  const records = Array.isArray(orders) ? orders.filter(o=>accountId === null || o.seller_id === accountId) : [];
  const failedSources = [
    ...(!Array.isArray(accounts) ? ["Contas Mercado Livre"] : []),
    ...(!Array.isArray(allProducts) ? ["Produtos"] : []),
    ...(!Array.isArray(orders) ? ["Pedidos"] : []),
    ...(!timelineData ? ["Histórico"] : []),
  ];
  return {
    user,
    accounts: Array.isArray(accounts) ? accounts : [],
    sources: Array.isArray(sources) ? sources : [],
    orders: records,
    products,
    timeline: Array.isArray(timelineData?.data) ? timelineData.data : [],
    listing: listings || null,
    cancellations: cancellations || null,
    ads: ads || null,
    accountId, days, failedSources,
  };
}
