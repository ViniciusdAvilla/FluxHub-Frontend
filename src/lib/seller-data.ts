import "server-only";
import { backendRequest } from "./backend-transport";

export type Account = { account_id: number; nickname: string | null; expires_at: string; connected: boolean };
export type SellerIdentity = { id: number; email: string; is_admin: boolean; is_active: boolean };
export type SellerCost = { external_id: string; unit_cost: number; manufacturer: string; marketplace_fee_percent: number | null; tax_percent: number; shipping_cost: number; other_cost: number };
export type SellerOrder = { external_id: string; seller_id: number | null; status: string; total_amount: number; created_at: string; is_cancelled: boolean };
export type SellerProduct = { id: number; external_id: string; title: string; brand: string; category: string; promotional_price: number | null; stock_qty: number | null; sales_30d: number | null; rating: number | null; source_key: string | null };
export type TimelinePoint = { date: string; orders: number; cancelled_orders: number; gross_non_cancelled: number; visits: number | null };
export type SourceStatus = { provider: string; account_key: string; connected: boolean; enabled: boolean; display_name: string; last_synced_at: string | null };
export type SellerProfile = { id: number; nickname?: string; seller_reputation?: { level_id?: string; power_seller_status?: string }; registration_date?: string; country_id?: string; status?: { site_status?: string } };
export type SellerReport = {
  user: SellerIdentity | null;
  accounts: Account[];
  profile: SellerProfile | null;
  sources: SourceStatus[];
  orders: SellerOrder[];
  products: SellerProduct[];
  costs: SellerCost[];
  timeline: TimelinePoint[];
  listing: { total_listings: number; active_listings: number; by_status: Record<string,number> } | null;
  cancellations: { total_orders: number; cancelled_orders: number; cancellation_rate_percent: number | null } | null;
  orderStatus: { total_orders: number; by_status: Record<string, number> } | null;
  ads: { has_ads_data: boolean; attributed_revenue: number | null; ad_spend: number | null; net_profit_after_ads: number | null; roas: number | null; profit_complete: boolean } | null;
  accountId: number | null;
  liveListingsTotal: number | null;
  days: number;
  failedSources: string[];
};

async function optional<T>(path: string, query?: URLSearchParams, timeoutMs = 10000): Promise<T | null> {
  try { return await backendRequest(path, query, timeoutMs) as T; } catch { return null; }
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
  const [user, accounts, sources, allProducts, listings, orders, cancellations, ads, costs] = await Promise.all([
    sellerIdentity(),
    optional<Account[]>("/api/v1/connectors/mercado-livre"),
    optional<SourceStatus[]>("/api/v1/connectors"),
    optional<SellerProduct[]>("/api/v1/products/"),
    optional<SellerReport["listing"]>("/api/v1/analytics/ads-performance"),
    optional<SellerOrder[]>("/api/v1/orders/", new URLSearchParams({limit:"100",offset:"0"})),
    optional<SellerReport["cancellations"]>("/api/v1/analytics/cancellations",new URLSearchParams({days:String(days)})),
    optional<SellerReport["ads"]>("/api/v1/analytics/ads-profitability",new URLSearchParams({days:String(days)})),
    optional<SellerCost[]>("/api/v1/analytics/product-costs",new URLSearchParams({limit:"1000"})),
  ]);
  const authorizedIds = new Set((accounts || []).map(a=>a.account_id));
  const accountId = requestedAccount !== null && authorizedIds.has(requestedAccount) ? requestedAccount : null;
  const timeQuery = new URLSearchParams({days:String(days)});
  if (accountId !== null) timeQuery.set("account_id",String(accountId));
  const profileAccount = accountId ?? (accounts?.length===1 ? accounts[0].account_id : null);
  // Live totals help compare the current seller catalog with persisted snapshots.
  const [timelineData,profile,liveCounts,orderStatus,scopedListings] = await Promise.all([
    optional<{data: TimelinePoint[]}>("/api/v1/analytics/timeline",timeQuery),
    profileAccount===null ? Promise.resolve(null) : optional<SellerProfile>(
      "/api/v1/connectors/mercado-livre/profile",
      new URLSearchParams({account_id:String(profileAccount)}), 60000),
    Promise.all((accounts || []).filter(a=>accountId===null || a.account_id===accountId)
      .map(a=>optional<{paging?:{total?:number}}>(
        "/api/v1/connectors/mercado-livre/items",
        new URLSearchParams({account_id:String(a.account_id),limit:"1",offset:"0"}),30000))),
    optional<{total_orders:number;by_status:Record<string,number>}>("/api/v1/analytics/order-status",timeQuery),
    accountId === null ? Promise.resolve(listings) :
      optional<SellerReport["listing"]>("/api/v1/analytics/ads-performance",
        new URLSearchParams({account_id:String(accountId)})),
  ]);
  const liveListingsTotal = liveCounts.length && liveCounts.every(
    response=>typeof response?.paging?.total==="number" && Number.isSafeInteger(response.paging.total) && response.paging.total>=0
  ) ? liveCounts.reduce((sum,response)=>sum+(response?.paging?.total ?? 0),0) : null;
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
    profile,
    sources: Array.isArray(sources) ? sources : [],
    orders: records,
    products,
    costs: Array.isArray(costs) ? costs : [],
    timeline: Array.isArray(timelineData?.data) ? timelineData.data : [],
    listing: scopedListings || null,
    cancellations: cancellations || null,
    orderStatus: orderStatus || null,
    ads: ads || null,
    accountId, liveListingsTotal, days, failedSources,
  };
}
