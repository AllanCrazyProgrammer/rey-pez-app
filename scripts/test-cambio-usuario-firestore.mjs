// Protección de escrituras sin internet al cambiar de usuario de Firebase Auth.
//
// Usa el SDK real de Firestore (sin red, IndexedDB simulada) y el EMULADOR de Auth:
//   npx firebase emulators:start --only auth --project demo-reypez
//   node scripts/test-cambio-usuario-firestore.mjs
// Nada se envía a la base real.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nm = p => pathToFileURL(path.join(raiz, 'node_modules', p)).href;
globalThis.window = globalThis;
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
const { initializeApp } = await import(nm('@firebase/app/dist/esm/index.esm2017.js'));
const fs = await import(nm('@firebase/firestore/dist/index.esm2017.js'));
const au = await import(nm('@firebase/auth/dist/esm2017/index.js'));
const { puedeCambiarDeUsuario } = await import(pathToFileURL(path.join(raiz, 'src/utils/cambioUsuarioFirestore.js')).href);

const app = initializeApp({ apiKey: 'demo', projectId: 'demo-reypez', appId: '1:1:web:1' });
const auth = au.initializeAuth(app, { persistence: au.inMemoryPersistence });
au.connectAuthEmulator(auth, process.env.AUTH_EMULATOR || 'http://127.0.0.1:9099', { disableWarnings: true });
const db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentSingleTabManager() }) });
await fs.disableNetwork(db);
const esperarPendientes = () => fs.waitForPendingWrites(db);
const visible = async ref => { const s = await fs.getDocFromCache(ref).catch(() => null); return Boolean(s && s.exists()); };
const pausa = ms => new Promise(r => setTimeout(r, ms));

// 1) Sin escrituras pendientes: se puede cambiar de usuario de inmediato (también sin internet).
let t = Date.now();
assert.equal(await puedeCambiarDeUsuario({ correoActual: null, correoDestino: 'a@reypez.app', esperarPendientes, ms: 3000 }), true);
assert.ok(Date.now() - t < 1500, 'sin pendientes no debe esperar');
console.log('PASS sin pendientes: el cambio de usuario se permite de inmediato, aun sin internet');

// 2) Con una escritura pendiente sin internet: NO se permite cambiar de usuario.
const ref = fs.doc(db, 'sacadas', `pendiente-${Date.now()}`);
fs.setDoc(ref, { kilos: 120, medida: '51/60' });
await pausa(300);
assert.equal(await visible(ref), true);
t = Date.now();
assert.equal(await puedeCambiarDeUsuario({ correoActual: null, correoDestino: 'a@reypez.app', esperarPendientes, ms: 1500 }), false);
assert.ok(Date.now() - t < 3000, 'debe rendirse al llegar al límite');
console.log('PASS con pendientes sin internet: el cambio de usuario se niega al llegar al límite');

// 3) Mismo usuario: no hay cambio, así que se permite aunque haya pendientes.
assert.equal(await puedeCambiarDeUsuario({ correoActual: 'A@reypez.app', correoDestino: 'a@reypez.app', esperarPendientes, ms: 1500 }), true);
console.log('PASS mismo usuario: se permite aunque haya pendientes');

// 4) Lo que la protección evita: si se cambiara de usuario igual, la escritura queda atascada
//    (deja de verse y de subirse) hasta volver al usuario anterior. No se pierde.
await au.createUserWithEmailAndPassword(auth, `qa-cambio-${Date.now()}@reypez.app`, 'clave-larga-123');
await pausa(800);
assert.equal(await visible(ref), false, 'con otro usuario, la escritura pendiente deja de verse');
await au.signOut(auth);
await pausa(800);
assert.equal(await visible(ref), true, 'al volver al usuario anterior reaparece (no se pierde)');
console.log('PASS riesgo documentado: cambiar de usuario con pendientes los atasca; volver al usuario los recupera');
process.exit(0);
