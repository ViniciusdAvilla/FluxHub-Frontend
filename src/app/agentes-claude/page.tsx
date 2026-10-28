import ModernShell from "@/components/modern-shell";
import ClaudeAgentsPanel from "@/components/claude-agents-panel";
import { sellerIdentity } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AgentsPage() {
  const user = await sellerIdentity();
  return <ModernShell title="Agentes Claude" eyebrow="Inteligência da operação"
    isAdmin={Boolean(user?.is_admin)}>
    <ClaudeAgentsPanel/>
  </ModernShell>;
}
