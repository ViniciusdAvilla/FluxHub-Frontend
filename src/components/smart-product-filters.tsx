"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownUp, Check, Search, SlidersHorizontal, X } from "lucide-react";
import type { ProductSortDirection, ProductSortKey, ProductQuickFilter, AdvancedProductFilters } from "@/lib/product-filters";
import { activeAdvancedCount, defaultAdvancedProductFilters } from "@/lib/product-filters";

const quickOptions: { key: ProductQuickFilter; label: string }[] = [
  { key: "with-stock", label: "Com estoque" },
  { key: "out-of-stock", label: "Sem estoque" },
  { key: "top-revenue", label: "Maior faturamento" },
  { key: "low-margin", label: "Margem abaixo de 10%" },
  { key: "top-sales", label: "Mais vendidos" },
];
const sortOptions: { key: ProductSortKey; label: string }[] = [
  { key: "title", label: "Nome do produto" },
  { key: "brand", label: "Fabricante" },
  { key: "price", label: "Preço de venda" },
  { key: "sales", label: "Produtos vendidos" },
  { key: "stock", label: "Estoque" },
  { key: "revenue", label: "Receita estimada" },
  { key: "profit", label: "Lucro estimado" },
  { key: "margin", label: "Margem estimada" },
  { key: "stockDays", label: "Dias de cobertura" },
];

type Props = {
  query: string; onQueryChange: (next: string) => void;
  category: string; onCategoryChange: (next: string) => void;
  manufacturer: string; onManufacturerChange: (next: string) => void;
  stockTone: string; onStockToneChange: (next: string) => void;
  categories: string[]; manufacturers: string[];
  advanced: AdvancedProductFilters;
  onAdvancedChange: (next: AdvancedProductFilters) => void;
  count: number; total: number;
  purchaseMode?: boolean;
};

