export type Tone = "good" | "warning" | "bad" | "neutral";

export type Product = {
  id: string;
  title: string;
  category: string;
  brand: string;
  price: number | null;
  originalPrice: number | null;
  stock: number | null;
  sales: number | null;
  condition: string | null;
  rating: number | null;
  freeShipping: boolean | null;
  discount: number | null;
  raw?: Record<string, unknown>;
};

export type Finance = {
  productId: string;
  supplier: string;
  unitCost: number;
  feePercent: number;
  taxPercent: number;
  shippingCost: number;
  otherCost: number;
};

export type EndpointParameter = {
  name: string;
  in: "path" | "query" | "header" | "cookie" | string;
  required: boolean;
  type: string;
  description: string | null;
};

export type EndpointDefinition = {
  path: string;
  method: string;
  summary: string;
  operationId: string | null;
  tag: string;
  parameters: EndpointParameter[];
};

export type BackendSchema = {
  title: string;
  version: string;
  endpoints: EndpointDefinition[];
  error: string | null;
};

export type Snapshot = {
  products: Product[];
  sales?: {
    days: number;
    total_orders: number;
    paid_order_count: number;
    gross_paid_order_amount: number | null;
    data_complete: boolean;
    partial_data: boolean;
    note: string;
  } | null;
  finance: Finance[];
  schema: BackendSchema;
  updatedAt: string | null;
  error: string | null;
};

export type ProductRow = Product & {
  finance: Finance | null;
  revenue: number | null;
  profit: number | null;
  margin: number | null;
  stockDays: number | null;
  stockTone: Tone;
  stockLabel: string;
};

export type AbcRow = ProductRow & {
  abcClass: "A" | "B" | "C" | null;
  revenueShare: number | null;
  cumulativeShare: number | null;
};

export type MarketplaceName =
  | "Mercado Livre"
  | "Shopee"
  | "Amazon"
  | "Magalu"
  | "Casas Bahia"
  | "KaBuM!"
  | "Outro";

export type MarketListing = {
  id: string;
  marketplace: MarketplaceName;
  source: string;
  title: string;
  price: number | null;
  originalPrice: number | null;
  rating: number | null;
  reviews: number | null;
  shipping: string | null;
  freeShipping: boolean | null;
  url: string;
  thumbnail: string | null;
  similarity: number;
};

export type RaioXCheck = {
  key: string;
  label: string;
  detail: string;
  tone: Tone;
  score: number;
  maxScore: number;
};

export type RaioXMarketStats = {
  matches: number;
  marketplaces: number;
  minPrice: number | null;
  medianPrice: number | null;
  averagePrice: number | null;
  maxPrice: number | null;
  priceDeltaPercent: number | null;
  pricePosition: "below" | "competitive" | "above" | "unknown";
  priceTone: Tone;
};

export type RaioXResult = {
  productId: string;
  productTitle: string;
  query: string;
  generatedAt: string;
  cached: boolean;
  providers: string[];
  warnings: string[];
  score: number;
  tone: Tone;
  checks: RaioXCheck[];
  market: RaioXMarketStats;
  listings: MarketListing[];
};
