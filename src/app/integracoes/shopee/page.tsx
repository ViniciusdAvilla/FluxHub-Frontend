import Link from "next/link";
import { ArrowLeft, ExternalLink, KeyRound, ShieldCheck, Store, CircleAlert } from "lucide-react";
import ModernShell from "@/components/modern-shell";

export default function ShopeeIntegrationPage() {
  return <ModernShell title="Integração Shopee" eyebrow="Canais de vendas">
    <div className="fh-card fh-shopee-setup">
      <Link href="/integracoes" className="fh-inline-back"><ArrowLeft size={16}/> Voltar às integrações</Link>
      <div className="fh-integration-brand"><span className="fh-integration-provider-icon neutral"><Store size={24}/></span>
        <div><h2>Preparar conexão Shopee</h2>
          <p>Conexão via Shopee Open Platform, com autorização individual de cada vendedor.</p></div>
      </div>
      <p className="fh-notice"><CircleAlert size={17}/> A integração ainda não está operacional. Este assistente não solicita senha, não cria tokens e não envia dados à Shopee.</p>
      <ol className="fh-shopee-steps">
        <li><KeyRound size={20}/><div><strong>1. Credenciamento</strong><p>Cadastre o FluxHub na Shopee Open Platform e solicite acesso de parceiro adequado ao seu caso.</p></div></li>
        <li><ShieldCheck size={20}/><div><strong>2. Permissões por vendedor</strong><p>Defina URL de retorno HTTPS, escopos e credenciais do aplicativo no backend. Cada vendedor precisará consentir com o vínculo.</p></div></li>
        <li><Store size={20}/><div><strong>3. Habilitação segura</strong><p>Após credenciamento, serão implementados callback assinado, refresh de tokens, sincronização paginada e isolamento por empresa.</p></div></li>
      </ol>
      <div className="fh-inline-actions">
        <a className="fh-control" href="https://open.shopee.com/" target="_blank" rel="noopener noreferrer">Abrir Shopee Open Platform <ExternalLink size={16}/></a>
        <Link className="fh-control" href="/integracoes">Voltar</Link>
      </div>
      <p className="fh-profit-hint">Nunca informe o Partner Secret ou a senha de uma loja nesta tela. O botão “Conectar” será liberado somente após o conector oficial ser configurado e testado.</p>
    </div>
  </ModernShell>;
}
