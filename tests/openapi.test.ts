import test from "node:test";
import assert from "node:assert/strict";
import { parseOpenApi } from "../src/lib/openapi";

const schema = {
  info: { title: "Middleware Ecommerce", version: "2.4.0" },
  paths: {
    "/api/v1/products/": {
      get: {
        tags: ["Produtos"],
        summary: "Listar produtos",
        operationId: "list_products",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer" },
          },
        ],
      },
    },
    "/api/v1/orders/{order_id}": {
      parameters: [
        {
          name: "order_id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Pedidos"],
        summary: "Detalhar pedido",
      },
      delete: {
        tags: ["Pedidos"],
        summary: "Excluir pedido",
      },
    },
  },
};

test("lê título versão e todos os métodos documentados", () => {
  const parsed = parseOpenApi(schema);
  assert.equal(parsed.title, "Middleware Ecommerce");
  assert.equal(parsed.version, "2.4.0");
  assert.equal(parsed.endpoints.length, 3);
});

test("preserva tag resumo operationId e tipos dos parâmetros", () => {
  const parsed = parseOpenApi(schema);
  const endpoint = parsed.endpoints.find(
    (item) => item.path === "/api/v1/products/",
  );
  assert.equal(endpoint?.tag, "Produtos");
  assert.equal(endpoint?.summary, "Listar produtos");
  assert.equal(endpoint?.operationId, "list_products");
  assert.equal(endpoint?.parameters[0].type, "integer");
});

test("combina parâmetros comuns do caminho com os da operação", () => {
  const parsed = parseOpenApi(schema);
  const endpoint = parsed.endpoints.find(
    (item) =>
      item.path === "/api/v1/orders/{order_id}" && item.method === "GET",
  );
  assert.deepEqual(endpoint?.parameters, [
    {
      name: "order_id",
      in: "path",
      required: true,
      type: "string",
      description: null,
    },
  ]);
});

test("rejeita contrato inexistente e fornece defaults quando info falta", () => {
  assert.throws(() => parseOpenApi(null));
  const parsed = parseOpenApi({ paths: {} });
  assert.equal(parsed.title, "Serviço local");
  assert.equal(parsed.version, "atual");
  assert.deepEqual(parsed.endpoints, []);
});
