import ModernShell from "@/components/modern-shell";
import SupportCenter from "@/components/support-center";
import { getMarketplaceOverview } from "@/lib/marketplace-overview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MensagensPage() {
  const { ml, isAdmin } = await getMarketplaceOverview();
  return <ModernShell title="Central de Atendimento" eyebrow="Mercado Livre" isAdmin={isAdmin}>
    <SupportCenter accounts={ml.accounts.map(a=>({accountId:a.accountId,nickname:a.nickname}))}/>
  </ModernShell>;
}
