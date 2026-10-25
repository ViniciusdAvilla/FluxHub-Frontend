"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

export default function IntegrationRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" className="fh-control fh-integration-refresh"
    onClick={() => startTransition(() => router.refresh())} disabled={pending}>
    <RefreshCw size={15} className={pending ? "fh-spinning" : ""}/>
    {pending ? "Consultando..." : "Verificar conexão"}
  </button>;
}
