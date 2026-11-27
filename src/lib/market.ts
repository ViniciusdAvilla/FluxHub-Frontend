import "server-only";
import { createHash } from "node:crypto";
import type { MarketListing, MarketplaceName, Product, RaioXResult } from "./types";
import { backendMutation, backendRequest } from "./backend-transport";
import { adQualityChecks, listingSimilarity, marketStats, overallScore } from "./market-analysis";

const configuredCacheMinutes = Number(process.env.MARKET_CACHE_MINUTES || "360");
const CACHE_MINUTES = Number.isFinite(configuredCacheMinutes) && configuredCacheMinutes >= 1 && configuredCacheMinutes <= 10080 ? configuredCacheMinutes : 360;
const CACHE_TTL_MS = CACHE_MINUTES * 60_000;
const cache = new Map<string, { expires: number; result: RaioXResult }>();

function safeNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(String(value).replace(/[^0-9.,-]/g, "").replace(/\.(?=.*\.)/g, "").replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function safeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeHttpUrl(value: unknown): string | null {
  const text = safeText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return /^https?:$/.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function marketplace(source: string): MarketplaceName {
  const s = source.toLowerCase();
  if (s.includes("shopee")) return "Shopee";
  if (s.includes("mercado livre") || s.includes("mercadolivre")) return "Mercado Livre";
  if (s.includes("amazon")) return "Amazon";
  if (s.includes("magalu") || s.includes("magazine luiza")) return "Magalu";
  if (s.includes("casas bahia")) return "Casas Bahia";
  if (s.includes("kabum")) return "KaBuM!";
  return "Outro";
}

function queryFor(product: Product) {
  const raw = product.raw ?? {};
  const identifier = [raw.part_number, raw.partNumber, raw.mpn, raw.oem, raw.gtin, raw.ean]
    .map(safeText)
    .find(Boolean);
  return [product.brand !== "Sem marca" ? product.brand : "", identifier ?? "", product.title]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function dedupe(listings: MarketListing[]) {
  const seen = new Set<string>();
  return listings.filter((item) => {
    const key = `${item.marketplace}|${item.title.toLowerCase()}|${item.price ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function serpApi(product: Product, query: string): Promise<MarketListing[]> {
  // Google Shopping credentials are stored exclusively in FastAPI.
  const data = await backendMutation(
    "/api/v1/market/google-shopping", "POST", { query }, 25000,
  ) as Record<string, unknown>;
  const direct = Array.isArray(data?.shopping_results) ? data.shopping_results : [];
  return direct
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
    .map((item, index): MarketListing | null => {
      const title = safeText(item.title);
      const source = safeText(item.source) ?? "Loja online";
      const price = safeNumber(item.extracted_price ?? item.price);
      const url = safeHttpUrl(item.link ?? item.product_link);
      if (!title || !url || price === null) return null;
      const similarity = listingSimilarity(product, title);
      if (similarity < 0.32) return null;
      const shipping = safeText(item.shipping ?? item.delivery);
      return {
        id: safeText(item.product_id) ?? `shopping-${index}`,
        marketplace: marketplace(source),
        source,
        title,
        price,
        originalPrice: safeNumber(item.extracted_old_price ?? item.old_price),
        rating: safeNumber(item.rating),
        reviews: safeNumber(item.reviews),
        shipping,
        freeShipping: shipping ? /gr[aá]tis|free/i.test(shipping) : null,
        url,
        thumbnail: safeHttpUrl(item.thumbnail),
        similarity,
      };
    })
    .filter((item): item is MarketListing => item !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 30);
}

async function mercadoLivre(product: Product, query: string): Promise<MarketListing[]> {
  const token = process.env.MELI_ACCESS_TOKEN?.trim();
  if (!token) return [];
  const url = new URL("https://api.mercadolibre.com/sites/MLB/search");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "20");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Mercado Livre indisponível (${response.status}).`);
  const data = await response.json() as Record<string, unknown>;
  const rows = Array.isArray(data.results) ? data.results : [];
  return rows
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
    .map((item): MarketListing | null => {
      const id = safeText(item.id);
      const title = safeText(item.title);
      const price = safeNumber(item.price);
      const url = safeHttpUrl(item.permalink);
      if (!id || !title || price === null || !url || id === product.id) return null;
      const similarity = listingSimilarity(product, title);
      if (similarity < 0.32) return null;
      const seller = item.seller && typeof item.seller === "object" ? item.seller as Record<string, unknown> : {};
      const shipping = item.shipping && typeof item.shipping === "object" ? item.shipping as Record<string, unknown> : {};
      return {
        id,
        marketplace: "Mercado Livre",
        source: safeText(seller.nickname) ?? "Mercado Livre",
        title,
        price,
        originalPrice: safeNumber(item.original_price),
        rating: null,
        reviews: null,
        shipping: shipping.free_shipping === true ? "Frete grátis" : null,
        freeShipping: typeof shipping.free_shipping === "boolean" ? shipping.free_shipping : null,
        url,
        thumbnail: safeHttpUrl(item.thumbnail),
        similarity,
      };
    })
    .filter((item): item is MarketListing => item !== null)
    .sort((a, b) => b.similarity - a.similarity);
}

export async function marketProviderStatus() {
  let googleShopping = false;
  try {
    const status = await backendRequest("/api/v1/market/providers", undefined, 10000) as Record<string, unknown>;
    googleShopping = status?.googleShopping === true;
  } catch {
    // Keep the Raio-X available for the other configured providers.
  }
  return {
    googleShopping,
    mercadoLivre: Boolean(process.env.MELI_ACCESS_TOKEN?.trim()),
    cacheMinutes: CACHE_MINUTES,
  };
}

export async function analyzeMarket(product: Product, force = false): Promise<RaioXResult> {
  const query = queryFor(product);
  const key = createHash("sha1").update(JSON.stringify(product)).update("|").update(query).digest("hex");
  const existing = cache.get(key);
  if (!force && existing && existing.expires > Date.now()) return { ...existing.result, cached: true };

  const warnings: string[] = [];
  const providers: string[] = [];
  const batches: MarketListing[][] = [];
  const tasks: Array<{ name: string; fallback: string; run: () => Promise<MarketListing[]> }> = [];
  const providerStatus = await marketProviderStatus();
  if (providerStatus.googleShopping) tasks.push({ name: "Google Shopping", fallback: "Falha no Google Shopping.", run: () => serpApi(product, query) });
  if (process.env.MELI_ACCESS_TOKEN?.trim()) tasks.push({ name: "Mercado Livre", fallback: "Falha no Mercado Livre.", run: () => mercadoLivre(product, query) });
  const settled = await Promise.allSettled(tasks.map((task) => task.run()));
  settled.forEach((item, index) => {
    const task = tasks[index];
    if (item.status === "fulfilled") { providers.push(task.name); batches.push(item.value); }
    else warnings.push(item.reason instanceof Error ? item.reason.message : task.fallback);
  });
  if (!tasks.length) warnings.push("Configure SERPAPI_KEY no backend FastAPI e/ou MELI_ACCESS_TOKEN para concorrentes do Mercado Livre.");

  const listings = dedupe(batches.flat())
    .sort((a, b) => b.similarity - a.similarity || (a.price ?? Infinity) - (b.price ?? Infinity))
    .slice(0, 40);
  const market = marketStats(product.price, listings);
  const checks = adQualityChecks(product, market);
  const overall = overallScore(checks);
  const result: RaioXResult = {
    productId: product.id,
    productTitle: product.title,
    query,
    generatedAt: new Date().toISOString(),
    cached: false,
    providers,
    warnings,
    score: overall.score,
    tone: overall.tone,
    checks,
    market,
    listings,
  };
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, result });
  return result;
}
