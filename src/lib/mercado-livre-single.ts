import type { Account, SourceStatus } from "./seller-data";
import {
  deriveMercadoLivreIntegration,
  type BackendResult, type MercadoLivreAccountView,
} from "./integration-model";

export type SingleSellerState =
  | { kind: "unavailable"; account: null; count: 0 }
  | { kind: "not_linked"; account: null; count: 0 }
  | { kind: "multiple"; account: null; count: number }
  | { kind: "ready"; account: MercadoLivreAccountView; count: 1 };

/**
 * O Client ID configura o aplicativo, NÃO identifica o vendedor.
 * O frontend só escolhe automaticamente quando o FastAPI retorna
 * exatamente uma conta OAuth já autorizada para o usuário FluxHub.
 * Nunca escolhemos o primeiro vendedor se existem vários.
 */
export function selectBackendMercadoLivre(
  connections: BackendResult<Account[]>,
  sources: BackendResult<SourceStatus[]>,
): SingleSellerState {
  const ml = deriveMercadoLivreIntegration(connections, sources);
  if (ml.status === "unavailable") return { kind: "unavailable", account: null, count: 0 };
  if (ml.status === "not_connected") return { kind: "not_linked", account: null, count: 0 };
  if (ml.accounts.length !== 1) return { kind: "multiple", account: null, count: ml.accounts.length };
  return { kind: "ready", account: ml.accounts[0], count: 1 };
}
