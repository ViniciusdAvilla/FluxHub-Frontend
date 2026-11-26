import "server-only";

import { getSnapshot } from "./backend";
import { buildDecisionQueue } from "./decision-queue";
import { backendRequest } from "./backend-transport";
import { periodLength, reportToday, resolvePeriod } from "./report-period";
import { priorityCandidates, priorityProductKey, selectSalesPriority } from "./sales-priority";

export async function getSalesPriority() {
  const period = resolvePeriod("30", reportToday());
  const days = periodLength(period);
  const snapshot = await getSnapshot("catalog", period);
  const statuses = new Map<string, string>();
  const decisions = snapshot.error || !snapshot.catalogSales?.orders_complete ? [] : buildDecisionQueue(snapshot, days);

  await Promise.all(priorityCandidates(decisions).map(async row => {
    const params = new URLSearchParams({ account_id: row.account, search: row.id, limit: "20" });
    const response = await backendRequest("/api/v1/listing-health/", params, 3500).catch(() => null);
    if (!response || typeof response !== "object" || !("items" in response) || !Array.isArray(response.items)) return;
    const items: unknown[] = response.items;
    for (const item of items) {
      if (item && typeof item === "object" &&
          "item_id" in item && item.item_id === row.id &&
          "account_id" in item && String(item.account_id) === row.account &&
          "listing_status" in item && typeof item.listing_status === "string") {
        statuses.set(priorityProductKey(row), item.listing_status);
        break;
      }
    }
  }));

  const result = selectSalesPriority(snapshot, { start: period.start, end: period.end, days }, statuses, decisions);
  return { verified: true, sections: [{ query: "prioridade_vendas", result }] };
}
