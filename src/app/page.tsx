import SellerHome from "@/components/seller-home";
import { getSellerReport, validAccount } from "@/lib/seller-data";

import { readPeriod, reportToday, type PeriodSearch } from "@/lib/report-period";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page({
  searchParams,
}:{
  searchParams: Promise<PeriodSearch>;
}) {
  const query=await searchParams;
  const today = reportToday();
  const period = readPeriod(query, today);
  const report = await getSellerReport(period, validAccount(query.account));
  return <SellerHome report={report} period={period} today={today}/>;
}
