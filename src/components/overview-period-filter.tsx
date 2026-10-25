"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";

export default function OverviewPeriodFilter({days,accountId}:{days:number;accountId:number|null}) {
  const router=useRouter();
  return <label className="fh-glass-period" aria-label="Período dos indicadores">
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
  </label>;
}
