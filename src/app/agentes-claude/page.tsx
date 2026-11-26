import ClaudeAgentsPanel from "@/components/claude-agents-panel";
import { sellerIdentity } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AgentsPage() {
  const user = await sellerIdentity();
  return <ClaudeAgentsPanel isAdmin={Boolean(user?.is_admin)}/>;
}
