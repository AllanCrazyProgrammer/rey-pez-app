// Prueba local de la app de despique, SIN tocar la base real:
//   npm run despique:local
// 1. Levanta los emuladores de Firebase (Auth, Firestore y Realtime Database) con el proyecto de
//    prueba "demo-reypez" y las reglas de seguridad/propuesta (las mismas que producción), en
//    puertos propios (seguridad/firebase.despique-local.json) para no chocar con otras pruebas.
// 2. Carga datos de ejemplo: el día de hoy con 3 medidas, 3 despicadoras con pesadas y el
//    catálogo, más un usuario de prueba (abajo).
// 3. Compila la app de despique apuntando a esos emuladores y la sirve en http://localhost:8095.
// Todo vive en memoria: al cerrar (Ctrl+C) se borra. Para el build real vuelve a correr
// `npm run build:despique:web` (este script deja en despique-dist/ el build de prueba).
// Necesita Java 21+ (firebase-tools); en Mac: brew install openjdk@21.
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const PROYECTO = 'demo-reypez';
const PUERTO_APP = Number(process.env.PUERTO || 8095);
const AUTH = '127.0.0.1:9399';
const FIRESTORE = '127.0.0.1:8385';
const DATABASE = '127.0.0.1:9300';
// Usuario de prueba del emulador (no existe en la base real).
const USUARIO = { usuario: 'prueba', correo: 'prueba@reypez.app', contrasena: 'prueba123' };

const env = { ...process.env };
const java21 = ['/opt/homebrew/opt/openjdk@21', '/usr/local/opt/openjdk@21'].find(dir => fs.existsSync(path.join(dir, 'bin/java')));
if (java21 && !process.env.JAVA_HOME) {
  env.JAVA_HOME = java21;
  env.PATH = `${path.join(java21, 'bin')}:${env.PATH}`;
}

const hijos = [];
function cerrar(codigo = 0) {
  hijos.forEach(hijo => { try { hijo.kill('SIGINT'); } catch (_) { /* ya terminó */ } });
  setTimeout(() => process.exit(codigo), 1500);
}
process.on('SIGINT', () => cerrar(0));
process.on('SIGTERM', () => cerrar(0));

function fechaHoy() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
}

async function esperar(url, intentos = 120) {
  for (let i = 0; i < intentos; i++) {
    try { await fetch(url); return; } catch (_) { await new Promise(r => setTimeout(r, 1000)); }
  }
  throw new Error(`El emulador no respondió en ${url}`);
}

// Valor de Firestore REST a partir de un valor de JS.
function valor(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, valor(x)])) } };
}

async function guardarDoc(ruta, datos) {
  // "Bearer owner" salta las reglas: solo existe en el emulador.
  const url = `http://${FIRESTORE}/v1/projects/${PROYECTO}/databases/(default)/documents/${ruta}`;
  const res = await fetch(url, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: valor(datos).mapValue.fields }) });
  if (!res.ok) throw new Error(`No se pudo guardar ${ruta}: ${res.status} ${await res.text()}`);
}

async function sembrar() {
  const res = await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: USUARIO.correo, password: USUARIO.contrasena, returnSecureToken: true })
  });
  if (!res.ok) {
    const texto = await res.text();
    if (!texto.includes('EMAIL_EXISTS')) throw new Error(`No se pudo crear el usuario de prueba: ${texto}`);
  }

  const fecha = fechaHoy();
  await guardarDoc(`pesadasDiarias/${fecha}`, {
    fecha, eliminado: false, creadoEn: new Date().toISOString(),
    columnas: {
      c1: { medida: '21/25', precio: 10, orden: '1' },
      c2: { medida: '26/30', precio: 12, orden: '2' },
      c3: { medida: '31/35', precio: 14, orden: '3' }
    },
    personas: {
      p1: { nombre: 'María López', orden: '1' },
      p2: { nombre: 'Juana Pérez', orden: '2' },
      p3: { nombre: 'Rosa Gómez', orden: '3' }
    },
    pesos: { p1: { c1: 12.4, c2: 8.1 }, p2: { c1: 15.2 }, p3: { c2: 9.3 } }
  });
  const catalogo = [['María López', 'Mary'], ['Juana Pérez', 'Juanita'], ['Rosa Gómez', ''], ['Lucía Torres', 'Lucy']];
  for (const [i, [nombre, apodo]] of catalogo.entries()) {
    await guardarDoc(`despicadoras/d${i + 1}`, { nombre, apodo, activo: true });
  }
  return fecha;
}

