# AutoGestão · Mercado Livre

Plataforma de gestão em **Next.js 16 + React 19 + TypeScript**, preparada para consumir o middleware local em `http://127.0.0.1:8000` e organizar catálogo, estoque, rentabilidade, fabricantes, compras e consultas operacionais em uma única interface.

A organização funcional usa plataformas de gestão de marketplace como referência, mas a interface, os componentes e as regras deste projeto são próprios.

## Módulos entregues

| Rota | Área | O que faz |
| --- | --- | --- |
| `/` | Visão geral | Receita, lucro, margem, vendas, gráficos por categoria e fabricante, situação de estoque |
| `/produtos` | Produtos | Catálogo completo, busca, filtros e ficha detalhada com campos extras recebidos |
| `/raio-x` | Raio-X de anúncios | Compara produtos do Swagger com concorrentes, preço de mercado e qualidade do anúncio |
| `/estoque` | Estoque | Saldo, giro, cobertura em dias e classificação ruim/atenção/bom |
| `/financeiro` | Financeiro | Receita, lucro, margem, cobertura de custos e resultado por produto |
| `/fabricantes` | Fabricantes | Performance por fabricante, lucro, custo de compra estimado, quantidade de produtos e margem |
| `/precificacao` | Precificação | Simulador de preço ideal para uma margem desejada |
| `/reposicao` | Compras e reposição | Sugestão de compra por produto para atingir uma cobertura-alvo |
| `/curva-abc` | Curva ABC | Classificação A/B/C por participação acumulada na receita estimada |
| `/pedidos` | Pedidos | Descobre e consulta as leituras de pedidos/vendas existentes no contrato atual |
| `/dados` | Central de dados | Lê o OpenAPI, cataloga todos os métodos, executa GETs com parâmetros e exporta JSON/CSV |

## Cores com significado

As cores de estado são usadas somente quando existe uma avaliação operacional:

- **Vermelho:** ruim / prejuízo / estoque zerado.
- **Amarelo:** atenção / margem abaixo de 15% / baixa cobertura / ação necessária.
- **Verde:** bom / margem a partir de 15% / estoque saudável.
- **Azul, cinza e branco:** navegação, informação neutra e estrutura visual; não representam desempenho.

Isso evita usar várias cores sem significado nos indicadores.

## Integração com o backend

A aplicação consulta `GET /openapi.json` no servidor configurado e monta um inventário da versão em execução. Assim, a Central de dados acompanha alterações do Swagger sem exigir que cada caminho seja escrito manualmente no frontend.

O carregamento de produtos procura primeiro `GET /api/v1/products/`. Caso o caminho mude, tenta identificar automaticamente uma rota GET terminada em `/product` ou `/products`. Também é possível definir o caminho explicitamente em `.env.local`.

A normalização aceita variações usuais sem inventar valores:

- ID: `external_id`, `id`, `sku` ou `item_id`.
- Nome: `title`, `name` ou `description`.
- Categoria: `category`, `category_name` ou `category_id`.
- Marca: `brand` ou `manufacturer`.
- Preço: `promotional_price`, `sale_price`, `current_price`, `original_price`, `price` ou `list_price`.
- Estoque: `stock_qty`, `stock` ou `available_quantity`.
- Vendas: `sales_30d`, `sold_quantity` ou `sales`.
- Condição: `condition` ou `item_condition`.
- Avaliação: `rating`, `reviews_rating` ou `average_rating`.
- Frete grátis: `free_shipping` ou `is_free_shipping`.
- Desconto: `discount_percentage`, `discount_percent`, `discount` ou `discount_rate`; taxas decimais como `0.18` são exibidas como `18%`.
- Demais propriedades do objeto original continuam disponíveis na ficha detalhada.

Valores ausentes permanecem como `—`. O frontend não transforma dados inexistentes em zero e não exibe `R$ NaN`.

### Central de dados

A página `/dados` mostra **todos os métodos do contrato OpenAPI**. Para evitar alterações acidentais em uma apresentação, somente operações **GET** podem ser executadas pela interface; `POST`, `PUT`, `PATCH` e `DELETE` ficam catalogados.

