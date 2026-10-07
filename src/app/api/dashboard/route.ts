import { getSnapshot } from "@/lib/backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const snapshot = await getSnapshot();
  return Response.json(snapshot, {
    status: snapshot.error ? 502 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
