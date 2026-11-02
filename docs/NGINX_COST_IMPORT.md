# Importação de custos: erro HTTP 413 (Nginx)

## Sintoma

Ao importar um CSV, Excel, Word ou PDF, o browser pode mostrar
`Unexpected token '<', "<html>..." is not valid JSON`.
O frontend tentou ler JSON, mas o proxy retornou uma página HTML.

O arquivo "BASE PREÇOS SISTEMA 30 10 2026.csv" recebido em novembro de 2026
tem aproximadamente **2,05 MB** e **21.872 itens**. O limite de aplicação
é 16 MB, mas o **Nginx tem limite padrão de 1 MB** (`client_max_body_size 1m`).
Quando o corpo HTTP supera o limite do Nginx, ele responde HTTP 413 com HTML
antes de encaminhar a solicitação ao Next.js. O backend não recebe o arquivo.

Referência oficial: https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size

## Ajuste necessário na VPS Hostinger

1. Pelo MobaXterm/SSH, descubra qual arquivo de configuração atende
   `myfluxhub.tech`. Use `sudo nginx -T` e localize o bloco
   `server_name myfluxhub.tech`.
2. No **bloco server HTTPS já existente** de `myfluxhub.tech`, acrescente:

   ```nginx
   client_max_body_size 20m;
   ```

   Não crie uma segunda localização `location /api` nem substitua
   `proxy_pass`, os cabeçalhos de autenticação ou as configurações HTTPS.
   Se existir outra diretiva `client_max_body_size` mais específica na
   `location` de importação, ela também deve aceitar 20 MB.
   O valor 20 MB permite multipart com o arquivo máximo de 16 MB.
3. Valide sem interromper o site:

   ```bash
   sudo nginx -t
   ```

4. **Somente se o teste for bem-sucedido**, aplique:

   ```bash
   sudo systemctl reload nginx
   ```

5. Publicar a correção do frontend e tentar de novo em
   **Precificação > Importação de custos em massa**.

O aplicativo Next.js verifica extensões permitidas e 16 MB; o FastAPI
aplica o mesmo limite. O Nginx pode aceitar até 20 MB, mas o aplicativo
continuará rejeitando arquivos maiores que 16 MB.

## Diagnóstico, se ainda falhar

Abra as Ferramentas de Desenvolvedor do navegador > Rede/Network e selecione
`POST /api/platform/cost-import?mode=preview`.

- **413 + text/html**: limite do Nginx ou outro proxy anterior.
- **401 / 403**: sessão expirada, autenticação ou proteção de origem.
- **502 / 503 / 504**: verificar `fluxhub-frontend`, `fluxhub-backend` e Nginx.
- **422 + application/json**: o backend recebeu o documento, mas encontrou
  algum problema no formato ou nas correspondências.

A correção do frontend identifica respostas HTML e mostra mensagens claras;
aumentar o limite do Nginx continua sendo necessário para transmitir o
arquivo de 2,05 MB ao servidor. A aplicação não importa nem altera custos
sem prévia e confirmação do usuário.
