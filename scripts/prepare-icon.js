/**
 * Prepara o ícone para o app Android/PWA.
 * - Se existir assets/icone-apps.png, usa como fonte (recomendado 1024×1024).
 * - Senão, se existir public/uploads/favicon-fly.png, copia para assets/icon-only.png.
 * - Senão, gera um placeholder verde para o build não falhar.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iconApps = path.join(root, 'assets', 'icone-apps.png');
const uploadsFavicon = path.join(root, 'public', 'uploads', 'favicon-fly.png');
const assetsDir = path.join(root, 'assets');
const iconOnly = path.join(assetsDir, 'icon-only.png');
const iconForeground = path.join(assetsDir, 'icon-foreground.png');
const iconBackground = path.join(assetsDir, 'icon-background.png');
const splashPng = path.join(assetsDir, 'splash.png');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

function ensureAdaptiveIcons() {
  if (!fs.existsSync(iconOnly)) return;
  fs.copyFileSync(iconOnly, iconForeground);
  console.log('icon-foreground.png atualizado.');
}

async function createGreenBackground() {
  const sharp = require('sharp');
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: { r: 34, g: 197, b: 94 } },
  })
    .png()
    .toFile(iconBackground);
  console.log('icon-background.png (verde) criado.');
}

/**
 * Cor de fundo do splash: igual ao android/app/.../res/values/colors.xml (splash_background).
 * Mantém coerência com o tema do app e com a tela de splash no Android 12+.
 */
const SPLASH_BACKGROUND = { r: 12, g: 18, b: 34 }; // #0C1222

/** Gera assets/splash.png (2732×2732) para a tela de abertura: fundo #0C1222 + ícone centralizado. Requerido pelo @capacitor/assets (Custom Mode). */
async function ensureSplash() {
  if (!fs.existsSync(iconOnly)) return;
  const sharp = require('sharp');
  const size = 2732;
  const iconSize = 1024;
  const icon = await sharp(iconOnly).resize(iconSize, iconSize).toBuffer();
  const left = Math.round((size - iconSize) / 2);
  await sharp({
    create: { width: size, height: size, channels: 3, background: SPLASH_BACKGROUND },
  })
    .composite([{ input: icon, left, top: left }])
    .png()
    .toFile(splashPng);
  console.log('splash.png (2732×2732, fundo #0C1222) criado.');
}

(async () => {
  if (fs.existsSync(iconApps)) {
    fs.copyFileSync(iconApps, iconOnly);
    ensureAdaptiveIcons();
    await createGreenBackground();
    await ensureSplash();
    console.log('Ícone usado: assets/icone-apps.png');
    process.exit(0);
    return;
  }

  if (fs.existsSync(uploadsFavicon)) {
    fs.copyFileSync(uploadsFavicon, iconOnly);
    ensureAdaptiveIcons();
    await createGreenBackground();
    await ensureSplash();
    console.log('Ícone copiado de public/uploads/favicon-fly.png para assets/icon-only.png');
    process.exit(0);
    return;
  }

  if (fs.existsSync(iconOnly)) {
    ensureAdaptiveIcons();
    if (!fs.existsSync(iconBackground)) {
      await createGreenBackground();
    }
    await ensureSplash();
    console.log('assets/icon-only.png já existe.');
    process.exit(0);
    return;
  }

  // Placeholder 1024x1024 com a cor do tema (#22c55e) para o build não falhar
  try {
    const sharp = require('sharp');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: { r: 34, g: 197, b: 94 },
      },
    })
      .png()
      .toFile(iconOnly);
    await createGreenBackground();
    ensureAdaptiveIcons();
    await ensureSplash();
    console.log('Placeholder criado em assets/icon-only.png (verde). Substitua pelo ícone Fly Games 1024x1024.');
  } catch (err) {
    console.error('Erro ao criar placeholder:', err.message);
    console.error('Coloque o ícone Fly Games (1024x1024 px) em assets/icon-only.png.');
    process.exit(1);
  }
  process.exit(0);
})();
