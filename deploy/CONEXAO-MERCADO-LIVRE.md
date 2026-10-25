# Mercado Livre como fonte única do FluxHub

O frontend **não cadastra nem autoriza** aplicativos ou vendedores Mercado Livre.
A fonte de dados é o FastAPI do repositório FluxHub-Backend, com os tokens
OAuth do vendedor armazenados de maneira criptografada no PostgreSQL.

## O que foi simplificado

- A rota `/integracoes` permanece por compatibilidade, mas exibe apenas
  a conta Mercado Livre retornada pelo backend; sua navegação mostra
  **Mercado Livre**, não um catálogo de integrações.
- Foram removidos da interface e das rotas Next.js os botões e endpoints que
  iniciavam autorização pelo navegador e os controles de múltiplos provedores.
- O Next.js não precisa receber `MERCADO_LIVRE_CLIENT_ID`,
  `MERCADO_LIVRE_CLIENT_SECRET` ou `MERCADO_LIVRE_REDIRECT_URI`.
- A tela chama `GET /api/v1/connectors/mercado-livre` com a sessão
  FluxHub para encontrar a conta autorizada já armazenada no backend.
- Se houver uma única conta, valida acesso por
  `GET /api/v1/connectors/mercado-livre/profile?account_id=...`.
  O backend renova seu token usando o refresh token salvo, se necessário.
- Exibe os produtos e pedidos **já persistidos** no FastAPI/PostgreSQL por
  `GET /api/v1/products/` e `GET /api/v1/orders/?account_id=...`.
  A contagem de pedidos é limitada à consulta dos 100 mais recentes.
- Se a fonte estiver ativa e validada, permite sincronizar por
  `POST /api/v1/analytics/sync` via `POST /api/platform/sync` do Next.js.
  Dashboard, Pedidos e Produtos continuam usando o backend real.

## O que NÃO é possível sem token de vendedor

Os três dados de aplicativo (Client ID, Client Secret e Redirect URI)
**não identificam uma conta vendedora** e não concedem permissão para ler
pedidos ou anúncios privados. É preciso existir no banco uma conta OAuth
de vendedor autorizada com access token e refresh token válidos.
Se ainda não houver autorização ou se ela tiver sido revogada, será
necessária **uma única autorização do vendedor fora do frontend** para
estabelecer/reestabelecer esses tokens. O frontend não tenta contornar
a autorização do provedor e não mostra dados fictícios.

## Configuração privada do servidor

No processo Next.js, mantenha:

```dotenv
BACKEND_URL=http://127.0.0.1:8000
BACKEND_TOKEN=<valor-privado-idêntico-ao-do-FastAPI>
AUTH_SESSION_SECRET=<segredo-existente-do-Next.js>
```

No FastAPI ficam as credenciais do aplicativo e o callback:

```dotenv
MERCADO_LIVRE_REDIRECT_URI=https://myfluxhub.tech/api/v1/connectors/mercado-livre/callback
FRONTEND_URL=https://myfluxhub.tech
```

O callback Next.js `/api/v1/connectors/mercado-livre/callback`
permanece implementado **somente por compatibilidade com a URL já registrada**.
O frontend não oferece mais um botão para iniciar o fluxo.
Não copie segredos para o GitHub, scripts do navegador ou `NEXT_PUBLIC_*`.

## Diagnóstico

### Por que a tela pode não puxar dados?

1. **Sem vendedor autorizado no banco**: `GET /api/v1/connectors/mercado-livre`
   retorna `[]`. Ter o Client ID/Client Secret no .env **não é** ter
   `access_token`/`refresh_token` para um vendedor. Uma autorização OAuth
   precisa ter terminado com sucesso anteriormente.
2. **Usuário FluxHub diferente**: a lista de contas é filtrada pelo
   `user_id` do usuário autenticado, não pelo `client_id` do aplicativo.
   Entre na conta FluxHub que possui a conexão OAuth.
3. **Token cadastrado, mas consulta do perfil falha**: o FastAPI chama
   `get_valid_access_token` (podendo atualizar o token em até 20 segundos)
   e depois chama `/users/me` (timeout HTTP configurado em 20 segundos).
   O frontend antes interrompia a chamada em 10 segundos. Agora as leituras
   do perfil Mercado Livre esperam até 60 segundos; outras operações rápidas
   conservam seus limites.
4. **Dados vazios após validar perfil**: os indicadores vêm das tabelas de
   pedidos/anúncios sincronizadas. É preciso que exista fonte
   `mercado_livre / ml:SELLER_ID` ativa e que `/api/v1/analytics/sync`
   finalize pelo menos uma página com sucesso.
5. **GitHub diferente da VPS**: o workflow do repositório apenas executa
   TypeScript, testes e build; não publica automaticamente na Hostinger.
   Confira se a branch `main` foi atualizada na VPS e se o processo Next.js
   foi reiniciado com o build novo.

Sem acessar o banco de produção ou os logs sanitizados, o frontend
não consegue determinar qual desses estados está ocorrendo na Hostinger.



- **Backend indisponível**: falhou o GET da lista de vendedores.
- **Nenhum vendedor salvo**: GET retornou [] — não existe conta OAuth
  vinculada à sessão FluxHub consultada.
- **Vários vendedores salvos**: a tela recusa escolher um arbitrariamente.
  Deixe apenas a conta pretendida autorizada para a empresa no FastAPI.
- **Vendedor salvo, perfil indisponível**: o GET de lista retornou uma
  conta, mas a leitura de `/profile` falhou; pode ser token expirado/
  revogado ou problema momentâneo no Mercado Livre. Isso não é
  resolvido colocando o Client Secret no frontend.
- **Produtos e pedidos vazios**: a conta pode existir, mas o banco
  pode não ter sido sincronizado. Confira a fonte e a rotina de sync.

Para publicar na Hostinger, atualize o checkout da branch `main`,
execute `npm ci`, `npm run build` e reinicie o serviço Next.js.
Preserve os arquivos de ambiente privados do servidor.

**Segurança:** qualquer Client Secret divulgado em mensagem, issue ou
repositório deve ser substituído no painel do Mercado Livre e no FastAPI
em uma janela controlada. Alterar o Client Secret pode afetar tokens
existentes; confirme as exigências do provedor. Não gire
`TOKEN_ENCRYPTION_KEY` sem migração dos tokens criptografados.
