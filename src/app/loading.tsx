"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import AppSidebar, { navigation } from "@/components/app-sidebar";

export default function Loading() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const view = navigation.find((item) => item.href === pathname)?.view ?? "overview";
  const name = navigation.find((item) => item.view === view)?.label ?? "Painel";
  return (
    <div className="app-shell" aria-busy="true" aria-label="Carregando conteúdo">
      {open && <button className="menu-backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
      <AppSidebar view={view} open={open} onClose={() => setOpen(false)} />
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button menu-toggle" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>FluxHub</span><span className="crumb-arrow">/</span><strong>{name}</strong></div>
          <div className="topbar-actions"><span className="skeleton skeleton-button" /></div>
        </header>
        <main className="skeleton-page">
          <div className="page-heading"><div><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-heading" /><span className="skeleton skeleton-description" /></div></div>
          <div className="skeleton-toolbar"><span className="skeleton skeleton-input" /><span className="skeleton skeleton-filter" /><span className="skeleton skeleton-filter" /></div>
          <div className="metric-grid four">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="metric-card skeleton-metric"><span className="skeleton skeleton-label" /><span className="skeleton skeleton-number" /><span className="skeleton skeleton-label short" /></div>)}
          </div>
          <section className="panel skeleton-panel"><div className="panel-head"><span className="skeleton skeleton-section-title" /></div><div className="skeleton-lines">{Array.from({ length: 6 }, (_, i) => <span className="skeleton skeleton-row" key={i} />)}</div></section>
        </main>
      </div>
    </div>
  );
}
