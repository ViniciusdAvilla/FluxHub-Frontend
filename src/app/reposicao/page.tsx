import PlatformPage from "@/components/platform-page";
import { getSnapshot } from "@/lib/backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page() {
  return <PlatformPage initial={await getSnapshot()} view="replenishment" />;
}
