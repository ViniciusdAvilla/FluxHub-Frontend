import PlatformPage from "@/components/platform-page";
import { getSnapshot } from "@/lib/backend";
import { sellerIdentity } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page() {
  const [snapshot, identity] = await Promise.all([getSnapshot(), sellerIdentity()]);
  return <PlatformPage initial={snapshot} isAdmin={Boolean(identity?.is_admin)} view="finance" />;
}
