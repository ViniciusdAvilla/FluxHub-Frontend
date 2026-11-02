/**
 * Do not parse HTML responses from a reverse proxy as JSON.
 * Nginx often replies with an HTML 413 when uploads exceed client_max_body_size.
 */
function nonJsonImportError(status: number): string {
  if (status === 413)
    return "Arquivo rejeitado pelo servidor (HTTP 413). O limite do Nginx pode estar em 1 MB. Configure pelo menos 20 MB para permitir importar arquivos de até 16 MB.";
  if (status === 401 || status === 403)
    return "Sua sessão pode ter expirado. Entre novamente no FluxHub e tente importar o arquivo.";
  if (status === 502 || status === 503 || status === 504 || status >= 500)
    return "O servidor de importação não respondeu corretamente (HTTP " + status + "). Verifique se o backend e o Nginx estão disponíveis.";
  if (status >= 200 && status < 300)
    return "O servidor retornou uma página HTML em vez dos dados da importação. Atualize a página e tente novamente.";
  return "Não foi possível ler a resposta do servidor (HTTP " + status + ").";
}

export async function readCostImportResponse(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json") && !contentType.includes("+json"))
    throw new Error(nonJsonImportError(response.status));

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new Error("O servidor retornou JSON inválido. Tente novamente ou verifique os logs do backend.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("O servidor retornou uma resposta de importação incompleta.");

  const data = raw as Record<string, unknown>;
  if (!response.ok) {
    const serverMessage = typeof data.error === "string" ? data.error :
      typeof data.detail === "string" ? data.detail : null;
    throw new Error(serverMessage || nonJsonImportError(response.status));
  }
  return data;
}
