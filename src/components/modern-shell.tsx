"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import MercadoLivreIdentity from "./mercado-livre-identity";
import {
  Activity, BadgeDollarSign, Bell, Boxes, ChartNoAxesCombined,
  CircleHelp, ClipboardList, LayoutDashboard, Link2, LogOut, Menu,
  Package, Settings2, ShieldCheck, ShoppingCart, Users, X, Zap,
  MessagesSquare,
} from "lucide-react";

const modules = [
  { label: "Visão geral", href: "/", icon: LayoutDashboard, paths: ["/"], tabs: [
    { label: "Resumo geral", href: "/" },
    { label: "Desempenho", href: "/#desempenho" },
    { label: "Alertas", href: "/#alertas" },
  ] },
  { label: "Vendas e pedidos", href: "/vendas", icon: ShoppingCart, paths: ["/vendas", "/pedidos"], tabs: [
    { label: "Resumo de vendas", href: "/vendas" },
    { label: "Pedidos", href: "/pedidos" },
  ] },
  { label: "Produtos e anúncios", href: "/produtos", icon: Package, paths: ["/produtos", "/anuncios", "/estoque"], tabs: [
    { label: "Meus produtos", href: "/produtos" },
    { label: "Meus anúncios", href: "/anuncios" },
    { label: "Controle de estoque", href: "/estoque" },
  ] },
  { label: "Gestão de compras", href: "/fabricantes", icon: Boxes, paths: ["/fabricantes", "/reposicao"], tabs: [
    { label: "Fornecedores e fabricantes", href: "/fabricantes" },
    { label: "Compras e reposição", href: "/reposicao" },
  ] },
  { label: "Relatórios e análises", href: "/curva-abc", icon: ChartNoAxesCombined, paths: ["/curva-abc", "/raio-x"], tabs: [
    { label: "Curva ABC", href: "/curva-abc" },
    { label: "Raio-X de anúncios", href: "/raio-x" },
  ] },
  { label: "Financeiro", href: "/financeiro", icon: BadgeDollarSign, paths: ["/financeiro"], tabs: [
    { label: "Resumo financeiro", href: "/financeiro" },
  ] },
  { label: "Atendimento", href: "/mensagens", icon: MessagesSquare, paths: ["/mensagens"], tabs: [
    { label: "Mensagens e sugestões de IA", href: "/mensagens" },
  ] },
  { label: "Configurações", href: "/dados", icon: Settings2, paths: ["/dados", "/integracoes"], tabs: [
    { label: "Central de dados", href: "/dados" },
    { label: "Integrações", href: "/integracoes" },
  ] },
];
const adminLinks = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Clientes e usuários", icon: Users },
];
const descriptions: Record<string,string> = {
  "/": "Tudo o que acontece na sua loja, em um só lugar.",
  "/vendas": "Acompanhe resultados comerciais e pedidos da sua operação.",
  "/produtos": "Gerencie seu catálogo e acompanhe o desempenho da sua loja.",
  "/fabricantes": "Organize fornecedores, compras e reposição.",
  "/curva-abc": "Identifique oportunidades e produtos que merecem atenção.",
  "/financeiro": "Acompanhe custos, receita e rentabilidade da loja.",
  "/mensagens": "Converse com seus clientes e revise sugestões de IA.",
  "/dados": "Gerencie dados e conexões da sua operação.",
};

