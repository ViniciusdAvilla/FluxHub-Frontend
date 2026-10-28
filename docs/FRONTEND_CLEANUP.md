# Frontend: arquitetura e desempenho (2026-10-28)

## O que foi alterado

- Preservado Next.js App Router, layout Liquid Glass, sessão FluxHub, OAuth Mercado Livre, API routes, telas e navegação.
- **Vendas e pedidos**: criada leitura dedicada `getOrdersOverview` com quatro consultas (identidade, contas, histórico, status); o relatório geral anterior efetuava **11 chamadas** para `account=null` e transferia todos os produtos. Dados de itens e compradores seguem sendo consultados sob demanda pelo `OrderExplorer`.
- O gráfico de status em **Vendas** agora usa o agregado de pedidos armazenados (`order-status`), em vez de contar somente os primeiros 100 pedidos.
- Traduções de status unificadas em `src/lib/order-status.ts` e testadas.
- Calculadora de precificação e painel de Raio-X carregados sob demanda, para não entrar no bundle inicial de telas que não os usam.
- Removidos `src/components/app-sidebar.tsx` e `src/lib/integration-overview.ts`: sem importações/consumidores no aplicativo, substituídos respectivamente pelo `ModernShell` e `marketplace-overview`.
- Dependências e dois arquivos CSS analisados: mantidos porque são usados; **nenhuma limpeza de CSS global sem medição visual** para evitar regressões no login, dashboard e mobile.
- Adicionados testes para status, escopo das consultas e carregamento tardio.

## Limites e proteção

- Nenhuma tabela, token, conta conectada, pedido ou anúncio foi removido.
- O catálogo de produtos e anúncios continua completo nas telas correspondentes.
- Redução de chamadas é uma melhoria estrutural; LCP, INP, CLS, tráfego e JS após produção precisam de instrumentação real para quantificação.
- `getSellerReport`, `getSnapshot` e `platform-page.tsx` ainda têm oportunidades de dividir contratos por domínio/usar paginação sem mudar cálculos; exigir validação com conta real antes da troca.
