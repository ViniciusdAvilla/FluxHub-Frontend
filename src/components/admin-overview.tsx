import Link from "next/link";
import { Activity, AlertCircle, BarChart3, Boxes, Database, Link2, ShieldCheck, UserRound, Users, Wallet } from "lucide-react";
import { number } from "@/lib/analytics";
import type { AdminReport } from "@/lib/admin-data";
import ModernShell from "./modern-shell";
import { DonutStats } from "./modern-charts";
import { CreateClientForm, ClientControls } from "./admin-forms";

function Tile({name,count,color,icon:Icon}:{name:string;count:number|null;color:"blue"|"green"|"purple"|"orange"|"rose";icon:typeof Users}){
return <article className={`fh-kpi ${color}`}><div className="fh-kpi-top"><span className="fh-kpi-icon"><Icon size={18}/></span><span className="fh-kpi-label">{name}</span></div><strong className="fh-kpi-value">{number(count)}</strong><span className="fh-kpi-note">Dados atuais do backend</span></article>;
}
export default function AdminOverview({data,clientsOnly=false}:{data:AdminReport;clientsOnly?:boolean}){
  const v=data.overview;
  const total=v?.total_users??null;
  const inactive=total!==null?(total-(v?.active_users||0)):null;
  const mlConnected=data.clients.filter(c=>c.sources.some(s=>s.provider==="mercado_livre"&&s.connected)).length;
  const mpConnected=data.clients.filter(c=>c.sources.some(s=>s.provider==="mercado_pago"&&s.connected)).length;
  return <ModernShell title={clientsOnly?"Clientes":"Administração"} eyebrow={clientsOnly?"Gerenciamento":"Visão geral"} adminMode isAdmin>
    {data.error&&<div className="fh-notice error" role="alert">{data.error}. Faça login com uma conta de administrador do FluxHub.</div>}
    {!clientsOnly&&<>
      <div className="fh-kpis">
        <Tile icon={Users} color="blue" name="Clientes ativos" count={v?.active_users??null}/>
        <Tile icon={UserRound} color="blue" name="Usuários cadastrados" count={total}/>
        <Tile icon={Link2} color="orange" name="Contas ML conectadas" count={v?.mercado_livre_accounts??null}/>
        <Tile icon={Wallet} color="blue" name="Contas MP conectadas" count={v?.mercado_pago_accounts??null}/>
        <Tile icon={Boxes} color="purple" name="Produtos cadastrados" count={v?.total_products??null}/>
        <Tile icon={ShieldCheck} color="green" name="Usuários ativos" count={v?.active_users??null}/>
        <Tile icon={Activity} color="green" name="Clientes com integração ML" count={data.error?null:mlConnected}/>
        <Tile icon={AlertCircle} color="rose" name="Usuários inativos" count={inactive}/>
      </div>
      <div className="fh-hero-grid">
        <section className="fh-card"><div className="fh-card-head"><div><h2>Contas e integrações da plataforma</h2><p>Visão atual das conexões registradas no PostgreSQL</p></div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:15}}>
            <DonutStats label="contas" items={[{name:"Mercado Livre",value:v?.mercado_livre_accounts||0,color:"#3b82f6"},{name:"Mercado Pago",value:v?.mercado_pago_accounts||0,color:"#20c58a"}]}/>
            <DonutStats label="usuários" items={[{name:"Ativos",value:v?.active_users||0,color:"#20c58a"},{name:"Inativos",value:inactive||0,color:"#f27c87"}]}/>
          </div>
          <div className="fh-notice" style={{marginTop:16,marginBottom:0}}>O backend ainda não armazena histórico de assinaturas, webhooks ou receita recorrente. Esses indicadores não são simulados.</div>
        </section>
        <section className="fh-card"><div className="fh-card-head"><div><h2>Status da plataforma</h2><p>Serviços vinculados à operação</p></div></div>
          <div className="fh-info-row"><span>Autenticação de usuários</span><strong className={`fh-pill ${v?"":"offline"}`}>{v?"API respondeu":"Indisponível"}</strong></div>
          <div className="fh-info-row"><span>Banco de dados</span><strong>{v?"Consultado via FastAPI":"Não confirmado"}</strong></div>
          <div className="fh-info-row"><span>Isolamento</span><strong>Por conta de usuário</strong></div>
          <div className="fh-info-row"><span>Mercado Livre</span><strong>{number(v?.mercado_livre_accounts??null)} conexões</strong></div>
          <div className="fh-info-row"><span>Mercado Pago</span><strong>{number(v?.mercado_pago_accounts??null)} conexões</strong></div>
          <div className="fh-info-row"><span>Filas e webhooks</span><strong>Não instrumentados</strong></div>
          <Link href="/integracoes" className="fh-info-action" style={{marginTop:16}}>Gerenciar integrações →</Link>
        </section>
      </div>
    </>}
    <div className="fh-admin-grid">
      <section className="fh-card"><div className="fh-card-head"><div><h2>Clientes da plataforma</h2><p>Usuários e conexões cadastradas no backend</p></div><Link href="/admin/clientes" className="fh-card-link">Gerenciar →</Link></div>
        <div className="fh-table-wrap"><table className="fh-table"><thead><tr><th>Usuário</th><th>Status</th><th>Mercado Livre</th><th>Mercado Pago</th><th>Cadastrado em</th>{clientsOnly&&<th>Ações</th>}</tr></thead>
          <tbody>{data.clients.map(c=><tr key={c.user.id}>
            <td className="fh-table-name"><strong>{c.user.email}</strong><small>ID {c.user.id} · {c.user.is_admin?"Admin":"Cliente"}</small></td>
            <td><span className={`fh-pill ${c.user.is_active?"":"offline"}`}>{c.user.is_active?"Ativo":"Inativo"}</span></td>
            <td><span className={`fh-pill ${c.sources.some(s=>s.provider==="mercado_livre"&&s.connected)?"":"offline"}`}>{c.sources.some(s=>s.provider==="mercado_livre"&&s.connected)?"Conectado":"Não conectado"}</span></td>
            <td><span className={`fh-pill ${c.sources.some(s=>s.provider==="mercado_pago"&&s.connected)?"":"offline"}`}>{c.sources.some(s=>s.provider==="mercado_pago"&&s.connected)?"Conectado":"Não conectado"}</span></td>
            <td>{new Date(c.user.created_at).toLocaleDateString("pt-BR")}</td>
            {clientsOnly&&<td><ClientControls id={c.user.id} active={c.user.is_active} admin={c.user.is_admin}/></td>}
          </tr>)}
          {!data.clients.length&&<tr><td colSpan={clientsOnly?6:5} style={{textAlign:"center",padding:28}}>Nenhum usuário disponível.</td></tr>}
          </tbody>
        </table></div>
        {data.clients.length===100&&<p style={{color:"#8d9ab1",fontSize:11}}>Exibindo os primeiros 100 usuários. Use a paginação da API para os seguintes.</p>}
      </section>
      <section className="fh-card"><div className="fh-card-head"><div><h2>Criar cliente</h2><p>Cadastro no PostgreSQL pelo FastAPI</p></div></div>
        <CreateClientForm/><hr className="fh-separator"/>
        <div className="fh-admin-actions"><Link href="/integracoes">Conexões Mercado Livre e Pago</Link><Link href="/dados">Consultar dados da API</Link><Link href="/">Abrir painel do vendedor</Link></div>
      </section>
    </div>
  </ModernShell>;
}
