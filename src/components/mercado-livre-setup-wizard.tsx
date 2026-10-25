"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardCopy,
  ExternalLink, KeyRound, LockKeyhole, ShieldCheck, Store, X,
} from "lucide-react";

const CALLBACK = "https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback";
const DEVCENTER = "https://developers.mercadolivre.com.br/devcenter";

const steps = [
  { name: "DevCenter", title: "Acesse o DevCenter do Mercado Livre",
    text: "Entre no site oficial com a conta responsável pelo aplicativo do FluxHub. Esta configuração é feita somente uma vez pelo dono da plataforma.",
    tip: "Os seus clientes não precisam entrar no DevCenter.",
    action: "Abrir DevCenter", url: DEVCENTER, icon: BookOpen },
  { name: "Aplicativo", title: "Crie ou abra o aplicativo FluxHub",
    text: "No DevCenter, entre em Minhas aplicações. Se o FluxHub já estiver cadastrado, abra para editar. Caso contrário, selecione Criar uma aplicação e informe os dados solicitados.",
    tip: "Você precisa de apenas um aplicativo para todos os vendedores do FluxHub.",
    icon: Store },
  { name: "Callback", title: "Configure a URL de retorno",
    text: "Localize a área de Autenticação e segurança e informe exatamente o endereço abaixo no campo de Redirect URI. Salve no DevCenter.",
    tip: "O endereço de notificações/webhooks é separado. Não use o callback OAuth para notificações.",
    icon: ClipboardCopy },
  { name: "PKCE", title: "Confira as permissões e o PKCE",
    text: "Autorize somente os recursos de que o FluxHub precisa (como anúncios e pedidos). Veja se o PKCE está ativado ou desativado: o backend deve usar a mesma opção.",
    tip: "Se o PKCE estiver ativo, configure MERCADO_LIVRE_PKCE_ENABLED=true no backend. Se estiver desligado, use false.",
    icon: ShieldCheck },
  { name: "Credenciais", title: "Localize o Client ID e o Client Secret",
    text: "Encontre as credenciais do aplicativo na área de configurações do DevCenter. Elas pertencem à plataforma FluxHub, e não a cada cliente.",
    tip: "Nunca coloque Client Secret no frontend, em mensagens, prints ou no GitHub.",
    icon: KeyRound },
  { name: "Backend", title: "Configure as credenciais privadas na VPS",
    text: "No servidor, configure MERCADO_LIVRE_CLIENT_ID, MERCADO_LIVRE_CLIENT_SECRET, MERCADO_LIVRE_REDIRECT_URI e MERCADO_LIVRE_PKCE_ENABLED no ambiente privado do FastAPI. Depois reinicie o backend.",
    tip: "O FluxHub não pede nem armazena suas credenciais do aplicativo neste assistente. A configuração é feita diretamente no servidor.",
    icon: LockKeyhole },
  { name: "Teste", title: "Conecte o primeiro vendedor",
    text: "Feche este assistente e clique em Conectar Mercado Livre. Entre na conta oficial do vendedor, autorize e confirme que a loja aparece como vinculada.",
    tip: "Após a autorização, o FluxHub mostrará o nome e, se disponível pela API oficial, a foto do vendedor.",
    icon: CheckCircle2 },
] as const;

