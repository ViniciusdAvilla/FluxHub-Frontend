import ModernShell from "@/components/modern-shell";
import AtendimentoPanel from "@/components/atendimento-panel";
import { sellerIdentity } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AtendimentoPage() {
  const user = await sellerIdentity();
  return <ModernShell title="Central de Atendimento" eyebrow="Mercado Livre"
    isAdmin={Boolean(user?.is_admin)}>
    <AtendimentoPanel />
  </ModernShell>;
}
