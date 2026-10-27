import ModernShell from "@/components/modern-shell";
import BuyerExplorer from "@/components/buyer-explorer";
import { sellerIdentity } from "@/lib/seller-data";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function BuyersPage(){
  const identity = await sellerIdentity();
  return <ModernShell title="Clientes" eyebrow="Compradores Mercado Livre"
    isAdmin={Boolean(identity?.is_admin)}>
    <BuyerExplorer/>
  </ModernShell>;
}
