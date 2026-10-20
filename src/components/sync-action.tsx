"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function SyncAction({accountId}:{accountId:number}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const router=useRouter();
  async function run() {
    if (busy) return;
    setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/platform/sync",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({accountId}),cache:"no-store"
      });
      const data=await response.json() as {error?:string;listings?:number;orders?:number;partial?:boolean};
      if(!response.ok) throw new Error(data.error||"Falha na sincronização.");
      setMessage(`Página sincronizada: ${data.listings??0} anúncios, ${data.orders??0} pedidos.`);
      router.refresh();
    } catch(e) {setMessage(e instanceof Error?e.message:"Erro de sincronização.");}
    finally {setBusy(false);}
  }
  return <div><button className="fh-primary-btn" type="button" onClick={run} disabled={busy}>
    <RefreshCw size={16} className={busy?"fh-spinning":""}/>{busy?"Sincronizando...":"Sincronizar dados"}
  </button>{message&&<p style={{fontSize:11,color:"#68799a",maxWidth:260}} role="status">{message}</p>}</div>;
}
