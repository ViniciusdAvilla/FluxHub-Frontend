import { buildDecisionQueue, type Decision } from "./decision-queue";
import type { Snapshot } from "./types";

export type SalesPriority = {
  title: string;
  action: string;
  destination: "purchases" | "pricing" | "listings" | "integrations" | "queue";
  reason: string;
  product?: Pick<Decision, "id" | "name" | "units" | "coverage" | "margin" | "target" | "quantity" | "investment">;
  status?: string;
  start: string;
  end: string;
  source: string;
};

export function isSalesPriorityQuestion(question: string) {
  const normalized = question.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return /\b(prioridad\w*|priorizar|primeiro|comecar)\b/.test(normalized)
    && /\b(venda\w*|faturamento|vender)\b/.test(normalized);
}

export function priorityCandidates(decisions: Decision[]) {
  return decisions.filter(row => row.kind !== "data")
    .sort((a, b) => b.units - a.units || (a.coverage ?? Infinity) - (b.coverage ?? Infinity))
    .slice(0, 8);
}

export const priorityProductKey = (row: Pick<Decision, "account" | "id">) => `${row.account}:${row.id}`;

export function selectSalesPriority(
  snapshot: Snapshot,
  window: { start: string; end: string; days: number },
  statuses: ReadonlyMap<string, string>,
  decisions = buildDecisionQueue(snapshot, window.days),
): SalesPriority {
  const base = {
    start: window.start, end: window.end,
    source: "Pedidos pagos, estoque, custos e anúncios sincronizados no FluxHub",
  };
  if (snapshot.error || !snapshot.catalogSales?.orders_complete) {
    return { ...base, title: "Conferir a sincronização das vendas", action: "Ver integrações",
      destination: "integrations", reason: "Os pedidos do período estão indisponíveis ou ainda em apuração. Confira a cobertura antes de decidir onde investir." };
  }

  const candidates = priorityCandidates(decisions);
  const status = (row: Decision) => statuses.get(priorityProductKey(row));
  const restock = candidates.find(row => row.kind === "restock" && status(row) === "active");
  if (restock) {
    return { ...base, title: "Repor o produto com risco de falta", action: "Ver plano de compras",
      destination: "purchases", reason: "Este é o item com mais unidades vendidas entre as reposições verificadas. A cobertura está baixa e a margem estimada atende à meta da classe.",
      product: restock, status: "Ativo" };
  }

  const paused = candidates.find(row => status(row) === "paused" && row.coverage !== null && row.coverage > 0
    && row.margin !== null && row.target !== null && row.margin >= row.target);
  if (paused) {
    return { ...base, title: "Revisar um anúncio pausado com vendas recentes", action: "Ver anúncios",
      destination: "listings", reason: "O produto tem vendas registradas, saldo disponível e margem estimada dentro da meta. Confira o motivo da pausa antes de decidir se vale reativar.",
      product: paused, status: "Pausado" };
  }

  const margin = candidates.find(row => row.kind === "margin" && status(row) === "active");
  if (margin) {
    return { ...base, title: "Revisar o preço de um produto com vendas", action: "Abrir precificação",
      destination: "pricing", reason: "Este produto vendeu no período e a margem estimada ficou abaixo da meta da classe. Simule preço ou custo antes de aumentar o volume.",
      product: margin, status: "Ativo" };
  }

  const unverified = candidates.find(row => !status(row));
  if (unverified) {
    return { ...base, title: "Conferir a situação do anúncio prioritário", action: "Ver anúncios",
      destination: "listings", reason: "O status do anúncio não pôde ser confirmado no FluxHub. Confira o cadastro antes de decidir repor estoque ou mudar o preço.",
      product: unverified };
  }

  const incomplete = decisions.find(row => row.kind === "data");
  if (incomplete) {
    return { ...base, title: incomplete.reason, action: "Abrir Fila de decisões",
      destination: "queue", reason: "Este produto teve vendas recentes. Esse dado precisa ser conferido para sustentar uma recomendação comercial.",
      product: incomplete };
  }

  return { ...base, title: "Sem prioridade comercial confirmada", action: "Abrir Fila de decisões",
    destination: "queue", reason: "Os registros consultados não sustentam uma ação imediata de reposição, preço ou revisão de anúncio para os itens analisados." };
}
