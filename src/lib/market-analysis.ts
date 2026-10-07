import type {
  MarketListing,
  Product,
  RaioXCheck,
  RaioXMarketStats,
  Tone,
} from "./types";

const STOP = new Set([
  "de", "da", "do", "das", "dos", "para", "com", "sem", "e", "em", "a", "o",
  "um", "uma", "kit", "novo", "nova", "original", "peca", "produto", "auto",
]);

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string) {
  return [...new Set(normalizedText(value).split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t)))];
}

function identifiers(value: string) {
  return new Set(
    normalizedText(value)
      .split(/\s+/)
      .filter((t) => t.length >= 4 && /\d/.test(t)),
  );
}

export function listingSimilarity(product: Pick<Product, "title" | "brand">, candidateTitle: string) {
  const own = tokens(`${product.brand} ${product.title}`);
  const other = new Set(tokens(candidateTitle));
  if (!own.length || !other.size) return 0;
  const common = own.filter((token) => other.has(token)).length;
  const recall = common / own.length;
  const precision = common / other.size;
  let score = recall * 0.65 + precision * 0.35;

  const brand = normalizedText(product.brand);
  if (brand && brand !== "sem marca" && normalizedText(candidateTitle).includes(brand)) score += 0.12;

  const ownIds = identifiers(product.title);
  const otherIds = identifiers(candidateTitle);
  if (ownIds.size) {
    const sameId = [...ownIds].some((id) => otherIds.has(id));
    score += sameId ? 0.2 : -0.1;
  }
  return Math.max(0, Math.min(1, score));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function marketStats(productPrice: number | null, listings: MarketListing[]): RaioXMarketStats {
  const prices = listings.map((item) => item.price).filter((price): price is number => price !== null && Number.isFinite(price) && price > 0);
  const marketMedian = median(prices);
  const average = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null;
  const delta = productPrice !== null && marketMedian !== null && marketMedian > 0
    ? ((productPrice - marketMedian) / marketMedian) * 100
    : null;
  const position: RaioXMarketStats["pricePosition"] = delta === null
    ? "unknown"
    : delta <= -3
      ? "below"
      : delta <= 8
        ? "competitive"
        : "above";
  const tone: Tone = position === "unknown" ? "neutral" : position === "above" ? "bad" : position === "competitive" ? "good" : "warning";
  return {
    matches: listings.length,
    marketplaces: new Set(listings.map((item) => item.marketplace)).size,
    minPrice: prices.length ? Math.min(...prices) : null,
    medianPrice: marketMedian === null ? null : round(marketMedian),
    averagePrice: average === null ? null : round(average),
    maxPrice: prices.length ? Math.max(...prices) : null,
    priceDeltaPercent: delta === null ? null : round(delta),
    pricePosition: position,
    priceTone: tone,
  };
}

function hasRaw(product: Product, names: string[]) {
  const raw = product.raw ?? {};
  return names.some((name) => {
    const value = raw[name];
    return Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

export function adQualityChecks(product: Product, market: RaioXMarketStats): RaioXCheck[] {
  const titleLength = product.title.trim().length;
  const titleTone: Tone = titleLength >= 45 && titleLength <= 110 ? "good" : titleLength >= 30 ? "warning" : "bad";
  const brandKnown = product.brand !== "Sem marca";
  const stockTone: Tone = product.stock === null ? "neutral" : product.stock === 0 ? "bad" : product.stock <= 3 ? "warning" : "good";
  const ratingTone: Tone = product.rating === null ? "neutral" : product.rating >= 4.5 ? "good" : product.rating >= 4 ? "warning" : "bad";
  const hasIdentifier = hasRaw(product, ["gtin", "ean", "barcode", "part_number", "partNumber", "mpn", "oem", "sku"]);
  const hasImage = hasRaw(product, ["thumbnail", "thumbnail_url", "image", "image_url", "pictures", "images"]);
  const hasDescription = hasRaw(product, ["description", "plain_text", "body", "long_description"]);

  const check = (key: string, label: string, detail: string, tone: Tone, score: number, maxScore: number): RaioXCheck => ({ key, label, detail, tone, score, maxScore });
  return [
    check("price", "Preço frente ao mercado", market.pricePosition === "unknown" ? "Sem concorrentes suficientes para comparar." : market.pricePosition === "above" ? `Preço ${Math.abs(market.priceDeltaPercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% acima da mediana.` : market.pricePosition === "below" ? `Preço ${Math.abs(market.priceDeltaPercent ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% abaixo da mediana; revise a margem.` : "Preço dentro da faixa competitiva.", market.priceTone, market.priceTone === "good" ? 22 : market.priceTone === "warning" ? 13 : market.priceTone === "bad" ? 4 : 0, 22),
    check("title", "Título do anúncio", titleTone === "good" ? "Comprimento adequado para busca e leitura." : titleTone === "warning" ? "Título pode ganhar mais detalhes relevantes." : "Título muito curto para competir bem nas buscas.", titleTone, titleTone === "good" ? 15 : titleTone === "warning" ? 9 : 3, 15),
    check("brand", "Marca identificada", brandKnown ? product.brand : "Marca não identificada no produto.", brandKnown ? "good" : "warning", brandKnown ? 10 : 4, 10),
    check("identifier", "Código / Part Number", hasIdentifier ? "Há identificador técnico disponível para matching." : "Inclua EAN, GTIN, Part Number, OEM ou SKU quando disponível.", hasIdentifier ? "good" : "warning", hasIdentifier ? 12 : 4, 12),
    check("shipping", "Frete grátis", product.freeShipping === true ? "Frete grátis informado." : product.freeShipping === false ? "Anúncio sem frete grátis." : "Frete não informado.", product.freeShipping === true ? "good" : product.freeShipping === false ? "warning" : "neutral", product.freeShipping === true ? 9 : product.freeShipping === false ? 4 : 0, 9),
    check("rating", "Avaliação", product.rating === null ? "Avaliação não recebida no Swagger." : `Nota ${product.rating.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}.`, ratingTone, ratingTone === "good" ? 10 : ratingTone === "warning" ? 6 : ratingTone === "bad" ? 2 : 0, 10),
    check("stock", "Disponibilidade", product.stock === null ? "Estoque não informado." : product.stock === 0 ? "Produto sem estoque." : `${product.stock} unidade(s) disponíveis.`, stockTone, stockTone === "good" ? 10 : stockTone === "warning" ? 5 : stockTone === "bad" ? 0 : 0, 10),
    check("image", "Imagem do anúncio", hasImage ? "Imagem recebida no cadastro." : "Nenhuma imagem identificada nos campos recebidos.", hasImage ? "good" : "warning", hasImage ? 6 : 2, 6),
    check("description", "Descrição", hasDescription ? "Descrição disponível no cadastro." : "Descrição não identificada nos campos recebidos.", hasDescription ? "good" : "warning", hasDescription ? 6 : 2, 6),
  ];
}

export function overallScore(checks: RaioXCheck[]) {
  const max = checks.reduce((sum, item) => sum + item.maxScore, 0);
  const value = checks.reduce((sum, item) => sum + item.score, 0);
  const score = max ? Math.round((value / max) * 100) : 0;
  const tone: Tone = score >= 75 ? "good" : score >= 50 ? "warning" : "bad";
  return { score, tone };
}