Para GETs com parâmetros:

1. Selecione a consulta.
2. Preencha parâmetros de caminho e query exigidos pelo contrato.
3. Clique em **Consultar**.
4. Visualize a resposta em tabela ou JSON.
5. Exporte para CSV ou JSON.

As chamadas passam pelo servidor Next.js, então o navegador não precisa acessar diretamente `127.0.0.1:8000` e não depende de CORS.

## Custos e fabricantes

Os campos financeiros ficam em SQLite local e são vinculados pelo código do produto:

- fabricante (armazenado no campo financeiro legado `supplier` por compatibilidade);
- custo de compra por unidade;
- comissão de venda (%);
- imposto (%);
- frete pago pelo vendedor por unidade;
- outras despesas por unidade.

O arquivo padrão é `data/finance.sqlite` e é criado automaticamente.

### Cálculos

```text
receita estimada = preço atual × unidades vendidas

lucro estimado = unidades vendidas × (
  preço atual
  − preço atual × (comissão% + imposto%) / 100
  − custo de compra
  − frete
  − outras despesas
)

margem = lucro / receita × 100

preço ideal = custos fixos por unidade /
  (1 − comissão% − imposto% − margem desejada%)

venda diária = vendas dos últimos 30 dias / 30
estoque alvo = venda diária × cobertura desejada
quantidade de compra = max(0, estoque alvo − estoque atual)
```

Produtos sem custo cadastrado continuam aparecendo no catálogo e no estoque, mas ficam fora dos cálculos de lucro e margem.

## Curva ABC

A classificação usa a receita estimada em ordem decrescente:

- **A:** produtos que formam a faixa inicial de aproximadamente 80% da receita acumulada;
- **B:** faixa seguinte até aproximadamente 95%;
- **C:** cauda restante.

Produtos sem base de receita permanecem sem classe em vez de receber uma classificação inventada.

## Executar no Windows

Requisito recomendado: **Node.js 24 ou superior**.

Na pasta do frontend:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abra:

```text
http://localhost:3000
```

Em outro terminal, mantenha o backend Python em execução, por exemplo:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Para produção local:

```powershell
npm run build
npm start
```

Se o PowerShell bloquear `npm.ps1`, use `npm.cmd` nos comandos sem alterar a política do Windows.

## Configuração

`.env.local`:

```dotenv
BACKEND_URL=http://127.0.0.1:8000
PRODUCTS_PATH=
PRODUCTS_BY_BRANDS_PATH=
BACKEND_TOKEN=
FINANCE_DB_PATH=./data/finance.sqlite
SERPAPI_KEY=
MELI_ACCESS_TOKEN=
MARKET_CACHE_MINUTES=360
```

- `BACKEND_URL`: endereço acessível **a partir do servidor Next.js**, e não necessariamente do navegador. Se o FastAPI estiver publicado sob um prefixo de proxy, inclua esse prefixo na URL. O frontend preserva esse caminho ao consultar `openapi.json` e os endpoints de produtos, pedidos etc.

Configuração segura: se frontend e FastAPI rodam na mesma máquina, conecte diretamente ao FastAPI via loopback. Se estiverem em máquinas distintas, configure TLS em um domínio e use HTTPS:

```dotenv
# Mesma máquina:
BACKEND_URL=http://127.0.0.1:8000

# Em servidores separados com HTTPS configurado:
# BACKEND_URL=https://api.seudominio.com.br/backend-api
```

**Não use `http://187.77.230.250/backend-api` com token real:** o Next.js bloqueará essa configuração por ser HTTP público. Para manter `/backend-api`, publique o proxy com HTTPS e o prefixo correspondente. **Não use `/docs` nem o fragmento `#/Products/...` em `BACKEND_URL`.** Depois de alterar as variáveis de produção, reinicie/reimplante o Next.js.

A Central de Dados (`POST /api/explorer`) usa a mesma verificação de origem confiável que o Raio-X, reconhecendo cabeçalhos de proxy reverso. Continua rejeitando origens externas e requisições sem cabeçalho `Origin`.

