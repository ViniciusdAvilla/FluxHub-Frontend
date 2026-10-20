import "server-only";
import { backendRequest } from "./backend-transport";
import { sellerIdentity, type Account, type SourceStatus } from "./seller-data";
import { type BackendResult } from "./integration-model";
import { selectBackendMercadoLivre } from "./mercado-livre-single";

type Profile = { id?: number; nickname?: string };
type ProductRow = { source_key?: string | null };
type OrderRow = { external_id?: string };

/** Todas as consultas usam a sessão FluxHub e credenciais privadas do FastAPI. */
async function readArray<T>(path: string): Promise<BackendResult<T[]>> {
  try {
    const data: unknown = await backendRequest(path);
    return Array.isArray(data) ? { ok: true, data: data as T[] } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function getIntegrationOverview() {
  const [identity, connections, sources] = await Promise.all([
    sellerIdentity(),
    readArray<Account>("/api/v1/connectors/mercado-livre"),
    readArray<SourceStatus>("/api/v1/connectors"),
  ]);
  const seller = selectBackendMercadoLivre(connections, sources);

  // Verificação ativa, em tempo real: a listagem de conexões representa
  // registros em banco, enquanto /profile valida/renova o token no backend.
  let profileState: "valid" | "unavailable" | "not_checked" = "not_checked";
  let liveNickname: string | null = null;
  let productCount: number | null = null;
  let recentOrderCount: number | null = null;
  if (seller.kind === "ready") {
    const accountId = seller.account.accountId;
    const [profile, products, orders] = await Promise.all([
      backendRequest("/api/v1/connectors/mercado-livre/profile",
        new URLSearchParams({ account_id: String(accountId) }), 60000).catch(() => null),
      readArray<ProductRow>("/api/v1/products/"),
      (async () => {
        try {
          const rows: unknown = await backendRequest("/api/v1/orders/",
            new URLSearchParams({ account_id: String(accountId), limit: "100" }));
          return Array.isArray(rows) ? rows as OrderRow[] : null;
        } catch { return null; }
      })(),
    ]);
    if (profile && typeof profile === "object" && Number((profile as Profile).id) === accountId) {
      profileState = "valid";
      liveNickname = typeof (profile as Profile).nickname === "string"
        ? (profile as Profile).nickname! : null;
    } else {
      profileState = "unavailable";
    }
    if (products.ok) productCount = products.data.filter(row => row.source_key === `ml:${accountId}`).length;
    if (orders !== null) recentOrderCount = orders.length;
  }

  return {
    isAdmin: Boolean(identity?.is_admin),
    seller,
    profileState,
    liveNickname,
    sourcesAvailable: sources.ok,
    productCount,
    recentOrderCount,
  };
}
