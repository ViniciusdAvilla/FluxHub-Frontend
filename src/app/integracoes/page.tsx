import Link from "next/link";
import {
  ArrowRight, CheckCircle2, CircleAlert, Database, LockKeyhole,
  Package, ShoppingBag, ShoppingCart, ShieldCheck, RefreshCw,
} from "lucide-react";
import ModernShell from "@/components/modern-shell";
import SyncAction from "@/components/sync-action";
import IntegrationRefresh from "@/components/integration-refresh";
import { getIntegrationOverview } from "@/lib/integration-overview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function lastSync(value: string | null) {
  if (!value) return "Ainda não sincronizada";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data não informada"
    : date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function MercadoLivrePage() {
  const data = await getIntegrationOverview();
  const { seller, profileState, sourcesAvailable } = data;
  const account = seller.kind === "ready" ? seller.account : null;
  const verified = Boolean(account && profileState === "valid");
  const sourceReady = Boolean(account?.sourceKnown && account.enabled && account.sourceConnected === true);

  return <ModernShell title="Mercado Livre" eyebrow="Dados do backend"
    isAdmin={data.isAdmin} action={<IntegrationRefresh/>}>
    <section className="fh-integration-intro">
      <div className="fh-integration-intro-icon"><ShoppingBag size={24}/></div>
      <div>
        <span className="fh-integration-eyebrow">Uma única conexão · Mercado Livre</span>
        <h2>Os dados da sua conta, direto do backend</h2>
        <p>Sem configurar Client ID, Client Secret, callback ou tokens nesta tela.
          O FluxHub consulta os dados oficiais armazenados no FastAPI e no PostgreSQL.</p>
      </div>
    </section>

    <section className="fh-card fh-integration-main">
      <div className="fh-card-head fh-integration-header">
        <div className="fh-integration-brand">
          <span className="fh-integration-provider-icon"><ShoppingBag size={21}/></span>
          <div><h2>Mercado Livre</h2><p>Fonte exclusiva deste painel</p></div>
        </div>
        <span className={`fh-pill ${verified ? "" : "offline"}`}>
          {verified ? <CheckCircle2 size={14}/> : <CircleAlert size={14}/>}
          {verified ? "API validada" : account ? "Acesso não validado" : "Aguardando backend"}
        </span>
      </div>

      {seller.kind === "unavailable" && <div className="fh-integration-empty" role="status">
        <CircleAlert size={27}/>
        <h3>Não foi possível consultar o FastAPI</h3>
        <p>A consulta às contas Mercado Livre falhou. Verifique se o backend está no ar,
          se BACKEND_URL e BACKEND_TOKEN estão configurados no Next.js e se a sessão FluxHub é válida.</p>
        <IntegrationRefresh/>
      </div>}

      {seller.kind === "not_linked" && <div className="fh-integration-empty" role="status">
        <Database size={27}/>
        <h3>O backend ainda não retornou uma conta de vendedor autorizada</h3>
        <p>O aplicativo Mercado Livre está configurado no servidor, mas o Client ID e o
          Client Secret não dão acesso privado aos anúncios e pedidos. Para importar dados,
          o FastAPI precisa ter um access token e um refresh token válidos de uma autorização anterior.</p>
        <p>Este frontend não oferece login nem uma nova conexão com o Mercado Livre.
          Depois que a conta estiver cadastrada no backend, ela aparecerá automaticamente aqui.</p>
        <IntegrationRefresh/>
      </div>}

      {seller.kind === "multiple" && <div className="fh-integration-empty" role="alert">
        <CircleAlert size={27}/>
        <h3>Há mais de um vendedor no backend</h3>
        <p>O FastAPI devolveu {seller.count} contas autorizadas. Não é seguro escolher uma
          delas pelo Client ID do aplicativo, pois ele não identifica o vendedor.
          Configure somente a conta desejada no backend para manter uma fonte única neste painel.</p>
      </div>}

      {account && <div className="fh-integration-accounts">
        <div className="fh-integration-summary">
          <CheckCircle2 size={19}/>
          <div><strong>Conta vendedora encontrada no FastAPI</strong>
            <span>Os dados de autorização permanecem no backend. Nenhum novo login no Mercado Livre foi solicitado.</span>
          </div>
        </div>
        <article className="fh-integration-account">
          <div className="fh-integration-account-top">
            <div className="fh-integration-avatar"><ShoppingBag size={19}/></div>
            <div className="fh-integration-account-name">
              <h3>{data.liveNickname || account.nickname}</h3>
              <span>Seller ID: {account.accountId}</span>
            </div>
            <span className={`fh-pill ${verified ? "" : "offline"}`}>
              {verified ? "Token funcionando" : "Verificação pendente"}
            </span>
          </div>
          <div className="fh-integration-details fh-ml-details">
            <div><span>Perfil Mercado Livre</span><strong>{verified ? "Consulta realizada com sucesso" : "Não foi possível consultar /users/me"}</strong></div>
            <div><span>Última importação</span><strong>{lastSync(account.lastSyncedAt)}</strong></div>
            <div><span>Produtos já armazenados</span><strong>{data.productCount ?? "Indisponível"}</strong></div>
            <div><span>Pedidos recentes armazenados</span><strong>{data.recentOrderCount ?? "Indisponível"}{data.recentOrderCount === 100 ? " (até 100)" : ""}</strong></div>
          </div>
          {!verified && <div className="fh-notice error" role="status">
            <CircleAlert size={16}/> A conta está registrada, mas o FastAPI não conseguiu
            confirmar o acesso atual ao Mercado Livre. Se o refresh token estiver expirado
            ou revogado, o frontend não consegue substituí-lo usando apenas as credenciais do aplicativo.
          </div>}
          {!sourcesAvailable && <div className="fh-notice error" role="status">
            Não foi possível consultar o estado da sincronização no backend.
          </div>}
          {account.sourceKnown && !account.enabled && <div className="fh-notice" role="status">
            A fonte desta conta está pausada ou desconectada no backend.
            A importação automática permanece desativada.
          </div>}
          {!account.sourceKnown && <div className="fh-notice" role="status">
            O vendedor está registrado, mas não há uma fonte de sincronização correspondente no FastAPI.
          </div>}
          <div className="fh-integration-account-actions">
            {sourceReady && verified && <SyncAction accountId={account.accountId}
              auto={!account.lastSyncedAt}/>}
            <nav className="fh-integration-links" aria-label="Ver dados da conta">
              <Link href={`/?account=${account.accountId}`}>Dashboard <ArrowRight size={14}/></Link>
              <Link href="/produtos">Produtos <ArrowRight size={14}/></Link>
              <Link href={`/pedidos?account=${account.accountId}`}>Pedidos <ArrowRight size={14}/></Link>
            </nav>
          </div>
        </article>
      </div>}
    </section>

    <section className="fh-card fh-ml-backend-only">
      <div className="fh-integration-brand">
        <span className="fh-integration-provider-icon neutral"><LockKeyhole size={18}/></span>
        <div><h2>Credenciais e renovação: somente no backend</h2>
          <p>O frontend recebe dados da sua API privada, nunca o Client Secret ou os tokens.</p>
        </div>
      </div>
      <div className="fh-integration-security">
        <p><ShieldCheck size={16}/>Se já houver autorização válida, o FastAPI renova o token e reutiliza a conta automaticamente.</p>
        <p><Database size={16}/>Produtos, pedidos e dados da dashboard vêm de consultas reais ao backend.</p>
        <p><RefreshCw size={16}/>Use “Verificar conexão” ou “Atualizar dados” para buscar os registros mais recentes.</p>
      </div>
    </section>
  </ModernShell>;
}