- `PRODUCTS_PATH`: opcional; força a rota de produtos se a descoberta automática não for suficiente.
- `PRODUCTS_BY_BRANDS_PATH`: opcional; força a rota `by-brands` usada para enriquecer o fabricante dos produtos.
- `BACKEND_TOKEN`: **obrigatório** para acesso ao FastAPI protegido, configurado somente no processo Next.js. Deve ser idêntico ao `BACKEND_TOKEN` do backend. Não use `NEXT_PUBLIC_BACKEND_TOKEN`.

### Proteção da API e do Swagger

O FastAPI agora exige `Authorization: Bearer <BACKEND_TOKEN>` inclusive para `/openapi.json` e `/docs`. O único endpoint sem autenticação é `GET /api/v1/health`, que informa apenas o status operacional. O navegador **não recebe o token**: o Next.js adiciona esse cabeçalho nas solicitações do servidor.

Crie um token aleatório em um terminal seguro:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Configure o mesmo valor nos dois ambientes, ambos com o nome `BACKEND_TOKEN`. Não compartilhe com `AUTH_SESSION_SECRET`, a senha do login ou `AUTH_PASSWORD_HASH`. Recomenda-se conexão interna entre Next.js e FastAPI. Se a API estiver publicada em IP público, use TLS/HTTPS e restrinja por firewall/Nginx. O código recusa enviar o Bearer token para URL HTTP que não seja localhost/loopback. Sem esse token, as consultas ao backend **falharão intencionalmente**.

**Ordem de deploy:** primeiro configure `BACKEND_TOKEN` nos ambientes de frontend e backend; depois publique a revisão do frontend que envia esse token e, por último, a revisão do FastAPI que valida o cabeçalho. Se o backend for implantado primeiro, o painel ficará sem dados até a configuração do frontend. Após o deploy, teste `/dados`, `/financeiro` e `/produtos`.

O Swagger público deixa de funcionar diretamente no navegador porque não recebe o token Bearer; isso é **intencional**. Para consultar o contrato com autorização, use um cliente API (curl/Postman) com o token, sem expô-lo no navegador ou no frontend público.
- `FINANCE_DB_PATH`: arquivo SQLite usado para custos.
- `SERPAPI_KEY`: habilita pesquisa no Google Shopping para Shopee e outros e-commerces.
- `MELI_ACCESS_TOKEN`: habilita comparação direta com anúncios do Mercado Livre.
- `MARKET_CACHE_MINUTES`: controla por quanto tempo uma análise externa pode ser reutilizada.

## Qualidade e segurança

- URL externa limitada à origem configurada em `BACKEND_URL`.
- Central de dados executa apenas GETs presentes no OpenAPI atual.
- Parâmetros enviados pela Central são limitados aos nomes declarados no contrato.
- Gravação financeira valida origem, content type, tamanho e faixas numéricas.
- Sem `dangerouslySetInnerHTML`.
- Sem dados fictícios usados como fallback em produção.
- Formatação protege a interface contra `NaN` e `Infinity`.
- Layout responsivo para desktop, tablet e celular.
- Componentes acessíveis por teclado e estados com texto, não apenas cor.

## Testes

```powershell
npm test
npm run typecheck
npm run build
```

A suíte cobre normalização, valores ausentes, cálculo de receita/lucro/margem, fabricantes, validação financeira, preço ideal, reposição, Curva ABC, persistência SQLite, leitura do OpenAPI e regras do Raio-X de anúncios.

## Raio-X de anúncios e concorrência

A rota `/raio-x` cruza cada produto carregado do Swagger com anúncios similares do mercado e mostra:

- nota de qualidade do anúncio (0–100);
- comparação do seu preço com mínimo, mediana, média e máximo encontrados;
- status visual: vermelho = ruim, amarelo = atenção, verde = bom;
- concorrentes por marketplace;
- similaridade entre os títulos para reduzir comparações erradas;
- avaliação, frete, preço e link do concorrente quando a fonte fornece esses campos;
- diagnóstico de título, marca, Part Number/EAN/OEM/SKU, frete, avaliação, estoque, imagem e descrição.

### Fontes externas

```dotenv
SERPAPI_KEY=
MELI_ACCESS_TOKEN=
MARKET_CACHE_MINUTES=360
```

