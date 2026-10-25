"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Link2, Unplug } from "lucide-react";
import { parseOfficialMercadoLivreOAuthUrl } from "@/lib/marketplace-oauth";

export default function MarketplaceConnectionActions({ accountId }: { accountId?: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function connect() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/platform/connections/mercado-livre", {
        method: "POST", headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const data = await response.json() as { authorization_url?: unknown; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível conectar.");
      const url = parseOfficialMercadoLivreOAuthUrl(data.authorization_url);
      if (!url) throw new Error("URL de autorização não reconhecida.");
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na conexão.");
      setPending(false);
    }
  }
  async function disconnect() {
    if (!accountId || !window.confirm("Desconectar esta conta? Uma nova autorização será necessária para sincronizar.")) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/platform/connections/mercado-livre", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }), cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "Falha ao desconectar.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao desconectar.");
    } finally {
      setPending(false);
    }
  }
  return <div>
    {accountId ? (
      <button type="button" className="fh-control" onClick={() => void disconnect()} disabled={pending}>
        <Unplug size={16}/> {pending ? "Desconectando..." : "Desconectar"}
      </button>
    ) : (
      <button type="button" className="fh-primary-btn" onClick={() => void connect()} disabled={pending}>
        <Link2 size={16}/> {pending ? "Abrindo Mercado Livre..." : "Conectar Mercado Livre"}
      </button>
    )}
    {error && <p role="alert" className="fh-notice error">{error}</p>}
  </div>;
}
