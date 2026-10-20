# Conectar uma conta Mercado Livre ao FluxHub

O frontend não usa Client Secret, access token nem refresh token do Mercado Livre.
Eles pertencem exclusivamente ao backend FastAPI. Nunca copie segredos para o
código Git, NEXT_PUBLIC_* ou para parâmetros de URL do frontend.

## Fluxo de autorização

1. O vendedor entra em `https://myfluxhub.tech/integracoes` autenticado no FluxHub.
2. Clica **Autorizar minha conta Mercado Livre**.
3. O Next.js chama o backend autenticado em `GET /api/v1/connectors/mercado-livre/authorize`.
4. O FastAPI emite um `state` exclusivo e redireciona para a página de consentimento oficial do Mercado Livre.
5. Após o vendedor aceitar, o Mercado Livre volta para o callback configurado:
   `https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback`.
6. **Esse callback é uma rota Next.js**, não o backend público. Ela encaminha
   `state` e `code` diretamente ao FastAPI pela `BACKEND_URL` privada.
7. O FastAPI valida o `state` de uso único, troca o código, verifica o perfil
   e persiste tokens criptografados e a fonte `mercado_livre`.
8. O Next.js encaminha o navegador para `/integracoes?ml=connected` e
   consulta as contas reais vinculadas. A tela então inicia a primeira
   sincronização de anúncios/pedidos e permite importar outras páginas.

**Não é possível dispensar o consentimento da conta vendedora** usando
somente App ID e Client Secret. Não crie valores artificiais de
`access_token`, `refresh_token` ou `state`.

## Configuração em produção (Hostinger, Next.js e FastAPI na mesma VPS)

No **processo Next.js** (arquivo privado `.env.local` ou variáveis do systemd):

```dotenv
BACKEND_URL=http://127.0.0.1:8000
BACKEND_TOKEN=<mesmo-valor-privado-configurado-no-fastapi>
AUTH_SESSION_SECRET=<segredo-de-sessao-existente>
```

No **processo FastAPI** (arquivo privado `.env` ou variáveis do systemd):

```dotenv
FRONTEND_URL=https://myfluxhub.tech
MERCADO_LIVRE_REDIRECT_URI=https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback
```

As chaves `MERCADO_LIVRE_CLIENT_ID` e `MERCADO_LIVRE_CLIENT_SECRET`
ficam somente no FastAPI, já configuradas fora do repositório.

O callback registrado no painel de aplicativos do Mercado Livre deve ser
**idêntico, caractere por caractere**, ao `MERCADO_LIVRE_REDIRECT_URI`
do FastAPI. Use `https://`, sem barras invertidas.

O Nginx deve manter as rotas distintas:
- `/api/v1/connectors/mercado-livre/callback` -> Next.js (`127.0.0.1:3000`).
- `/backend-api/api/v1/...` -> FastAPI (`127.0.0.1:8000`).
- O Next.js acessa o FastAPI diretamente em `BACKEND_URL`, sem expor o token ao navegador.

Após atualizar a branch `main` na VPS, reinstale dependências se necessário,
execute `npm run build` e reinicie o serviço Next.js. Preserve arquivos de
segredo existentes; não substitua por `.env.example` e não envie as chaves ao GitHub.

## Conferência sem expor credenciais

- `https://myfluxhub.tech/login`: login do FluxHub.
- `https://myfluxhub.tech/backend-api/api/v1/health`: saúde do FastAPI.
- `https://myfluxhub.tech/integracoes`: contas vinculadas e botão OAuth.

O `GET` de callback sem `state` e `code` não vincula contas.
O teste real exige entrar no FluxHub e **aprovar o acesso no Mercado Livre**.

## Credenciais divulgadas acidentalmente

Se segredos do `.env` foram colados em conversa, log, issue ou ambiente público,
trate-os como expostos. Gire os segredos em ambientes privados:
- Troque a senha do PostgreSQL e atualize `DATABASE_URL` em conjunto.
- Regenere o Client Secret no portal do Mercado Livre e atualize o FastAPI
  antes de reautorizar as contas.
- Gire `BACKEND_TOKEN` em ambos os processos na mesma janela de manutenção.
- Gire `JWT_SECRET_KEY` sabendo que as sessões emitidas deixarão de ser válidas.
- **Não altere `TOKEN_ENCRYPTION_KEY` diretamente**: ela decifra tokens
  OAuth já armazenados. Faça uma migração segura dos tokens ou revincule as
  contas antes de aposentar a chave antiga, evitando perda de acesso.
