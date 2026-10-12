/**
 * Cabeçalho de autenticação servidor-a-servidor.
 * Não importar em componentes client-side.
 */
export function backendAuthHeaders(token: string | undefined): Record<string, string> {
  if (
    !token ||
    token.length < 32 ||
    token.length > 2048 ||
    token.trim() !== token ||
    /\s/.test(token)
  ) {
    throw new Error("BACKEND_TOKEN não configurado. Defina o mesmo token seguro no Next.js e no FastAPI.");
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}
