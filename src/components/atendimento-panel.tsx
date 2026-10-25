"use client";

import { useCallback, useEffect, useState } from "react";

type Account = { account_id: number; nickname: string | null };
type Question = {
  id: number; text: string; status?: string; item_id?: string;
  answer?: { text?: string } | null; date_created?: string;
};
type Order = { order_id: number; pack_id: number; status?: string; date_created?: string };
type Message = { message_id?: string; text?: { plain?: string } | string;
  from?: { user_id?: number | string }; date_created?: string; date_received?: string };
type Selection = { kind: "question" | "post_sale"; id: number };

async function endpoint(action: string, account?: number, pack?: number) {
  const query = new URLSearchParams({ action });
  if (account) query.set("account", String(account));
  if (pack) query.set("pack", String(pack));
  const response = await fetch("/api/atendimento?" + query.toString(), { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Não foi possível carregar.");
  return result;
}

async function mutate(payload: unknown) {
  const response = await fetch("/api/atendimento", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Operação indisponível.");
  return result;
}

const panel: React.CSSProperties = { background: "white", border: "1px solid #e3e9f1",
  borderRadius: 16, padding: 22, minWidth: 0 };
const control: React.CSSProperties = { padding: "11px 14px", borderRadius: 10,
  border: "1px solid #d9e2ec", background: "#fff", color: "#223249", cursor: "pointer" };
const primary: React.CSSProperties = { ...control, background: "#206af5", color: "white",
  borderColor: "#206af5", fontWeight: 650 };

export default function AtendimentoPanel() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<number | null>(null);
  const [tab, setTab] = useState<"question" | "post_sale">("post_sale");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    endpoint("contas").then((rows: Account[]) => {
      setAccounts(rows); setAccount(rows[0]?.account_id || null);
    }).catch(e => setError(e.message));
  }, []);

  const refresh = useCallback(async () => {
    if (!account) return;
    setLoading(true); setError("");
    try {
      if (tab === "question") {
        const data = await endpoint("perguntas", account);
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
      } else {
        const data = await endpoint("pedidos", account);
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na consulta."); }
    finally { setLoading(false); }
  }, [account, tab]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    setSelection(null); setMessages([]); setReply(""); setNotice("");
  }, [account, tab]);

  async function choose(kind: "question" | "post_sale", id: number) {
    setSelection({ kind, id }); setReply(""); setMessages([]); setNotice(""); setError("");
    if (kind === "post_sale" && account) {
      setLoading(true);
      try {
        const data = await endpoint("mensagens", account, id);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        if (!data.messages?.length) setNotice("Ainda não há mensagens disponíveis para esse pedido.");
      } catch (e) { setError(e instanceof Error ? e.message : "Falha ao abrir conversa."); }
      finally { setLoading(false); }
    }
  }

  async function suggestion() {
    if (!selection) return;
    const selected = questions.find(q => q.id === selection.id);
    const history = selection.kind === "question"
      ? [selected?.text || ""]
      : messages.map(m => typeof m.text === "string" ? m.text : m.text?.plain || "");
    if (!history.filter(Boolean).length) return setError("Sem histórico para gerar uma sugestão.");
    setBusy(true); setError(""); setNotice("");
    try {
      const data = await mutate({ action: "sugerir", channel: selection.kind, messages: history.filter(Boolean).slice(-12) });
      setReply(data.suggestion);
      setNotice("Sugestão gerada. Revise e edite antes de enviar.");
    } catch (e) { setError(e instanceof Error ? e.message : "IA indisponível."); }
    finally { setBusy(false); }
  }

  async function send() {
    if (!selection || !account || !reply.trim()) return;
    if (!window.confirm("Confirmar envio desta resposta ao cliente pelo Mercado Livre?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await mutate({ action: selection.kind === "question" ? "responder-pergunta" : "responder-mensagem",
        account, id: selection.id, text: reply.trim() });
      setReply(""); setNotice("Resposta enviada ao Mercado Livre.");
      if (selection.kind === "post_sale") await choose("post_sale", selection.id);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar."); }
    finally { setBusy(false); }
  }

  const chosenQuestion = selection?.kind === "question"
    ? questions.find(q => q.id === selection.id) : undefined;

  return <div style={{ display: "grid", gap: 18 }}>
    <div style={{ ...panel, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: 21, margin: "0 0 5px" }}>Central de Atendimento</h2>
        <p style={{ color: "#6c7b8e", margin: 0 }}>Respostas manuais e sugestões de IA com aprovação humana.</p>
      </div>
      <label style={{ display: "grid", gap: 5, fontSize: 13 }}>Conta Mercado Livre
        <select style={control} value={account || ""} onChange={e => setAccount(Number(e.target.value))}>
          {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.nickname || a.account_id}</option>)}
        </select>
      </label>
      <button style={control} onClick={() => void refresh()} disabled={loading || !account}>Atualizar</button>
    </div>
    {error && <div role="alert" style={{ padding: 14, color: "#a62035", background: "#fff0f1", borderRadius: 10 }}>{error}</div>}
    {notice && <div role="status" style={{ padding: 14, color: "#236344", background: "#edf9f2", borderRadius: 10 }}>{notice}</div>}
    {!accounts.length && !error && <div style={panel}>Nenhuma conta conectada. Acesse Integrações para autorizar o Mercado Livre.</div>}
    {!!accounts.length && <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(0, 2fr)", gap: 16 }}>
      <section style={panel} aria-label="Lista de conversas">
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <button style={tab === "post_sale" ? primary : control} onClick={() => setTab("post_sale")}>Pós-venda</button>
          <button style={tab === "question" ? primary : control} onClick={() => setTab("question")}>Perguntas</button>
        </div>
        {loading && <p role="status">Carregando conversas…</p>}
        {tab === "question" && questions.map(q => <button key={q.id}
          onClick={() => void choose("question", q.id)}
          style={{ ...control, width: "100%", textAlign: "left", marginBottom: 8,
            background: selection?.id === q.id ? "#eef5ff" : "white" }}>
          <strong>Pergunta #{q.id}</strong><div style={{ marginTop: 5, overflowWrap: "anywhere" }}>{q.text}</div>
          <small style={{ color: "#7e8ca0" }}>{q.status || "Sem status"} · {q.item_id || "Anúncio"}</small>
        </button>)}
        {tab === "post_sale" && orders.map(o => <button key={o.order_id}
          onClick={() => void choose("post_sale", o.pack_id)}
          style={{ ...control, width: "100%", textAlign: "left", marginBottom: 8,
            background: selection?.id === o.pack_id ? "#eef5ff" : "white" }}>
          <strong>Pedido #{o.order_id}</strong><div>Conversa {o.pack_id}</div>
          <small style={{ color: "#7e8ca0" }}>{o.status || "Sem status"}</small>
        </button>)}
        {!loading && (tab === "question" ? !questions.length : !orders.length) &&
          <p style={{ color: "#7e8ca0" }}>Nenhum registro disponível nesta conta.</p>}
      </section>
      <section style={{ ...panel, display: "grid", gap: 16, alignContent: "start" }}>
        {!selection && <p style={{ color: "#7e8ca0" }}>Selecione um pedido ou pergunta para começar.</p>}
        {selection && <>
          <div><h3 style={{ margin: 0 }}>{selection.kind === "question" ? "Pergunta" : "Conversa pós-venda"} #{selection.id}</h3>
          <small style={{ color: "#7e8ca0" }}>Conta {account}</small></div>
          {chosenQuestion && <div style={{ padding: 16, background: "#f4f7fb", borderRadius: 12 }}>
            <p>{chosenQuestion.text}</p>
            {chosenQuestion.answer?.text && <p><strong>Resposta:</strong> {chosenQuestion.answer.text}</p>}
          </div>}
          {selection.kind === "post_sale" && <div style={{ display: "grid", gap: 10, maxHeight: 400, overflowY: "auto" }}>
            {messages.map((m, i) => <div key={m.message_id || i}
              style={{ padding: 14, borderRadius: 12, background: String(m.from?.user_id) === String(account) ? "#eaf3ff" : "#f4f7fb" }}>
              <small>{String(m.from?.user_id) === String(account) ? "Vendedor" : "Comprador / agente"}</small>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", marginBottom: 0 }}>
                {typeof m.text === "string" ? m.text : m.text?.plain || "Mensagem sem texto"}</p>
            </div>)}
          </div>}
          {(!chosenQuestion?.answer?.text || selection.kind === "post_sale") && <>
            <label htmlFor="support-reply">Sua resposta</label>
            <textarea id="support-reply" rows={5} maxLength={350} value={reply}
              onChange={e => setReply(e.target.value)} placeholder="Escreva sua resposta ao cliente…"
              style={{ ...control, width: "100%", resize: "vertical" }}/>
            <small style={{ color: "#7e8ca0" }}>{reply.length}/350 caracteres. A IA não envia mensagens automaticamente.</small>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button style={control} disabled={busy} onClick={() => void suggestion()}>{busy ? "Aguarde…" : "Sugerir com IA"}</button>
              <button style={primary} disabled={busy || !reply.trim()} onClick={() => void send()}>Revisar e enviar</button>
            </div>
          </>}
        </>}
      </section>
    </div>}
  </div>;
}
