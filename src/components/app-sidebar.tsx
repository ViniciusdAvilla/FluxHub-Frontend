"use client";

import Link from "next/link";
import {
  Activity, BadgeDollarSign, Boxes, Calculator, ChartNoAxesCombined, ChevronRight,
  ClipboardList, Database, Factory, Gauge, LogOut, Package, ScanSearch,
  ShoppingCart, X,
} from "lucide-react";
import type { View } from "./platform-page";

export const navigation: Array<{ view: View; href: string; label: string; icon: typeof Gauge }> = [
  { view: "overview", href: "/", label: "Visão geral", icon: Gauge },
  { view: "products", href: "/produtos", label: "Produtos", icon: Package },
  { view: "raiox", href: "/raio-x", label: "Raio-X de anúncios", icon: ScanSearch },
  { view: "inventory", href: "/estoque", label: "Estoque", icon: Boxes },
  { view: "finance", href: "/financeiro", label: "Financeiro", icon: BadgeDollarSign },
  { view: "manufacturers", href: "/fabricantes", label: "Fabricantes", icon: Factory },
  { view: "pricing", href: "/precificacao", label: "Precificação", icon: Calculator },
  { view: "replenishment", href: "/reposicao", label: "Compras e reposição", icon: ShoppingCart },
  { view: "abc", href: "/curva-abc", label: "Curva ABC", icon: ChartNoAxesCombined },
  { view: "orders", href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { view: "data", href: "/dados", label: "Central de dados", icon: Database },
];

export default function AppSidebar({
  view, open = false, onClose, connected, endpointCount,
}: {
  view: View;
  open?: boolean;
  onClose?: () => void;
  connected?: boolean;
  endpointCount?: number;
}) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand-block">
        <div className="brand-mark"><Activity size={19} /></div>
        <div><strong>FluxHub</strong><small>Gestão inteligente</small></div>
        {onClose && <button type="button" className="icon-button mobile-close" onClick={onClose} aria-label="Fechar menu"><X size={18} /></button>}
      </div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        <span className="nav-section">MENU PRINCIPAL</span>
        {navigation.map(({ view: itemView, href, label, icon: Icon }) => (
          <Link key={itemView} href={href} aria-current={view === itemView ? "page" : undefined} className={view === itemView ? "active" : ""} onClick={onClose}>
            <Icon size={18} /><span>{label}</span>{view === itemView && <ChevronRight size={14} />}
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        {endpointCount !== undefined && (
          <div className={`connection ${connected ? "online" : "offline"}`}>
            <i /><div><strong>{connected ? "Operação conectada" : "Sem atualização"}</strong><span>{endpointCount} consultas mapeadas</span></div>
          </div>
        )}
        <form action="/api/auth/logout" method="post">
          <button className="logout-button" type="submit"><LogOut size={16} /> Sair da conta</button>
        </form>
      </div>
    </aside>
  );
}
