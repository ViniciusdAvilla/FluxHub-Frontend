import "server-only";
import { backendRequest } from "./backend-transport";
import { sellerIdentity, type Account, type SourceStatus } from "./seller-data";
import {
  deriveMercadoLivreIntegration, deriveMercadoPagoIntegration,
  type BackendResult, type MercadoPagoConnection,
} from "./integration-model";

/** Um único leitor do backend, sem Client Secret nem credenciais no browser. */
async function readArray<T>(path: string): Promise<BackendResult<T[]>> {
  try {
    const result: unknown = await backendRequest(path);
    if (!Array.isArray(result)) return { ok: false };
    return { ok: true, data: result as T[] };
  } catch {
    return { ok: false };
  }
}

export async function getIntegrationOverview() {
  const [identity, ml, mp, sourceResult] = await Promise.all([
    sellerIdentity(),
    readArray<Account>("/api/v1/connectors/mercado-livre"),
    readArray<MercadoPagoConnection>("/api/v1/connectors/mercado-pago"),
    readArray<SourceStatus>("/api/v1/connectors"),
  ]);

  return {
    isAdmin: Boolean(identity?.is_admin),
    mercadoLivre: deriveMercadoLivreIntegration(ml, sourceResult),
    mercadoPago: deriveMercadoPagoIntegration(mp),
    sources: sourceResult.ok ? sourceResult.data : null,
  };
}
