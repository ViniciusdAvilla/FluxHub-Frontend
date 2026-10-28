import test from "node:test";
import assert from "node:assert/strict";
import { enrichProducts, normalizeProducts } from "../src/lib/analytics";
import {
  activeAdvancedCount, defaultAdvancedProductFilters, filterCatalogProducts,
  purchaseUrgency, sortCatalogProducts,
} from "../src/lib/product-filters";

const products = [
  { external_id:"A", title:"Árvore", brand:"Bosch", category:"Casa", original_price:50,
    promotional_price:50, stock_qty:0, sales_30d:3 },
  { external_id:"B", title:"Bola", brand:"Valeo", category:"Casa", original_price:10,
    promotional_price:10, stock_qty:10, sales_30d:0 },
  { external_id:"C", title:"Chave", brand:"Bosch", category:"Ferramentas", original_price:100,
    promotional_price:100, stock_qty:2, sales_30d:30 },
  { external_id:"D", title:"Dado", brand:"Bosch", category:"Ferramentas", original_price:null,
    promotional_price:null, stock_qty:null, sales_30d:null },
];
const rows = enrichProducts(normalizeProducts(products), [
  { productId:"A", supplier:"X", unitCost:40, feePercent:0, taxPercent:0,
    shippingCost:0, otherCost:0 },
  { productId:"C", supplier:"X", unitCost:70, feePercent:0, taxPercent:0,
    shippingCost:0, otherCost:0 },
]);

test("alfabético em português e números vazios sempre no fim", () => {
  assert.deepEqual(sortCatalogProducts(rows, "title", "asc").map(x => x.id), ["A","B","C","D"]);
  assert.deepEqual(sortCatalogProducts(rows, "price", "desc").map(x => x.id), ["C","A","B","D"]);
  assert.deepEqual(sortCatalogProducts(rows, "price", "asc").map(x => x.id), ["B","A","C","D"]);
});

test("filtros combináveis incluem estoque, fabricante e vendas sem inventar valor", () => {
  const selected = filterCatalogProducts(rows, {
    ...defaultAdvancedProductFilters, brands:["Bosch"], minSales:"1", maxPrice:"100",
  });
  assert.deepEqual(selected.map(x => x.id), ["A","C"]);
  assert.deepEqual(filterCatalogProducts(rows, {
    ...defaultAdvancedProductFilters, quick:"out-of-stock",
  }).map(x => x.id), ["A"]);
  assert.deepEqual(filterCatalogProducts(rows, {
    ...defaultAdvancedProductFilters, onlyWithCost:true,
  }).map(x => x.id), ["A","C"]);
});

test("urgência exige cobertura mensurável; desconhecido não aparece como saudável", () => {
  assert.equal(purchaseUrgency(rows[0]), "critical");
  assert.equal(purchaseUrgency(rows[1]), null);
  assert.equal(purchaseUrgency(rows[2]), "critical");
  assert.equal(purchaseUrgency(rows[3]), null);
  assert.deepEqual(filterCatalogProducts(rows, {
    ...defaultAdvancedProductFilters, urgency:"critical",
  }).map(x => x.id), ["A","C"]);
});

test("margem baixa somente quando existe cálculo; preserva arrays originais", () => {
  const untouched = [...rows];
  const selected = filterCatalogProducts(rows, {
    ...defaultAdvancedProductFilters, quick:"low-margin",
  });
  assert.deepEqual(selected.map(x => x.id), []);
  assert.equal(activeAdvancedCount({
    ...defaultAdvancedProductFilters, brands:["Bosch"], minPrice:"5", onlyWithSales:true,
  }), 3);
  sortCatalogProducts(rows, "sales", "desc");
  assert.deepEqual(rows, untouched);
});
