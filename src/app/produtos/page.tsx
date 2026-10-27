import PlatformPage from "@/components/platform-page";
import { getSnapshot } from "@/lib/backend";
import { sellerIdentity } from "@/lib/seller-data";
import { backendRequest } from "@/lib/backend-transport";
import type { Account } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  const [snapshot, identity, accounts] = await Promise.all([
    getSnapshot(),
    sellerIdentity(),
    backendRequest("/api/v1/connectors/mercado-livre").catch(() => []) as Promise<Account[]>,
  ]);
  const syncAccounts = (Array.isArray(accounts) ? accounts : []).map(account => ({
    accountId: account.account_id,
    auto: true,
  }));
  return <PlatformPage initial={snapshot} view="products" syncAccounts={syncAccounts} isAdmin={Boolean(identity?.is_admin)}/>;
}
