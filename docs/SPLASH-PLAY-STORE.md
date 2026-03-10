# Splash do app – configuração coerente para Play Store

O splash (tela de abertura) do app Fly Games está alinhado ao ícone e ao tema para ficar coerente na Play Store e em todos os dispositivos Android.

---

## Cores e origem

| Elemento | Valor | Onde está |
|----------|--------|------------|
| **Fundo do splash** | `#0C1222` | `android/app/src/main/res/values/colors.xml` → `splash_background` |
| **Imagem do splash** | 2732×2732 px, fundo #0C1222 + ícone centralizado | Gerada em `assets/splash.png` pelo script |

O fundo **#0C1222** é o mesmo no Android (tema da tela de splash) e na imagem gerada, para não haver “flash” de cor diferente ao abrir o app.

---

## Como é gerado

1. **Script** `scripts/prepare-icon.js`:
   - Lê o ícone em `assets/icon-only.png` (ou `assets/icone-apps.png` / `public/uploads/favicon-fly.png`).
   - Gera **`assets/splash.png`** em 2732×2732 px: fundo **#0C1222** e ícone 1024×1024 centralizado.
   - Também prepara `icon-foreground.png` e `icon-background.png` para ícones adaptativos.

2. **`npm run icons:generate`**:
   - Roda o script acima.
   - Roda **`capacitor-assets generate --android --splashBackgroundColor '#0C1222'`**, que usa `assets/splash.png` e gera os drawables do Android (incluindo variantes por densidade e orientação).
   - Os arquivos gerados vão para `android/app/src/main/res/drawable/` e `drawable-port-*` / `drawable-land-*`.

3. **Android (estilo)** em `android/app/src/main/res/values/styles.xml`:
   - `AppTheme.NoActionBarLaunch` usa `@drawable/splash` (imagem full-screen em versões antigas).
   - No **Android 12+** usa `Theme.SplashScreen` com:
     - `windowSplashScreenAnimatedIcon` = `@mipmap/ic_launcher_foreground`
     - `windowSplashScreenBackground` = `@color/splash_background` (#0C1222)

Assim, ícone do app, splash legado e splash Android 12+ usam a mesma cor de fundo e o mesmo branding.

---

## Quando alterar o splash

- **Só trocar o ícone:** coloque o novo ícone em `assets/icon-only.png` (ou `assets/icone-apps.png`) com **1024×1024 px** e rode:
  ```bash
  npm run icons:generate
  ```
  O splash será recriado com o mesmo fundo #0C1222 e o novo ícone, e o Android será atualizado.

- **Mudar a cor de fundo:** altere **#0C1222** em:
  1. `scripts/prepare-icon.js` → constante `SPLASH_BACKGROUND`
  2. `android/app/src/main/res/values/colors.xml` → `splash_background`
  3. Rode `npm run icons:generate` de novo.

---

## Resumo para a Play Store

- Splash e ícone usam o mesmo logo (Fly Games) e a mesma cor de fundo (#0C1222).
- A imagem do splash atende ao tamanho mínimo exigido pelo @capacitor/assets (2732×2732).
- Depois de `icons:generate`, faça um novo build do AAB para a versão da loja refletir o splash atualizado.
