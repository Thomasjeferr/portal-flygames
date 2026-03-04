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

(async () => {
  if (fs.existsSync(iconApps)) {
    fs.copyFileSync(iconApps, iconOnly);
    ensureAdaptiveIcons();
    await createGreenBackground();
    console.log('Ícone usado: assets/icone-apps.png');
    process.exit(0);
    return;
  }

  if (fs.existsSync(uploadsFavicon)) {
    fs.copyFileSync(uploadsFavicon, iconOnly);
    ensureAdaptiveIcons();
    await createGreenBackground();
    console.log('Ícone copiado de public/uploads/favicon-fly.png para assets/icon-only.png');
    process.exit(0);
    return;
  }

  if (fs.existsSync(iconOnly)) {
    ensureAdaptiveIcons();
    if (!fs.existsSync(iconBackground)) {
      await createGreenBackground();
    }
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
    console.log('Placeholder criado em assets/icon-only.png (verde). Substitua pelo ícone Fly Games 1024x1024.');
  } catch (err) {
    console.error('Erro ao criar placeholder:', err.message);
    console.error('Coloque o ícone Fly Games (1024x1024 px) em assets/icon-only.png.');
    process.exit(1);
  }
  process.exit(0);
})();
