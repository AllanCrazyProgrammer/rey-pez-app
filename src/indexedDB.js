import { openDB } from 'idb';

const dbName = 'reypezApp';
const dbVersion = 2; // Incrementa esto de 1 a 2

const dbPromise = openDB(dbName, dbVersion, {
  upgrade(db, oldVersion, newVersion, transaction) {
    // Crear o verificar los object stores necesarios
    if (!db.objectStoreNames.contains('cuentasOzuna')) {
      db.createObjectStore('cuentasOzuna', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('cuentasOzunaAll')) {
      db.createObjectStore('cuentasOzunaAll', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('cuentasOzunaPendientes')) {
      db.createObjectStore('cuentasOzunaPendientes', { keyPath: 'id', autoIncrement: true });
    }
    console.log('Database schema updated');
  },
});

export async function saveToIndexedDB(storeName, data) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  await store.put(data);
  await tx.done;
}

export async function getFromIndexedDB(storeName, key) {
  const db = await dbPromise;
  return db.get(storeName, key);
}

export async function getAllFromIndexedDB(storeName) {
  const db = await dbPromise;
  return db.getAll(storeName);
}

export async function deleteFromIndexedDB(storeName, key) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).delete(key);
  await tx.done;
}

export async function clearIndexedDB(storeName) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).clear();
  await tx.done;
}

export async function getLastCuentaBeforeDate(date) {
  const db = await dbPromise;
  const tx = db.transaction('cuentasOzuna', 'readonly');
  const store = tx.objectStore('cuentasOzuna');
  const cuentas = await store.getAll();
  const cuentasAnteriores = cuentas
    .filter(cuenta => new Date(cuenta.fecha) < new Date(date))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return cuentasAnteriores[0] || null;
}

export async function saveAllCuentas(cuentas) {
  const db = await dbPromise;
  const tx = db.transaction('cuentasOzunaAll', 'readwrite');
  const store = tx.objectStore('cuentasOzunaAll');
  await store.put({ id: 'allCuentas', cuentas });
  await tx.done;
}

export async function getAllCuentas() {
  const db = await dbPromise;
  const result = await db.get('cuentasOzunaAll', 'allCuentas');
  return result ? result.cuentas : [];
}

export async function saveCuentaOzunaPendiente(cuenta) {
  const db = await dbPromise;
  const tx = db.transaction('cuentasOzunaPendientes', 'readwrite');
  const store = tx.objectStore('cuentasOzunaPendientes');
  await store.add(cuenta);
  await tx.done;
}

export async function getCuentasOzunaPendientes() {
  console.log('Intentando obtener cuentas pendientes...');
  const db = await dbPromise;
  console.log('Base de datos obtenida:', db);
  console.log('Nombres de object stores:', db.objectStoreNames);
  return db.getAll('cuentasOzunaPendientes');
}

export async function deleteCuentaOzunaPendiente(id) {
  const db = await dbPromise;
  const tx = db.transaction('cuentasOzunaPendientes', 'readwrite');
  await tx.objectStore('cuentasOzunaPendientes').delete(id);
  await tx.done;
}