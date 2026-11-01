"use client";

import { useEffect, useState } from "react";

/**
 * O frame do dashboard permanece montado durante a navegação.
 * Somente a área de dados recebe skeleton após um pequeno atraso.
 */
export default function Loading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  if (!slow) return <div className="fh-route-pending" aria-hidden="true" />;

  return <div className="fh-route-loading" role="status" aria-live="polite"
    aria-label="Carregando informações da página">
    <span className="fh-sr-only">Carregando informações da página.</span>
    <div className="fh-skeleton-kpis" aria-hidden="true">
      {Array.from({length:4},(_,i)=><section className="fh-kpi" key={i}>
        <span className="fh-skeleton-block fh-skeleton-label"/>
        <span className="fh-skeleton-block fh-skeleton-number"/>
        <span className="fh-skeleton-block fh-skeleton-note"/>
      </section>)}
    </div>
    <div className="fh-skeleton-panels" aria-hidden="true">
      <section className="fh-card">
        <span className="fh-skeleton-block fh-skeleton-label"/>
        <span className="fh-skeleton-block fh-skeleton-chart"/>
      </section>
      <section className="fh-card">
        <span className="fh-skeleton-block fh-skeleton-label"/>
        <span className="fh-skeleton-block fh-skeleton-chart"/>
      </section>
    </div>
    <div className="fh-skeleton-bottom" aria-hidden="true">
      {Array.from({length:2},(_,i)=><section className="fh-card" key={i}>
        <span className="fh-skeleton-block fh-skeleton-label"/>
        {Array.from({length:3},(_,row)=><span className="fh-skeleton-block fh-skeleton-list-row" key={row}/>)}
      </section>)}
    </div>
  </div>;
}
