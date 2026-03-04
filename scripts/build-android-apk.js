const { execSync } = require('child_process');
const path = require('path');
const isWindows = process.platform === 'win32';
const gradlew = isWindows ? 'gradlew.bat' : './gradlew';

execSync('npx cap sync android', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
execSync(`${gradlew} assembleDebug`, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..', 'android'),
});
