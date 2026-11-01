import McpConsentPanel from "@/components/mcp-consent-panel";

type PageProps = { searchParams: Promise<{ request_id?: string }> };

export default async function McpConsentPage({ searchParams }: PageProps) {
  const { request_id: requestId } = await searchParams;
  if (!requestId || !/^[A-Za-z0-9_-]{30,100}$/.test(requestId))
    return <main style={{ padding: 48 }}>Solicitação de conexão MCP inválida.</main>;
  return <McpConsentPanel requestId={requestId}/>;
}
