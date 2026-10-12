"use client";

import { FormEvent, useState } from "react";
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("FluxHub@gmail.com");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "Não foi possível entrar.");
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
      <div className="login-card">
        <div className="login-brand"><span className="brand-mark"><Activity size={20} /></span><strong>FluxHub</strong></div>
        <div className="login-copy"><span className="eyebrow">ACESSO RESTRITO</span><h1>Bem-vindo de volta.</h1><p>Entre com sua conta para acessar os indicadores da operação.</p></div>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="login-email">E-mail</label>
          <input id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
          <label htmlFor="login-password">Senha</label>
          <div className="login-password">
            <input id="login-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required autoFocus value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
            <button type="button" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible(!visible)} disabled={busy}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
          </div>
          {error && <p role="alert" className="login-error">{error}</p>}
          <button type="submit" className="login-submit" disabled={busy}><LockKeyhole size={17}/>{busy ? "Entrando..." : "Entrar no painel"}<ArrowRight size={17}/></button>
        </form>
        <div className="login-foot"><ShieldCheck size={16}/> Ambiente privado · Acesso autorizado</div>
      </div>
      <p className="login-disclaimer">FluxHub · Plataforma de gestão</p>
    </main>
  );
}
