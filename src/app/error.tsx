"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="initial-loading">
      <h1>Não foi possível abrir o painel.</h1>
      <button className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
