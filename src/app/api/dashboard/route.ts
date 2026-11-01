import { getSnapshot } from "@/lib/backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope") === "data"
    ? "data" : "catalog";
  const snapshot = await getSnapshot(scope);
  return Response.json(snapshot, {
    status: snapshot.error ? 502 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
