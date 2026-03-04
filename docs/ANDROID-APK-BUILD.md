# Gerar APK Android (Fly Games)

O app Android é uma “casca” (WebView) que abre a URL do site em produção. Assim você não precisa republicar o app a cada mudança no site.

## Pré-requisitos

- **Node.js** (já usado no projeto)
- **Java JDK 17** (obrigatório para o build Android).
  - Baixe: [Adoptium Temurin 17](https://adoptium.net/) (LTS).
  - Depois de instalar, defina a variável de ambiente **JAVA_HOME** apontando para a pasta do JDK (ex.: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot`).
  - No Windows: Painel de Controle → Sistema → Configurações avançadas → Variáveis de ambiente → Novo em “Variáveis do sistema”: `JAVA_HOME` = pasta do JDK.
- **Android SDK** (recomendado instalar [Android Studio](https://developer.android.com/studio) uma vez; ele configura o SDK e o Gradle usa automaticamente).

## URL que o app abre

No `capacitor.config.ts` o app usa a URL definida em **`CAPACITOR_SERVER_URL`** (variável de ambiente) ou, se não existir, `https://portal.futvar.com.br`.

Para usar outro domínio (ex.: seu deploy na Vercel):

1. Crie ou edite o arquivo `.env.local` na raiz do projeto.
2. Adicione: `CAPACITOR_SERVER_URL=https://seu-dominio.vercel.app` (ou a URL do site em produção).
3. Ao rodar `cap sync` ou `android:build`, essa URL será usada no app.

## Comandos para gerar o APK

Na raiz do projeto:

```bash
# 1) Sincronizar o projeto web com o Android e gerar o APK (debug)
npm run android:build

# 2) Copiar o APK para a pasta do site (para o botão "Baixar e instalar" funcionar)
npm run android:copy-apk
```

Ou em um único passo:

```bash
npm run android:apk
```

O APK ficará em **`public/downloads/flygames.apk`**. Faça o deploy do site (incluindo essa pasta) para o link “Baixar e instalar” no menu funcionar.

## Onde o APK é gerado

- **Saída do Gradle:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Cópia para o site:** `public/downloads/flygames.apk`

## Testar no celular

1. Gere o APK com `npm run android:apk`.
2. Envie o arquivo `public/downloads/flygames.apk` para o celular (e-mail, Drive, etc.) ou suba o site e baixe pelo link no menu.
3. No Android, abra o APK e permita “Instalar de fontes desconhecidas” se o sistema pedir.
4. Se aparecer o aviso do Play Protect, toque em “Instalar mesmo assim”.

## APK de release (assinado)

O comando acima gera um **APK de debug** (para testar). Para distribuir um APK de **release** (assinado):

1. Crie um keystore (uma vez):  
   `keytool -genkey -v -keystore flygames.keystore -alias flygames -keyalg RSA -keysize 2048 -validity 10000`
2. Configure a assinatura em `android/app/build.gradle` (signingConfigs) e use `assembleRelease` em vez de `assembleDebug`.
3. Rode o build de release, copie o APK de `android/app/build/outputs/apk/release/` para `public/downloads/flygames.apk`.

Há guias detalhados na documentação do [Capacitor](https://capacitorjs.com/docs/android) e do [Android](https://developer.android.com/studio/publish/app-signing).
