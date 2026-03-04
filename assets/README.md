# Ícones e splash do app (Fly Games)

O app Android e o PWA usam o ícone daqui para a tela inicial e na instalação.

## Ícone (obrigatório)

Coloque o ícone do app em **`assets/icone-apps.png`** (ou em `icon-only.png`). Tamanho: 512×512 px (mínimo) ou **1024×1024 px** (recomendado).

O script usa primeiro `icone-apps.png`; se não existir, usa `public/uploads/favicon-fly.png` e copia para `assets/`.

## Gerar ícones Android

Na raiz do projeto:

```bash
npm run icons:generate
```

Isso atualiza os ícones em `android/app/src/main/res/` (mipmap-*). Depois, gere o APK com `npm run android:apk`.

## Opcional: splash screen

Para personalizar a tela de abertura do app, adicione:

- `splash.png` — pelo menos 2732×2732 px (modo claro).
- `splash-dark.png` — opcional, modo escuro.

E rode de novo `npm run icons:generate`.
