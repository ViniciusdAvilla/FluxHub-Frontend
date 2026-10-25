import { NextResponse } from "next/server";
import { backendRequest } from "@/lib/backend-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

/** Proxy only authenticated, tenant-scoped public seller identity fields. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("account_id");
  if (raw !== null && !/^\d{1,15}$/.test(raw)) {
    return NextResponse.json({error:"Conta inválida."}, {status:422, headers});
  }
  const id = raw === null ? null : Number(raw);
  if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) {
    return NextResponse.json({error:"Conta inválida."}, {status:422, headers});
  }
  try {
    const query = id !== null ? new URLSearchParams({account_id:String(id)}) : undefined;
    const result = await backendRequest(
      "/api/v1/connectors/mercado-livre/identity", query, 60000,
    ) as {account_id:unknown; nickname?:unknown; display_name?:unknown; picture_url?:unknown};
    if (!result || typeof result.account_id !== "number" ||
        (id !== null && result.account_id !== id) ||
        typeof result.display_name !== "string" ||
        typeof result.nickname !== "string") {
      throw new Error("Perfil inválido.");
    }
    return NextResponse.json({
      account_id: result.account_id,
      nickname: result.nickname,
      display_name: result.display_name,
      picture_url: typeof result.picture_url === "string" ? result.picture_url : null,
    }, {headers});
  } catch {
    // An unlinked account is not a user identity; never use a fabricated seller photo.
    return NextResponse.json({error:"Perfil do vendedor indisponível."}, {status:404, headers});
  }
}
