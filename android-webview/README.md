# FluxHub Android (WebView)

Aplicativo Android nativo em Java, sem dependências extras de UI, para acessar o FluxHub (Next.js 16 / React 19) hospedado no computador ou servidor.

**O APK não incorpora o backend Next.js, FastAPI ou SQLite.** Esses serviços precisam estar executando fora do telefone. O aplicativo abre automaticamente a URL principal pré-gravada na compilação. Não tem tela de configuração no Android. Se FLUXHUB_URL não foi informada, usa o endereço salvo por versões antigas; em instalação nova sem URL exibirá uma mensagem explicativa.

## Endereços possíveis

- Produção: URL HTTPS do frontend.
- Celular na mesma LAN: URL HTTP do IP privado da máquina e porta 3000.
- Emulador Android: http://10.0.2.2:3000.
- ADB por USB: adb reverse tcp:3000 tcp:3000 e use http://127.0.0.1:3000 no app.

O frontend original usa servidor local por padrão. Para permitir acesso na rede Wi-Fi, rode o Next.js dentro do projeto original com:

    npm run dev -- --hostname 0.0.0.0

Ou, em produção:

    npm run build
    npx next start --hostname 0.0.0.0 --port 3000

Mantenha o Python/FastAPI e as variáveis AUTH_* configurados. Não exponha as portas diretamente na internet sem autenticação, TLS/HTTPS e proteção de rede.

## APK de testes no GitHub

O workflow na raiz do repositório .github/workflows/fluxhub-android.yml compila o APK Android (API 36, minSdk 29).

1. Acesse **Actions > FluxHub Android APK**.
2. Use **Run workflow** ou abra o resultado automático do push/PR.
3. Baixe o artifact **FluxHub-Android-debug-apk**, extraia o ZIP e instale app-debug.apk.

É um APK *debug*, para testes. Publicação na Play Store requer AAB de produção com assinatura própria.

## Android Studio

Abra somente a pasta android-webview. Use Java/JDK 17, SDK 36, Gradle 8.13 e Android Gradle Plugin 8.13.2. Este projeto não inclui o arquivo binário gradle-wrapper.jar: configure o Gradle 8.13 no Android Studio, ou instale o Gradle e execute:

    gradle --project-dir android-webview :app:assembleDebug

## Recursos e limites

- JavaScript, armazenamento DOM, sessão por cookie, navegação da mesma origem;
- navegação Voltar e erro de conexão com botão Recarregar;
- seletor nativo para uploads e DownloadManager para URLs da mesma origem;
- links externos abrem no navegador;
- exportações geradas por blob: podem não funcionar na WebView: nesses casos use o site no navegador;
- HTTP somente para endereço privado/local; **HTTPS para produção**.

Para testar regras de URL localmente sem Android SDK:

    bash android-webview/test-url-policy.sh


## APK sem tela de configuração

Configure uma URL real e acessível do Next.js (não a URL da API Python) durante a compilação:

- Via GitHub Actions: abra `FluxHub Android APK` > `Run workflow` e preencha `frontend_url` com a URL `https://seu-dominio.com`.
- Alternativa: configure a variável de repositório `FLUXHUB_URL` nas configurações do GitHub, e a CI usará essa URL.
- Via terminal: `FLUXHUB_URL=https://seu-dominio.com gradle --project-dir android-webview :app:assembleDebug`.

A tela "Servidor" foi removida. O sistema Next.js com backend Python permanece necessário. A primeira instalação só funciona se a URL do frontend tiver sido incluída no build. O arquivo gerado por CI é debug e pode exigir desinstalar versões debug anteriores, pois a chave de assinatura da CI pode ser diferente.
