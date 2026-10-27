"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

type JobStatus = "idle" | "queued" | "running" | "retry" | "paused" | "completed" | "failed";
type SyncJob = {
  account_id: number;
  status: JobStatus;
  phase: "listings" | "orders" | "done" | null;
  listings_scanned: number;
  listings_saved: number;
  listings_total: number | null;
  orders_saved: number;
  pages_done: number;
  retry_count: number;
  last_error: string | null;
  retry_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  orders_window_start: string | null;
  orders_window_end: string | null;
  orders_until: string | null;
};

const activeStatuses: JobStatus[] = ["queued", "running", "retry"];

function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function date(value: string | null) {
  if (!value) return "—";
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? "—" :
    result.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function SyncAction({ accountId }: {
  accountId: number;
  auto?: boolean;
}) {
  const router = useRouter();
  const [job, setJob] = useState<SyncJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const startInFlight = useRef(false);
  const priorStatus = useRef<JobStatus | null>(null);

  const start = useCallback(async (action: "sync" | "orders" = "sync") => {
    if (startInFlight.current) return;
    startInFlight.current = true;
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/platform/sync-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, action }),
        cache: "no-store",
      });
      const data: SyncJob & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível iniciar a sincronização.");
      setJob(data);
      priorStatus.current = data.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar a sincronização.");
    } finally {
      setStarting(false);
      startInFlight.current = false;
    }
  }, [accountId]);

  const pause = useCallback(async () => {
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/platform/sync-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, action: "pause" }),
        cache: "no-store",
      });
      const data: SyncJob & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível pausar.");
      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao pausar.");
    } finally {
      setStarting(false);
    }
  }, [accountId]);

  useEffect(() => {
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const poll = async () => {
      try {
        const response = await fetch(`/api/platform/sync-job?accountId=${accountId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result: SyncJob & { error?: string } = await response.json();
        if (!response.ok) throw new Error(result.error || "Falha ao consultar o andamento.");
        if (closed) return;
        setJob(result);
        setError("");
        if (result.status === "completed" && priorStatus.current !== "completed") {
          router.refresh();
        }
        priorStatus.current = result.status;
      } catch (err) {
        if (!closed) setError(err instanceof Error ? err.message : "Falha ao consultar o andamento.");
      } finally {
        if (!closed) timer = setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => {
      closed = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [accountId, router]);

  const running = job !== null && activeStatuses.includes(job.status);
  const total = job?.listings_total;
  const percent = total && total > 0 && job ? Math.min(100,
    Math.round(job.listings_scanned / total * 100)) : null;
  const title = !job || job.status === "idle" ? "Pronto para sincronizar" :
    job.status === "queued" ? "Na fila de sincronização" :
    job.status === "retry" ? "Aguardando nova tentativa" :
    job.status === "paused" ? "Sincronização pausada" :
    job.status === "failed" ? "Sincronização interrompida" :
    job.status === "completed" ? "Sincronização concluída" :
    job.phase === "listings" ? "Buscando anúncios do Mercado Livre" :
    "Buscando histórico de pedidos";

  return <div className="fh-sync-action">
    <button className="fh-primary-btn" type="button"
      onClick={() => void start()} disabled={starting || running}>
      <RefreshCw size={16} className={running || starting ? "fh-spinning" : ""} />
      {starting ? "Iniciando..." : running ? "Sincronização em andamento" :
        job?.status === "paused" ? "Retomar sincronização" :
        job?.status === "failed" ? "Tentar novamente" :
        job?.status === "completed" ? "Sincronizar novamente" :
        "Sincronizar todos os dados"}
    </button>
    {running && <button className="fh-control" type="button" onClick={() => void pause()} disabled={starting}>
      Pausar sincronização
    </button>}
    {job?.status !== "running" && <button className="fh-control" type="button"
      onClick={() => void start("orders")} disabled={starting}>
      {job?.status === "retry" || job?.status === "queued"
        ? "Priorizar pedidos e faturamento" : "Atualizar pedidos e faturamento"}
    </button>}
    <div className="fh-sync-message" aria-live="polite" role="status">
      <p><strong>{title}</strong></p>
      {job && job.status !== "idle" && <>
        <p>{number(job.listings_saved)} anúncios no banco, {number(job.orders_saved)} pedidos armazenados.
          {" "}{number(job.pages_done)} lotes executados (incluindo retomadas).</p>
        {job.phase === "listings" && percent !== null && <div role="progressbar"
          aria-label="Anúncios consultados" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
          style={{ width: "100%", maxWidth: 420, height: 7, borderRadius: 8,
            background: "rgba(128,128,128,0.18)", overflow: "hidden", marginTop: 8 }}>
          <div style={{ width: `${percent}%`, height: "100%", background: "#20a582",
            borderRadius: 8, transition: "width .3s" }} />
        </div>}
        {job.phase === "listings" && total !== null && total !== undefined &&
          <p>{number(job.listings_saved)} de {number(total)} anúncios existentes na API.</p>}
        {job.phase === "listings" && typeof total === "number" && total > 0 &&
          job.listings_saved >= total && job.orders_saved === 0 && <p>
          Os anúncios já estão armazenados. Pedidos e faturamento ainda
          precisam ser importados. Você pode priorizá-los sem apagar o catálogo.
        </p>}
        {job.phase === "orders" && job.orders_window_start && <p>
          Período de pedidos: {date(job.orders_window_start)} até {date(job.orders_window_end)}.
          Histórico consultado por intervalos para evitar limites de paginação.
        </p>}
        {job.status === "retry" && <p>
          Nova tentativa agendada para {date(job.retry_at)}. Tentativa {job.retry_count}.
        </p>}
        {job.last_error && <p>{job.last_error}</p>}
        {job.status === "paused" && <p>Os dados no PostgreSQL estão preservados. Retome quando desejar.</p>}
        {job.status === "completed" && <p>Concluída em {date(job.completed_at)}.
          Os registros permanecem no PostgreSQL.</p>}
        {running && <p>O processo continua no servidor mesmo se você fechar esta página.</p>}
      </>}
      {error && <p role="alert">{error}</p>}
    </div>
  </div>;
}
