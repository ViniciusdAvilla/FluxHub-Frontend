import SellerHome from "@/components/seller-home";
import { getSellerReport, validAccount, validDays } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page({
  searchParams,
}:{
  searchParams: Promise<{ days?:string; account?:string }>;
}) {
  const query=await searchParams;
  const report=await getSellerReport(validDays(query.days),validAccount(query.account));
  return <SellerHome report={report}/>;
}
