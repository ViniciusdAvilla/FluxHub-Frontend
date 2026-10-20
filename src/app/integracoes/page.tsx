import { Link2, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, Wallet } from "lucide-react";
import ModernShell from "@/components/modern-shell";
import ConnectMarketplace from "@/components/connect-marketplace";
import { backendRequest } from "@/lib/backend-transport";
import { sellerIdentity, type Account, type SourceStatus } from "@/lib/seller-data";
import SyncAction from "@/components/sync-action";
export const dynamic="force-dynamic";
export const runtime="nodejs";
type MPAccount={account_id:string;connected:boolean;expires_at:string};
async function fetchSafe<T>(path:string):Promise<T|null>{
 try{return await backendRequest(path) as T;}catch{return null;}
}
export default async function Integrations(){
 const [user,ml,mp,sources]=await Promise.all([
  sellerIdentity(),fetchSafe<Account[]>("/api/v1/connectors/mercado-livre"),
  fetchSafe<MPAccount[]>("/api/v1/connectors/mercado-pago"),
  fetchSafe<SourceStatus[]>("/api/v1/connectors")]);
 return <ModernShell title="Integrações" eyebrow="Conectar marketplaces" isAdmin={Boolean(user?.is_admin)}>
   <div className="fh-notice"><ShieldCheck size={15} style={{verticalAlign:"middle",marginRight:5}}/>As contas são autorizadas nas páginas oficiais do Mercado Livre e Mercado Pago. Tokens nunca são expostos no navegador.</div>
   <div className="fh-hero-grid">
     <section className="fh-card"><div className="fh-card-head"><div><h2>Mercado Livre</h2><p>Conecte um vendedor para consultar anúncios, visitas e pedidos</p></div><span className={`fh-pill ${ml?.length?"":"offline"}`}>{ml?.length?"Conectado":"Não conectado"}</span></div>
       <ConnectMarketplace provider="mercado-livre"/>
       <hr className="fh-separator"/>
       {(ml||[]).map(a=><div key={a.account_id} className="fh-info-row"><div><strong style={{display:"block"}}>{a.nickname||"Conta Mercado Livre"}</strong><span>Seller ID: {a.account_id}</span></div><SyncAction accountId={a.account_id}/></div>)}
       {ml!==null&&!ml.length&&<div className="fh-empty"><Link2 size={24}/>Nenhum vendedor Mercado Livre associado.</div>}
       {ml===null&&<div className="fh-notice error">Não foi possível consultar as contas. Verifique o backend.</div>}
     </section>
     <section className="fh-card"><div className="fh-card-head"><div><h2>Mercado Pago</h2><p>Autorize consulta de pagamentos para a sua conta</p></div><span className={`fh-pill ${mp?.length?"":"offline"}`}>{mp?.length?"Conectado":"Não conectado"}</span></div>
       <ConnectMarketplace provider="mercado-pago"/>
       <hr className="fh-separator"/>
       {(mp||[]).map(a=><div key={a.account_id} className="fh-info-row"><span><Wallet size={16} style={{verticalAlign:"middle"}}/> Conta {a.account_id}</span><strong>Conectada</strong></div>)}
       {mp!==null&&!mp.length&&<div className="fh-empty"><Wallet size={24}/>Nenhuma conta Mercado Pago associada.</div>}
       {mp===null&&<div className="fh-notice error">Não foi possível consultar o Mercado Pago.</div>}
     </section>
   </div>
   <section className="fh-card"><div className="fh-card-head"><div><h2>Fontes de dados cadastradas</h2><p>Sincronizações e fontes identificadas pelo backend</p></div></div>
     <div className="fh-table-wrap"><table className="fh-table"><thead><tr><th>Provedor</th><th>Conta</th><th>Estado</th><th>Última sincronização</th></tr></thead><tbody>
       {(sources||[]).map(s=><tr key={s.provider+s.account_key}><td><strong>{s.provider}</strong></td><td>{s.display_name||s.account_key}</td><td><span className={`fh-pill ${s.connected&&s.enabled?"":"offline"}`}>{s.connected&&s.enabled?"Ativo":s.connected?"Pausado":"Desconectado"}</span></td><td>{s.last_synced_at?new Date(s.last_synced_at).toLocaleString("pt-BR"):"—"}</td></tr>)}
       {!sources?.length&&<tr><td colSpan={4} style={{padding:25,textAlign:"center"}}>Nenhuma fonte cadastrada.</td></tr>}
     </tbody></table></div>
   </section>
 </ModernShell>;
}
