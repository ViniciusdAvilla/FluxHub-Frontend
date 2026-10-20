import type { Account, SourceStatus } from "./seller-data";

export type BackendResult<T> = { ok: true; data: T } | { ok: false };
export type ConnectionStatus = "connected" | "not_connected" | "unavailable";

export type MercadoLivreAccountView = {
  accountId: number;
  nickname: string;
  expiresAt: string | null;
  sourceKey: string;
  sourceKnown: boolean;
  enabled: boolean;
  lastSyncedAt: string | null;
};

export type MercadoLivreIntegration = {
  status: ConnectionStatus;
  accounts: MercadoLivreAccountView[];
  sourcesAvailable: boolean;
  orphanSources: number;
};

export type MercadoPagoIntegration = {
  status: ConnectionStatus;
  accountIds: string[];
};

export type MercadoPagoConnection = {
  account_id: string | number;
  connected: boolean;
};

/**
 * Apenas o GET autenticado de contas vinculadas comprova a existência
 * da integração OAuth. App ID/Client Secret cadastrados no backend
 * NÃO equivalem a autorização de uma conta vendedora.
 */
export function deriveMercadoLivreIntegration(
  connections: BackendResult<Account[]>,
  sourceResult: BackendResult<SourceStatus[]>,
): MercadoLivreIntegration {
  if (!connections.ok) {
    return { status: "unavailable", accounts: [], sourcesAvailable: sourceResult.ok, orphanSources: 0 };
  }

  const sources = sourceResult.ok ? sourceResult.data.filter(s => s.provider === "mercado_livre") : [];
  const byKey = new Map(sources.map(source => [source.account_key, source]));
  const accountIds = new Set<number>();
  const accounts: MercadoLivreAccountView[] = [];

  for (const account of connections.data) {
    if (account.connected !== true || !Number.isSafeInteger(account.account_id) ||
        account.account_id <= 0 || accountIds.has(account.account_id)) continue;
    accountIds.add(account.account_id);
    const sourceKey = `ml:${account.account_id}`;
    const source = byKey.get(sourceKey);
    accounts.push({
      accountId: account.account_id,
      nickname: account.nickname?.trim() || `Vendedor ${account.account_id}`,
      expiresAt: account.expires_at || null,
      sourceKey,
      sourceKnown: Boolean(source),
      enabled: source ? source.enabled && source.connected : true,
      lastSyncedAt: source?.last_synced_at || null,
    });
  }

  return {
    status: accounts.length ? "connected" : "not_connected",
    accounts,
    sourcesAvailable: sourceResult.ok,
    orphanSources: sources.filter(s => s.connected && !accountIds.has(Number(s.account_key.replace(/^ml:/, "")))).length,
  };
}

export function deriveMercadoPagoIntegration(
  response: BackendResult<MercadoPagoConnection[]>,
): MercadoPagoIntegration {
  if (!response.ok) return { status: "unavailable", accountIds: [] };
  const accountIds = [...new Set(response.data
    .filter(a => a.connected === true && /^\d{1,20}$/.test(String(a.account_id)))
    .map(a => String(a.account_id)))];
  return { status: accountIds.length ? "connected" : "not_connected", accountIds };
}
