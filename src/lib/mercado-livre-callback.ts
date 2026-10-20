/**
 * Valida o retorno OAuth recebido pelo Next.js antes de encaminhá-lo ao FastAPI.
 * Nunca registre code/state nos logs ou inclua-os nos redirecionamentos de UI.
 */
export function parseMercadoLivreCallback(params: URLSearchParams): URLSearchParams | null {
  const states = params.getAll("state");
  const codes = params.getAll("code");
  const errors = params.getAll("error");
  if (states.length !== 1 || !/^[A-Za-z0-9_-]{16,200}$/.test(states[0])) return null;
  if (codes.length > 1 || errors.length > 1 || (codes.length === 1 && errors.length === 1)) return null;
  if (codes.length === 0 && errors.length === 0) return null;
  if (codes.length === 1 && (codes[0].length === 0 || codes[0].length > 2048)) return null;
  if (errors.length === 1 && (errors[0].length === 0 || errors[0].length > 200)) return null;

  const query = new URLSearchParams({ state: states[0] });
  if (codes.length === 1) query.set("code", codes[0]);
  if (errors.length === 1) query.set("error", errors[0]);
  return query;
}
