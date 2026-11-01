/** Rótulos apresentados ao usuário; os códigos enviados à API permanecem intactos. */
export const orderStatusLabels: Readonly<Record<string, string>> = {
  paid: "Pago",
  partially_refunded: "Parcialmente reembolsado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  confirmed: "Confirmado",
  payment_required: "Aguardando pagamento",
  payment_in_process: "Pagamento em processamento",
  partially_paid: "Parcialmente pago",
  pending: "Pendente",
  invalid: "Inválido",
  unknown: "Não informado",
};

export const listingStatusLabels: Readonly<Record<string, string>> = {
  active: "Ativos",
  paused: "Pausados",
  inactive: "Inativos",
  under_review: "Em análise",
  closed: "Encerrados",
  deleted: "Excluídos",
  pending: "Pendentes",
  unknown: "Não informado",
};

export function orderStatusLabel(status: string): string {
  if (!status) return "Não informado";
  return orderStatusLabels[status.toLowerCase()] || "Outro status";
}
export function listingStatusLabel(status: string): string {
  if (!status) return "Não informado";
  return listingStatusLabels[status.toLowerCase()] || "Outro status";
}
