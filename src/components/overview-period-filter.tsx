"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";

export default function OverviewPeriodFilter({days,accountId,accounts}:{days:number;accountId:number|null;accounts:{account_id:number;nickname:string|null}[]}) {
  const router=useRouter();
  return <div className="fh-glass-period-group">{accounts.length>1&&<label className="fh-glass-period"><select aria-label="Conta Mercado Livre" value={accountId===null?"":String(accountId)} onChange={event=>{const params=new URLSearchParams({days:String(days)});if(event.target.value)params.set("account",event.target.value);router.push("/?"+params.toString());}}><option value="">Todas as contas</option>{accounts.map(a=><option key={a.account_id} value={String(a.account_id)}>{a.nickname||a.account_id}</option>)}</select><ChevronDown size={15} aria-hidden="true"/></label>}<label className="fh-glass-period" aria-label="Período dos indicadores">
    <CalendarDays size={16} aria-hidden="true"/>
    <select aria-label="Período dos indicadores" value={String(days)}
      onChange={event=>{
        const params=new URLSearchParams({days:event.target.value});
        if(accountId!==null) params.set("account",String(accountId));
        router.push("/?"+params.toString());
      }}>
      <option value="7">Últimos 7 dias</option>
      <option value="30">Últimos 30 dias</option>
      <option value="90">Últimos 90 dias</option>
    </select>
    <ChevronDown size={15} aria-hidden="true"/>
  </label></div>;
}
