import { forwardMcp } from "@/lib/mcp-server-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return forwardMcp(request, "/api/v1/mcp", { allowBody: true });
}

export async function GET(request: Request) {
  return forwardMcp(request, "/api/v1/mcp");
}
