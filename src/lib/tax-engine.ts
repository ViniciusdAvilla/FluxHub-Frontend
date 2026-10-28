/** Deterministic BRL simulation. Never represents an official tax assessment. */
export type TaxProfitInput = {
  grossSale: number;
  quantity: number;
  feeAmount: number;
  freight: number;
  sellerReimbursements: number;
  unitCost: number;
  otherCosts: number;
  icmsRate: number;
  difalRate: number;
  icmsCredit: number;
  corporateTax: "none" | "lucro-real-projection";
  monthlyTaxableProfitBeforeSale: number;
  irpjRate: number;
  irpjAdditionalRate: number;
  csllRate: number;
  additionalIrpjMonthlyThreshold: number;
};

export type TaxProfitBreakdown = {
  grossSale: number; feeAmount: number; freight: number; reimbursements: number;
  productCost: number; icms: number; difal: number; icmsCredit: number;
  otherCosts: number; afterMarketplace: number; beforeCorporate: number;
  irpj: number; irpjAdditional: number; csll: number; corporateTaxes: number;
  netProfit: number; netMargin: number | null;
};

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const nonNegative = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;

export function simulateTaxProfit(input: TaxProfitInput): TaxProfitBreakdown {
  const sale = cents(nonNegative(input.grossSale));
  const fees = cents(nonNegative(input.feeAmount));
  const freight = cents(nonNegative(input.freight));
  const reimbursements = cents(nonNegative(input.sellerReimbursements));
  const cost = cents(nonNegative(input.unitCost) * nonNegative(input.quantity));
  const icms = cents(sale * nonNegative(input.icmsRate) / 100);
  const difal = cents(sale * nonNegative(input.difalRate) / 100);
  const credit = cents(nonNegative(input.icmsCredit));
  const other = cents(nonNegative(input.otherCosts));
  const afterMarketplace = cents(sale - fees - freight + reimbursements);
  const beforeCorporate = cents(afterMarketplace - cost - icms - difal + credit - other);
  let irpj = 0, irpjAdditional = 0, csll = 0;
  if (input.corporateTax === "lucro-real-projection" && beforeCorporate > 0) {
    irpj = cents(beforeCorporate * nonNegative(input.irpjRate) / 100);
    csll = cents(beforeCorporate * nonNegative(input.csllRate) / 100);
    const monthlyBase = nonNegative(input.monthlyTaxableProfitBeforeSale);
    const threshold = nonNegative(input.additionalIrpjMonthlyThreshold);
    const excessBefore = Math.max(0, monthlyBase - threshold);
    const excessAfter = Math.max(0, monthlyBase + beforeCorporate - threshold);
    irpjAdditional = cents((excessAfter - excessBefore) * nonNegative(input.irpjAdditionalRate) / 100);
  }
  const corporateTaxes = cents(irpj + irpjAdditional + csll);
  const netProfit = cents(beforeCorporate - corporateTaxes);
  return {
    grossSale: sale, feeAmount: fees, freight, reimbursements,
    productCost: cost, icms, difal, icmsCredit: credit, otherCosts: other,
    afterMarketplace, beforeCorporate, irpj, irpjAdditional, csll, corporateTaxes,
    netProfit, netMargin: sale > 0 ? cents(100 * netProfit / sale) : null,
  };
}

/** Smallest price in centavos reaching a target margin; fee is proportional approximation. */
export function priceForNetMargin(
  input: TaxProfitInput, targetMarginPercent: number, feePercent: number,
): number | null {
  if (!Number.isFinite(input.unitCost) || input.unitCost < 0 ||
      !Number.isFinite(targetMarginPercent) || targetMarginPercent < 0 || targetMarginPercent >= 100 ||
      !Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) return null;
  const profitAt = (centavos: number) => {
    const price = centavos / 100;
    const snapshot = simulateTaxProfit({
      ...input, grossSale: price, feeAmount: price * feePercent / 100,
      // The seller credit/refund is not assumed to grow with the price.
    });
    return snapshot.netProfit - price * targetMarginPercent / 100;
  };
  let high = Math.max(1, Math.round(input.grossSale * 100));
  while (profitAt(high) < 0 && high < 100_000_000_000) high = Math.min(high * 2, 100_000_000_000);
  if (profitAt(high) < 0) return null;
  let low = 0;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (profitAt(middle) >= 0) high = middle;
    else low = middle + 1;
  }
  return cents(low / 100);
}

/** Commercial scenario only: purchase taxes/credits must be supplied for each UF. */
export function comparePurchaseOrigins(args: {
  quantity: number; spUnitCost: number | null; esUnitCost: number | null;
  spCreditRate: number; esCreditRate: number;
}) {
  const totalFor = (unitCost: number | null, creditRate: number) =>
    unitCost === null || !Number.isFinite(unitCost) || unitCost < 0
      ? null
      : cents(unitCost * nonNegative(args.quantity) * (1 - nonNegative(creditRate) / 100));
  const spTotal = totalFor(args.spUnitCost, args.spCreditRate);
  const esTotal = totalFor(args.esUnitCost, args.esCreditRate);
  return { spTotal, esTotal,
    cheaper: spTotal === null || esTotal === null || spTotal === esTotal
      ? null : spTotal < esTotal ? "SP" as const : "ES" as const,
    difference: spTotal === null || esTotal === null ? null : cents(Math.abs(spTotal - esTotal)),
  };
}
