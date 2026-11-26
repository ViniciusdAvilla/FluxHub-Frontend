"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ClaudeQueryResults, { type QuerySection } from "./claude-query-results";
import styles from "./claude-consultations.module.css";
import McpConnectionCard from "@/components/mcp-connection-card";
import {
  BadgePercent, Boxes, ChartNoAxesCombined, CheckCircle2, CircleAlert,
  Eye, EyeOff, LockKeyhole, Send, ShieldCheck, Sparkles, Target,
} from "lucide-react";

type Mode = "sales" | "pricing" | "inventory" | "strategy";
type Status = {
  configured: boolean;
  model: string | null;
  can_manage: boolean;
  read_only: boolean;
};
type Turn = { role: "user" | "assistant"; content: string; sections?: QuerySection[] };
type Busy = "test" | "save" | null;

const models = [
  { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
];
const agents = [
  { key: "sales" as const, name: "Análise de vendas", help: "Pedidos e faturamento pago", icon: ChartNoAxesCombined },
  { key: "pricing" as const, name: "Precificação", help: "Preços e custos cadastrados", icon: BadgePercent },
  { key: "inventory" as const, name: "Gestão de estoque", help: "Saldo e produtos esgotados", icon: Boxes },
  { key: "strategy" as const, name: "Estratégia comercial", help: "Anúncios, Ads e sincronização", icon: Target },
];

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => ({}));
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
function errorText(body: Record<string, unknown>, fallback: string) {
  return typeof body.error === "string" ? body.error : fallback;
}

