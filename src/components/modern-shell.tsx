"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import MercadoLivreIdentity from "./mercado-livre-identity";
import {
  Activity, BadgeDollarSign, Bell, Boxes, ChevronDown, ChevronRight, CircleHelp,
  ChartNoAxesCombined, ClipboardList,
  Database, LayoutDashboard, Link2, LogOut, Menu, Package, Settings2,
  ShieldCheck, ShoppingBag, ShoppingCart, Users, X, Zap, MessagesSquare,
} from "lucide-react";

const sellerLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/anuncios", label: "Anúncios", icon: ShoppingBag },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/financeiro", label: "Financeiro", icon: BadgeDollarSign },
  { href: "/fabricantes", label: "Fabricantes", icon: Users },
  { href: "/reposicao", label: "Compras e reposição", icon: Activity },
  { href: "/curva-abc", label: "Curva ABC", icon: ChartNoAxesCombined },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/mensagens", label: "Atendimento", icon: MessagesSquare },
  { href: "/raio-x", label: "Raio-X de anúncios", icon: ShieldCheck },
];
const adminLinks = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Clientes e usuários", icon: Users },
  { href: "/admin", label: "Operação", icon: Activity },
];

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
  const settingsActive = path === "/dados" || path === "/integracoes";
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);
  const settingsId = useId();
  useEffect(() => { if (settingsActive) setSettingsOpen(true); }, [settingsActive]);
  const links = adminMode ? adminLinks : sellerLinks;
  return <div className="fh-app">
    <aside className={`fh-sidebar ${mobileOpen ? "fh-open" : ""}`}>
      <div className="fh-logo">
        <span className="fh-logo-mark"><Zap size={23} fill="currentColor" /></span>
        <strong>Flux<span>Hub</span></strong>
        <button className="fh-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18}/></button>
      </div>
      <nav className="fh-nav" aria-label={adminMode ? "Navegação administrativa" : "Navegação principal"}>
        {links.map(({ href, icon: Icon, label }) =>
          <Link key={href + label} href={href}
            onClick={() => setMobileOpen(false)}
            aria-current={path === href ? "page" : undefined}
            className={path === href ? "fh-nav-active" : ""}>
            <Icon size={19} strokeWidth={1.85}/><span>{label}</span>
            {path === href && <ChevronRight size={14} className="fh-nav-tail" />}
          </Link>)}
        <button type="button"
          className={`fh-settings-trigger ${settingsActive ? "fh-settings-active" : ""}`}
          aria-expanded={settingsOpen} aria-controls={settingsId}
          onClick={() => setSettingsOpen(open => !open)}>
          <Settings2 size={19} strokeWidth={1.85}/>
          <span>Configurações</span>
          <ChevronDown size={15} className={`fh-settings-chevron ${settingsOpen ? "open" : ""}`}/>
        </button>
        {settingsOpen && <div id={settingsId} className="fh-settings-children" role="group" aria-label="Configurações">
          <Link href="/dados" onClick={() => setMobileOpen(false)}
            aria-current={path === "/dados" ? "page" : undefined}
            className={path === "/dados" ? "fh-nav-active" : ""}>
            <Database size={17}/><span>Central de dados</span>
          </Link>
          <Link href="/integracoes" onClick={() => setMobileOpen(false)}
            aria-current={path === "/integracoes" ? "page" : undefined}
            className={path === "/integracoes" ? "fh-nav-active" : ""}>
            <Link2 size={17}/><span>Integrações</span>
          </Link>
        </div>}
        {isAdmin && !adminMode && <Link href="/admin" className="fh-admin-link"><ShieldCheck size={19}/> Administração</Link>}
        {adminMode && <Link href="/" className="fh-admin-link"><LayoutDashboard size={19}/> Painel do vendedor</Link>}
      </nav>
      <div className="fh-sidebar-bottom">
        <div className="fh-promo"><div className="fh-promo-icon"><ShieldCheck size={20}/></div>
          <strong>{adminMode ? "Controle da plataforma" : "Sua operação em um só lugar"}</strong>
          <p>{adminMode ? "Clientes, contas e integrações com isolamento por usuário." : "Acompanhe vendas, anúncios e dados reais do Mercado Livre."}</p>
        </div>
        <div className="fh-help"><CircleHelp size={17}/> {adminMode ? "Administrador Master" : "Central FluxHub"}</div>
        <form method="post" action="/api/auth/logout"><button className="fh-signout" type="submit"><LogOut size={16}/> Sair da conta</button></form>
      </div>
    </aside>
    {mobileOpen && <button className="fh-overlay" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}/>}
    <div className="fh-content">
      <header className="fh-topbar">
        <button className="fh-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={23}/></button>
        <div className="fh-heading"><h1>{title}</h1><span>Início</span><ChevronRight size={14}/><span>{eyebrow || title}</span></div>
        <div className="fh-top-actions">{action}
          <Link href="/integracoes" title="Mercado Livre" aria-label="Mercado Livre" className="fh-top-icon"><Bell size={18}/></Link>
          <Link href={adminMode ? "/admin" : "/integracoes"} className="fh-account-control"
            title={adminMode ? "Administrador Master" : "Conta Mercado Livre"}>
            {adminMode ? <span className="fh-admin-account">
              <span className="fh-avatar"><Users size={16}/></span>
              <span>Administrador Master</span>
            </span> : <MercadoLivreIdentity variant="header"/>}
          </Link>
        </div>
      </header>
      <main className="fh-main">{children}</main>
    </div>
  </div>;
}
