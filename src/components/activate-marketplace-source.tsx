"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Power } from "lucide-react";

export default function ActivateMarketplaceSource({ accountKey }: { accountKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function activate() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/platform/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountKey }),
        cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || "Não foi possível ativar esta conta.");
      }
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao ativar.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="fh-integration-inline">
    <button type="button" className="fh-primary-btn" disabled={busy} onClick={activate}>
      <Power size={15}/>{busy ? "Ativando..." : "Reativar fonte"}
    </button>
    {error && <p role="alert" className="fh-sync-message">{error}</p>}
  </div>;
}
