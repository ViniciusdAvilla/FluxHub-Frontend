"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { money } from "@/lib/analytics";
import { validateFinance } from "@/lib/validation";
import type { Finance, ProductRow } from "@/lib/types";

const fields = [
  ["unitCost", "Custo de compra / un.", "R$"],
  ["feePercent", "Comissão de venda", "%"],
  ["taxPercent", "Imposto sobre a venda", "%"],
  ["shippingCost", "Frete pago por você / un.", "R$"],
  ["otherCost", "Outras despesas / un.", "R$"],
] as const;

export default function FinanceDialog({
  products,
  selected,
  onClose,
  onSaved,
}: {
  products: ProductRow[];
  selected: string | null;
  onClose: () => void;
  onSaved: (finance: Finance) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [productId, setProductId] = useState(
    selected ?? products.find((p) => !p.finance)?.id ?? products[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const product = products.find((p) => p.id === productId);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setBusy(true);
    try {
      const finance = validateFinance({
        productId,
        supplier: data.get("supplier"),
        ...Object.fromEntries(
          fields.map(([key]) => [
            key,
            data.get(key) === "" ? null : Number(data.get(key)),
          ]),
        ),
      });
      const response = await fetch("/api/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finance),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível salvar.");
      onSaved(result);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar os custos.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="finance-dialog"
      aria-labelledby="finance-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">RENTABILIDADE</span>
          <h2 id="finance-title">Custos e fabricante</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Fechar cadastro"
          onClick={onClose}
          disabled={busy}
        >
          <X size={20} />
        </button>
      </div>
      <form onSubmit={submit}>
        <label className="field">
          <span>Produto</span>
          <select
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setError("");
            }}
            disabled={busy}
            required
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {p.id}
              </option>
            ))}
          </select>
        </label>
        <div className="price-note">
          <span>Preço de venda atual</span>
          <strong>{money(product?.price ?? null)}</strong>
        </div>
        <div key={productId} className="finance-fields">
          <div className="price-note manufacturer-note">
            <span>Fabricante do catálogo</span>
            <strong>{product?.brand !== "Sem marca" ? product?.brand : "Sem fabricante"}</strong>
            <input type="hidden" name="supplier" value={product?.brand !== "Sem marca" ? product?.brand : "Sem fabricante"} />
          </div>
          {fields.map(([key, label, suffix]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <div className="input-unit">
                <input
                  name={key}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={suffix === "%" ? 100 : 10000000}
                  step="0.01"
                  placeholder="0,00"
                  defaultValue={product?.finance?.[key] ?? ""}
                  required
                  disabled={busy}
                />
                <span>{suffix}</span>
              </div>
            </label>
          ))}
        </div>
        <p className="form-note">
          Informe 0 quando não houver custo. O cálculo considera as vendas dos
          últimos 30 dias e os valores atuais.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Check size={17} />
            )}
            Salvar custos
          </button>
        </div>
      </form>
    </dialog>
  );
}
