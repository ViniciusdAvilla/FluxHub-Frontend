import type {
  BackendSchema,
  EndpointDefinition,
  EndpointParameter,
} from "./types";

const METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
] as const;

type RawOpenApi = {
  info?: { title?: unknown; version?: unknown };
  paths?: Record<
    string,
    Record<string, unknown> & {
      parameters?: unknown;
    }
  >;
};

function asParameter(value: unknown): EndpointParameter | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (typeof p.name !== "string" || typeof p.in !== "string") return null;
  const schema =
    p.schema && typeof p.schema === "object"
      ? (p.schema as Record<string, unknown>)
      : {};
  return {
    name: p.name,
    in: p.in,
    required: Boolean(p.required),
    type: typeof schema.type === "string" ? schema.type : "string",
    description: typeof p.description === "string" ? p.description : null,
  };
}

function uniqueParameters(values: unknown[]): EndpointParameter[] {
  const map = new Map<string, EndpointParameter>();
  for (const value of values) {
    const parameter = asParameter(value);
    if (parameter) map.set(`${parameter.in}:${parameter.name}`, parameter);
  }
  return [...map.values()];
}

export function parseOpenApi(payload: unknown): BackendSchema {
  if (!payload || typeof payload !== "object")
    throw new Error("Contrato de dados indisponível.");

  const raw = payload as RawOpenApi;
  const endpoints: EndpointDefinition[] = [];

  for (const [path, item] of Object.entries(raw.paths ?? {})) {
    if (!item || typeof item !== "object") continue;
    const common = Array.isArray(item.parameters) ? item.parameters : [];

    for (const method of METHODS) {
      const operation = item[method];
      if (!operation || typeof operation !== "object") continue;
      const op = operation as Record<string, unknown>;
      const own = Array.isArray(op.parameters) ? op.parameters : [];
      const tags = Array.isArray(op.tags) ? op.tags : [];

      endpoints.push({
        path,
        method: method.toUpperCase(),
        summary:
          typeof op.summary === "string" && op.summary.trim()
            ? op.summary.trim()
            : typeof op.description === "string" && op.description.trim()
              ? op.description.trim().split("\n")[0]
              : `${method.toUpperCase()} ${path}`,
        operationId:
          typeof op.operationId === "string" ? op.operationId : null,
        tag: typeof tags[0] === "string" ? tags[0] : "Geral",
        parameters: uniqueParameters([...common, ...own]),
      });
    }
  }

  endpoints.sort(
    (a, b) =>
      a.tag.localeCompare(b.tag, "pt-BR") ||
      a.path.localeCompare(b.path, "pt-BR") ||
      a.method.localeCompare(b.method),
  );

  return {
    title:
      typeof raw.info?.title === "string" ? raw.info.title : "Serviço local",
    version:
      typeof raw.info?.version === "string" ? raw.info.version : "atual",
    endpoints,
    error: null,
  };
}
