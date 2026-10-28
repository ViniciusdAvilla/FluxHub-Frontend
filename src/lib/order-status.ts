/** Traduções consistentes para pedidos, vendas e filtros. */
export const orderStatusLabels: Readonly<Record<string, string>> = {
  paid: "Pago",
  cancelled: "Cancelado",
  confirmed: "Confirmado",
  payment_required: "Aguardando pagamento",
  payment_in_process: "Pagamento em processamento",
  partially_paid: "Parcialmente pago",
  refunded: "Reembolsado",
  invalid: "Inválido",
};

export function orderStatusLabel(status: string): string {
  return orderStatusLabels[status] ||
    (status ? "Outro: " + status.replaceAll("_", " ") : "Não informado");
}
