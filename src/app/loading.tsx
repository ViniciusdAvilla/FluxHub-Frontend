"use client";

import { useEffect, useState } from "react";

/** Next.js App Router monta este fallback apenas durante navegações pendentes.
 * Exibimos o esqueleto depois de 240 ms para não piscar em transições rápidas.
 */
export default function Loading() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let stored: "light" | "dark" = "light";
    try {
      if (window.localStorage.getItem("fluxhub-theme") === "dark") stored = "dark";
    } catch { /* Preferência indisponível: o tema claro permanece. */ }
    setTheme(stored);
    document.documentElement.dataset.fluxhubTheme = stored;
    const timer = window.setTimeout(() => setVisible(true), 240);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className={`fh-app fh-liquid-glass fh-theme-${theme} fh-route-loading`}
      role="status" aria-live="polite" aria-label="Carregando informações da página">
      <span className="fh-sr-only">Carregando informações da página.</span>
      <div className="fh-glass-atmosphere" aria-hidden="true" />
      <aside className="fh-sidebar" aria-hidden="true">
        <div className="fh-logo">
          <span className="fh-logo-mark fh-logo-bars"><i/><i/><i/></span>
          <strong>Flux<span>Hub</span></strong>
        </div>
        <div className="fh-nav">
          {Array.from({length:9},(_,i)=><div className="fh-skeleton-nav-row" key={i}>
            <span className="fh-skeleton-block fh-skeleton-nav-icon"/>
            <span className="fh-skeleton-block fh-skeleton-nav-label"/>
          </div>)}
        </div>
        <div className="fh-sidebar-bottom"><span className="fh-skeleton-block fh-skeleton-full"/></div>
      </aside>
      <div className="fh-content" aria-hidden="true">
        <header className="fh-topbar">
          <div className="fh-skeleton-heading">
            <span className="fh-skeleton-block fh-skeleton-title"/>
            <span className="fh-skeleton-block fh-skeleton-description"/>
          </div>
          <div className="fh-skeleton-header-actions">
            <span className="fh-skeleton-block fh-skeleton-action"/>
            <span className="fh-skeleton-block fh-skeleton-action"/>
          </div>
        </header>
        <div className="fh-subnav fh-skeleton-tabs">
          {Array.from({length:3},(_,i)=><span className="fh-skeleton-block fh-skeleton-tab" key={i}/>)}
        </div>
        <main className="fh-main">
          <div className="fh-skeleton-kpis">
            {Array.from({length:4},(_,i)=><section className="fh-kpi" key={i}>
              <span className="fh-skeleton-block fh-skeleton-label"/>
              <span className="fh-skeleton-block fh-skeleton-number"/>
              <span className="fh-skeleton-block fh-skeleton-note"/>
            </section>)}
          </div>
          <div className="fh-skeleton-panels">
            <section className="fh-card">
              <span className="fh-skeleton-block fh-skeleton-label"/>
              <span className="fh-skeleton-block fh-skeleton-chart"/>
            </section>
            <section className="fh-card">
              <span className="fh-skeleton-block fh-skeleton-label"/>
              <span className="fh-skeleton-block fh-skeleton-chart"/>
            </section>
          </div>
          <div className="fh-skeleton-bottom">
            {Array.from({length:2},(_,i)=><section className="fh-card" key={i}>
              <span className="fh-skeleton-block fh-skeleton-label"/>
              {Array.from({length:3},(_,row)=><span className="fh-skeleton-block fh-skeleton-list-row" key={row}/>)}
            </section>)}
          </div>
        </main>
      </div>
    </div>
  );
}
