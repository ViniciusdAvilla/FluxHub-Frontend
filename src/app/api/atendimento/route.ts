import { backendMutation, backendRequest } from "@/lib/backend-transport";
import { isTrustedRequestOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const base = "/api/v1/atendimento";
const noStore = { "Cache-Control": "no-store" };

function safeId(value: string | null): number | null {
  const number = Number(value);
  return value && /^\d{1,16}$/.test(value) && Number.isSafeInteger(number) && number > 0 ? number : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "contas";
  const accountId = safeId(url.searchParams.get("account"));
  const offset = url.searchParams.get("offset") || "0";
  if (!["contas", "perguntas", "pedidos", "mensagens"].includes(action))
    return Response.json({ error: "Consulta inválida." }, { status: 422 });
  if (action !== "contas" && !accountId)
    return Response.json({ error: "Selecione uma conta." }, { status: 422 });
  const query = new URLSearchParams();
  if (accountId) query.set("account_id", String(accountId));
  if (action === "pedidos" || action === "perguntas") {
    if (!/^\d{1,4}$/.test(offset) || Number(offset) > 1000)
      return Response.json({ error: "Página inválida." }, { status: 422 });
    query.set("offset", offset);
  }
  let path = base + "/" + action;
  if (action === "mensagens") {
    const pack = safeId(url.searchParams.get("pack"));
    if (!pack) return Response.json({ error: "Pedido inválido." }, { status: 422 });
    path += "/" + pack;
  }
  try {
    return Response.json(await backendRequest(path, query, 35000), { headers: noStore });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Atendimento indisponível." },
                         { status: 502, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isTrustedRequestOrigin(request))
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });
  try {
    const raw = await request.text();
    if (raw.length > 6500) return Response.json({ error: "Conteúdo muito grande." }, { status: 413 });
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      return Response.json({ error: "Dados inválidos." }, { status: 422 });
    const input = payload as Record<string, unknown>;
    const action = input.action;
    if (!["sugerir", "responder-pergunta", "responder-mensagem"].includes(String(action)))
      return Response.json({ error: "Ação inválida." }, { status: 422 });
    if (action === "sugerir") {
      const messages = input.messages;
      if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12 ||
          messages.some(x => typeof x !== "string" || x.length > 500) ||
          !["question", "post_sale"].includes(String(input.channel)))
        return Response.json({ error: "Histórico inválido." }, { status: 422 });
      const result = await backendMutation(base + "/sugerir", "POST",
        { messages, channel: input.channel }, 30000);
      return Response.json(result, { headers: noStore });
    }
    const account = typeof input.account === "number" && Number.isSafeInteger(input.account) && input.account > 0 ? input.account : null;
    const id = typeof input.id === "number" && Number.isSafeInteger(input.id) && input.id > 0 ? input.id : null;
    const message = input.text;
    if (!account || !id || typeof message !== "string" || !message.trim() || message.length > 350)
      return Response.json({ error: "Informe conta, conversa e resposta de até 350 caracteres." }, { status: 422 });
    const path = action === "responder-pergunta"
      ? base + "/perguntas/" + id + "/responder"
      : base + "/mensagens/" + id + "/responder";
    const result = await backendMutation(path, "POST", { text: message.trim() }, 35000,
      new URLSearchParams({ account_id: String(account) }));
    return Response.json(result, { headers: noStore });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha no atendimento." },
                         { status: 502, headers: noStore });
  }
}
