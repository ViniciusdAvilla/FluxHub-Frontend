export type MarketplaceProvider = "mercado-livre" | "mercado-pago";

const ML_CALLBACK = "https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback";
const AUTH_HOST: Record<MarketplaceProvider, string> = {
  "mercado-livre": "auth.mercadolivre.com.br",
  "mercado-pago": "auth.mercadopago.com",
};

/**
 * Recebe apenas a URL emitida pelo FastAPI. Nunca cria client_id,
 * client_secret, state ou token no Next.js.
 */
export function validateAuthorizationUrl(provider: MarketplaceProvider, value: unknown): string {
  if (typeof value !== "string") throw new Error("O backend não forneceu uma URL de autorização.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("A URL de autorização do backend é inválida."); }
  if (url.protocol !== "https:" || url.username || url.password ||
      url.hostname !== AUTH_HOST[provider] || url.pathname !== "/authorization" ||
      url.port || url.hash)
    throw new Error("O backend retornou um endereço diferente do provedor oficial.");

  if (url.searchParams.get("response_type") !== "code" ||
      !/^\d{5,25}$/.test(url.searchParams.get("client_id") || "") ||
      !/^[a-zA-Z0-9_-]{16,200}$/.test(url.searchParams.get("state") || ""))
    throw new Error("A autorização gerada pelo backend está incompleta.");

  // Verificação preventiva do callback: erro conhecido de redirect_uri divergente.
  if (provider === "mercado-livre" &&
      url.searchParams.get("redirect_uri") !== ML_CALLBACK)
    throw new Error("O callback do FastAPI não corresponde ao endereço cadastrado para o FluxHub: https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback.");

  return url.toString();
}
