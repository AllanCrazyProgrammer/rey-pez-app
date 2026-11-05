// Pruebas de las reglas PROPUESTAS (seguridad/propuesta/*) contra los EMULADORES de
// Firestore, Realtime Database y Storage. Nunca toca el proyecto real (proyecto demo-*).
//
// Correr (desde la raíz del repo; necesita Java 21+, ver docs/SEGURIDAD_Y_RESPALDOS.md):
//   npm run test:reglas
// que equivale a:
//   npx firebase emulators:exec --config seguridad/firebase.emulador.json --project demo-reypez \
//     --only firestore,database,storage "node --test scripts/test-reglas-propuesta.cjs"
//
// Las rutas probadas son las que usa la app: colecciones de Firestore (con subcolecciones),
// presenciaEmbarques/ y status/ en Realtime Database, bitacoras/ y journal/ en Storage.
const { test, before, after, describe } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {
  initializeTestEnvironment, assertFails, assertSucceeds
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, deleteDoc, collection, getDocs, updateDoc } = require('firebase/firestore');
const { ref: dbRef, get, set, remove } = require('firebase/database');
const { ref: stRef, uploadBytes, getBytes, deleteObject } = require('firebase/storage');

// REGLAS_DIR=. prueba las reglas actuales de la raíz (deben fallar los casos "sin sesión").
const PROPUESTA = path.resolve(process.env.REGLAS_DIR || path.join(__dirname, '..', 'seguridad', 'propuesta'));
const leer = f => fs.readFileSync(path.join(PROPUESTA, f), 'utf8');
const hostPuerto = (variable, def) => {
  const [host, port] = (process.env[variable] || def).split(':');
  return { host, port: Number(port) };
};

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-reypez',
    firestore: { rules: leer('firestore.rules'), ...hostPuerto('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8085') },
    database: { rules: leer('database.rules.json'), ...hostPuerto('FIREBASE_DATABASE_EMULATOR_HOST', '127.0.0.1:9000') },
    storage: { rules: leer('storage.rules'), ...hostPuerto('FIREBASE_STORAGE_EMULATOR_HOST', '127.0.0.1:9199') }
  });
});
after(async () => { if (env) await env.cleanup(); });

const anonimo = () => env.unauthenticatedContext();
const conSesion = () => env.authenticatedContext('uid-allan', { email: 'allan@reypez.app' });
const imagen = (bytes = 1024) => new Uint8Array(bytes).fill(7);

// Documentos representativos de la app: colección simple, mapa por cuenta, papelera y subcolección.
const DOCS = [
  'embarques/emb-1',
  'saldosCuentas/porCuenta',
  'papelera/p-1',
  'entradasProductoBarcos/e-1',
  'embarques/emb-1/clientes/cli-1'
];

describe('Firestore', () => {
  before(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      for (const p of DOCS) await setDoc(doc(db, p), { semilla: true });
    });
  });

  for (const p of DOCS) {
    test(`sin sesión: no lee, lista, escribe ni borra ${p}`, async () => {
      const db = anonimo().firestore();
      await assertFails(getDoc(doc(db, p)));
      await assertFails(getDocs(collection(db, p.split('/').slice(0, -1).join('/'))));
      await assertFails(setDoc(doc(db, p), { intruso: true }));
      await assertFails(updateDoc(doc(db, p), { intruso: true }));
      await assertFails(deleteDoc(doc(db, p)));
    });

    test(`con sesión: lee, lista, crea, actualiza y borra ${p}`, async () => {
      const db = conSesion().firestore();
      await assertSucceeds(getDoc(doc(db, p)));
      await assertSucceeds(getDocs(collection(db, p.split('/').slice(0, -1).join('/'))));
      await assertSucceeds(setDoc(doc(db, p), { valor: 1 }, { merge: true }));
      await assertSucceeds(updateDoc(doc(db, p), { valor: 2 }));
      await assertSucceeds(deleteDoc(doc(db, p)));
      await assertSucceeds(setDoc(doc(db, p + '-nuevo'), { creado: true }));
    });
  }
});

