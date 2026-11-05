// Verifica que una actualización del SDK de Firebase no pierda la caché offline.
//
// Escribe SIN CONEXIÓN con la versión vieja (caché persistente en una IndexedDB
// simulada en memoria), abre la MISMA base con la versión nueva y comprueba que los
// datos y las escrituras pendientes siguen ahí. Luego prueba regresar a la vieja y
// volver a la nueva. La red se desactiva con disableNetwork y el proyecto es de
// demostración: nada se envía a la base real.
//
// Uso (cada carpeta con su propio `npm install firebase@<versión>`):
//   node scripts/verificar-migracion-cache-firestore.mjs <carpetaVieja> <carpetaNueva>
// Resultado con 10.12.4 -> 10.14.1 (esquema IndexedDB 16 -> 17): OK; al regresar a
// 10.12.4 la app usa caché en memoria y las escrituras pendientes reaparecen al volver
// a 10.14.1.
import 'fake-indexeddb/auto';
import { createRequire } from 'node:module';
import path from 'node:path';
if (process.argv.length < 4) { console.error('Uso: node scripts/verificar-migracion-cache-firestore.mjs <carpetaVieja> <carpetaNueva>'); process.exit(2); }
const OLD = path.resolve(process.argv[2]) + '/node_modules/';
const NEW = path.resolve(process.argv[3]) + '/node_modules/';
const cfg = { apiKey: 'demo', projectId: 'demo-reypez-migracion', appId: '1:1:web:1' };
globalThis.window = globalThis; // la persistencia web espera window
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };

async function cargar(base) {
  const app = await import(base + '@firebase/app/dist/esm/index.esm2017.js');
  const fs = await import(base + '@firebase/firestore/dist/index.esm2017.js');
  return { app, fs, version: createRequire(base)('firebase/package.json').version };
}
const espera = ms => new Promise(r => setTimeout(r, ms));

const v1 = await cargar(OLD);
{
  const app = v1.app.initializeApp(cfg);
  const db = v1.fs.initializeFirestore(app, { localCache: v1.fs.persistentLocalCache({ tabManager: v1.fs.persistentSingleTabManager() }) });
  await v1.fs.disableNetwork(db);
  v1.fs.setDoc(v1.fs.doc(db, 'embarques', 'e1'), { cliente: 'Ozuna', kilos: 123.45, items: [{ medida: '51/60', taras: 3 }] });
  v1.fs.setDoc(v1.fs.doc(db, 'abonos', 'a1'), { monto: 1500, fecha: '2026-11-05' });
  await espera(500);
  const snap = await v1.fs.getDocFromCache(v1.fs.doc(db, 'embarques', 'e1'));
  console.log(`[${v1.version}] escrito sin conexión:`, JSON.stringify(snap.data()), 'pendiente:', snap.metadata.hasPendingWrites);
  await v1.fs.terminate(db); await v1.app.deleteApp(app);
}
const v2 = await cargar(NEW);
{
  const app = v2.app.initializeApp(cfg);
  const db = v2.fs.initializeFirestore(app, { localCache: v2.fs.persistentLocalCache({ tabManager: v2.fs.persistentSingleTabManager() }) });
  await v2.fs.disableNetwork(db);
  const e1 = await v2.fs.getDocFromCache(v2.fs.doc(db, 'embarques', 'e1'));
  const a1 = await v2.fs.getDocFromCache(v2.fs.doc(db, 'abonos', 'a1'));
  console.log(`[${v2.version}] embarques/e1:`, JSON.stringify(e1.data()), 'pendiente:', e1.metadata.hasPendingWrites);
  console.log(`[${v2.version}] abonos/a1:`, JSON.stringify(a1.data()), 'pendiente:', a1.metadata.hasPendingWrites);
  const ok = e1.data()?.kilos === 123.45 && e1.data()?.items?.[0]?.taras === 3 && a1.data()?.monto === 1500 && e1.metadata.hasPendingWrites && a1.metadata.hasPendingWrites;
  // versión del esquema en disco tras abrir con la versión nueva
  const dbs = await indexedDB.databases();
  console.log('IndexedDB:', JSON.stringify(dbs));
  console.log(ok ? 'OK: datos y escrituras pendientes intactos tras la migración' : 'FALLO');
  await v2.fs.terminate(db); await v2.app.deleteApp(app);
  if (!ok) process.exit(1);
}
// Reversión: abrir la base (ya en esquema 17) otra vez con 10.12.4.
{
  const app = v1.app.initializeApp(cfg);
  let msg = 'sin error';
  try {
    const db = v1.fs.initializeFirestore(app, { localCache: v1.fs.persistentLocalCache({ tabManager: v1.fs.persistentSingleTabManager() }) });
    await v1.fs.disableNetwork(db);
    const e1 = await v1.fs.getDocFromCache(v1.fs.doc(db, 'embarques', 'e1')).catch(e => { msg = e.code + ': ' + e.message.slice(0, 160); return null; });
    console.log('[reversión a 10.12.4] lectura de caché:', e1 ? JSON.stringify(e1.data()) : 'no disponible', '|', msg);
    await v1.fs.terminate(db).catch(() => {});
  } catch (e) { console.log('[reversión a 10.12.4] error al iniciar:', e.code, e.message.slice(0, 160)); }
  await v1.app.deleteApp(app);
}
// Volver a 10.14.1: ¿siguen ahí las escrituras pendientes?
{
  const app = v2.app.initializeApp(cfg);
  const db = v2.fs.initializeFirestore(app, { localCache: v2.fs.persistentLocalCache({ tabManager: v2.fs.persistentSingleTabManager() }) });
  await v2.fs.disableNetwork(db);
  const e1 = await v2.fs.getDocFromCache(v2.fs.doc(db, 'embarques', 'e1'));
  console.log('[de nuevo 10.14.1] embarques/e1:', JSON.stringify(e1.data()), 'pendiente:', e1.metadata.hasPendingWrites);
  process.exit(0);
}