export default function SmartProductFilters(props: Props) {
  const {
    query, onQueryChange, category, onCategoryChange, manufacturer, onManufacturerChange,
    stockTone, onStockToneChange, categories, manufacturers, advanced, onAdvancedChange,
    count, total, purchaseMode = false,
  } = props;
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      triggerRef.current?.focus();
    };
  }, [open]);

  // The filter card uses backdrop-filter (liquid glass), which creates a
  // containing block for position:fixed children. Render the dialog at the
  // document root instead, so it always occupies the full desktop viewport.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const update = (changes: Partial<AdvancedProductFilters>) =>
    onAdvancedChange({ ...advanced, ...changes });
  const chooseQuick = (key: ProductQuickFilter) => {
    const next = advanced.quick === key ? "" : key;
    update({
      quick: next,
      ...(next === "top-revenue" ? { sortKey: "revenue" as const, sortDirection: "desc" as const } : {}),
      ...(next === "top-sales" ? { sortKey: "sales" as const, sortDirection: "desc" as const } : {}),
    });
  };
  const reset = () => {
    onQueryChange(""); onCategoryChange(""); onManufacturerChange("");
    onStockToneChange(""); onAdvancedChange(defaultAdvancedProductFilters);
  };
  const active = activeAdvancedCount(advanced) +
    Number(Boolean(query)) + Number(Boolean(category)) + Number(Boolean(manufacturer)) +
    Number(Boolean(stockTone)) + Number(Boolean(advanced.quick));
  const setSortKey = (key: ProductSortKey) => update({
    sortKey: key, sortDirection: key === "title" || key === "brand" ? "asc" : "desc",
    quick: "",
  });
  const setSortDirection = (direction: ProductSortDirection) => update({
    sortDirection: direction, quick: "",
  });

  return (
    <div className="fh-smart-filter-module">
      <div className="fh-smart-toolbar">
        <label className="fh-smart-search"><Search size={18} aria-hidden="true"/>
          <input value={query} onChange={event => onQueryChange(event.target.value)}
            aria-label="Buscar produto, SKU, código, marca ou categoria"
            placeholder="Buscar produto, SKU, código ou fabricante"/>
        </label>
        <div className="fh-smart-sort-inline">
          <ArrowDownUp size={16} aria-hidden="true"/>
          <select aria-label="Ordenar produtos por" value={advanced.sortKey}
            onChange={event => setSortKey(event.target.value as ProductSortKey)}>
            {sortOptions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <button className="fh-smart-dir" type="button"
            onClick={() => setSortDirection(advanced.sortDirection === "asc" ? "desc" : "asc")}
            aria-label={advanced.sortDirection === "asc" ? "Alterar para ordem decrescente" : "Alterar para ordem crescente"}
            title={advanced.sortDirection === "asc" ? "Crescente" : "Decrescente"}>
            {advanced.sortDirection === "asc" ? "↑" : "↓"}
          </button>
        </div>
        <button ref={triggerRef} type="button" className="fh-smart-open"
          onClick={() => setOpen(true)}>
          <SlidersHorizontal size={17} aria-hidden="true"/> Filtros avançados
          {active > 0 && <span className="fh-smart-count">{active}</span>}
        </button>
      </div>
      <div className="fh-smart-chips" role="group" aria-label="Filtros rápidos">
        {quickOptions.map(item =>
          <button key={item.key} type="button" className={"fh-smart-chip " + (advanced.quick === item.key ? "is-selected" : "")}
            aria-pressed={advanced.quick === item.key} onClick={() => chooseQuick(item.key)}>
            {advanced.quick === item.key && <Check size={13} aria-hidden="true"/>}{item.label}
          </button>)}
      </div>
      <div className="fh-smart-filter-footer">
        <span><strong>{count.toLocaleString("pt-BR")}</strong> de {total.toLocaleString("pt-BR")} produtos</span>
        {active > 0 && <button type="button" className="fh-smart-clear" onClick={reset}>
          <X size={14} aria-hidden="true"/> Limpar filtros
        </button>}
      </div>
      {open && typeof document !== "undefined" && createPortal(
        <div className="fh-smart-overlay" role="presentation"
        onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <section className="fh-smart-drawer" role="dialog" aria-modal="true"
          aria-label="Filtros avançados de produtos" tabIndex={-1} ref={panelRef}>
          <header className="fh-smart-drawer-header">
            <div><span className="fh-smart-eyebrow">FLUXHUB · FILTROS INTELIGENTES</span>
              <h2>{purchaseMode ? "Filtros de compras" : "Ordenar e filtrar"}</h2>
              <p>Combine os critérios para encontrar os produtos certos.</p></div>
            <button type="button" className="fh-smart-close" onClick={() => setOpen(false)}
              aria-label="Fechar filtros"><X size={20}/></button>
          </header>
          <div className="fh-smart-drawer-content">
            <fieldset className="fh-smart-fieldset">
              <legend>Ordenação</legend>
              <div className="fh-smart-form-row">
                <label>Ordenar por
                  <select value={advanced.sortKey} onChange={event => setSortKey(event.target.value as ProductSortKey)}>
                    {sortOptions.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </label>
                <label>Direção
                  <select value={advanced.sortDirection}
                    onChange={event => setSortDirection(event.target.value as ProductSortDirection)}>
                    <option value="asc">Crescente (A–Z / menor)</option>
                    <option value="desc">Decrescente (Z–A / maior)</option>
                  </select>
                </label>
              </div>
            </fieldset>
            <fieldset className="fh-smart-fieldset">
              <legend>Catálogo e estoque</legend>
              <div className="fh-smart-form-row">
                <label>Categoria
                  <select value={category} onChange={event => onCategoryChange(event.target.value)}>
                    <option value="">Todas as categorias</option>
                    {categories.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>Situação de estoque
                  <select value={stockTone} onChange={event => onStockToneChange(event.target.value)}>
                    <option value="">Todos os níveis</option><option value="bad">Crítico</option>
                    <option value="warning">Atenção</option><option value="good">Saudável</option>
                  </select>
                </label>
              </div>
              <label>Fabricante principal
                <select value={manufacturer} onChange={event => onManufacturerChange(event.target.value)}>
                  <option value="">Todos os fabricantes</option><option value="__missing">Sem fabricante</option>
                  {manufacturers.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <div className="fh-smart-multi">
                <strong>Selecione vários fabricantes</strong>
                <div className="fh-smart-multi-scroll">
                  {manufacturers.map(item =>
                    <label key={item} className="fh-smart-check"><input type="checkbox"
                      checked={advanced.brands.includes(item)}
                      onChange={event => update({ brands: event.target.checked
                        ? [...advanced.brands, item]
                        : advanced.brands.filter(current => current !== item) })}/>
                      <span>{item}</span>
                    </label>)}
                </div>
              </div>
            </fieldset>
            <fieldset className="fh-smart-fieldset">
              <legend>Faixas de preço e vendas</legend>
              <div className="fh-smart-form-row">
                <label>Preço mínimo (R$)<input type="number" min="0" step="0.01" value={advanced.minPrice}
                  onChange={event => update({ minPrice: event.target.value })}/></label>
                <label>Preço máximo (R$)<input type="number" min="0" step="0.01" value={advanced.maxPrice}
                  onChange={event => update({ maxPrice: event.target.value })}/></label>
              </div>
              <div className="fh-smart-form-row">
                <label>Vendidos (mínimo)<input type="number" min="0" step="1" value={advanced.minSales}
                  onChange={event => update({ minSales: event.target.value })}/></label>
                <label>Vendidos (máximo)<input type="number" min="0" step="1" value={advanced.maxSales}
                  onChange={event => update({ maxSales: event.target.value })}/></label>
              </div>
              <label className="fh-smart-check fh-smart-check-large"><input type="checkbox"
                checked={advanced.onlyWithSales} onChange={event => update({ onlyWithSales: event.target.checked })}/>
                <span>Mostrar somente produtos com vendas registradas</span>
              </label>
              <label className="fh-smart-check fh-smart-check-large"><input type="checkbox"
                checked={advanced.onlyWithCost} onChange={event => update({ onlyWithCost: event.target.checked })}/>
                <span>Mostrar somente produtos com custo cadastrado</span>
              </label>
            </fieldset>
            {purchaseMode && <fieldset className="fh-smart-fieldset">
              <legend>Urgência de reposição</legend>
              <div className="fh-smart-urgency" role="group" aria-label="Prioridade de compra">
                {[
                  {key: "", label:"Todas"}, {key:"critical",label:"Urgente: até 7 dias"},
                  {key:"warning",label:"Atenção: até 30 dias"}, {key:"healthy",label:"Estoque adequado"},
                ].map(item =>
                  <button type="button" key={item.key} aria-pressed={advanced.urgency === item.key}
                    className={advanced.urgency === item.key ? "is-selected" : ""}
                    onClick={() => update({ urgency: item.key as AdvancedProductFilters["urgency"] })}>
                    {item.label}
                  </button>)}
              </div>
              <small>Urgência calculada apenas quando há dados suficientes de estoque e vendas.</small>
            </fieldset>}
          </div>
          <footer className="fh-smart-drawer-footer">
            <button type="button" className="fh-smart-reset" onClick={reset}>Limpar tudo</button>
            <button type="button" className="fh-smart-apply" onClick={() => setOpen(false)}>
              Mostrar {count.toLocaleString("pt-BR")} produtos
            </button>
          </footer>
        </section>
      </div>, document.body)}
    </div>
  );
}
