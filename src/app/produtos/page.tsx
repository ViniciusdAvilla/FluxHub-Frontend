import PlatformPage from "@/components/platform-page";
import { getSnapshot } from "@/lib/backend";
import { backendRequest } from "@/lib/backend-transport";
import type { Account, SourceStatus } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page() {
  const [snapshot, accounts, sources] = await Promise.all([
    getSnapshot(),
    backendRequest("/api/v1/connectors/mercado-livre").catch(() => []) as Promise<Account[]>,
    backendRequest("/api/v1/connectors").catch(() => []) as Promise<SourceStatus[]>,
  ]);
  const syncAccounts = (Array.isArray(accounts) ? accounts : []).map(account => ({
    accountId: account.account_id,
    auto: !(Array.isArray(sources) && sources.some(source =>
      source.account_key === `ml:${account.account_id}` && Boolean(source.last_synced_at)
    )),
  }));
  return <PlatformPage initial={snapshot} view="products" syncAccounts={syncAccounts}/>;
}
