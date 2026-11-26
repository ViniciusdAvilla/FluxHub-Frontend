import PlatformPage from "@/components/platform-page";
import { getSnapshot } from "@/lib/backend";
import { sellerIdentity } from "@/lib/seller-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page({ searchParams }: { searchParams: Promise<{ produto?: string; meta?: string }> }) {
  const query = await searchParams;
  const product = typeof query.produto === "string" && /^[A-Z0-9]{3,100}$/i.test(query.produto) ? query.produto : "";
  const margin = typeof query.meta === "string" && ["10", "15", "20"].includes(query.meta) ? Number(query.meta) : 20;
  const [snapshot, identity] = await Promise.all([getSnapshot(), sellerIdentity()]);
  return <PlatformPage key={product + ":" + margin} initial={snapshot} initialProduct={product} initialMargin={margin} isAdmin={Boolean(identity?.is_admin)} view="pricing" />;
}
