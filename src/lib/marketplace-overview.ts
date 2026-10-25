import "server-only";
import { backendRequest } from "./backend-transport";
import { sellerIdentity, type Account, type SourceStatus } from "./seller-data";
import { deriveMercadoLivreIntegration, type BackendResult } from "./integration-model";

export type MarketplaceProvider = {
  id: string;
  name: string;
  status: "available" | "planned";
  auth_type: string;
  allows_multiple_accounts: boolean;
  features: string[];
};

/** Identificadores suportados pelo catálogo — outras APIs não são autorizadas. */
const PROVIDERS = new Set(["mercado_livre", "mercado_pago", "shopee", "tiktok_shop"]);

async function loadArray<T>(path: string): Promise<BackendResult<T[]>> {
  try {
    const data: unknown = await backendRequest(path);
    return Array.isArray(data) ? { ok: true, data: data as T[] } : { ok: false };
  } catch { return { ok: false }; }
}

export async function getMarketplaceOverview() {
  const [identity, accounts, sources, catalog] = await Promise.all([
    sellerIdentity(),
    loadArray<Account>("/api/v1/connectors/mercado-livre"),
    loadArray<SourceStatus>("/api/v1/connectors"),
    loadArray<MarketplaceProvider>("/api/v1/connectors/catalog"),
  ]);

  const ml = deriveMercadoLivreIntegration(accounts, sources);
  const marketplaces = catalog.ok
    ? catalog.data.filter(p => PROVIDERS.has(p.id) &&
        (p.status === "available" || p.status === "planned"))
    : [
        { id:"mercado_livre",name:"Mercado Livre",status:"available" as const,
          auth_type:"oauth2_authorization_code",allows_multiple_accounts:true,
          features:["seller_profile","listings","orders","visits","sync"] },
        { id:"mercado_pago",name:"Mercado Pago",status:"planned" as const,
          auth_type:"oauth2_authorization_code",allows_multiple_accounts:true,features:[] },
        { id:"shopee",name:"Shopee",status:"planned" as const,
          auth_type:"partner_authorization",allows_multiple_accounts:true,features:[] },
        { id:"tiktok_shop",name:"TikTok Shop",status:"planned" as const,
          auth_type:"partner_authorization",allows_multiple_accounts:true,features:[] },
      ];

  return { isAdmin: Boolean(identity?.is_admin), ml, marketplaces };
}
