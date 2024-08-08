const DB_NAME = 'SacadasDB';
const STORE_NAME = 'sacadas';
const DB_VERSION = 1;
const PROVEEDORES_STORE = 'proveedores';
const MEDIDAS_STORE = 'medidas';

let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject("Error al abrir la base de datos");

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROVEEDORES_STORE)) {
        db.createObjectStore(PROVEEDORES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MEDIDAS_STORE)) {
        db.createObjectStore(MEDIDAS_STORE, { keyPath: 'id' });
      }
    };
  });
}

export const indexedDBService = {
  async getSacadas() {
    await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject("Error al obtener sacadas");
      request.onsuccess = () => {
        const sacadas = request.result;
        // Ordenamos las sacadas por fecha, de la más reciente a la más antigua
        sacadas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        resolve(sacadas);
      };
    });
  },
  

  async saveSacadas(sacadas) {
    await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      sacadas.forEach(sacada => {
        store.put(sacada);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject("Error al guardar sacadas");
    });
  },

  async deleteSacada(id) {
    await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject("Error al eliminar sacada");
      request.onsuccess = () => resolve();
    });
  },

  async saveProveedores(proveedores) {
    await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROVEEDORES_STORE, 'readwrite');
      const store = transaction.objectStore(PROVEEDORES_STORE);

      proveedores.forEach(proveedor => {
        store.put(proveedor);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject("Error al guardar proveedores");
    });
  },

  async getProveedores() {
    await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROVEEDORES_STORE, 'readonly');
      const store = transaction.objectStore(PROVEEDORES_STORE);
      const request = store.getAll();

      request.onerror = () => reject("Error al obtener proveedores");
      request.onsuccess = () => resolve(request.result);
    });
  },

  async saveMedidas(medidas) {
    await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MEDIDAS_STORE, 'readwrite');
      const store = transaction.objectStore(MEDIDAS_STORE);

      medidas.forEach(medida => {
        store.put(medida);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject("Error al guardar medidas");
    });
  },

  async getMedidas() {
    await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MEDIDAS_STORE, 'readonly');
      const store = transaction.objectStore(MEDIDAS_STORE);
      const request = store.getAll();

      request.onerror = () => reject("Error al obtener medidas");
      request.onsuccess = () => resolve(request.result);
    });
  },

  async getSacada(id) {
    await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject("Error al obtener sacada");
      request.onsuccess = () => resolve(request.result);
    });
  },

  async saveSacada(sacada) {
    await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(sacada);

      request.onerror = () => reject("Error al guardar sacada");
      request.onsuccess = () => resolve();
    });
  }
};