- `SERPAPI_KEY`: usa Google Shopping para descobrir ofertas de Shopee, Amazon, Magalu, Mercado Livre e outras lojas que apareçam nos resultados.
- `MELI_ACCESS_TOKEN`: habilita uma consulta adicional diretamente na API oficial do Mercado Livre.
- `MARKET_CACHE_MINUTES`: tempo de cache em memória para reduzir consumo de consultas externas.

Nenhum preço de concorrente é inventado. Sem uma fonte configurada, o Raio-X continua avaliando a qualidade interna do anúncio e informa que a comparação externa ainda não está habilitada.

## Solução para "Origem não autorizada" no Raio-X

O Raio-X chama o SerpApi somente pelo servidor Next.js (`/api/raio-x`). A chave `SERPAPI_KEY` nunca deve ser usada diretamente em componentes client-side.

Esta versão aceita corretamente os endereços locais equivalentes:

- `http://127.0.0.1:3000`
- `http://localhost:3000`

Depois de alterar `.env.local`, reinicie o Next.js com `npm run dev`.

Exemplo:

```env
SERPAPI_KEY=sua_chave_privada_aqui
MARKET_CACHE_MINUTES=360
```

Se estiver usando proxy, Nginx, Vercel ou outro domínio, a rota também reconhece os cabeçalhos `Host`, `X-Forwarded-Host` e `X-Forwarded-Proto`.


## Acesso restrito e apresentação do painel

O FluxHub exibe uma tela única de login em `/login`, **sem cadastro público**. Após o login, todas as páginas e as rotas `/api/*` precisam de uma sessão assinada no servidor. A sessão dura até 12 horas, fica em cookie `HttpOnly` e é encerrada pelo botão **Sair da conta** no menu lateral.

### Preparar credenciais no ambiente

O projeto **não inclui senha, hash da senha nem segredo de assinatura no GitHub**. Na máquina onde você configura o deployment, execute:

```bash
node scripts/hash-password.mjs
```

Digite a senha escolhida no terminal (sem eco de caracteres). O comando exibirá as duas variáveis geradas. Coloque-as em seu `.env.local` ou nos segredos do servidor:

```dotenv
AUTH_EMAIL=FluxHub@gmail.com
AUTH_PASSWORD_HASH=scrypt:<salt>:<hash>
AUTH_SESSION_SECRET=<chave-aleatoria-gerada>
```

Use os **valores reais gerados**, não os marcadores entre `<>`. Nunca publique essas variáveis no repositório nem em logs públicos. Configure as mesmas variáveis em todas as réplicas do Next.js; caso contrário as sessões serão rejeitadas durante o balanceamento. Depois de alterar as variáveis, reinicie o processo/deploy.

**HTTPS obrigatório para uso real:** o endereço fornecido `http://187.77.230.250` ainda usa HTTP. Antes de utilizar o login com uma senha real, configure um domínio e certificado TLS/HTTPS no proxy reverso. Em HTTP, credenciais e sessões podem ser interceptadas na rede. O cookie tem atributo Secure automaticamente quando a requisição chega por HTTPS (incluindo `X-Forwarded-Proto: https`). Também restrinja `/api/auth/login` por IP no Nginx/proxy para proteger contra tentativas distribuídas; a limitação em memória da rota é complementar e não substitui uma camada persistente.

Se `AUTH_PASSWORD_HASH` ou `AUTH_SESSION_SECRET` estiver ausente, nenhum login é aprovado. Isso evita ativação involuntária com uma senha embutida no frontend.

### Carregamento e Financeiro

A antiga tela central de loading foi substituída por um **esqueleto da interface** com a navegação lateral e a barra superior presentes. O conteúdo é substituído por métricas e tabelas reais quando o servidor conclui a leitura. Não há valores fictícios no esqueleto.

Em `/financeiro`, um gráfico de barras compara **receita e lucro estimados por categoria** com base no filtro aplicado. Exibe receita apenas quando existem preços e vendas, e lucro somente para itens com custos cadastrados. Esse gráfico não representa evolução diária ou mensal, porque a API atual não fornece uma série histórica para isso.
