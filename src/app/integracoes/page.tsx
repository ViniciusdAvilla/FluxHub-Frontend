import Link from "next/link";
import {
  ArrowRight, CheckCircle2, CircleAlert, Clock3, Database,
  Link2, LockKeyhole, ShoppingBag, ShieldCheck, Wallet,
} from "lucide-react";
import ModernShell from "@/components/modern-shell";
import ConnectMarketplace from "@/components/connect-marketplace";
import SyncAction from "@/components/sync-action";
import IntegrationRefresh from "@/components/integration-refresh";
import ActivateMarketplaceSource from "@/components/activate-marketplace-source";
import { getIntegrationOverview } from "@/lib/integration-overview";
import type { ConnectionStatus } from "@/lib/integration-model";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const errorMessages: Record<string, string> = {
  state: "A tentativa de autorização expirou ou já foi utilizada. Inicie outra autorização pelo botão abaixo.",
  backend: "O frontend não conseguiu acessar o FastAPI. Verifique BACKEND_URL e BACKEND_TOKEN no servidor.",
  exchange: "O backend não conseguiu concluir a autorização com o Mercado Livre. Confira a URL de retorno e os registros privados da API.",
  invalid: "O retorno do Mercado Livre não trouxe os dados de autorização esperados. Tente novamente.",
  unknown: "A autorização não foi concluída. Confira o serviço FastAPI e tente novamente.",
};

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const label = status === "connected" ? "Conta vinculada"
    : status === "not_connected" ? "Aguardando autorização" : "Não foi possível verificar";
  return <span className={`fh-pill ${status === "connected" ? "" : status === "not_connected" ? "neutral" : "offline"}`}>
    {status === "connected" ? <CheckCircle2 size={13}/> : <CircleAlert size={13}/>}
    {label}
  </span>;
}