export default function ModernShell({
  title, eyebrow, isAdmin = false, adminMode = false, children, action,
}: {
  title: string;
  eyebrow?: string;
  isAdmin?: boolean;
  adminMode?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hash, setHash] = useState("");
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const activeModule = modules.find(item => item.paths.some(p => p === "/" ? path === "/" : path === p || path.startsWith(p + "/"))) ?? modules[0];
  const activeRoot = activeModule.href;
  const sellerTitle = activeModule.label;
  const currentTab = activeModule.tabs.find(t => t.href === path + (path === "/" ? hash : "")) ??
    activeModule.tabs.find(t => t.href === path) ?? activeModule.tabs[0];

  return <div className="fh-app fh-liquid-glass">
    <aside className={`fh-sidebar ${mobileOpen ? "fh-open" : ""}`}>
      <div className="fh-logo">
        <span className="fh-logo-mark"><Zap size={23} fill="currentColor" /></span>
        <strong>Flux<span>Hub</span></strong>
        <button className="fh-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18}/></button>
      </div>
      <nav className="fh-nav" aria-label={adminMode ? "Navegação administrativa" : "Navegação principal"}>
        {adminMode ? adminLinks.map(({href,label,icon:Icon})=>
          <Link key={href} href={href} onClick={()=>setMobileOpen(false)} aria-current={path===href?"page":undefined} className={path===href?"fh-nav-active":""}>
            <Icon size={19} strokeWidth={1.85}/><span>{label}</span>
          </Link>
        ) : modules.map(({href,label,icon:Icon})=>
          <Link key={href} href={href} onClick={()=>setMobileOpen(false)} aria-current={activeRoot===href?"page":undefined} className={activeRoot===href?"fh-nav-active":""}>
            <Icon size={19} strokeWidth={1.85}/><span>{label}</span>
          </Link>
        )}
        {isAdmin && !adminMode && <Link href="/admin" className="fh-admin-link" onClick={()=>setMobileOpen(false)}><ShieldCheck size={19}/> Administração</Link>}
        {adminMode && <Link href="/" className="fh-admin-link" onClick={()=>setMobileOpen(false)}><LayoutDashboard size={19}/> Painel do vendedor</Link>}
      </nav>
      <div className="fh-sidebar-bottom">
        <div className="fh-help"><CircleHelp size={17}/> {adminMode ? "Administrador Master" : "Central FluxHub"}</div>
        <form method="post" action="/api/auth/logout"><button className="fh-signout" type="submit"><LogOut size={16}/> Sair da conta</button></form>
      </div>
    </aside>
    {mobileOpen && <button className="fh-overlay" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}/>}
    <div className="fh-content">
      <header className="fh-topbar">
        <button className="fh-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={23}/></button>
        <div className="fh-heading">
          <h1>{adminMode ? title : sellerTitle}</h1>
          <p>{adminMode ? eyebrow || "Gestão da plataforma" : descriptions[activeRoot] || "Gestão integrada da sua operação no Mercado Livre."}</p>
        </div>
        <div className="fh-top-actions">{action}
          <Link href="/integracoes" title="Integrações" aria-label="Integrações" className="fh-top-icon"><Bell size={18}/></Link>
          <Link href={adminMode ? "/admin" : "/integracoes"} className="fh-account-control"
            title={adminMode ? "Administrador Master" : "Conta Mercado Livre"}>
            {adminMode ? <span className="fh-admin-account"><span className="fh-avatar"><Users size={16}/></span><span>Administrador Master</span></span> : <MercadoLivreIdentity variant="header"/>}
          </Link>
        </div>
      </header>
      {adminMode ? <nav className="fh-subnav" aria-label="Área administrativa">
        {adminLinks.map(item=><Link key={item.href} href={item.href} className={path===item.href?"fh-tab-active":""} aria-current={path===item.href?"page":undefined}>{item.label}</Link>)}
      </nav> : <nav className="fh-subnav" aria-label={`Abas de ${activeModule.label}`}>
        {activeModule.tabs.map(tab=><Link key={tab.href} href={tab.href}
          aria-current={currentTab.href===tab.href?"page":undefined}
          className={currentTab.href===tab.href?"fh-tab-active":""}
          onClick={()=>{ if(tab.href.startsWith("/#")) setHash(tab.href.slice(1)); }}>
          {tab.label}
        </Link>)}
      </nav>}
      <main className="fh-main">{children}</main>
    </div>
  </div>;
}
