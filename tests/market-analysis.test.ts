import assert from "node:assert/strict";
import test from "node:test";
import { adQualityChecks, listingSimilarity, marketStats, overallScore } from "../src/lib/market-analysis";
import type { MarketListing, Product } from "../src/lib/types";

const product: Product = {
  id: "MLB1",
  title: "Pastilha Freio Dianteira Bosch BP1234 Honda Civic",
  category: "Freios",
  brand: "Bosch",
  price: 180,
  originalPrice: 200,
  stock: 12,
  sales: 8,
  condition: "new",
  rating: 4.8,
  freeShipping: true,
  discount: 10,
  raw: { part_number: "BP1234", images: ["x"], description: "Pastilha de freio dianteira" },
};

function listing(price: number, title = "Pastilha Freio Dianteira Bosch BP1234 Honda Civic"): MarketListing {
  return { id: String(price), marketplace: "Shopee", source: "Shopee", title, price, originalPrice: null, rating: 4.7, reviews: 20, shipping: "Frete grátis", freeShipping: true, url: "https://example.com", thumbnail: null, similarity: listingSimilarity(product, title) };
}

test("matching prioriza marca e part number", () => {
  const same = listingSimilarity(product, "Pastilha Bosch BP1234 para Civic dianteira");
  const wrong = listingSimilarity(product, "Filtro de óleo Toyota Corolla");
  assert.ok(same > 0.5);
  assert.ok(wrong < 0.2);
});

test("estatística usa mediana e classifica preço acima", () => {
  const stats = marketStats(180, [listing(120), listing(130), listing(140)]);
  assert.equal(stats.medianPrice, 130);
  assert.equal(stats.pricePosition, "above");
  assert.equal(stats.priceTone, "bad");
});

test("qualidade completa gera nota boa", () => {
  const market = marketStats(130, [listing(128), listing(130), listing(135)]);
  const checks = adQualityChecks({ ...product, price: 130 }, market);
  const score = overallScore(checks);
  assert.ok(score.score >= 75);
  assert.equal(score.tone, "good");
});
