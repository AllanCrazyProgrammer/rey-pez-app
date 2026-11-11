const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { identidadPaquete, entornoPaquete, escribirManifiesto } = require('./lib/paqueteActualizacion.cjs');
const root = path.resolve(__dirname, '..');
// --solo-web: solo la pantalla (android-dist + paquete.json), sin SDK ni APK; lo usa la GitHub Action
// para publicar la actualización que las apps instaladas descargan.
const soloWeb = process.argv.includes('--solo-web');
const identidad = identidadPaquete();
const sdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
  path.join(os.homedir(), 'Library/Android/sdk'), '/opt/homebrew/share/android-commandlinetools',
  path.join(os.homedir(), 'Android/Sdk')].find(candidate => candidate && fs.existsSync(path.join(candidate, 'platforms')));
if (!sdk && !soloWeb) {
  console.error('No se encontró el SDK de Android. Configura ANDROID_HOME e intenta nuevamente.');
  process.exit(1);
}
const env = { ...process.env, VUE_APP_TARGET: 'android', ...entornoPaquete(identidad), ...(sdk ? { ANDROID_HOME: sdk } : {}) };
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
escribirManifiesto('android', identidad);
console.log(`Paquete de Android ${identidad.version}`);
if (soloWeb) process.exit(0);
run(process.execPath, [require.resolve('@capacitor/cli/bin/capacitor'), 'sync', 'android']);
// --release: APK firmada con el keystore de distribución (CI de Releases). Sin él, debug local.
const release = process.argv.includes('--release');
if (release && (!process.env.REYPEZ_KEYSTORE_FILE || !fs.existsSync(process.env.REYPEZ_KEYSTORE_FILE))) {
  console.error('Para --release hace falta REYPEZ_KEYSTORE_FILE con el keystore de distribución.');
  process.exit(1);
}
const android = path.join(root, 'android');
run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', [release ? 'assembleRelease' : 'assembleDebug'], android);
const output = path.join(root, 'release/android');
fs.mkdirSync(output, { recursive: true });
const version = require('../package.json').version;
const target = path.join(output, `ReyPez-${version}.apk`);
fs.copyFileSync(path.join(android, 'app/build/outputs/apk', release ? 'release/app-release.apk' : 'debug/app-debug.apk'), target);
console.log(`${release ? 'APK firmada lista' : 'APK de prueba lista'}: ${target}`);
