"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ClipboardCopy,
  ExternalLink, KeyRound, ShieldCheck, Store, X, Lightbulb,
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
    text: "Autorize somente os recursos de que o FluxHub precisa (como anúncios e pedidos). Confira se a opção PKCE está ativada ou desativada. Essa configuração precisa estar alinhada à configuração técnica do FluxHub.",
    tip: "Informe ao responsável técnico se o PKCE está ativado ou desativado, para manter a integração compatível.",
    icon: ShieldCheck },
  { name: "Credenciais", title: "Localize o Client ID e o Client Secret",
    text: "Encontre as credenciais do aplicativo na área de configurações do DevCenter. Elas pertencem à plataforma FluxHub, e não a cada cliente.",
    tip: "O Client Secret deve ser configurado uma única vez pelo responsável técnico da plataforma, fora deste assistente. Nunca compartilhe essa credencial.",
    icon: KeyRound },
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
      <BookOpen size={18} aria-hidden="true"/> Configurar <ArrowRight size={16} aria-hidden="true"/>
    </button>
    <dialog ref={dialog} className="fh-wizard" aria-labelledby="ml-wizard-heading"
      aria-describedby="ml-wizard-subtitle" onClick={event => {
        if (event.target === dialog.current) close();
      }}>
      <div className="fh-wizard-inner">
        <header className="fh-wizard-header">
          <span className="fh-wizard-brand" aria-hidden="true"><Image src="/marketplaces/mercado-livre-icon.webp" alt="" width={76} height={76} unoptimized/></span>
          <div className="fh-wizard-header-text">
            <h2 id="ml-wizard-heading">Configurar Mercado Livre</h2>
            <p id="ml-wizard-subtitle">Esta é uma configuração feita apenas uma vez pelo dono da plataforma.</p>
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
            <div className="fh-wizard-mini-browser" role="img"
              aria-label="Ilustração de uma página do DevCenter Mercado Livre com cadastro de aplicativo">
              <div className="fh-wizard-browser-dots" aria-hidden="true">
                <i/><i/><i/>
              </div>
              <div className="fh-wizard-browser-body">
                <div className="fh-wizard-browser-preview">
                  <div className="fh-wizard-browser-marketplace">
                    <Image src="/marketplaces/mercado-livre-icon.webp" alt="" width={92} height={92} unoptimized/>
                    <strong>mercado<br/>livre</strong>
                  </div>
                  <span className="fh-wizard-demo-line wide"/><span className="fh-wizard-demo-line medium"/>
                </div>
                <div className="fh-wizard-browser-form" aria-hidden="true">
                  <span className="fh-wizard-demo-line medium"/><span className="fh-wizard-demo-line short"/>
                  <span className="fh-wizard-demo-input"/><span className="fh-wizard-demo-input"/>
                </div>
              </div>
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
          <div className="fh-wizard-tip"><Lightbulb size={24} aria-hidden="true"/><div>
            <strong>Dica: esta etapa é feita apenas uma vez.</strong><p>{current.tip}</p>
          </div></div>
        </section>
        <footer className="fh-wizard-actions">
          <button type="button" className="fh-wizard-secondary" onClick={() => setStep(n => Math.max(0, n - 1))}
            disabled={step === 0}><ArrowLeft size={17}/> Voltar</button>
          <div className="fh-wizard-actions-right">
            <button className="fh-wizard-next" type="button"
              onClick={() => step === steps.length - 1 ? close() : setStep(n => n + 1)}>
              {step === steps.length - 1 ? "Concluir" : "Próximo passo"}
              {step === steps.length - 1 ? <CheckCircle2 size={18}/> : <ArrowRight size={18}/>}
            </button>
            {"url" in current && <a className="fh-wizard-external" href={current.url} target="_blank"
              rel="noopener noreferrer"><ExternalLink size={17}/> Abrir DevCenter</a>}
          </div>
        </footer>
      </div>
    </dialog>
  </>;
}
