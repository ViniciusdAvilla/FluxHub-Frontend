"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ModernShell from "./modern-shell";
import ClaudeQueryResults, { type QuerySection } from "./claude-query-results";
import styles from "./claude-consultations.module.css";
import McpConnectionCard from "@/components/mcp-connection-card";
import {
  CheckCircle2, ChevronRight, CircleAlert, Eye, EyeOff, LockKeyhole, Search, ShieldCheck, Sparkles, X,
} from "lucide-react";

type Mode = "sales" | "pricing" | "inventory" | "strategy";
type Status = {
  configured: boolean;
  model: string | null;
  can_manage: boolean;
  read_only: boolean;
};
type Consultation = { id: number; question: string; sections: QuerySection[]; message: string };
type Busy = "test" | "save" | null;

const models = [
  { value: "claude-sonnet-5", label: "Claude Sonnet 5" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
];
const agents: Record<Mode, string> = {
  sales: "Análise de vendas",
  pricing: "Precificação",
  inventory: "Gestão de estoque",
  strategy: "Estratégia comercial",
};
const shortcuts: { label: string; question: string; mode: Mode }[] = [
  { label: "Prioridade de vendas", question: "Qual é a minha prioridade agora para alavancar as vendas?", mode: "strategy" },
  { label: "Faturamento", question: "Qual foi o faturamento bruto dos pedidos pagos no mês passado?", mode: "sales" },
  { label: "Pedidos pagos", question: "Quantos pedidos pagos tive nos últimos 7 dias?", mode: "sales" },
  { label: "Estoque baixo", question: "Quais produtos estão com estoque baixo?", mode: "inventory" },
];

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => ({}));
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
function errorText(body: Record<string, unknown>, fallback: string) {
  return typeof body.error === "string" ? body.error : fallback;
}

export default function ClaudeAgentsPanel({ isAdmin }: { isAdmin?: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [active, setActive] = useState<Mode>("sales");
  const [model, setModel] = useState("claude-sonnet-5");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [configNotice, setConfigNotice] = useState("");
  const [configError, setConfigError] = useState("");
  const [draft, setDraft] = useState("");
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [queryError, setQueryError] = useState("");
  const selected = consultations.find(item => item.id === selectedId);
  const nextId = useRef(0);
  const connection = useRef<HTMLDialogElement>(null);
  const queryInput = useRef<HTMLInputElement>(null);
  const action = useMemo(() => <button type="button" className={styles.configure}
    aria-haspopup="dialog" onClick={() => connection.current?.showModal()}>
    <Sparkles size={18} aria-hidden/> Configurar Claude
  </button>, []);

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

  async function runConsultation() {
    const question = draft.trim();
    if (!question || pending || !status?.configured) return;
    const previous = [...consultations].reverse().slice(-8)
      .map(({ question }) => ({ role: "user", content: question }));
    setQueryError("");
    setPending(true);
    try {
      const response = await fetch("/api/platform/agents/claude", {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: active, instruction: question, history: previous }),
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(errorText(body, "Não foi possível consultar o FluxHub."));
      if (body.verified !== true || !Array.isArray(body.sections)) {
        throw new Error("Consulta verificada indisponível. Atualize o backend do FluxHub.");
      }
      const result = {
        id: ++nextId.current, question,
        sections: body.sections as QuerySection[],
        message: typeof body.message === "string" ? body.message : "",
      };
      setConsultations(current => [result, ...current].slice(0, 20));
      setSelectedId(result.id);
    } catch (error) {
      setSelectedId(null);
      setQueryError(error instanceof Error ? error.message : "Falha na consulta.");
    } finally {
      setPending(false);
    }
  }

  return <ModernShell title="Agentes de IA" isAdmin={isAdmin} action={action}>
    <div className={styles.workspace}>
      <form className={styles.search} onSubmit={event => { event.preventDefault(); void runConsultation(); }}>
        <Search size={22} aria-hidden/>
        <input ref={queryInput} type="text" aria-label="Pergunte sobre sua operação"
          maxLength={1200} placeholder="Pergunte sobre sua operação"
          value={draft} onChange={event => setDraft(event.target.value)} disabled={pending}/>
        <button type="submit" className={styles.submit} disabled={pending || !status?.configured || !draft.trim()}>
          {pending ? "Consultando…" : "Consultar"}
        </button>
      </form>
      <div className={styles.prompts} role="group" aria-label="Consultas rápidas">
        {shortcuts.map(({ label, question, mode }) => <button type="button" key={label} disabled={pending}
          onClick={() => { setDraft(question); setActive(mode); queryInput.current?.focus(); }}>{label}</button>)}
      </div>

      <section aria-label="Resultado da consulta" aria-busy={pending} aria-live="polite" className={styles.answer}>
        {pending ? <p className={styles.empty} role="status">Consultando o FluxHub…</p>
          : queryError ? <p className={styles.empty} role="alert">{queryError}</p>
          : selected?.sections.length ? <ClaudeQueryResults key={selected.id} sections={selected.sections}/>
          : <div className={styles.empty} role="status">
            {selected?.message || (status?.configured ? "Faça uma consulta para ver o resultado."
              : configError || (status ? "Configure o Claude para começar." : "Verificando a conexão com o Claude…"))}
          </div>}
      </section>

      <section className={styles.recent} aria-labelledby="claude-recent">
        <h2 id="claude-recent">Consultas recentes</h2>
        {consultations.length ? <ul>
          {consultations.map(item => <li key={item.id}>
            <button type="button" aria-pressed={item.id === selectedId} disabled={pending}
              onClick={() => { setSelectedId(item.id); setQueryError(""); setDraft(item.question); }}>
              <span>{item.question}</span><ChevronRight size={17} aria-hidden/>
            </button>
          </li>)}
        </ul> : <p className={styles.historyEmpty}>As consultas desta sessão aparecerão aqui.</p>}
      </section>

      <dialog ref={connection} className={styles.dialog} aria-labelledby="configure-claude-heading"
        onClose={() => { setShowKey(false); setApiKey(""); }}>
        <div className={styles.dialogHeading}>
          <h2 id="configure-claude-heading">Configurar Claude</h2>
          <button type="button" aria-label="Fechar configurações" onClick={() => connection.current?.close()}><X size={21}/></button>
        </div>
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

        <label className={styles.agentOption}>Agente padrão
          <select className="fh-claude-model" value={active} disabled={pending}
            onChange={event => setActive(event.target.value as Mode)}>
            {Object.entries(agents).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <details className={styles.setting}>
          <summary>Conector MCP externo</summary>
          <McpConnectionCard/>
        </details>
      </dialog>
    </div>
  </ModernShell>;
}
