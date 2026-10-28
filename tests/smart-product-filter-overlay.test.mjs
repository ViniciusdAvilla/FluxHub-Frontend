import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

test("filtros avançados ocupam o viewport mesmo dentro de liquid glass", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:3000",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    MutationObserver: dom.window.MutationObserver,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const React = await import("react");
  const { render, fireEvent, cleanup } = await import("@testing-library/react");
  const { default: SmartProductFilters } = await import("../src/components/smart-product-filters");
  const { defaultAdvancedProductFilters } = await import("../src/lib/product-filters");

  const glassAncestor = document.createElement("section");
  glassAncestor.style.backdropFilter = "blur(18px)";
  glassAncestor.style.transform = "translateZ(0)";
  document.body.appendChild(glassAncestor);
  const props = {
    query: "", onQueryChange: () => {}, category: "", onCategoryChange: () => {},
    manufacturer: "", onManufacturerChange: () => {},
    stockTone: "", onStockToneChange: () => {},
    categories: ["Eletrônicos"], manufacturers: ["Marca A"],
    advanced: defaultAdvancedProductFilters, onAdvancedChange: () => {},
    count: 123, total: 123,
  };
  try {
    const view = render(React.createElement(SmartProductFilters, props),
      { container: glassAncestor, baseElement: document.body });
    fireEvent.click(view.getByRole("button", { name: /Filtros avançados/i }));
    const dialog = view.getByRole("dialog", { name: "Filtros avançados de produtos" });
    assert.equal(dialog.closest(".fh-smart-overlay")?.parentElement, document.body);
    assert.ok(view.getByLabelText("Ordenar por"));
    assert.ok(view.getByLabelText("Categoria"));
    assert.equal(document.body.style.overflow, "hidden");
    fireEvent.click(view.getByRole("button", { name: "Fechar filtros" }));
    assert.equal(document.querySelector(".fh-smart-overlay"), null);
    assert.equal(document.body.style.overflow, "");
    view.unmount();
  } finally {
    cleanup();
    glassAncestor.remove();
    dom.window.close();
  }
});