function formatSync(value: string | null | undefined) {
  if (!value) return "Primeira sincronização pendente";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function Integrations({
  searchParams,
}: {
  searchParams: Promise<{ ml?: string; ml_reason?: string }>;
}) {
  const [overview, query] = await Promise.all([getIntegrationOverview(), searchParams]);
  const { mercadoLivre: ml, mercadoPago: mp, sources } = overview;
  const errorMessage = errorMessages[query.ml_reason || "unknown"] || errorMessages.unknown;

  return <ModernShell title="Integrações" eyebrow="Mercado Livre e fontes de dados"
    isAdmin={overview.isAdmin} action={<IntegrationRefresh/>}>
    <section className="fh-integration-intro">
      <div className="fh-integration-intro-icon"><Link2 size={22}/></div>
      <div>
        <span className="fh-integration-eyebrow">Integração gerenciada pelo seu backend</span>
        <h2>Seu Mercado Livre no FluxHub</h2>
        <p>O aplicativo, as credenciais e o callback ficam no FastAPI. O painel consulta as contas vinculadas e traz os dados reais do PostgreSQL, sem solicitar tokens ou chaves novamente.</p>
      </div>
    </section>

    {query.ml === "connected" && ml.status === "connected" &&
      <div className="fh-notice success" role="status"><CheckCircle2 size={16}/>Autorização concluída. A conta foi encontrada no backend. Sincronize os dados para atualizar o painel.</div>}
    {query.ml === "connected" && ml.status !== "connected" &&
      <div className="fh-notice error" role="alert"><CircleAlert size={16}/>A autorização retornou, mas a conta não pôde ser confirmada no backend. Verifique a conexão e atualize a tela.</div>}
    {query.ml === "error" &&
      <div className="fh-notice error" role="alert"><CircleAlert size={16}/>{errorMessage}</div>}
    {query.ml === "cancelled" &&
      <div className="fh-notice" role="status">A autorização foi cancelada. Nenhuma nova conta foi vinculada nessa tentativa.</div>}

    <div className="fh-integrations-layout">
      <section className="fh-card fh-integration-main" aria-label="Integração Mercado Livre">
        <div className="fh-card-head fh-integration-header">
          <div className="fh-integration-brand">
            <span className="fh-integration-provider-icon"><ShoppingBag size={21}/></span>
            <div><h2>Mercado Livre</h2><p>Vendedores, anúncios, pedidos e sincronização</p></div>
          </div>
          <ConnectionBadge status={ml.status}/>
        </div>

        {ml.status === "unavailable" && <div className="fh-integration-empty">
          <CircleAlert size={25}/>
          <h3>Não conseguimos consultar as contas vinculadas</h3>
          <p>O FastAPI pode estar indisponível ou a sessão não está autorizada. Não é possível afirmar que a conta está desconectada.</p>
          <IntegrationRefresh/>
        </div>}

        {ml.status === "not_connected" && <div className="fh-integration-empty">
          <Link2 size={27}/>
          <h3>Aplicativo pronto para autorizar sua conta</h3>
          <p>Os dados do aplicativo ficam no backend. Para ter acesso aos anúncios e pedidos de um vendedor, é necessário conceder acesso uma única vez no Mercado Livre.</p>
          <ConnectMarketplace provider="mercado-livre"/>
          {ml.orphanSources > 0 && <p className="fh-integration-subtle">O backend possui fontes antigas, mas não retornou uma conta OAuth vinculada. Refaça a autorização pelo botão acima.</p>}
        </div>}

        {ml.status === "connected" && <div className="fh-integration-accounts">
          <div className="fh-integration-summary">
            <CheckCircle2 size={19}/>
            <div><strong>{ml.accounts.length} {ml.accounts.length === 1 ? "conta encontrada" : "contas encontradas"} no backend</strong>
              <span>A conexão já está cadastrada. Não é necessário inserir Client ID nem Client Secret no frontend.</span>
            </div>
          </div>

          {!ml.sourcesAvailable && <div className="fh-notice error">
            Os vendedores foram encontrados, mas o backend não respondeu à consulta de fontes e sincronização.
          </div>}

          {ml.accounts.map(account => <article key={account.accountId} className="fh-integration-account">
            <div className="fh-integration-account-top">
              <div className="fh-integration-avatar"><ShoppingBag size={20}/></div>
              <div className="fh-integration-account-name">
                <h3>{account.nickname}</h3>
                <span>Seller ID: {account.accountId}</span>
              </div>
              <span className={`fh-pill ${account.enabled ? "" : "offline"}`}>
                {account.enabled ? "Vinculada" : "Fonte pausada"}
              </span>
            </div>

            <div className="fh-integration-details">
              <div><span>Dados</span><strong>{!account.sourceKnown ? "Aguardando primeiro registro" : account.enabled ? "Fonte ativa" : "Fonte desativada"}</strong></div>
              <div><span>Última importação</span><strong>{formatSync(account.lastSyncedAt)}</strong></div>
            </div>

            {!account.enabled && <div className="fh-notice">
              Esta conta está salva no backend, mas sua fonte de dados não está ativa.
              {account.canReactivate ? <ActivateMarketplaceSource accountKey={account.sourceKey}/> :
                <span> Reautorize a conta para restaurar sua fonte.</span>}
            </div>}

            {account.enabled && <div className="fh-integration-account-actions">
              <SyncAction accountId={account.accountId}
                auto={ml.sourcesAvailable && !account.lastSyncedAt}/>
              <nav className="fh-integration-links" aria-label={`Dados do vendedor ${account.accountId}`}>
                <Link href={`/?account=${account.accountId}`}>Dashboard <ArrowRight size={14}/></Link>
                <Link href="/produtos">Produtos <ArrowRight size={14}/></Link>
                <Link href={`/pedidos?account=${account.accountId}`}>Pedidos <ArrowRight size={14}/></Link>
              </nav>
            </div>}
          </article>)}

          <div className="fh-integration-add">
            <span>Deseja vincular outro vendedor?</span>
            <ConnectMarketplace provider="mercado-livre" connected/>
          </div>
        </div>}
      </section>

      <aside className="fh-integration-aside">
        <section className="fh-card">
          <div className="fh-integration-brand">
            <span className="fh-integration-provider-icon secondary"><Wallet size={19}/></span>
            <div><h2>Mercado Pago</h2><p>Integração opcional de pagamentos</p></div>
          </div>
          <div className="fh-integration-aside-status"><ConnectionBadge status={mp.status}/></div>
          {mp.status === "connected" &&
            <p className="fh-integration-subtle">{mp.accountIds.length} {mp.accountIds.length===1?"conta vinculada":"contas vinculadas"} no backend.</p>}
          {mp.status === "not_connected" &&
            <p className="fh-integration-subtle">Nenhuma conta de pagamentos vinculada. Não interfere na integração do Mercado Livre.</p>}
          {mp.status === "unavailable" &&
            <p className="fh-integration-subtle">O status do Mercado Pago não pôde ser consultado.</p>}
          {mp.status !== "unavailable" && <ConnectMarketplace provider="mercado-pago" connected={mp.status === "connected"}/>}
        </section>

        <section className="fh-card">
          <div className="fh-integration-brand">
            <span className="fh-integration-provider-icon neutral"><LockKeyhole size={18}/></span>
            <div><h2>Segurança</h2><p>Configuração protegida no FastAPI</p></div>
          </div>
          <div className="fh-integration-security">
            <p><ShieldCheck size={16}/>Tokens armazenados e renovados pelo backend.</p>
            <p><Database size={16}/>Dados reais carregados da API e do PostgreSQL.</p>
            <p><Clock3 size={16}/>Sincronização iniciada após encontrar o vendedor.</p>
          </div>
        </section>
      </aside>
    </div>

    <section className="fh-card fh-integration-sources">
      <div className="fh-card-head">
        <div><h2>Fontes reconhecidas pelo backend</h2>
          <p>Informações persistidas da empresa autenticada. Sem dados demonstrativos.</p>
        </div>
      </div>
      {sources === null ? <div className="fh-notice error" role="status">
        Não foi possível ler o estado das fontes no FastAPI. Tente atualizar a conexão.
      </div> : sources.length === 0 ? <div className="fh-integration-no-sources">
        Nenhuma fonte foi registrada ainda. Depois de autorizar um vendedor, ela aparecerá aqui.
      </div> : <div className="fh-table-wrap">
        <table className="fh-table">
          <thead><tr><th>Provedor</th><th>Conta</th><th>Status</th><th>Última sincronização</th></tr></thead>
          <tbody>{sources.map(source => <tr key={source.provider + source.account_key}>
            <td><strong>{source.provider === "mercado_livre" ? "Mercado Livre" : source.provider === "mercado_pago" ? "Mercado Pago" : source.provider}</strong></td>
            <td>{source.display_name || source.account_key}</td>
            <td><span className={`fh-pill ${source.connected && source.enabled ? "" : "offline"}`}>
              {source.connected && source.enabled ? "Ativa" : source.connected ? "Pausada" : "Sem vínculo"}
            </span></td>
            <td>{source.last_synced_at ? formatSync(source.last_synced_at) : "Ainda não sincronizada"}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </ModernShell>;
}
