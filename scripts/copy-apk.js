const fs = require('fs');
const path = require('path');

const apkSource = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkDest = path.join(__dirname, '..', 'public', 'downloads', 'flygames.apk');
const destDir = path.dirname(apkDest);

if (!fs.existsSync(apkSource)) {
  console.error('APK não encontrado. Rode primeiro: npm run android:build');
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(apkSource, apkDest);
console.log('APK copiado para public/downloads/flygames.apk');
