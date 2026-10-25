"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, CheckCheck, CircleAlert, Clock3, Inbox, LoaderCircle,
  MessageCircle, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react";

type Kind = "questions" | "messages";
type Account = {accountId: number; nickname: string};
type Thread = {reference: string; kind: Kind; title: string; preview: string;
  status: string; date: string | null; unread: boolean};
type Message = {id: string; text: string; date?: string | null; from_seller: boolean};
type Detail = {kind: Kind; reference: string; status: string; item_id?: string;
  messages: Message[]; can_reply: boolean};

async function loadJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, {cache:"no-store", credentials:"same-origin", signal});
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || "Falha ao consultar conversas.");
  return body;
}

export default function SupportCenter({accounts}: {accounts: Account[]}) {
  const [accountId,setAccountId] = useState(accounts[0]?.accountId ?? 0);
  const requestVersion = useRef(0);
  const [kind,setKind] = useState<Kind>("messages");
  const [threads,setThreads] = useState<Thread[]>([]);
  const [active,setActive] = useState<string | null>(null);
  const [detail,setDetail] = useState<Detail | null>(null);
  const [draft,setDraft] = useState("");
  const [loading,setLoading] = useState(false);
  const [detailLoading,setDetailLoading] = useState(false);
  const [busy,setBusy] = useState<"reply"|"suggest"|null>(null);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [refreshKey,setRefreshKey] = useState(0);

  useEffect(() => {
    if (!accountId) return;
    const abort = new AbortController();
    const version = ++requestVersion.current;
    setLoading(true); setThreads([]); setActive(null); setDetail(null);
    setDraft(""); setError(""); setNotice("");
    const query = new URLSearchParams({account_id:String(accountId), kind});
    loadJson(`/api/platform/support?${query}`, abort.signal)
      .then((data: {threads?: Thread[]}) => {
        if (!abort.signal.aborted && version===requestVersion.current) setThreads(Array.isArray(data.threads) ? data.threads : []);
      }).catch(e => { if (!abort.signal.aborted && version===requestVersion.current) setError(e instanceof Error?e.message:"Falha na consulta."); })
      .finally(() => { if (!abort.signal.aborted && version===requestVersion.current) setLoading(false); });
    return () => abort.abort();
  }, [accountId,kind,refreshKey]);

  const loadDetail = useCallback((ref: string) => {
    if (!accountId) return Promise.resolve();
    const version = ++requestVersion.current;
    const query = new URLSearchParams({account_id:String(accountId), kind, reference:ref});
    setDetailLoading(true); setDetail(null); setError(""); setNotice("");
    return loadJson(`/api/platform/support?${query}`)
      .then((data: Detail) => {
        // prevent showing data from a stale selection
        if (version===requestVersion.current) setDetail(data);
      }).catch(e=>{if(version===requestVersion.current) setError(e instanceof Error?e.message:"Falha na conversa.");})
      .finally(()=>{if(version===requestVersion.current) setDetailLoading(false);});
  }, [accountId,kind]);

  async function selectThread(reference: string) {
    setActive(reference); setDraft("");
    await loadDetail(reference);
  }
  async function action(op:"reply"|"suggest") {
    if (!detail || busy || !accountId) return;
    if (!detail.can_reply) {setError("Esta conversa não permite respostas neste momento.");return;}
    if (op === "reply" && (!draft.trim() || draft.length > (kind === "messages"?350:2000))) {
      setError("Confira o texto e o limite de caracteres deste canal."); return;
    }
    if (op === "reply" && !window.confirm("Confirmar envio desta resposta ao comprador pelo Mercado Livre?")) return;
    setBusy(op); setError(""); setNotice("");
    try {
      const response = await fetch("/api/platform/support",{
        method:"POST", headers:{"Content-Type":"application/json"},
        credentials:"same-origin",
        body:JSON.stringify({op,account_id:accountId,kind,reference:detail.reference,
          ...(op === "reply" ? {text:draft,confirmed:true}:{})}),
      });
      const data = await response.json().catch(()=>null);
      if (!response.ok) throw new Error(data?.error || "Não foi possível concluir.");
      if (op === "suggest") {
        if (typeof data.suggestion !== "string") throw new Error("Resposta da IA inválida.");
        setDraft(data.suggestion);
        setNotice("Sugestão preenchida. Revise e confirme antes de enviar.");
      } else {
        setDraft("");
        await loadDetail(detail.reference);
        setNotice("Resposta enviada pelo Mercado Livre e registrada no FluxHub.");
      }
    } catch(e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {setBusy(null);}
  }
  const limit = kind === "messages" ? 350 : 2000;
  return <div className="fh-support">
    <section className="fh-support-summary fh-card">
      <div><span className="fh-support-kicker">ATENDIMENTO DO VENDEDOR</span>
        <h2>Conversas do Mercado Livre</h2>
        <p>Leia mensagens pós-venda e perguntas dos anúncios. Responda manualmente ou peça uma sugestão da IA para revisar.</p>
      </div>
      <div className="fh-support-control">
        <label htmlFor="support-account">Conta conectada</label>
        <select id="support-account" value={accountId}
          onChange={event=>{requestVersion.current++;setAccountId(Number(event.target.value));}}>
          {accounts.map(a=><option value={a.accountId} key={a.accountId}>{a.nickname || a.accountId} · {a.accountId}</option>)}
        </select>
      </div>
    </section>
    {accounts.length===0 ? <div className="fh-card fh-support-empty"><Inbox size={30}/>
      <h3>Conecte uma conta Mercado Livre</h3>
      <p>Para consultar mensagens, vincule sua loja primeiro na seção Integrações.</p>
      <a href="/integracoes">Ir para integrações</a>
    </div> : <>
      <div className="fh-support-toolbar">
        <div className="fh-support-tabs" role="group" aria-label="Tipo de atendimento">
          <button type="button" className={kind==="messages"?"selected":""}
            aria-pressed={kind==="messages"} onClick={()=>{requestVersion.current++;setKind("messages");}}>
            <MessageCircle size={16}/> Pós-venda
          </button>
          <button type="button" className={kind==="questions"?"selected":""}
            aria-pressed={kind==="questions"} onClick={()=>{requestVersion.current++;setKind("questions");}}>
            <Inbox size={16}/> Perguntas de anúncios
          </button>
        </div>
        <button className="fh-support-reload" type="button" disabled={busy!==null}
          onClick={()=>{requestVersion.current++;setRefreshKey(i=>i+1);}}><RefreshCw size={15}/> Atualizar</button>
      </div>
      {error && <div className="fh-notice error" role="alert"><CircleAlert size={17}/>{error}</div>}
      {notice && <div className="fh-notice" role="status"><CheckCheck size={17}/>{notice}</div>}
      <div className="fh-support-grid">
        <aside className="fh-card fh-support-threads" aria-label="Lista de conversas">
          <header><strong>{kind==="messages"?"Mensagens e pedidos recentes":"Perguntas recebidas"}</strong>
            <span>{threads.length} encontrados</span></header>
          {loading ? <div className="fh-support-loader"><LoaderCircle className="fh-spin" size={22}/> Consultando Mercado Livre...</div>:
            threads.length===0?<div className="fh-support-no-data">Nenhuma conversa encontrada nessa consulta.</div>:
            <div className="fh-support-thread-list">
              {threads.map(thread=><button key={thread.reference} type="button"
                className={"fh-support-thread "+(active===thread.reference?"active":"")}
                aria-pressed={active===thread.reference} onClick={()=>void selectThread(thread.reference)}>
                <span className="fh-support-thread-top"><strong>{thread.title}</strong>
                  {thread.unread && <span className="fh-support-dot" title="Pendente"/>}</span>
                <span className="fh-support-preview">{thread.preview}</span>
                <span className="fh-support-state">{thread.unread?"Pendente":thread.status==="recent"?"Pedido recente":thread.status}</span>
              </button>)}
            </div>}
          {kind==="messages"&&<p className="fh-support-footnote">Exibimos mensagens pendentes e pedidos recentes. Alguns pedidos podem não ter conversas disponíveis.</p>}
        </aside>
        <section className="fh-card fh-support-conversation" aria-label="Conversa selecionada">
          {!active?<div className="fh-support-placeholder"><MessageCircle size={30}/>
            <h3>Selecione um atendimento</h3><p>Abra uma conversa à esquerda para ver as mensagens e responder.</p></div>:
            detailLoading?<div className="fh-support-placeholder"><LoaderCircle className="fh-spin" size={24}/> Carregando conversa...</div>:
            !detail?<div className="fh-support-placeholder"><CircleAlert size={25}/> Conversa indisponível. Selecione outra ou atualize.</div>:
            <>
              <header className="fh-support-conversation-head">
                <div><strong>{kind==="questions"?"Pergunta do anúncio":"Conversa pós-venda"} #{detail.reference}</strong>
                  <small>Estado informado pelo Mercado Livre: {detail.status||"não informado"}</small></div>
                <span className={"fh-support-availability "+(detail.can_reply?"yes":"no")}>
                  {detail.can_reply?"Resposta disponível":"Envio indisponível"}</span>
              </header>
              <div className="fh-support-messages" aria-live="polite">
                {detail.messages.length?detail.messages.map((message,i)=><div
                  className={"fh-support-bubble "+(message.from_seller?"seller":"buyer")}
                  key={message.id||String(i)}>
                  <span>{message.from_seller?"Sua loja":"Comprador / agente ML"}</span>
                  <p>{message.text||"(mensagem sem texto disponível)"}</p>
                  {message.date&&<small><Clock3 size={12}/>{new Date(message.date).toLocaleString("pt-BR")}</small>}
                </div>):<div className="fh-support-no-data">Sem mensagens disponíveis para este pedido.</div>}
              </div>
              <div className="fh-support-composer">
                <label htmlFor="support-draft">Sua resposta</label>
                <textarea id="support-draft" value={draft} maxLength={limit} rows={4}
                  disabled={!detail.can_reply||busy!==null} onChange={e=>setDraft(e.target.value)}
                  placeholder={detail.can_reply?"Escreva uma resposta ou gere uma sugestão...":"A conversa não está habilitada para resposta."}/>
                <div className="fh-support-limit">{draft.length}/{limit} caracteres</div>
                <div className="fh-support-actions">
                  <button className="fh-support-ai" type="button" disabled={!detail.can_reply||busy!==null}
                    onClick={()=>void action("suggest")}><Sparkles size={16}/>
                    {busy==="suggest"?"Gerando...":"Sugerir com IA"}</button>
                  <button className="fh-support-send" type="button"
                    disabled={!detail.can_reply||busy!==null||!draft.trim()}
                    onClick={()=>void action("reply")}><Send size={16}/>
                    {busy==="reply"?"Enviando...":"Revisar e enviar"}</button>
                </div>
                <p className="fh-support-disclosure"><ShieldCheck size={14}/>
                  O envio requer sua confirmação. Ao solicitar uma sugestão, o texto recente da conversa é processado pelo provedor de IA configurado no FluxHub. Nenhuma resposta é enviada automaticamente.</p>
              </div>
            </>}
        </section>
        <aside className="fh-card fh-support-help">
          <div className="fh-support-help-icon"><Bot size={24}/></div>
          <h3>Assistente FluxHub AI</h3>
          <p>Gere rascunhos para revisar antes de responder. A IA não tem acesso à senha do Mercado Livre nem envia mensagens por conta própria.</p>
          <div className="fh-support-help-rule"><ShieldCheck size={17}/>
            <span>Somente mensagens permitidas pela API oficial podem ser enviadas.</span></div>
          <div className="fh-support-help-rule"><CheckCheck size={17}/>
            <span>Cada vendedor acessa apenas as conversas da própria conta vinculada.</span></div>
        </aside>
      </div>
    </>}
  </div>;
}
