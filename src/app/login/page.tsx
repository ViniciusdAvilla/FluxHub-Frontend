"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import LoginAnimatedDashboard from "@/components/login-animated-dashboard";
import FluxHubLogo from "@/components/fluxhub-logo";

const REMEMBER_EMAIL_KEY = "fluxhub.rememberedEmail";

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
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next && /^\/mcp\/autorizar\?request_id=[A-Za-z0-9_-]{30,100}$/.test(next)
        ? next : "/";
      window.location.assign(safeNext);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <LoginAnimatedDashboard />
      <section className="login-card" aria-labelledby="login-heading">
        <div className="login-brand"><FluxHubLogo className="login-logo" /></div>
        <div className="login-copy">
          <h1 id="login-heading">Acesse sua conta</h1>
          <p>Gerencie suas vendas, produtos e integrações em um só lugar.</p>
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
          <button type="submit" className="login-submit" disabled={busy}><span>{busy ? "Entrando..." : "Entrar no FluxHub"}</span><ArrowRight size={25} /></button>
        </form>
        <div className="login-foot"><ShieldCheck size={20} aria-hidden="true" /><span>Acesso restrito a usuários autorizados.<br />Solicite seu cadastro ao Administrador Master.</span></div>
      </section>
    </main>
  );
}
