import test from "node:test";
import assert from "node:assert/strict";
import { comparePurchaseOrigins, priceForNetMargin, simulateTaxProfit } from "../src/lib/tax-engine";
import type { TaxProfitInput } from "../src/lib/tax-engine";

const base: TaxProfitInput = {
  grossSale: 100, quantity: 1, feeAmount: 12, freight: 5, sellerReimbursements: 0,
  unitCost: 40, otherCosts: 2, icmsRate: 7, difalRate: 0, icmsCredit: 0,
  corporateTax: "lucro-real-projection", monthlyTaxableProfitBeforeSale: 0,
  irpjRate: 15, irpjAdditionalRate: 10, csllRate: 9, additionalIrpjMonthlyThreshold: 20000,
};

test("desagrega cada imposto sem aplicar 34% fora da faixa do adicional", () => {
  const result = simulateTaxProfit(base);
  assert.equal(result.beforeCorporate, 34);
  assert.equal(result.irpj, 5.1);
  assert.equal(result.irpjAdditional, 0);
  assert.equal(result.csll, 3.06);
  assert.equal(result.netProfit, 25.84);
});
test("adicional mensal só incide sobre excedente incremental", () => {
  const result = simulateTaxProfit({ ...base, monthlyTaxableProfitBeforeSale: 19990 });
  assert.equal(result.irpjAdditional, 2.4);
  const above = simulateTaxProfit({ ...base, monthlyTaxableProfitBeforeSale: 22000 });
  assert.equal(above.irpjAdditional, 3.4);
});
test("preço recomendado é o primeiro centavo que satisfaz 10% líquido", () => {
  const target = priceForNetMargin(base, 10, 12);
  assert.ok(target !== null);
  const netAt = simulateTaxProfit({ ...base, grossSale: target!, feeAmount: target! * 0.12 });
  assert.ok(netAt.netProfit >= target! * 0.1 - 0.00001);
  const justBelow = simulateTaxProfit({ ...base, grossSale: target! - 0.01,
    feeAmount: (target! - 0.01) * 0.12 });
  assert.ok(justBelow.netProfit < (target! - 0.01) * 0.1 + 0.00001);
});
test("sem custo de ambas as origens, não inventa melhor fornecedor", () => {
  const partial = comparePurchaseOrigins({
    quantity: 5, spUnitCost: 55, esUnitCost: null,
    spCreditRate: 12, esCreditRate: 0,
  });
  assert.equal(partial.cheaper, null);
  const complete = comparePurchaseOrigins({
    quantity: 5, spUnitCost: 55, esUnitCost: 50,
    spCreditRate: 0, esCreditRate: 0,
  });
  assert.equal(complete.cheaper, "ES");
  assert.equal(complete.difference, 25);
});
