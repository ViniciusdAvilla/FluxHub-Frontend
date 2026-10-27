import Link from "next/link";
import Image from "next/image";
import MercadoLivreSetupWizard from "@/components/mercado-livre-setup-wizard";
import MercadoLivreIdentity from "@/components/mercado-livre-identity";
import {
  ArrowRight, CheckCircle2, CircleAlert, Database, LockKeyhole,
  ShoppingBag, ShieldCheck, RefreshCw, Layers3,
} from "lucide-react";
import ModernShell from "@/components/modern-shell";
import SyncAction from "@/components/sync-action";
import IntegrationRefresh from "@/components/integration-refresh";
import MarketplaceConnectionActions from "@/components/marketplace-connection-actions";
import { getMarketplaceOverview } from "@/lib/marketplace-overview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function lastSync(value: string | null) {
  if (!value) return "Aguardando primeira sincronização";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

type Params = { ml?: string; ml_reason?: string };
export default async function IntegracoesPage({
  searchParams,
}: { searchParams?: Promise<Params> }) {
  const [data, params] = await Promise.all([
    getMarketplaceOverview(), searchParams ?? Promise.resolve({} as Params),
  ]);
  const { ml, marketplaces } = data;
  const ready = ml.status !== "unavailable";
  const connected = ml.accounts.length;

  return <ModernShell title="Integrações" eyebrow="FluxHub SaaS"
    isAdmin={data.isAdmin} action={<IntegrationRefresh/>}>

    <section className="fh-integration-intro">
      <div className="fh-integration-intro-icon"><Layers3 size={24}/></div>
      <div>
        <span className="fh-integration-eyebrow">Central de marketplaces · Multi-conta</span>
        <h2>Conecte o FluxHub aos seus canais</h2>
        <p>Conecte o Mercado Livre para gerenciar sua operação e sincronizar vendas, produtos e pedidos. Os dados de cada vendedor ficam separados.</p>
      </div>
    </section>

    {params.ml === "connected" && <div className="fh-notice" role="status">
      <CheckCircle2 size={18}/> Mercado Livre autorizado com sucesso.
      Sua conta já pode aparecer abaixo; inicie a sincronização quando desejar.
    </div>}
    {params.ml === "cancelled" && <div className="fh-notice" role="status">
      A autorização foi cancelada. Seus dados existentes foram preservados.
    </div>}
    {params.ml === "error" && <div className="fh-notice error" role="alert">
      <CircleAlert size={18}/> Não foi possível concluir a autorização.
      {params.ml_reason === "state"
        ? " O link expirou ou já foi usado. Inicie uma nova conexão."
        : params.ml_reason === "backend"
        ? " Verifique se o FastAPI e o token de serviço estão configurados."
        : " Confira o aplicativo no Mercado Livre e tente novamente."}
    </div>}


    <section className="fh-card fh-integration-main">
      <div className="fh-card-head fh-integration-header">
        <div className="fh-integration-brand">
          <span className="fh-integration-provider-icon fh-ml-brand-logo"><Image
            src="/marketplaces/mercado-livre-icon.webp" width={66} height={66} alt="" unoptimized /></span>
          <div>
            <h2>Mercado Livre</h2>
            <p>Vendas, produtos e pedidos da sua loja em um só lugar.</p>
          </div>
        </div>
        <span className={`fh-pill ${connected ? "" : "offline"}`}>
          {connected ? <CheckCircle2 size={14}/> : <CircleAlert size={14}/>}
          {connected ? `${connected} conta(s) vinculada(s)` : "Não conectado"}
        </span>
      </div>
      {data.isAdmin && <div className="fh-ml-setup-trigger">
        <span>
          <strong>Configuração inicial da plataforma</strong>
          <small>Abra o guia visual do Mercado Livre com seis etapas, uma por vez.</small>
        </span>
        <MercadoLivreSetupWizard />
      </div>}

      {!ready && <div className="fh-integration-empty" role="status">
        <CircleAlert size={26}/>
        <h3>Não foi possível consultar suas integrações</h3>
        <p>Verifique a sessão FluxHub e se o FastAPI está acessível.
          BACKEND_TOKEN precisa ser o mesmo no Next.js e no FastAPI.</p>
        <IntegrationRefresh/>
      </div>}

      {ready && connected === 0 && <div className="fh-integration-empty">
        <ShoppingBag size={28}/>
        <h3>Conecte seu primeiro vendedor</h3>
        <p>Não é necessário copiar tokens, abrir terminal ou configurar aplicativos
          na conta de cada cliente. Entre no Mercado Livre, confirme as permissões
          e volte automaticamente ao FluxHub.</p>
        <MarketplaceConnectionActions/>
      </div>}

      {ready && connected > 0 && <div className="fh-integration-accounts">
        <div className="fh-integration-summary">
          <CheckCircle2 size={20}/>
          <div><strong>Suas contas Mercado Livre</strong>
            <span>Cada vendedor fica isolado na sua conta FluxHub.</span>
          </div>
        </div>
        {ml.accounts.map(account =>
          <article key={account.accountId} className="fh-integration-account">
            <div className="fh-integration-account-top">
              <div className="fh-integration-account-name">
                <MercadoLivreIdentity accountId={account.accountId} fallbackName={account.nickname} variant="card"/>
                <span className="fh-ml-account-id">Seller ID: {account.accountId}</span>
              </div>
              <span className={`fh-pill ${account.enabled ? "" : "offline"}`}>
                {account.enabled ? "Autorizada" : "Sincronização pausada"}
              </span>
            </div>
            <div className="fh-integration-details fh-ml-details">
              <div><span>Autorização OAuth</span><strong>Salva no FastAPI</strong></div>
              <div><span>Última sincronização</span><strong>{lastSync(account.lastSyncedAt)}</strong></div>
              <div><span>Status da fonte</span><strong>
                {account.sourceKnown
                  ? account.sourceConnected && account.enabled ? "Ativa" : "Pausada"
                  : "Pendente de configuração"}
              </strong></div>
            </div>
            {!account.sourceKnown && <p className="fh-notice" role="status">
              O backend ainda não retornou uma fonte de sincronização para esta conta.
            </p>}
            <div className="fh-integration-account-actions">
              {account.sourceKnown && account.sourceConnected && account.enabled &&
                <SyncAction accountId={account.accountId}/>}
              <nav className="fh-integration-links" aria-label={`Dados de ${account.nickname}`}>
                <Link href={`/?account=${account.accountId}`}>Dashboard <ArrowRight size={14}/></Link>
                <Link href={`/pedidos?account=${account.accountId}`}>Pedidos <ArrowRight size={14}/></Link>
                <Link href="/produtos">Produtos <ArrowRight size={14}/></Link>
              </nav>
              <MarketplaceConnectionActions accountId={account.accountId}/>
            </div>
          </article>
        )}
        <div className="fh-integration-account-actions">
          <MarketplaceConnectionActions/>
          <p>Você pode conectar outro vendedor sem remover os anteriores.</p>
        </div>
      </div>}
    </section>

    <section className="fh-card fh-integration-main fh-other-marketplaces">
      <div className="fh-card-head">
        <div className="fh-integration-brand">
          <span className="fh-integration-provider-icon neutral"><Layers3 size={20}/></span>
          <div><h2>Outros marketplaces</h2>
            <p>Mercado Pago, Shopee e TikTok Shop em preparação.</p></div>
        </div>
      </div>
      <div className="fh-marketplace-catalog">
        {marketplaces.filter(provider => provider.id !== "mercado_livre" && provider.status === "planned").map(provider => {
          const logos: Record<string, string> = {
            mercado_pago: "/marketplaces/mercado-pago.webp",
            shopee: "/marketplaces/shopee.webp",
            tiktok_shop: "/marketplaces/tiktok-shop.webp",
          };
          const logo = logos[provider.id];
          return <article className="fh-marketplace-provider" key={provider.id}>
            <span className="fh-pill offline">Em breve</span>
            <div className="fh-marketplace-provider-content">
              {logo
                ? <div className="fh-marketplace-logo"><Image src={logo} alt={`Logo ${provider.name}`} width={144} height={132} unoptimized /></div>
                : <span className="fh-integration-provider-icon neutral"><ShoppingBag size={34}/></span>}
              <h3>{provider.name}</h3>
              <p>Conector em preparação</p>
            </div>
          </article>;
        })}
      </div>
    </section>

    <section className="fh-card fh-ml-backend-only">
      <div className="fh-integration-brand">
        <span className="fh-integration-provider-icon neutral"><LockKeyhole size={18}/></span>
        <div><h2>Seus dados protegidos</h2><p>As senhas do Mercado Livre nunca passam pelo FluxHub.</p></div>
      </div>
      <div className="fh-integration-security">
        <p><ShieldCheck size={16}/>O login acontece no site oficial. Os tokens ficam criptografados no PostgreSQL.</p>
        <p><Database size={16}/>Anúncios e pedidos são consultados por vendedor e por usuário do SaaS.</p>
        <p><RefreshCw size={16}/>O backend renova o acesso automaticamente enquanto o grant for válido.</p>
      </div>
    </section>
  </ModernShell>;
}