/** Native dialog supplies focus trapping, ESC-close and focus restoration. */
export default function MercadoLivreSetupWizard() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = steps[step];
  const Icon = current.icon;

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function open() {
    setStep(0);
    dialog.current?.showModal();
  }
  function close() {
    dialog.current?.close();
  }
  async function copyCallback() {
    try {
      await navigator.clipboard.writeText(CALLBACK);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return <>
    <button className="fh-primary-btn fh-setup-launch" type="button" onClick={open}>
      <BookOpen size={18} aria-hidden="true"/> Configurar Mercado Livre <ArrowRight size={16} aria-hidden="true"/>
    </button>
    <dialog ref={dialog} className="fh-wizard" aria-labelledby="ml-wizard-heading"
      aria-describedby="ml-wizard-subtitle" onClick={event => {
        if (event.target === dialog.current) close();
      }}>
      <div className="fh-wizard-inner">
        <header className="fh-wizard-header">
          <span className="fh-wizard-brand" aria-hidden="true"><Store size={28}/></span>
          <div className="fh-wizard-header-text">
            <h2 id="ml-wizard-heading">Configurar Mercado Livre</h2>
            <p id="ml-wizard-subtitle">Assistente exclusivo do Administrador Master — configuração única.</p>
          </div>
          <button type="button" className="fh-wizard-close" onClick={close} aria-label="Fechar assistente"><X size={22}/></button>
        </header>
        <nav className="fh-wizard-progress" aria-label="Etapas de configuração">
          {steps.map((item, i) => <button key={item.name} type="button"
            aria-current={i === step ? "step" : undefined}
            aria-label={`Etapa ${i + 1}: ${item.name}`}
            className={`fh-wizard-step ${i === step ? "current" : i < step ? "done" : ""}`}
            onClick={() => { if (i <= step) setStep(i); }}
            disabled={i > step}>
            <span className="fh-wizard-step-number">{i < step ? <CheckCircle2 size={17}/> : i + 1}</span>
            <span>{item.name}</span>
          </button>)}
        </nav>
        <section className="fh-wizard-panel" aria-live="polite">
          <div className="fh-wizard-panel-head">
            <span className="fh-wizard-index">{step + 1}</span>
            <div>
              <span className="fh-wizard-eyebrow">ETAPA {step + 1} DE {steps.length}</span>
              <h3>{current.title}</h3>
            </div>
          </div>
          <p className="fh-wizard-description">{current.text}</p>
          {step === 0 && <div className="fh-wizard-illustration">
            <div className="fh-wizard-mini-browser">
              <span className="fh-wizard-browser-dots">● ● ●</span>
              <strong>mercado livre</strong>
              <span>DevCenter • Minhas aplicações</span>
            </div>
          </div>}
          {step === 2 && <div className="fh-wizard-copy">
            <code>{CALLBACK}</code>
            <button type="button" onClick={() => void copyCallback()} aria-label="Copiar URL de callback">
              <ClipboardCopy size={17}/> {copied ? "Copiado!" : "Copiar URL"}
            </button>
          </div>}
          {step === 3 && <div className="fh-wizard-help-choice">
            <strong>PKCE no DevCenter</strong>
            <p>Ativado no aplicativo → <code>true</code> no backend. Desativado → <code>false</code>.</p>
          </div>}
          {step === 5 && <div className="fh-wizard-code">
            <code>MERCADO_LIVRE_CLIENT_ID</code>
            <code>MERCADO_LIVRE_CLIENT_SECRET</code>
            <code>MERCADO_LIVRE_REDIRECT_URI</code>
            <code>MERCADO_LIVRE_PKCE_ENABLED</code>
          </div>}
          <div className="fh-wizard-tip"><ShieldCheck size={21} aria-hidden="true"/><div>
            <strong>Dica importante</strong><p>{current.tip}</p>
          </div></div>
        </section>
        <footer className="fh-wizard-actions">
          <button type="button" className="fh-wizard-secondary" onClick={() => setStep(n => Math.max(0, n - 1))}
            disabled={step === 0}><ArrowLeft size={17}/> Voltar</button>
          <div className="fh-wizard-actions-right">
            {"url" in current && <a className="fh-wizard-external" href={current.url} target="_blank"
              rel="noopener noreferrer"><ExternalLink size={17}/> Abrir DevCenter</a>}
            <button className="fh-wizard-next" type="button"
              onClick={() => step === steps.length - 1 ? close() : setStep(n => n + 1)}>
              {step === steps.length - 1 ? "Concluir" : "Próximo passo"}
              {step === steps.length - 1 ? <CheckCircle2 size={18}/> : <ArrowRight size={18}/>}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  </>;
}
