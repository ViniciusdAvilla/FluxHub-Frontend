"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import type { TimelinePoint } from "@/lib/seller-data";

function compactMoney(v: number) {return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(v);}
function pathFor(points: number[], max: number, width:number,height:number) {
  return points.map((v,i)=>`${i===0?"M":"L"} ${(i/(Math.max(1,points.length-1))*width).toFixed(2)} ${(height-(v/Math.max(1,max))*height).toFixed(2)}`).join(" ");
}

export function PerformanceChart({points}:{points:TimelinePoint[]}) {
  const data = useMemo(()=>[...points].sort((a,b)=>a.date.localeCompare(b.date)),[points]);
  const [hover,setHover] = useState<number|null>(null);
  if(!data.length) return <div className="fh-empty"><BarChart3 size={28}/><strong>Aguardando dados de vendas</strong><span>Conecte o Mercado Livre e sincronize pedidos para visualizar o histórico.</span></div>;
  const width=860,height=203,pad=10;
  const revenue=data.map(p=>Math.max(0,Number(p.gross_non_cancelled)||0));
  const visits=data.map(p=>Math.max(0,Number(p.visits)||0));
  const maxRev=Math.max(...revenue,1)*1.1, maxVisits=Math.max(...visits,1)*1.1;
  const primary=pathFor(revenue,maxRev,width,height), secondary=pathFor(visits,maxVisits,width,height);
  const date=data[hover??data.length-1];
  return <div>
    <div className="fh-chart-key" style={{marginBottom:5}}>
      <span><i className="fh-key-dot" style={{background:"#367dff"}}/>Pedidos brutos não cancelados</span>
      <span><i className="fh-key-dot" style={{background:"#9d69fd"}}/>Visitas (quando disponíveis)</span>
    </div>
    <div className="fh-chart-wrap" style={{position:"relative"}}>
      <svg viewBox="0 0 945 260" role="img" aria-label="Histórico de valores dos pedidos e visitas">
        <defs><linearGradient id="fhRevArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4087ff" stopOpacity=".23"/><stop offset="1" stopColor="#4087ff" stopOpacity=".01"/></linearGradient></defs>
        <g transform="translate(62,20)">
          {[0,.25,.5,.75,1].map((factor)=><g key={factor}><line x1="0" x2={width} y1={height*(1-factor)} y2={height*(1-factor)} stroke="#edf1f9" strokeDasharray="4 5"/><text textAnchor="end" x="-9" y={height*(1-factor)+4} className="fh-chart-label">{compactMoney(maxRev*factor)}</text></g>)}
          <path d={primary+` L ${width} ${height} L 0 ${height} Z`} fill="url(#fhRevArea)"/>
          <path d={primary} fill="none" stroke="#3b83f9" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
          {data.some(p=>p.visits!==null)&&<path d={secondary} fill="none" stroke="#a36aff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4"/>}
          {data.map((point,i)=><rect key={point.date} x={Math.max(0,(i/Math.max(1,data.length-1))*width-width/Math.max(1,data.length)/2)} y="0" width={width/Math.max(1,data.length)} height={height} fill="transparent" onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}/>)}
          {hover!==null&&<line x1={hover/Math.max(1,data.length-1)*width} x2={hover/Math.max(1,data.length-1)*width} y1="0" y2={height} stroke="#a4b9e5" strokeDasharray="4 4"/>}
          {data.filter((_,i)=>i%Math.max(1,Math.ceil(data.length/7))===0).map(p=><text key={p.date} className="fh-chart-label" textAnchor="middle" x={data.indexOf(p)/Math.max(1,data.length-1)*width} y={height+23}>{p.date.slice(5).split("-").reverse().join("/")}</text>)}
        </g>
      </svg>
      {hover!==null&&<div style={{position:"absolute",right:13,top:12,background:"#fff",border:"1px solid #e4eafa",borderRadius:10,padding:"10px 12px",boxShadow:"0 8px 25px #142a4d1e",fontSize:11,zIndex:2}}>
        <strong>{date.date.split("-").reverse().join("/")}</strong>
        <div>Pedidos: {compactMoney(date.gross_non_cancelled)}</div>
        <div>Visitas: {date.visits===null?"Não disponível":date.visits.toLocaleString("pt-BR")}</div>
      </div>}
    </div>
  </div>;
}
export function DailyBars({points}:{points:TimelinePoint[]}) {
  if (!points.length) return <div className="fh-empty"><BarChart3 size={21}/>Sem pedidos sincronizados.</div>;
  const entries=points.slice(-30),max=Math.max(...entries.map(p=>p.gross_non_cancelled),1);
  return <div style={{display:"flex",alignItems:"end",gap:4,height:154,paddingTop:12}}>
    {entries.map(p=><div key={p.date} title={`${p.date}: ${compactMoney(p.gross_non_cancelled)}`} style={{flex:1,height:"100%",display:"flex",alignItems:"end",minWidth:3}}>
      <span style={{height:`${Math.max(p.gross_non_cancelled>0?4:0,Math.min(100,(p.gross_non_cancelled/max)*100))}%`,background:"#3984ff",width:"100%",borderRadius:"4px 4px 0 0"}}/>
    </div>)}
  </div>;
}
export function DonutStats({items,label}:{items:{name:string;value:number;color:string}[];label:string}) {
  const total=items.reduce((sum,i)=>sum+i.value,0);
  if(!total) return <div className="fh-empty"><BarChart3 size={22}/>Sem dados para este período.</div>;
  let current=0;
  const gradients=items.filter(i=>i.value>0).map(item=>{const start=current;current+=(item.value/total)*100;return `${item.color} ${start}% ${current}%`;});
  return <div style={{display:"flex",alignItems:"center",gap:15,minHeight:151}}>
    <div style={{position:"relative",width:125,height:125,flexShrink:0,borderRadius:"50%",background:`conic-gradient(${gradients.join(",")})`}}>
      <div style={{position:"absolute",inset:23,borderRadius:"50%",background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <strong style={{fontSize:18}}>{total.toLocaleString("pt-BR")}</strong><span style={{fontSize:10,color:"#98a4bc"}}>{label}</span>
      </div>
    </div>
    <div style={{flex:1,minWidth:0}}>
      {items.filter(i=>i.value>0).map(i=><div key={i.name} className="fh-mini-row" style={{padding:"5px 0",fontSize:11}}>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><i className="fh-key-dot" style={{background:i.color}}/>{i.name}</span><strong>{Math.round(i.value/total*100)}%</strong>
      </div>)}
    </div>
  </div>;
}
