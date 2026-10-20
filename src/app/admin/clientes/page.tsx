import { redirect } from "next/navigation";
import AdminOverview from "@/components/admin-overview";
import { getAdminReport } from "@/lib/admin-data";
import { sellerIdentity } from "@/lib/seller-data";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export default async function ClientsPage(){
  const me=await sellerIdentity();
  if(!me?.is_admin) redirect("/");
  return <AdminOverview data={await getAdminReport()} clientsOnly/>;
}
