import ModernShell from "@/components/modern-shell";
import OverviewPeriodFilter from "@/components/overview-period-filter";
import DecisionQueue from "@/components/decision-queue";
import { getSnapshot } from "@/lib/backend";
import { backendRequest } from "@/lib/backend-transport";
import { buildDecisionQueue, type DecisionKind } from "@/lib/decision-queue";
import { sellerIdentity } from "@/lib/seller-data";
import { periodLength, periodSearchParams, readPeriod, reportToday, type PeriodSearch } from "@/lib/report-period";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page({ searchParams }: { searchParams: Promise<PeriodSearch> }) {
  const today = reportToday();
  const period = readPeriod({ ...await searchParams, compare: undefined }, today);
  const [snapshot, identity] = await Promise.all([getSnapshot("catalog", period), sellerIdentity()]);
  const decisions = buildDecisionQueue(snapshot, periodLength(period));
  const kinds: DecisionKind[] = ["restock", "margin", "data"];
  const ids = [...new Set(kinds.flatMap(kind => decisions.filter(item => item.kind === kind)
    .slice(0, 30).map(item => item.id)))].filter(id => /^[A-Za-z0-9]{3,100}$/.test(id));
  const photos: Record<string, string> = {};
  if (ids.length) {
    const result = await backendRequest("/api/v1/products/photos", new URLSearchParams({ ids: ids.join(",") }), 3000)
      .catch(() => null);
    if (Array.isArray(result)) {
      for (const photo of result) {
        if (typeof photo?.thumbnail === "string" && /^https:\/\/(?:[a-z0-9-]+\.)*mlstatic\.com\//i.test(photo.thumbnail)) {
          photos[`${photo.account_id}:${photo.item_id}`] = photo.thumbnail;
        }
      }
    }
  }
  const periodQuery = periodSearchParams(period).toString();
  return <ModernShell title="Fila de decisões" eyebrow="Ações sugeridas para sua operação."
    isAdmin={Boolean(identity?.is_admin)}
    action={<OverviewPeriodFilter period={period} today={today} accountId={null} accounts={[]} allowCompare={false}/>}>
    <DecisionQueue key={periodQuery} items={decisions} photos={photos} periodQuery={periodQuery}
      available={Boolean(snapshot.catalogSales) && !snapshot.error}
      complete={Boolean(snapshot.catalogSales?.orders_complete)}/>
  </ModernShell>;
}
