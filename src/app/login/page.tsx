"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, BarChart3, Box, Check, Eye, EyeOff, LayoutDashboard, LockKeyhole, Mail, Package, Search, Settings, ShieldCheck, ShoppingBag, TrendingUp } from "lucide-react";
import FluxHubLogo from "@/components/fluxhub-logo";

const REMEMBER_EMAIL_KEY = "fluxhub.rememberedEmail";

function LoginBackdrop() {
  return (
    <div className="login-scene" aria-hidden="true">
      <div className="login-scene-shell">
        <aside className="login-scene-sidebar">
          <FluxHubLogo className="scene-logo" />
          <div className="scene-nav active"><LayoutDashboard size={19} /> Dashboard</div>
          <div className="scene-nav"><ShoppingBag size={19} /> Vendas</div>
          <div className="scene-nav"><Package size={19} /> Anúncios</div>
          <div className="scene-nav"><Box size={19} /> Produtos</div>
          <div className="scene-nav"><Settings size={19} /> Integrações</div>
        </aside>
        <div className="login-scene-main">
          <div className="scene-toolbar"><Search size={19} /><span>Buscar em sua operação...</span></div>
          <div className="scene-metrics">
            {["Faturamento", "Lucro estimado", "Pedidos", "Produtos"].map((label) => (
              <div className="scene-tile" key={label}>
                <span>{label}</span><div className="scene-value-placeholder" /><span className="scene-up"><TrendingUp size={14} /> Indicadores</span>
              </div>
            ))}
          </div>
          <div className="scene-content">
            <section className="scene-chart">
              <h2>Resumo de vendas</h2>
              <div className="scene-chart-area">
                <div className="scene-grid-lines"><i/><i/><i/><i/></div>
                <svg viewBox="0 0 600 180" preserveAspectRatio="none">
                  <polyline points="0,134 60,130 120,124 180,129 240,101 300,89 360,95 420,64 480,75 540,39 600,26" fill="none" stroke="#7044d7" strokeWidth="4" />
                  <polyline points="0,157 60,160 120,145 180,150 240,133 300,141 360,118 420,125 480,102 540,110 600,83" fill="none" stroke="#09a9b6" strokeWidth="4" />
                </svg>
              </div>
            </section>
            <section className="scene-integrations">
              <h2>Integrações</h2>
              <div className="scene-integration"><span className="scene-source-icon">M</span><span>Marketplaces</span><i /></div>
              <div className="scene-integration"><span className="scene-source-icon">↗</span><span>Sincronização</span><i /></div>
              <div className="scene-integration"><span className="scene-source-icon"><BarChart3 size={16}/></span><span>Dados da operação</span><i /></div>
            </section>
          </div>
          <div className="scene-bottom">
            <div className="scene-tile"><span>Integração ativa</span><div className="scene-value-placeholder medium" /></div>
            <div className="scene-tile"><span>Vendas hoje</span><div className="scene-value-placeholder" /></div>
            <div className="scene-tile"><span>Margem</span><div className="scene-value-placeholder medium" /></div>
          </div>
        </div>
      </div>
      <div className="scene-glow scene-glow-left" />
      <div className="scene-glow scene-glow-right" />
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) setEmail(saved);
    } catch {
      // O armazenamento é opcional; a autenticação continua disponível.
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setShowRecovery(false);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
        cache: "no-store",
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Não foi possível entrar.");
      }
      try {
        if (remember) window.localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        else window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch {
        // Nunca armazenamos a senha.
      }
      window.location.assign("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <LoginBackdrop />
      <section className="login-card" aria-labelledby="login-heading">
        <div className="login-brand"><FluxHubLogo className="login-logo" /></div>
        <div className="login-copy">
          <h1 id="login-heading">Acesse sua operação de vendas<br className="desktop-break" /> em um só lugar.</h1>
        </div>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="login-email" className="sr-only">E-mail</label>
          <div className="login-input-wrap">
            <Mail size={22} aria-hidden="true" />
            <input id="login-email" name="email" type="email" placeholder="Seu e-mail" autoComplete="username" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
          </div>
          <label htmlFor="login-password" className="sr-only">Senha</label>
          <div className="login-input-wrap login-password">
            <LockKeyhole size={22} aria-hidden="true" />
            <input id="login-password" name="password" type={visible ? "text" : "password"} placeholder="Sua senha" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
            <button type="button" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible(!visible)} disabled={busy}>{visible ? <EyeOff size={23}/> : <Eye size={23}/>}</button>
          </div>
          <div className="login-options">
            <label className="remember-choice">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={busy} />
              <span className="remember-box"><Check size={16} strokeWidth={3}/></span>
              <span>Lembrar de mim</span>
            </label>
            <button type="button" className="login-forgot" onClick={() => setShowRecovery((current) => !current)}>Esqueci minha senha</button>
          </div>
          {showRecovery && <p className="login-help" role="status">Para recuperar o acesso, solicite a redefinição de senha ao administrador do FluxHub.</p>}
          {error && <p role="alert" className="login-error">{error}</p>}
          <button type="submit" className="login-submit" disabled={busy}><span>{busy ? "Entrando..." : "Entrar"}</span><ArrowRight size={25} /></button>
        </form>
        <div className="login-foot"><ShieldCheck size={25} /><span>Seus dados estão protegidos com criptografia<br className="desktop-break" /> e acesso seguro.</span></div>
      </section>
    </main>
  );
}