async function responde(url) {
  try { await fetch(url, { signal: AbortSignal.timeout(1500) }); return true; } catch (_) { return false; }
}

(async () => {
  // Si ya hay otro `npm run despique:local` corriendo, no levantar otro encima (chocan los puertos
  // y el usuario de prueba ya existe).
  if (await responde(`http://${AUTH}/`)) {
    const app = await responde(`http://localhost:${PUERTO_APP}/`);
    console.log(app
      ? `\n  ✅ El entorno de prueba ya está corriendo. Abre http://localhost:${PUERTO_APP}\n     Usuario: ${USUARIO.usuario}    Contraseña: ${USUARIO.contrasena}\n`
      : `\n  Los emuladores ya están corriendo (otra terminal). Ciérralos con Ctrl+C allá y vuelve a correr esto.\n`);
    process.exit(app ? 0 : 1);
  }
  console.log('Levantando emuladores de Firebase (proyecto de prueba, no la base real)…');
  const emuladores = spawn(path.join(root, 'node_modules/.bin/firebase'), ['emulators:start', '--only', 'auth,firestore,database',
    '--project', PROYECTO, '--config', 'seguridad/firebase.despique-local.json'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  hijos.push(emuladores);
  let salida = '';
  emuladores.stdout.on('data', d => { salida += d; });
  emuladores.stderr.on('data', d => { salida += d; });
  emuladores.on('exit', codigo => {
    if (codigo) { console.error(salida.slice(-3000)); console.error('Los emuladores se cerraron. ¿Java 21+ instalado? (brew install openjdk@21)'); cerrar(1); }
  });
  await Promise.all([`http://${AUTH}/`, `http://${FIRESTORE}/`, `http://${DATABASE}/.json?ns=${PROYECTO}-default-rtdb`].map(url => esperar(url)));
  const fecha = await sembrar();
  console.log(`Datos de ejemplo listos (día ${fecha}).`);

  console.log('Compilando la app de despique contra los emuladores…');
  const build = spawnSync(process.execPath, [require.resolve('@vue/cli-service/bin/vue-cli-service.js'), 'build'], {
    cwd: root, stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...env, VUE_APP_VARIANTE: 'despique', VUE_APP_TARGET: 'android',
      VUE_APP_AUTH_EMULATOR: `http://${AUTH}`, VUE_APP_FIRESTORE_EMULATOR: FIRESTORE, VUE_APP_DATABASE_EMULATOR: DATABASE }
  });
  if (build.status !== 0) { console.error('Falló la compilación.'); cerrar(1); return; }

  const servidor = spawn(process.execPath, [path.join(__dirname, 'servir-dist.cjs'), 'despique-dist', String(PUERTO_APP)], { cwd: root, stdio: 'inherit' });
  hijos.push(servidor);
  servidor.on('exit', codigo => { if (codigo) { console.error(`No se pudo usar el puerto ${PUERTO_APP}. Prueba: PUERTO=8096 npm run despique:local`); cerrar(1); } });

  console.log(`
  ✅ Listo. Abre http://localhost:${PUERTO_APP}
     Usuario: ${USUARIO.usuario}    Contraseña: ${USUARIO.contrasena}
     (cuenta de prueba solo de este emulador; nada se guarda en la base real)
     Ctrl+C para cerrar todo.`);
})().catch(error => { console.error(error.message); cerrar(1); });
