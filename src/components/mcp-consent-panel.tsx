"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole, ShieldCheck, Unplug } from "lucide-react";

type RequestInfo = { client_name: string; scope: string };
const frame = { maxWidth: 550, margin: "12vh auto", padding: 36,
  background: "#fff", border: "1px solid #e4eaf5", borderRadius: 24,
  boxShadow: "0 20px 70px #1d386015", color: "#17234b" } as const;

export default function McpConsentPanel({ requestId }: { requestId: string }) {
  const [details, setDetails] = useState<RequestInfo | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const returnTo = "/mcp/autorizar?request_id=" + encodeURIComponent(requestId);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetch("/api/mcp/oauth/request/" + encodeURIComponent(requestId),
      { signal: ctrl.signal, cache: "no-store" }).then(async res => {
      if (res.status === 401) { setNeedLogin(true); return; }
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail :
        "Esta solicitação expirou. Inicie novamente no Claude.");
      if (!ctrl.signal.aborted) setDetails(body as RequestInfo);
    }).catch(() => { if (!ctrl.signal.aborted) setError("Não foi possível validar a solicitação MCP."); });
    return () => ctrl.abort();
  }, [requestId]);

  async function approve() {
    if (busy || !details) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/mcp/oauth/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });
      const body = await res.json() as { redirect_to?: string; detail?: string };
      if (!res.ok || !body.redirect_to) throw new Error(body.detail || "Autorização não concluída.");
      const url = new URL(body.redirect_to);
      if (url.protocol !== "https:" && !(url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "::1"].includes(url.hostname)))
        throw new Error("Destino do conector não autorizado.");
      window.location.assign(url.href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha na conexão.");
      setBusy(false);
    }
  }

  return <main style={{ minHeight: "100vh", background: "#f5f7fc", padding: "2px 16px" }}>
    <section style={frame} aria-labelledby="mcp-title">
      <div style={{ display: "flex", gap: 12, alignItems: "center", color: "#347dff" }}>
        <ShieldCheck size={32}/>
        <strong style={{ fontSize: 17 }}>FluxHub · Conexões seguras</strong>
      </div>
      <h1 id="mcp-title" style={{ fontSize: 26, marginTop: 24 }}>Autorizar acesso ao FluxHub</h1>
      {details ? <>
        <p>O aplicativo <strong>{details.client_name}</strong> solicita acesso de leitura aos dados da sua operação.</p>
        <p style={{ padding: 16, borderRadius: 12, background: "#eef5ff" }}>
          <LockKeyhole size={16} style={{ verticalAlign: "middle", marginRight: 8 }}/>
          Permitido: consultas de produtos, estoque, vendas e anúncios patrocinados armazenados.
          Não permitido: alterações de anúncios, compras, dados pessoais de compradores ou senhas.
        </p>
        <p style={{ fontSize: 13, color: "#63718d" }}>
          Você poderá revogar a conexão na dashboard, em Agentes Claude.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
          <button type="button" disabled={busy} onClick={() => void approve()}
            style={{ padding: "12px 20px", color: "white", background: "#347dff", border: 0,
              borderRadius: 10, cursor: "pointer" }}>
            {busy ? "Autorizando…" : "Autorizar conexão"}
          </button>
          <Link href="/agentes-claude" style={{ padding: "12px 20px", color: "#394764" }}>
            Cancelar
          </Link>
        </div>
      </> : needLogin ? <>
        <p>Entre com seu usuário FluxHub para confirmar essa integração.</p>
        <Link href={"/login?next=" + encodeURIComponent(returnTo)}
          style={{ display: "inline-block", padding: "12px 20px", borderRadius: 10,
            background: "#347dff", color: "#fff" }}>Entrar no FluxHub</Link>
      </> : <p>Carregando solicitação...</p>}
      {error && <p role="alert" style={{ color: "#ad2733", marginTop: 16 }}>
        <Unplug size={16} style={{ verticalAlign: "middle" }}/> {error}
      </p>}
    </section>
  </main>;
}
