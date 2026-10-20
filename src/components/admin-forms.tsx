"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";

async function doAdmin(payload:Record<string,unknown>){
  const res=await fetch("/api/platform/admin",{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const data=await res.json() as {error?:string};
  if(!res.ok) throw new Error(data.error||"Operação indisponível.");
  return data;
}
export function CreateClientForm(){
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const router=useRouter();
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setMessage("");
    try{await doAdmin({action:"create",email,password});setMessage("Cliente criado com sucesso.");setEmail("");setPassword("");router.refresh();}
    catch(e){setMessage(e instanceof Error?e.message:"Erro ao cadastrar.");}
    finally{setBusy(false);}
  }
  return <form className="fh-form" onSubmit={save}>
    <label>E-mail do novo usuário <input type="email" required maxLength={320} value={email} onChange={e=>setEmail(e.target.value)} placeholder="cliente@empresa.com.br" autoComplete="off"/></label>
    <label>Senha inicial <input type="password" required minLength={12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo 12 caracteres"/></label>
    <button type="submit" className="fh-primary-btn" disabled={busy}><UserPlus size={16}/>{busy?"Criando...":"Criar cliente"}</button>
    {message&&<p role="status" style={{fontSize:12,color:"#5c749e",margin:0}}>{message}</p>}
  </form>;
}
export function ClientControls({id,active,admin}:{id:number;active:boolean;admin:boolean}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const router=useRouter();
  async function run(action:"status"|"reset"){
    if(busy)return;
    let password:string|undefined;
    if(action==="reset"){const answer=window.prompt("Nova senha do cliente (mínimo 12 caracteres):");if(!answer)return;if(answer.length<12){setMessage("Senha curta.");return;}password=answer;}
    if(action==="status"&&!window.confirm(active?"Desativar o acesso deste cliente?":"Reativar este cliente?"))return;
    setBusy(true);setMessage("");
    try{await doAdmin({action,id,enabled:!active,password});setMessage("Alteração aplicada.");router.refresh();}
    catch(e){setMessage(e instanceof Error?e.message:"Falha ao atualizar.")}
    finally{setBusy(false);}
  }
  return <div className="fh-inline-actions">
    <button className="fh-control" type="button" disabled={busy||admin} onClick={()=>run("status")}>{active?"Desativar":"Ativar"}</button>
    <button className="fh-control" type="button" disabled={busy} onClick={()=>run("reset")}>Trocar senha</button>
    {message&&<small role="status">{message}</small>}
  </div>;
}
