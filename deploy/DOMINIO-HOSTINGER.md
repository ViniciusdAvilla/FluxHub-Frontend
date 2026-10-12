# FluxHub em https://myfluxhub.tech

Este arquivo prepara a implantação no domínio adquirido na Hostinger. Ele **não altera o DNS nem a VPS automaticamente**: essas etapas devem ser executadas por quem administra a Hostinger e o servidor.

## 1. Apontamento de DNS

No hPanel, em **Domínios → myfluxhub.tech → DNS / Nameservers** (ou no provedor que gerencia os nameservers ativos), configure:

| Tipo | Nome | Valor | TTL |
| --- | --- | --- | --- |
| A | @ | 187.77.230.250 | Padrão |
| A | www | 187.77.230.250 | Padrão |

Remova apenas registros conflitantes `A/AAAA/CNAME` para `@` e `www`; **não altere registros MX, SPF, DKIM ou DMARC de e-mail**. A propagação pode levar até 24 horas.

Confirme o destino:

```bash
dig +short A myfluxhub.tech
dig +short A www.myfluxhub.tech
```

Ambos devem apresentar `187.77.230.250` antes de solicitar o certificado.

## 2. Conferir serviços antes de alterar Nginx

Este exemplo supõe **VPS Ubuntu/Debian com Nginx e os dois aplicativos instalados na mesma máquina**, usando Next.js local na porta 3000 e FastAPI local na porta 8000:

```bash
sudo ss -ltnp | grep -E ':(80|443|3000|8000)\\b'
curl -I http://127.0.0.1:3000/login
curl -I http://127.0.0.1:8000/api/v1/health
```

Se as portas ou aplicações forem outras, edite `deploy/nginx-myfluxhub.tech.conf` antes de instalá-lo. Não sobrescreva uma configuração Nginx existente sem fazer cópia e verificar conflitos de `server_name`. Se usar Docker, as portas internas precisam estar acessíveis a partir do Nginx.

## 3. Habilitar o proxy reverso

Após revisar outras configurações Nginx para o mesmo hostname:

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak
sudo cp deploy/nginx-myfluxhub.tech.conf /etc/nginx/sites-available/myfluxhub.tech
sudo ln -s /etc/nginx/sites-available/myfluxhub.tech /etc/nginx/sites-enabled/myfluxhub.tech
sudo nginx -t
sudo systemctl reload nginx
```

**Não execute o `ln -s` se o link já existir.** Se o bloco default em `sites-enabled` disputar `myfluxhub.tech`, resolva a duplicação antes de continuar. Se Nginx ou o site estiver sendo administrado por um painel, faça essa edição pelo sistema responsável, para não sobrescrever alterações.

No firewall da VPS e no firewall do provedor, libere **TCP 80/443**. Não abra 3000/8000 para a Internet; faça os serviços ouvirem em `127.0.0.1` se não estiverem em containers.

## 4. Certificado HTTPS com Certbot

Depois de confirmar DNS e HTTP acessíveis do exterior:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d myfluxhub.tech -d www.myfluxhub.tech --redirect
sudo certbot renew --dry-run
sudo nginx -t
```

O Certbot adicionará as definições TLS e o redirecionamento HTTP para HTTPS. Caso o sistema seja diferente de Ubuntu/Debian, siga os comandos da documentação oficial do Certbot para o sistema usado.

## 5. Ambiente e sessão protegida

Se Next.js e FastAPI rodam **na mesma VPS**:

```dotenv
# Variáveis privadas no ambiente do PROCESSO Next.js
BACKEND_URL=http://127.0.0.1:8000
AUTH_EMAIL=FluxHub@gmail.com
AUTH_PASSWORD_HASH=<valor-scrypt-gerado>
AUTH_SESSION_SECRET=<segredo-aleatorio-gerado>
BACKEND_TOKEN=<token-de-servico-igual-ao-do-fastapi>
```

No processo FastAPI configure o mesmo `BACKEND_TOKEN` (se a proteção tiver sido implantada). **Os placeholders não são valores reais. Não suba segredos para o GitHub**. O Next.js já verifica senha e cria cookie HttpOnly; o proxy repassa `X-Forwarded-Proto: https` após a emissão do certificado, permitindo o cookie Secure.

O script `node scripts/hash-password.mjs` gera `AUTH_PASSWORD_HASH`/`AUTH_SESSION_SECRET`. O script `node --env-file=.env.local scripts/check-auth.mjs` pode conferir o hash instalado, sem imprimir os segredos.

Reinicie o processo Next.js depois de configurar o ambiente para que as variáveis sejam carregadas.

## 6. Verificação

```bash
curl -I https://myfluxhub.tech/login
curl -I https://myfluxhub.tech/financeiro
curl -I https://myfluxhub.tech/backend-api/api/v1/health
curl -I https://myfluxhub.tech/backend-api/api/v1/products/
```

Resultados esperados: `/login` retorna 200, `/financeiro` redireciona para o login se não houver sessão, `/api/v1/health` retorna 200 e a rota de produtos retorna 401 sem Bearer se o PR do backend protegido estiver implantado. Os códigos reais dependem do status dos serviços.

**Atenção:** a página de login deve ser aberta em `https://myfluxhub.tech/login`, nunca em HTTP público. A senha anteriormente compartilhada precisa ser substituída antes do uso.
