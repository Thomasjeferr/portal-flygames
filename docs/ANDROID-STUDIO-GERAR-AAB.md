# Gerar AAB/APK no Android Studio (Fly Games)

## 1. Abrir o projeto

1. No **Android Studio** (tela "Welcome to Android Studio"), clique em **Open**.
2. Navegue até a pasta do projeto e selecione **só a pasta `android`**:
   - Caminho: `c:\Users\thoma\OneDrive\Área de Trabalho\Portal Futvar\android`
   - ⚠️ Não abra a pasta "Portal Futvar" sozinha; tem que ser **Portal Futvar\android**.
3. Clique em **OK** e aguarde o Gradle sincronizar (barra de progresso embaixo).

---

## 2. Antes de gerar o pacote (build + sync)

Na raiz do projeto (pasta "Portal Futvar"), no terminal:

```powershell
cd "c:\Users\thoma\OneDrive\Área de Trabalho\Portal Futvar"
npm run build
npx cap sync android
```

Assim o app Android fica com a versão mais recente do site (incluindo `?app=1` para a Play Store).

---

## 3. Gerar o AAB (para enviar à Play Store)

1. No Android Studio, com o projeto **android** aberto:
   - Menu **Build** → **Generate Signed Bundle / APK...**
2. Escolha **Android App Bundle** (recomendado para Play Store) → **Next**.
3. **Key store:**
   - Se já tiver um keystore (arquivo `.jks` ou `.keystore`), clique em **Choose existing...** e selecione + informe a senha.
   - Se for a primeira vez: **Create new...** → preencha o caminho do novo keystore, senha, alias, nome e guarde a senha e o arquivo em local seguro (quem perder não consegue atualizar o app na loja).
4. **Next** → escolha o build type **release** → **Create**.

O AAB pode ser gerado em um destes locais (depende da configuração do projeto):
- `android/app/release/app-release.aab` ← **neste projeto o AAB sai aqui**
- ou `android/app/build/outputs/bundle/release/app-release.aab`

Esse arquivo **app-release.aab** é o que você envia na Play Console em **Criar versão** (teste interno ou produção).

---

## 4. Gerar APK (para testar fora da loja)

- **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)** (ou use **Generate Signed Bundle / APK** e escolha **APK**).
- APK de release fica em: `android/app/build/outputs/apk/release/` (se for signed com o mesmo keystore do AAB).

---

## 5. URL do app (Play Store)

O `capacitor.config.ts` já está com:

- `url: 'https://flygames.app/?app=1'`

Então o app que você gera abre direto no modo loja (sem planos/preços no app). Não precisa mudar nada para a versão da Play Store.

---

## 6. Próxima versão: arquivo de desofuscação (mapping)

A Play Console exibe o aviso: *"Não há um arquivo de desofuscação associado a este App Bundle"*. Não bloqueia publicação; para corrigir na próxima versão:

1. **Ativar minify no release** em `android/app/build.gradle`:
   - No `buildTypes` de `release`, mudar `minifyEnabled false` para `minifyEnabled true` e (opcional) `shrinkResources true`.
2. **Regras ProGuard:** se o build quebrar (plugins Capacitor/reflexão), adicionar regras em `android/app/proguard-rules.pro` para manter as classes necessárias (ver doc do Capacitor/Android).
3. **Gerar o AAB de novo** (Build → Generate Signed Bundle / APK → release).
4. **Local do mapping:** após o build, o arquivo fica em `android/app/build/outputs/mapping/release/mapping.txt`.
5. **Na Play Console:** na página da versão (teste interno ou produção), em "Arquivos de desofuscação" / "App bundle" daquela versão, fazer upload do `mapping.txt`.

Assim o aviso some e os relatórios de crash/ANR passam a exibir stack traces legíveis. Detalhes: ver `docs/PLAY-STORE-PROXIMA-VERSAO.md`.
