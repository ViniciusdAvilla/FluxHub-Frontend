import { NextResponse } from "next/server";
import { backendRequest, backendMutation } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

function safeParams(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("account_id") || "";
  if (!/^[0-9]{1,15}$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) <= 0)
    throw new Error("Selecione uma conta Mercado Livre válida.");
  const kind = url.searchParams.get("kind") || "messages";
  if (kind !== "messages" && kind !== "questions")
    throw new Error("Tipo de conversa inválido.");
  const reference = url.searchParams.get("reference");
  if (reference !== null && !/^[0-9]{1,22}$/.test(reference))
    throw new Error("Identificador de conversa inválido.");
  return { account_id: Number(raw), kind, reference };
}

function errorResponse(error: unknown, status = 502) {
  const msg = error instanceof Error ? error.message : "Consulta indisponível.";
  // Backend returns sanitized messages; never echo unknown upstream errors.
  const safe = /^(Selecione|Tipo de|Identificador|Conta|Conversa|Esta conversa|O Mercado Livre|Envio|Mercado Livre|A conta|Assistente|Sugestões|Resposta)/.test(msg)
    ? msg : "Não foi possível concluir a operação. Confira sua sessão e a integração.";
  return NextResponse.json({error:safe}, {status, headers});
}

export async function GET(request: Request) {
  let args: ReturnType<typeof safeParams>;
  try { args = safeParams(request); }
  catch (error) { return errorResponse(error, 422); }
  const {account_id, kind, reference} = args;
  const query = new URLSearchParams({account_id:String(account_id), kind});
  try {
    const route = reference
      ? `/api/v1/support/threads/${reference}`
      : "/api/v1/support/threads";
    const result = await backendRequest(route, query, 60000);
    return NextResponse.json(result, {headers});
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  // Cookie-authenticated mutations MUST have a trusted browser Origin.
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return NextResponse.json({error:"Origem não autorizada."}, {status:403, headers});
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({error:"Formato inválido."}, {status:415, headers});
  try {
    const raw = await request.text();
    if (raw.length > 6000) return NextResponse.json({error:"Mensagem muito grande."}, {status:413, headers});
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return errorResponse(new Error("Resposta inválida."), 422);
    const input = parsed as Record<string, unknown>;
    const op = input.op;
    const account_id = input.account_id;
    const kind = input.kind;
    const reference = input.reference;
    if (typeof account_id !== "number" || !Number.isSafeInteger(account_id) || account_id <= 0 ||
      (kind !== "messages" && kind !== "questions") ||
      typeof reference !== "string" || !/^[0-9]{1,22}$/.test(reference))
      return errorResponse(new Error("Identificador de conversa inválido."), 422);
    if (op !== "suggest" && op !== "reply")
      return errorResponse(new Error("Tipo de operação inválido."), 422);
    if (op === "reply" && (input.confirmed !== true || typeof input.text !== "string" ||
      input.text.trim().length === 0 || input.text.length > (kind === "messages" ? 350 : 2000)))
      return errorResponse(new Error("Resposta inválida."), 422);
    const body = op === "reply"
      ? {account_id, kind, reference, text: input.text, confirmed: true}
      : {account_id, kind, reference};
    const result = await backendMutation(`/api/v1/support/${op}`, "POST", body, 60000);
    return NextResponse.json(result, {headers});
  } catch (error) { return errorResponse(error); }
}
