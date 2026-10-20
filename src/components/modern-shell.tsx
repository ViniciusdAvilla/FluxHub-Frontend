"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, BadgeDollarSign, Bell, Boxes, ChevronRight, CircleHelp,
  Database, LayoutDashboard, Link2, LogOut, Menu, Package, Settings2,
  ShieldCheck, ShoppingBag, ShoppingCart, Users, X, Zap,
} from "lucide-react";

const sellerLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/anuncios", label: "Anúncios", icon: ShoppingBag },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/pedidos", label: "Pedidos", icon: Boxes },
  { href: "/financeiro", label: "Financeiro", icon: BadgeDollarSign },
  { href: "/integracoes", label: "Integrações", icon: Link2 },
  { href: "/dados", label: "Central de dados", icon: Database },
];
const adminLinks = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Clientes e usuários", icon: Users },
  { href: "/integracoes", label: "Integrações", icon: Link2 },
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
  const links = adminMode ? adminLinks : sellerLinks;
  return <div className="fh-app">
    <aside className={`fh-sidebar ${mobileOpen ? "fh-open" : ""}`}>
      <div className="fh-logo">
        <span className="fh-logo-mark"><Zap size={23} fill="currentColor" /></span>
        <strong>Flux<span>Hub</span></strong>
        <button className="fh-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={18}/></button>
      </div>
      <nav className="fh-nav" aria-label="Navegação">
        {links.map(({ href, icon: Icon, label }) =>
          <Link key={href + label} href={href}
            onClick={() => setMobileOpen(false)}
            className={path === href ? "fh-nav-active" : ""}>
            <Icon size={19} strokeWidth={1.85}/><span>{label}</span>
            {path === href && <ChevronRight size={14} className="fh-nav-tail" />}
          </Link>)}
        {isAdmin && !adminMode && <Link href="/admin" className="fh-admin-link"><ShieldCheck size={19}/> Administração</Link>}
        {adminMode && <Link href="/" className="fh-admin-link"><LayoutDashboard size={19}/> Painel do vendedor</Link>}
      </nav>
      <div className="fh-sidebar-bottom">
        <div className="fh-promo"><div className="fh-promo-icon"><ShieldCheck size={20}/></div>
          <strong>{adminMode ? "Controle da plataforma" : "Sua operação em um só lugar"}</strong>
          <p>{adminMode ? "Clientes, contas e integrações com isolamento por usuário." : "Acompanhe vendas, anúncios e dados reais do Mercado Livre."}</p>
        </div>
        <div className="fh-help"><CircleHelp size={17}/> {adminMode ? "Administração" : "Central FluxHub"}</div>
        <form method="post" action="/api/auth/logout"><button className="fh-signout" type="submit"><LogOut size={16}/> Sair da conta</button></form>
      </div>
    </aside>
    {mobileOpen && <button className="fh-overlay" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}/>}
    <div className="fh-content">
      <header className="fh-topbar">
        <button className="fh-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={23}/></button>
        <div className="fh-heading"><h1>{title}</h1><span>Início</span><ChevronRight size={14}/><span>{eyebrow || title}</span></div>
        <div className="fh-top-actions">{action}
          <Link href="/integracoes" title="Integrações" aria-label="Integrações" className="fh-top-icon"><Bell size={18}/></Link>
          <Link href={isAdmin ? "/admin" : "/integracoes"} className="fh-avatar" title="Minha conta"><Users size={16}/></Link>
        </div>
      </header>
      <main className="fh-main">{children}</main>
    </div>
  </div>;
}
