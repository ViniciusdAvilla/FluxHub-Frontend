/**
 * Monta URLs no servidor Next.js preservando o prefixo do proxy (ex.: /backend-api).
 * Os caminhos do OpenAPI são absolutos em relação à API, não à raiz do domínio.
 */
export function resolveBackendUrl(
  base: URL,
  path: string,
  query?: URLSearchParams,
): URL {
  if (
    !/^https?:$/.test(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error("Endereço do serviço inválido.");
  }
  if (!path.startsWith("/") || path.startsWith("//") || /[?#]/.test(path)) {
    throw new Error("Caminho inválido.");
  }

  const prefix = base.pathname.replace(/\/+$/, "");
  const url = new URL(base.origin);
  url.pathname = `${prefix}${path}`;
  // Impede que segmentos ".." removam o prefixo e consultem outra aplicação.
  if (prefix && !url.pathname.startsWith(`${prefix}/`)) {
    throw new Error("Caminho inválido.");
  }

  if (query) url.search = query.toString();
  return url;
}
