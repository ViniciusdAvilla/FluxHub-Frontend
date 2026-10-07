import { saveFinance } from "@/lib/database";
import { validateFinance } from "@/lib/validation";

export const runtime = "nodejs";
export async function PUT(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Formato inválido." }, { status: 415 });
  if (Number(request.headers.get("content-length")) > 8192)
    return Response.json(
      { error: "O cadastro excede o tamanho permitido." },
      { status: 413 },
    );
  let finance;
  try {
    const body = await request.text();
    if (body.length > 8192)
      return Response.json(
        { error: "Cadastro muito grande." },
        { status: 413 },
      );
    finance = validateFinance(JSON.parse(body));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof SyntaxError
            ? "Dados inválidos."
            : (error as Error).message,
      },
      { status: 400 },
    );
  }
  try {
    saveFinance(finance);
    return Response.json(finance, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Não foi possível salvar. Tente novamente." },
      { status: 500 },
    );
  }
}