export default function ClaudeAgentsPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [active, setActive] = useState<Mode>("sales");
  const [model, setModel] = useState("claude-sonnet-5");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [configNotice, setConfigNotice] = useState("");
  const [configError, setConfigError] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Turn[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const conversationEnd = useRef<HTMLDivElement>(null);

  async function refreshStatus(signal?: AbortSignal) {
    const response = await fetch("/api/platform/agents/claude", {
      cache: "no-store", signal,
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error("Não foi possível consultar a conexão Claude.");
    const next = data as unknown as Status;
    if (signal?.aborted) return;
    setStatus(next);
    if (next.model && models.some(item => item.value === next.model)) setModel(next.model);
  }

  useEffect(() => {
    const controller = new AbortController();
    void refreshStatus(controller.signal).catch(() => {
      if (!controller.signal.aborted) setConfigError("Status do Claude indisponível. Tente atualizar a página.");
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatBusy]);

  async function configure(action: "test" | "save") {
    if (busy || !status?.can_manage) return;
    setBusy(action);
    setConfigError("");
    setConfigNotice("");
    try {
      const response = await fetch(
        "/api/platform/agents/claude/config" + (action === "test" ? "/test" : ""),
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, api_key: apiKey.trim() || null }) },
      );
      const body = await readJson(response);
      if (!response.ok) throw new Error(errorText(body, "Falha na configuração do Claude."));
      if (action === "save") {
        setApiKey("");
        setShowKey(false);
        await refreshStatus();
        setConfigNotice("Chave Anthropic validada por uma conversa real e salva com segurança.");
      } else {
        setConfigNotice("Conexão com a Anthropic validada.");
      }
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "Erro ao configurar a conexão.");
    } finally {
      setBusy(null);
    }
  }

  async function sendMessage(input = draft) {
    const question = input.trim();
    if (!question || chatBusy || !status?.configured) return;
    const prior = messages.filter(turn => turn.role === "user").slice(-8)
      .map(({ role, content }) => ({ role, content }));
    setDraft("");
    setChatError("");
    setMessages(current => [...current, { role: "user", content: question }]);
    setChatBusy(true);
    try {
      const response = await fetch("/api/platform/agents/claude", {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: active, instruction: question, history: prior }),
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(errorText(body, "Não foi possível analisar os indicadores."));
      if (body.verified !== true || !Array.isArray(body.sections)) {
        throw new Error("Consulta verificada indisponível. Atualize o backend do FluxHub.");
      }
      const sections = body.sections as QuerySection[];
      const message = typeof body.message === "string" ? body.message : "";
      setMessages(current => [...current, { role: "assistant", content: message, sections }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Falha na consulta.");
    } finally {
      setChatBusy(false);
    }
  }

  return <div className={styles.workspace}>


    <section className={"fh-card fh-claude-chat " + styles.chat} aria-label="Assistente Claude">
      <div className="fh-claude-chat-header">
        <div className="fh-claude-chat-title"><span className="fh-claude-symbol small">
          <Sparkles size={25}/></span><h2>Consultas do FluxHub</h2></div>
        <span className="fh-claude-chat-badge">{status?.configured ? "Somente leitura" : "Aguardando conexão"}</span>
      </div>
      <div className="fh-claude-chat-scroll" role="log" aria-label="Conversa com Claude" aria-live="polite">
        {messages.length === 0 ? <div className={styles.empty}>
          <h3>O que você quer consultar?</h3>
          <p>As respostas exibem apenas resultados consultados no banco da sua conta.</p>
          <div className={styles.prompts}>{[
            "Quantos anúncios tenho no FluxHub?",
            "Quantos pedidos pagos tive nos últimos 7 dias?",
            "Quais produtos estão com estoque baixo?",
          ].map(question => <button type="button" key={question} disabled={!status?.configured}
            onClick={() => void sendMessage(question)}>{question}</button>)}</div>
        </div> : messages.map((turn, index) => turn.sections?.length
          ? <ClaudeQueryResults key={index} sections={turn.sections}/>
          : <div key={index} className={"fh-claude-bubble " + turn.role}>{turn.content}</div>)}
        {chatBusy && <p className="fh-claude-typing" role="status">Consultando o FluxHub…</p>}
        {chatError && <div className="fh-claude-alert" role="alert"><CircleAlert size={16}/>{chatError}</div>}
        <div ref={conversationEnd}/>
      </div>
      <div className="fh-claude-chat-compose">
        <label className="fh-sr-only" htmlFor="claude-chat-input">Pergunte algo à sua IA</label>
        <textarea id="claude-chat-input" rows={2} maxLength={1200} value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault(); void sendMessage();
            }
          }}
          placeholder={status?.configured ? "Digite uma pergunta sobre sua operação…" : "Conecte Claude para começar..."}
          disabled={!status?.configured || chatBusy}/>
        <button type="button" className="fh-claude-send" onClick={() => void sendMessage()}
          disabled={!status?.configured || chatBusy || !draft.trim()}
          aria-label="Enviar pergunta" title="Enviar pergunta"><Send size={19}/></button>
      </div>
      <p className="fh-claude-chat-safety"><ShieldCheck size={15}/>
        O FluxHub exibe os resultados do banco. Claude seleciona as consultas.</p>
    </section>
    <aside className={styles.controls}>
      <details className={styles.setting} open={!status?.configured || undefined}>
        <summary>Conexão Claude</summary>
      <section className="fh-card fh-claude-connection" aria-label="Conectar Claude">
        <div className="fh-claude-card-title">
          <span className="fh-claude-symbol"><Sparkles size={29}/></span>
          <div className="fh-claude-card-copy">
            <div className="fh-claude-title-line">
              <h2>Conectar Claude</h2>
              <span className={"fh-claude-status " + (status?.configured ? "connected" : "")}>
                {status?.configured ? "Chave salva" : "Sem chave"}
              </span>
            </div>
            <p>Configure sua chave de API Anthropic com segurança.</p>
          </div>
        </div>
        {status?.can_manage ? <>
          <label className="fh-claude-label" htmlFor="claude-key">Chave de API</label>
          <div className="fh-claude-secret-wrap">
            <input id="claude-key" type={showKey ? "text" : "password"}
              autoComplete="off" spellCheck={false} maxLength={512}
              value={apiKey} onChange={event => setApiKey(event.target.value)}
              placeholder={status.configured ? "•••• •••• •••• •••• (chave salva)" : "Cole sua chave da Anthropic"}
              aria-describedby="claude-key-hint"/>
            <button type="button" onClick={() => setShowKey(value => !value)}
              aria-label={showKey ? "Ocultar chave" : "Mostrar chave digitada"}
              title={showKey ? "Ocultar chave" : "Mostrar chave digitada"}>
              {showKey ? <EyeOff size={19}/> : <Eye size={19}/>}
            </button>
          </div>
          <p id="claude-key-hint" className="fh-claude-microcopy">
            <LockKeyhole size={15}/> Criptografada e armazenada no servidor.
            {status.configured ? " Deixe em branco para manter a chave atual." : ""}
          </p>
          <label className="fh-claude-label" htmlFor="claude-model">Modelo de IA</label>
          <select className="fh-claude-model" id="claude-model" value={model}
            onChange={event => setModel(event.target.value)}>
            {models.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <div className="fh-claude-actions">
            <button type="button" className="fh-claude-secondary" disabled={busy !== null}
              onClick={() => void configure("test")}>
              {busy === "test" ? "Testando..." : "Testar conexão"}
            </button>
            <button type="button" className="fh-claude-primary" disabled={busy !== null ||
              (!status.configured && !apiKey.trim())}
              onClick={() => void configure("save")}>
              {busy === "save" ? "Salvando..." : "Salvar e ativar"}
            </button>
          </div>
        </> : <div className="fh-claude-managed">
          <ShieldCheck size={19}/>
          <p>A chave é gerenciada pelo Administrador Master. Você pode usar os agentes quando a conexão estiver ativa.</p>
        </div>}
        {configError && <p role="alert" className="fh-claude-alert"><CircleAlert size={16}/>{configError}</p>}
        {configNotice && <p role="status" className="fh-claude-success"><CheckCircle2 size={16}/>{configNotice}</p>}
        <p className="fh-claude-footer-note"><ShieldCheck size={18}/> A chave nunca aparece no navegador após salvar.</p>
      </section>

      </details>
      <details className={styles.setting}>
        <summary>Conector MCP externo</summary>
        <McpConnectionCard/>
      </details>

      <section className="fh-claude-available" aria-labelledby="claude-agents-heading">
        <h2 id="claude-agents-heading">Agentes disponíveis</h2>
        <div className={"fh-claude-agent-grid " + styles.agents}>
          {agents.map(agent => {
            const Icon = agent.icon;
            return <button key={agent.key} type="button"
              className={"fh-claude-agent " + (active === agent.key ? "is-active" : "")}
              aria-pressed={active === agent.key}
              onClick={() => { if (!chatBusy) { setActive(agent.key); setMessages([]); setChatError(""); } }}>
              <span className={"fh-claude-agent-icon " + agent.key}><Icon size={22}/></span>
              <span className="fh-claude-agent-copy"><strong>{agent.name}</strong><small>{agent.help}</small></span>
              <span className="fh-claude-agent-chevron" aria-hidden="true">›</span>
            </button>;
          })}
        </div>
      </section>
      <Link className={styles.queue} href="/fila-de-decisoes">Abrir Fila de decisões →</Link>
    </aside>
  </div>;
}
