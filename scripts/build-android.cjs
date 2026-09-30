const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const sdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
  path.join(os.homedir(), 'Library/Android/sdk'), '/opt/homebrew/share/android-commandlinetools',
  path.join(os.homedir(), 'Android/Sdk')].find(candidate => candidate && fs.existsSync(path.join(candidate, 'platforms')));
if (!sdk) {
  console.error('No se encontró el SDK de Android. Configura ANDROID_HOME e intenta nuevamente.');
  process.exit(1);
}
const env = { ...process.env, VUE_APP_TARGET: 'android', ANDROID_HOME: sdk };
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(process.execPath, [require.resolve('@vue/cli-service/bin/vue-cli-service.js'), 'build']);
const html = fs.readFileSync(path.join(root, 'android-dist/index.html'), 'utf8');
if (!/<script\b[^>]*\bsrc=/.test(html)) {
  console.error('La entrada Android no contiene scripts de arranque. No se generará un APK vacío.');
  process.exit(1);
}
run(process.execPath, [require.resolve('@capacitor/cli/bin/capacitor'), 'sync', 'android']);
const android = path.join(root, 'android');
run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['assembleDebug'], android);
const output = path.join(root, 'release/android');
fs.mkdirSync(output, { recursive: true });
const version = require('../package.json').version;
const target = path.join(output, `ReyPez-Inventarios-${version}.apk`);
fs.copyFileSync(path.join(android, 'app/build/outputs/apk/debug/app-debug.apk'), target);
console.log(`APK de prueba listo: ${target}`);
