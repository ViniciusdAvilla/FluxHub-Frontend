import type { Finance } from "./types";

export function validateFinance(value: unknown): Finance {
  if (!value || typeof value !== "object")
    throw new Error("Preencha os dados do produto.");
  const p = value as Record<string, unknown>;
  if (
    typeof p.productId !== "string" ||
    !p.productId.trim() ||
    p.productId.length > 100
  )
    throw new Error("Selecione um produto válido.");
  if (
    typeof p.supplier !== "string" ||
    !p.supplier.trim() ||
    p.supplier.trim().length > 120
  )
    throw new Error("Informe um fabricante com até 120 caracteres.");
  const fields = [
    "unitCost",
    "feePercent",
    "taxPercent",
    "shippingCost",
    "otherCost",
  ] as const;
  for (const key of fields) {
    const n = p[key];
    const max = key.endsWith("Percent") ? 100 : 10_000_000;
    if (
      typeof n !== "number" ||
      !Number.isFinite(n) ||
      n < 0 ||
      n > max ||
      Math.abs(n * 100 - Math.round(n * 100)) > 0.000001
    )
      throw new Error(
        "Preencha custos e percentuais válidos, com até duas casas decimais.",
      );
  }
  if (Number(p.feePercent) + Number(p.taxPercent) > 100)
    throw new Error("A soma de comissão e imposto não pode ultrapassar 100%.");
  return {
    productId: p.productId,
    supplier: p.supplier.trim(),
    unitCost: Number(p.unitCost),
    feePercent: Number(p.feePercent),
    taxPercent: Number(p.taxPercent),
    shippingCost: Number(p.shippingCost),
    otherCost: Number(p.otherCost),
  };
}
