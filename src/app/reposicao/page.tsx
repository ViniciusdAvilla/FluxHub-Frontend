import { readPeriod, reportToday, type PeriodSearch } from "@/lib/report-period";
import PlatformPage from "@/components/platform-page";
import { getSnapshot } from "@/lib/backend";
import { sellerIdentity } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page({ searchParams }: { searchParams: Promise<PeriodSearch & { produto?: string }> }) {
  const today = reportToday();
  const query = await searchParams;
  const product = typeof query.produto === "string" && /^[A-Z0-9]{3,100}$/i.test(query.produto) ? query.produto : "";
  const period = readPeriod(query, today);
  const [snapshot, identity] = await Promise.all([getSnapshot("catalog", period), sellerIdentity()]);
  return <PlatformPage key={product} initial={snapshot} initialProduct={product} dateFilter={{ period, today }} isAdmin={Boolean(identity?.is_admin)} view="replenishment" />;
}
