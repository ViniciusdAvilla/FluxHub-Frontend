"use client";

import { useEffect, useState } from "react";
import { Bot, CircleAlert, Lightbulb, Send, ShieldCheck } from "lucide-react";

type Mode = "sales" | "pricing" | "inventory" | "strategy";
type Status = { configured: boolean; model: string | null; read_only: boolean };
type AgentResult = { analysis: string; model: string; read_only: boolean;
  context: { products_in_catalog: number; paid_orders_30_days: number; gross_paid_sales_30_days: number } };
const modes: {key:Mode;name:string;help:string}[] = [
  {key:"sales",name:"Agente de Vendas",help:"Tendências e oportunidades nos pedidos pagos."},
  {key:"pricing",name:"Agente de Precificação",help:"Riscos de margem e possibilidades de ajuste."},
  {key:"inventory",name:"Agente de Estoque",help:"Reposição, cobertura e falta de mercadoria."},
  {key:"strategy",name:"Agente Estratégico",help:"Curva ABC e experiências de crescimento."},
];

export default function ClaudeAgentsPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [active, setActive] = useState<Mode>("sales");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/platform/agents/claude", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error("Não foi possível consultar a configuração.");
        return data as Status;
      })
      .then(data => { if (!controller.signal.aborted) setStatus(data); })
      .catch(() => { if (!controller.signal.aborted) setNotice("Status do Claude indisponível."); });
    return () => controller.abort();
  }, []);
  async function run() {
    if (loading || !status?.configured) return;
    setLoading(true); setNotice(""); setResult(null);
    try {
      const response = await fetch("/api/platform/agents/claude", {
        method:"POST", cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({agent:active,instruction:instruction.trim()}),
      });
      const body = await response.json() as AgentResult & { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível gerar a análise.");
      setResult(body);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Falha na análise.");
    } finally { setLoading(false); }
  }
  return <div className="fh-claude-layout">
    <section className="fh-card">
      <div className="fh-card-head"><div><h2>Agentes inteligentes Claude</h2>
        <p>Selecione uma especialidade e solicite uma análise dos indicadores da sua operação.</p></div>
        <span className={"fh-pill " + (status?.configured ? "" : "offline")}>
          {status?.configured ? "Configurado" : "Requer chave Anthropic"}
        </span>
      </div>
      <div className="fh-claude-agent-grid" role="group" aria-label="Selecionar agente">
        {modes.map(mode => <button type="button" key={mode.key}
          aria-pressed={active === mode.key} className={"fh-claude-agent " +
            (active === mode.key ? "is-active" : "")}
          onClick={() => { setActive(mode.key); setResult(null); }}>
          <Bot size={19}/><strong>{mode.name}</strong><small>{mode.help}</small>
        </button>)}
      </div>
      <label className="fh-claude-instruction">Sua pergunta ou objetivo
        <textarea maxLength={1200} rows={4} value={instruction}
          onChange={event => setInstruction(event.target.value)}
          placeholder="Ex.: quais ações podem melhorar o desempenho da minha loja nos próximos 30 dias?"/>
      </label>
      <div className="fh-inline-actions">
        <button type="button" className="fh-primary-btn" disabled={!status?.configured || loading}
          onClick={() => void run()}><Send size={16}/>
          {loading ? "Analisando indicadores..." : "Executar análise"}
        </button>
        <span className="fh-profit-hint">Somente consulta; nenhuma ação é executada automaticamente.</span>
      </div>
      {!status?.configured && <p className="fh-notice" role="status">
        Configure <code>ANTHROPIC_API_KEY</code> no backend para habilitar os agentes.
        A chave não deve ser digitada no navegador.</p>}
      {notice && <p className="fh-notice error" role="alert"><CircleAlert size={16}/>{notice}</p>}
    </section>
    <section className="fh-card">
      <div className="fh-card-head"><div><h2>Resultado da análise</h2>
        <p>Recomendações baseadas nos indicadores agregados disponíveis.</p></div></div>
      {result ? <>
        <div className="fh-claude-output" aria-live="polite">{result.analysis}</div>
        <p className="fh-profit-hint">Modelo: {result.model} · Produtos:
          {" "}{result.context.products_in_catalog.toLocaleString("pt-BR")} · Pedidos pagos (30d):
          {" "}{result.context.paid_orders_30_days.toLocaleString("pt-BR")}
        </p>
      </> : <div className="fh-claude-empty"><Lightbulb size={28}/>
        <strong>Pronto para analisar</strong>
        <p>Escolha um agente e pressione “Executar análise”.</p>
      </div>}
      <p className="fh-claude-security"><ShieldCheck size={16}/> Apenas números consolidados
        são enviados para análise. Dados pessoais, OAuth e pedidos individuais não são compartilhados.</p>
    </section>
  </div>;
}