describe('Realtime Database', () => {
  const RUTAS = ['presenciaEmbarques/emb-1/sesiones/s-1', 'status/uid-allan'];
  before(async () => {
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.database();
      for (const r of RUTAS) await set(dbRef(db, r), { semilla: true });
    });
  });

  test('sin sesión: no lee la raíz', async () => {
    await assertFails(get(dbRef(anonimo().database(), '/')));
  });

  for (const r of RUTAS) {
    test(`sin sesión: no lee, escribe ni borra ${r}`, async () => {
      const db = anonimo().database();
      await assertFails(get(dbRef(db, r)));
      await assertFails(set(dbRef(db, r), { intruso: true }));
      await assertFails(remove(dbRef(db, r)));
    });

    test(`con sesión: lee, escribe y borra ${r}`, async () => {
      const db = conSesion().database();
      await assertSucceeds(get(dbRef(db, r)));
      await assertSucceeds(set(dbRef(db, r), { online: true, ts: 1 }));
      await assertSucceeds(remove(dbRef(db, r)));
    });
  }
});

describe('Storage', () => {
  // Formas de ruta reales: fotosBitacora.js (cuarto-N/equipo-...), Bitacoras.vue ({id}/{fotoId}), Journal.vue.
  const FOTO_CUARTO = 'bitacoras/cuarto-3/equipo-2-1730000000000.jpg';
  const FOTO_BITACORA = 'bitacoras/bit-1/foto-1';
  const FOTO_JOURNAL = 'journal/j-1/1730000000000-abc.jpg';

  before(async () => {
    await env.clearStorage();
    await env.withSecurityRulesDisabled(async ctx => {
      const st = ctx.storage();
      for (const p of [FOTO_CUARTO, FOTO_BITACORA, FOTO_JOURNAL]) {
        await uploadBytes(stRef(st, p), imagen(), { contentType: 'image/jpeg' });
      }
    });
  });

  test('sin sesión: no lee, sube ni borra fotos', async () => {
    const st = anonimo().storage();
    for (const p of [FOTO_CUARTO, FOTO_BITACORA, FOTO_JOURNAL]) {
      await assertFails(getBytes(stRef(st, p)));
      await assertFails(uploadBytes(stRef(st, p), imagen(), { contentType: 'image/jpeg' }));
      await assertFails(deleteObject(stRef(st, p)));
    }
  });

  test('con sesión: lee fotos existentes de bitácoras y journal', async () => {
    const st = conSesion().storage();
    for (const p of [FOTO_CUARTO, FOTO_BITACORA, FOTO_JOURNAL]) await assertSucceeds(getBytes(stRef(st, p)));
  });

  test('con sesión: sube a bitácoras jpeg, png y webp de hasta 10 MB', async () => {
    const st = conSesion().storage();
    await assertSucceeds(uploadBytes(stRef(st, 'bitacoras/bit-2/a.jpg'), imagen(), { contentType: 'image/jpeg' }));
    await assertSucceeds(uploadBytes(stRef(st, 'bitacoras/bit-2/b.png'), imagen(), { contentType: 'image/png' }));
    await assertSucceeds(uploadBytes(stRef(st, 'bitacoras/bit-2/c.webp'), imagen(), { contentType: 'image/webp' }));
    await assertSucceeds(uploadBytes(stRef(st, 'bitacoras/bit-2/limite.jpg'), imagen(10 * 1024 * 1024), { contentType: 'image/jpeg' }));
  });

  test('con sesión: bitácoras rechaza más de 10 MB y lo que no sea imagen', async () => {
    const st = conSesion().storage();
    await assertFails(uploadBytes(stRef(st, 'bitacoras/bit-2/grande.jpg'), imagen(10 * 1024 * 1024 + 1), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(stRef(st, 'bitacoras/bit-2/doc.pdf'), imagen(), { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(stRef(st, 'bitacoras/bit-2/x.gif'), imagen(), { contentType: 'image/gif' }));
  });

  test('con sesión: sube y borra en journal; borra en bitácoras', async () => {
    const st = conSesion().storage();
    await assertSucceeds(uploadBytes(stRef(st, 'journal/j-2/n.jpg'), imagen(), { contentType: 'image/jpeg' }));
    await assertSucceeds(deleteObject(stRef(st, 'journal/j-2/n.jpg')));
    await assertSucceeds(deleteObject(stRef(st, FOTO_BITACORA)));
  });

  test('con sesión: rutas fuera de bitácoras/journal siguen cerradas', async () => {
    const st = conSesion().storage();
    await assertFails(uploadBytes(stRef(st, 'otros/x.jpg'), imagen(), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(stRef(st, 'bitacoras/a/b/c.jpg'), imagen(), { contentType: 'image/jpeg' }));
    await assertFails(getBytes(stRef(st, 'otros/x.jpg')));
  });
});
