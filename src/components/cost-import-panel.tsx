"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, UploadCloud, AlertTriangle, FileText, X } from "lucide-react";

type StatusKey = "atualizar" | "sem_alteracao" | "nao_encontrado" |
  "ambiguo" | "duplicado" | "revisar_valor" | "preco_invalido" | "sem_identificador";

type PreviewRow = {
  line: number;
  code: string;
  reference: string;
  description: string;
  item_id: string | null;
  matched_title: string | null;
  old_cost: number | null;
  new_cost: number | null;
  match_type: string | null;
  status: StatusKey;
};

type Preview = {
  total: number;
  ready: number;
  summary: Record<StatusKey, number>;
  rows: PreviewRow[];
  preview_limited: boolean;
  preview_token: string;
  note: string;
};
type Applied = {
  updated: number; new_cost_records: number; unchanged: number;
  not_matched: number; skipped: number; message: string;
};

const labels: Record<StatusKey, string> = {
  atualizar: "Preencher custo ausente",
  sem_alteracao: "Custo existente — preservado",
  nao_encontrado: "SKU não localizado",
  ambiguo: "SKU ambíguo",
  duplicado: "Duplicado na planilha",
  revisar_valor: "Revisar R$ 0,01 / zero",
  preco_invalido: "Preço inválido",
  sem_identificador: "Sem código ou referência",
};
const statuses: StatusKey[] = [
  "atualizar", "sem_alteracao", "nao_encontrado", "ambiguo",
  "duplicado", "revisar_valor", "preco_invalido", "sem_identificador",
];
const ACCEPTED_TYPES = /\.(csv|tsv|txt|xlsx|xls|docx|pdf)$/i;
const MAX_UPLOAD_BYTES = 16 * 1024 * 1024;
const currency = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CostImportPanel() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [applied, setApplied] = useState<Applied | null>(null);
  const [filter, setFilter] = useState<StatusKey | "todos">("todos");
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const rows = useMemo(() => preview?.rows.filter(row =>
    filter === "todos" || row.status === filter) ?? [], [preview, filter]);

  function choose(next: File | null) {
    setPreview(null);
    setApplied(null);
    setError("");
    setFilter("todos");
    if (next && (!ACCEPTED_TYPES.test(next.name) || next.size === 0 || next.size > MAX_UPLOAD_BYTES)) {
      setFile(null);
      setError("Arquivo inválido. Use CSV, Excel, Word (.docx), PDF ou TXT de até 16 MB.");
      return;
    }
    setFile(next);
  }

  async function send(mode: "preview" | "apply") {
    if (!file || busy || (mode === "apply" && (!preview || preview.ready < 1))) return;
    setBusy(mode);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      if (mode === "apply" && preview) form.set("preview_token", preview.preview_token);
      const response = await fetch("/api/platform/cost-import?mode=" + mode, {
        method: "POST", body: form, cache: "no-store",
      });
      const data = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(
        typeof data.error === "string" ? data.error : "Não foi possível importar os custos do arquivo.");
      if (mode === "preview") {
        setPreview(data as unknown as Preview);
        setApplied(null);
      } else {
        setApplied(data as unknown as Applied);
        setPreview(null);
        router.refresh();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha na importação.");
    } finally {
      setBusy(null);
    }
  }

  const phase = applied ? 3 : preview ? 2 : 1;

  return <section className="fh-cost-import" aria-labelledby="cost-import-title">
    <div className="fh-cost-import-heading">
      <div>
        <span className="eyebrow">PRECIFICAÇÃO / IMPORTAÇÃO DE CUSTOS</span>
        <h3 id="cost-import-title">Importação de custos em massa</h3>
        <p>Preencha custos de compra ausentes de vários produtos de uma só vez.</p>
      </div>
      <div className="fh-cost-import-secure"><ShieldCheck size={16}/> Custos existentes e preços de venda preservados</div>
    </div>

    <label className={"fh-cost-dropzone " + (dragging ? "is-dragging" : "") + (busy ? " is-busy" : "")}
      htmlFor="bulk-cost-file" onDragOver={event => {event.preventDefault(); if (!busy) setDragging(true);}}
      onDragLeave={event => {event.preventDefault(); setDragging(false);}}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        if (!busy) choose(event.dataTransfer.files?.[0] ?? null);
      }}>
      <input id="bulk-cost-file" type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls,.docx,.pdf"
        disabled={Boolean(busy)} onChange={event => {
          choose(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}/>
      <span className="fh-cost-dropzone-icon"><UploadCloud size={28}/></span>
      <strong>{file ? file.name : "Arraste seu arquivo ou clique para selecionar"}</strong>
      <span>{file ? "Clique para trocar de arquivo" : "Arquivo com SKU, referência ou MLB e uma coluna de custo de compra"}</span>
      <span className="fh-cost-file-types" aria-label="Formatos aceitos">
        {["CSV", "Excel", "Word (.docx)", "PDF", "TXT"].map(kind =>
          <span key={kind}>{kind}</span>)}
      </span>
    </label>

    <div className="fh-cost-steps" aria-label="Etapas da importação">
      <span className={phase >= 1 ? "is-active" : ""}><b>1</b> Enviar arquivo</span>
      <span className={phase >= 2 ? "is-active" : ""}><b>2</b> Conferir prévia</span>
      <span className={phase >= 3 ? "is-active" : ""}><b>3</b> Importar custos</span>
    </div>
    <div className="fh-cost-upload-actions">
      <p className="fh-cost-import-help">
        O FluxHub lê <strong>Preço Médio</strong> ou uma coluna identificada como
        <strong> custo de compra</strong>. Outros campos são ignorados.
        Só serão preenchidos custos ausentes com correspondência exata.
        PDF digitalizado pode exigir OCR.
      </p>
      <div className="fh-cost-upload-buttons">
        {file && <button type="button" className="fh-cost-clear" onClick={() => choose(null)}
          disabled={Boolean(busy)} aria-label="Remover arquivo"><X size={16}/> Remover</button>}
        <button className="fh-cost-import-button" type="button" disabled={!file || Boolean(busy)}
          onClick={() => void send("preview")}>
          <FileText size={17}/> {busy === "preview" ? "Lendo documento..." : "Conferir prévia"}
        </button>
      </div>
    </div>
    {error && <p className="fh-cost-import-error" role="alert"><AlertTriangle size={17}/>{error}</p>}
    {applied && <div className="fh-cost-import-success" role="status">
      <CheckCircle2 size={20}/>
      <div><strong>{applied.updated.toLocaleString("pt-BR")} custo(s) ausente(s) preenchido(s) com sucesso.</strong>
        <p>{applied.message} {applied.unchanged.toLocaleString("pt-BR")} custos existentes foram mantidos; {applied.skipped.toLocaleString("pt-BR")} linhas ignoradas.</p></div>
    </div>}

    {preview && <div className="fh-cost-import-preview">
      <div className="fh-cost-import-summary">
        <div><small>Registros analisados</small><strong>{preview.total.toLocaleString("pt-BR")}</strong></div>
        <div className="ready"><small>Custos a preencher</small><strong>{preview.ready.toLocaleString("pt-BR")}</strong></div>
        <div><small>Já cadastrados</small><strong>{preview.summary.sem_alteracao.toLocaleString("pt-BR")}</strong></div>
        <div><small>Não encontrados</small><strong>{preview.summary.nao_encontrado.toLocaleString("pt-BR")}</strong></div>
        <div className="warn"><small>Duplicados / ambíguos</small><strong>{(preview.summary.duplicado + preview.summary.ambiguo).toLocaleString("pt-BR")}</strong></div>
        <div className="warn"><small>Valores para revisar</small><strong>{(preview.summary.revisar_valor + preview.summary.preco_invalido + preview.summary.sem_identificador).toLocaleString("pt-BR")}</strong></div>
      </div>

      <div className="fh-cost-import-filters">
        <label htmlFor="cost-import-filter">Ver resultados:</label>
        <select id="cost-import-filter" value={filter} onChange={event =>
          setFilter(event.target.value as StatusKey | "todos")}>
          <option value="todos">Todas as situações</option>
          {statuses.map(status => <option key={status} value={status}>
            {labels[status]} ({preview.summary[status]})
          </option>)}
        </select>
        {preview.preview_limited && <small>Até 100 exemplos por situação; totais consideram todo o arquivo.</small>}
      </div>

      <div className="table-wrap">
        <table className="fh-cost-import-table">
          <thead><tr>
            <th>Linha</th><th>Referência / Código</th><th>Produto associado</th>
            <th>Custo atual</th><th>Custo no arquivo</th><th>Situação</th>
          </tr></thead>
          <tbody>
            {rows.map(row => <tr key={row.line}>
              <td>{row.line}</td>
              <td><strong>{row.reference || row.code || "—"}</strong>
                {row.description && <small>{row.description}</small>}</td>
              <td>{row.matched_title || "—"}{row.item_id && <small>{row.item_id}</small>}</td>
              <td>{currency(row.old_cost)}</td>
              <td>{currency(row.new_cost)}</td>
              <td><span className={"fh-cost-import-badge " + row.status}>{labels[row.status]}</span></td>
            </tr>)}
            {!rows.length && <tr><td colSpan={6}>Nenhuma linha deste tipo na amostra exibida.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="fh-cost-import-confirm">
        <div>
          <strong>Prévia da importação</strong>
          <p>Somente os {preview.ready.toLocaleString("pt-BR")} anúncios com correspondência exata, custo válido e custo ainda ausente serão preenchidos.
          Custos já cadastrados, comissões, impostos, estoque e preços anunciados continuarão como estão.</p>
        </div>
        <button type="button" className="fh-cost-import-button" disabled={Boolean(busy) || preview.ready === 0}
          onClick={() => void send("apply")}>
          <CheckCircle2 size={18}/>
          {busy === "apply" ? "Importando..." : "Confirmar importação em massa (" + preview.ready.toLocaleString("pt-BR") + ")"}
        </button>
      </div>
    </div>}
  </section>;
}
