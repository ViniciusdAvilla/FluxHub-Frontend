"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Globe2, ShieldAlert, Unplug } from "lucide-react";

type ConnectionStatus = { connected_clients: number; mcp_url: string };

export default function McpConnectionCard() {
  const [state, setState] = useState<ConnectionStatus | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh(signal?: AbortSignal) {
    const response = await fetch("/api/mcp/oauth/status", { cache: "no-store", signal });
    if (!response.ok) throw new Error("Não foi possível consultar o status do MCP.");
    const payload = await response.json() as ConnectionStatus;
    if (!signal?.aborted) setState(payload);
  }
  useEffect(() => {
    const ctrl = new AbortController();
    void refresh(ctrl.signal).catch(() => {
      if (!ctrl.signal.aborted) setError("Status MCP indisponível.");
    });
    return () => ctrl.abort();
  }, []);

  async function copyUrl() {
    if (!state?.mcp_url) return;
    try {
      await navigator.clipboard.writeText(state.mcp_url);
      setNotice("URL MCP copiada.");
    } catch {
      setError("Não foi possível copiar. Selecione a URL abaixo.");
    }
  }

  async function revoke() {
    if (!state?.connected_clients || busy || !window.confirm(
      "Desconectar todos os aplicativos Claude/MCP externos?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/mcp/oauth/revoke-all", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Não foi possível revogar as conexões.");
      await refresh();
      setNotice("Conexões externas revogadas.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao desconectar.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="fh-card fh-claude-mcp" aria-label="Conexão MCP externa">
    <div className="fh-claude-card-title">
      <span className="fh-claude-symbol"><Globe2 size={25}/></span>
      <div className="fh-claude-card-copy">
        <div className="fh-claude-title-line">
          <h2>Conector MCP externo</h2>
        </div>
        <p>Use os dados do FluxHub diretamente no Claude Web ou Desktop.</p>
      </div>
    </div>
    <label className="fh-claude-label" htmlFor="mcp-public-url">Servidor MCP</label>
    <div className="fh-claude-mcp-url">
      <input id="mcp-public-url" readOnly value={state?.mcp_url || "Carregando..."}
        aria-label="URL pública do servidor MCP"/>
      <button type="button" title="Copiar URL" aria-label="Copiar endereço MCP"
        onClick={() => void copyUrl()} disabled={!state?.mcp_url}><Copy size={17}/></button>
    </div>
    <p className="fh-claude-microcopy">
      <CheckCircle2 size={15}/> {state
        ? state.connected_clients + " conexão(ões) autorizada(s)"
        : "Verificando conexões..."}
    </p>
    <p className="fh-claude-microcopy">
      No Claude, abra <strong>Conectores → Adicionar conector personalizado</strong>,
      cole a URL e autorize com seu login FluxHub.
    </p>
    {Boolean(state?.connected_clients) && <button className="fh-claude-secondary"
      type="button" onClick={() => void revoke()} disabled={busy}>
      <Unplug size={16}/> {busy ? "Desconectando..." : "Revogar conexões externas"}
    </button>}
    {notice && <p className="fh-claude-success" role="status">{notice}</p>}
    {error && <p className="fh-claude-alert" role="alert">
      <ShieldAlert size={16}/>{error}
    </p>}
  </section>;
}
