"use client";
import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";

export default function ConnectMarketplace({provider}:{provider:"mercado-livre"|"mercado-pago"}){
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function connect(){
    setBusy(true);setError("");
    try{
      const res=await fetch("/api/platform/connect",{method:"POST",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({provider})});
      const json=await res.json() as {authorization_url?:string;error?:string};
      if(!res.ok||!json.authorization_url) throw new Error(json.error||"Não foi possível iniciar conexão.");
      const url=new URL(json.authorization_url);
      if(url.protocol!=="https:") throw new Error("URL de autorização insegura.");
      window.location.assign(url.toString());
    }catch(e){setError(e instanceof Error?e.message:"Conexão indisponível.");setBusy(false);}
  }
  return <div><button type="button" onClick={connect} disabled={busy} className="fh-primary-btn">
    <Link2 size={16}/>{busy?"Abrindo autorização...":provider==="mercado-livre"?"Conectar Mercado Livre":"Conectar Mercado Pago"}<ExternalLink size={14}/>
  </button>{error&&<p className="fh-notice error" style={{marginTop:10}} role="alert">{error}</p>}</div>;
}
