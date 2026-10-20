"use client";
import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";

export default function ConnectMarketplace({
  provider, connected = false,
}: {
  provider: "mercado-livre" | "mercado-pago";
  connected?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/platform/connect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }), cache: "no-store",
      });
      const json = await res.json() as { authorization_url?: string; error?: string };
      if (!res.ok || !json.authorization_url)
        throw new Error(json.error || "Não foi possível iniciar a conexão.");

      const url = new URL(json.authorization_url);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error("URL de autorização insegura.");
      if (provider === "mercado-livre" &&
          (url.hostname !== "auth.mercadolivre.com.br" || url.pathname !== "/authorization"))
        throw new Error("Endereço de autorização diferente do Mercado Livre oficial.");
      window.location.assign(url.toString());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Conexão indisponível.");
      setBusy(false);
    }
  }

  const label = provider === "mercado-livre"
    ? connected ? "Conectar outra conta Mercado Livre" : "Autorizar minha conta Mercado Livre"
    : connected ? "Conectar outra conta Mercado Pago" : "Conectar Mercado Pago";

  return <div>
    <button type="button" onClick={connect} disabled={busy} className="fh-primary-btn">
      <Link2 size={16}/>
      {busy ? "Abrindo autorização oficial..." : label}
      <ExternalLink size={14}/>
    </button>
    {error && <p className="fh-notice error" style={{ marginTop: 10 }} role="alert">{error}</p>}
  </div>;
}
