import { readPeriod, reportToday, type PeriodSearch } from "@/lib/report-period";
import PlatformPage from "@/components/platform-page";
import { getSnapshot } from "@/lib/backend";
import { sellerIdentity } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page({ searchParams }: { searchParams: Promise<PeriodSearch> }) {
  const today = reportToday();
  const period = readPeriod(await searchParams, today);
  const [snapshot, identity] = await Promise.all([getSnapshot("catalog", period), sellerIdentity()]);
  return <PlatformPage initial={snapshot} dateFilter={{ period, today }} isAdmin={Boolean(identity?.is_admin)} view="abc" />;
}
