# FluxHub SaaS — publicação da tela de Integrações

## Para o cliente final
1. Faça login no FluxHub.
2. Abra **Integrações**.
3. Clique em **Conectar Mercado Livre**.
4. Entre **no site oficial do Mercado Livre** e aprove as permissões.
5. Você voltará ao FluxHub. A nova conta aparece em Integrações;
   a primeira página de anúncios/pedidos é importada automaticamente.
6. A qualquer momento, use **Atualizar dados**, selecione o vendedor
   no Dashboard/Pedidos e conecte outras contas pelo mesmo botão.
7. Use **Desconectar** somente quando quiser desabilitar a autorização.

O FluxHub não coleta a senha Mercado Livre. Ele recebe tokens pelo
OAuth no FastAPI, criptografados em repouso. O browser não obtém secret
de aplicação, access token ou refresh token.

## Dependências para o deploy
- Atualizar o **backend com o catálogo e POST /authorize** antes
  de publicar o novo frontend.
- Next.js: BACKEND_URL e BACKEND_TOKEN corretos (valor igual ao
  do FastAPI ativo), AUTH_SESSION_SECRET privado.
- FastAPI: app ML configurado com redirect URI fixa
  https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback
  e PKCE conforme o DevCenter.
- Publicar o Next.js por npm ci, npm run build e reiniciar o serviço
  de frontend conforme a infraestrutura real.
- GitHub Actions de CI não realiza deploy na Hostinger.
- Mercado Pago, Shopee e TikTok Shop aparecem como **Em breve**,
  pois não estão integrados; o catálogo pode incluir novas APIs
  posteriormente com suas credenciais e fluxos próprios.

## Rotas
- POST /api/platform/connections/mercado-livre — inicia OAuth
  de usuário autenticado (CSRF protegido por Origin);
- DELETE /api/platform/connections/mercado-livre — desconecta
  uma conta pertencente ao cliente (accountId);
- GET /api/v1/connectors/mercado-livre/callback — callback público,
  sem tokens nas URLs finais;
- POST /api/platform/sync — importação paginada por accountId;
- GET FastAPI /api/v1/connectors/catalog — capacidade dos provedores.

Não colocar credenciais ou chaves no código versionado.
