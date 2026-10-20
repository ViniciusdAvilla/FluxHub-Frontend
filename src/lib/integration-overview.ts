import "server-only";
import { backendRequest } from "./backend-transport";
import { sellerIdentity, type Account, type SourceStatus } from "./seller-data";
import { type BackendResult } from "./integration-model";
import { selectBackendMercadoLivre } from "./mercado-livre-single";

type Profile = { id?: number; nickname?: string };

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
  if (seller.kind === "ready") {
    try {
      const profile = await backendRequest(
        "/api/v1/connectors/mercado-livre/profile",
        new URLSearchParams({ account_id: String(seller.account.accountId) }),
      ) as Profile;
      if (Number(profile?.id) === seller.account.accountId) {
        profileState = "valid";
        liveNickname = typeof profile.nickname === "string" ? profile.nickname : null;
      } else {
        profileState = "unavailable";
      }
    } catch {
      profileState = "unavailable";
    }
  }

  return {
    isAdmin: Boolean(identity?.is_admin),
    seller,
    profileState,
    liveNickname,
    sourcesAvailable: sources.ok,
  };
}
