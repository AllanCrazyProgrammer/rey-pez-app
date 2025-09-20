const DB_NAME = 'ReyPezOfflineDB';
const DB_VERSION = 1;
const STORE_EMBARQUES = 'embarques';

/**
 * Servicio ligero encima de IndexedDB para almacenar embarques offline.
 * Provee operaciones CRUD básicas y mantiene metadatos de sincronización.
 */
class EmbarquesOfflineService {
  constructor() {
    this.dbPromise = null;
    this.memoryStore = new Map();
    this.useMemoryFallback = false;
  }

  /**
   * Inicializa la base local. Reutiliza la misma promesa para evitar múltiples aperturas.
   */
  async init() {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    // Guardar referencia para detectar entornos sin window (por ejemplo, pruebas SSR)
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[EmbarquesOfflineService] indexedDB no disponible, usando almacenamiento en memoria.');
      this.useMemoryFallback = true;
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_EMBARQUES)) {
          const store = db.createObjectStore(STORE_EMBARQUES, { keyPath: 'id' });
          store.createIndex('fecha', 'fecha', { unique: false });
          store.createIndex('pendingSync', 'pendingSync', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[EmbarquesOfflineService] Error al abrir IndexedDB:', request.error);
        this.useMemoryFallback = true;
        resolve(null);
      };
    });

    try {
      await this.dbPromise;
    } catch (error) {
      console.error('[EmbarquesOfflineService] Error inicializando IndexedDB:', error);
      this.useMemoryFallback = true;
      this.dbPromise = Promise.resolve(null);
    }

    return this.dbPromise;
  }

  async getDb() {
    if (this.useMemoryFallback) {
      return null;
    }
    return this.init();
  }

  buildRecord(embarque, options = {}) {
    if (!embarque || !embarque.id) {
      throw new Error('El embarque debe incluir un id válido para guardarse offline');
    }

    return {
      id: embarque.id,
      ...embarque,
      updatedAt: Date.now(),
      pendingSync: options.pendingSync ?? false,
      syncState: options.syncState || (options.pendingSync ? 'pending' : 'synced'),
      lastSyncError: options.lastSyncError || null,
      deleted: options.deleted || false,
    };
  }

  /**
   * Guarda o actualiza un embarque en el almacenamiento offline.
   * options.pendingSync marca si falta sincronizar con el backend.
   */
  async save(embarque, options = {}) {
    const record = this.buildRecord(embarque, options);

    if (this.useMemoryFallback) {
      this.memoryStore.set(record.id, record);
      return record.id;
    }

    const db = await this.getDb();
    if (!db) {
      this.memoryStore.set(record.id, record);
      return record.id;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EMBARQUES, 'readwrite');
      const store = tx.objectStore(STORE_EMBARQUES);
      store.put(record);

      tx.oncomplete = () => resolve(record.id);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Obtiene todos los embarques almacenados localmente ordenados por fecha descendente.
   */
  async getAll() {
    if (this.useMemoryFallback) {
      return this.sortRecords(Array.from(this.memoryStore.values()));
    }

    const db = await this.getDb();
    if (!db) {
      return this.sortRecords(Array.from(this.memoryStore.values()));
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EMBARQUES, 'readonly');
      const store = tx.objectStore(STORE_EMBARQUES);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(this.sortRecords(request.result || []));
      };
      request.onerror = () => reject(request.error);
    });
  }

  sortRecords(records) {
    return (records || [])
      .filter(record => !record.deleted)
      .sort((a, b) => {
        const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
        const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
        return fechaB - fechaA;
      });
  }

  /**
   * Obtiene un embarque por id.
   */
  async getById(id) {
    if (!id) return null;

    if (this.useMemoryFallback) {
      return this.memoryStore.get(id) || null;
    }

    const db = await this.getDb();
    if (!db) {
      return this.memoryStore.get(id) || null;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EMBARQUES, 'readonly');
      const store = tx.objectStore(STORE_EMBARQUES);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Marca un embarque como eliminado. No se borra físicamente para poder sincronizar.
   */
  async markDeleted(id, options = {}) {
    const existing = await this.getById(id);
    if (!existing) return;

    const record = {
      ...existing,
      deleted: true,
      pendingSync: options.pendingSync ?? true,
      syncState: options.syncState || 'pending-delete',
      updatedAt: Date.now(),
    };

    return this.save(record, { pendingSync: record.pendingSync, syncState: record.syncState });
  }

  /**
   * Elimina físicamente un embarque del almacenamiento offline.
   */
  async hardDelete(id) {
    if (this.useMemoryFallback) {
      this.memoryStore.delete(id);
      return;
    }

    const db = await this.getDb();
    if (!db) {
      this.memoryStore.delete(id);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_EMBARQUES, 'readwrite');
      const store = tx.objectStore(STORE_EMBARQUES);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Devuelve los embarques pendientes de sincronizar.
   */
  async getPendingSync() {
    const records = await this.getAll();
    return records.filter(record => record.pendingSync);
  }

  /**
   * Marca un embarque como sincronizado.
   */
  async markSynced(id) {
    const existing = await this.getById(id);
    if (!existing) return;

    const record = {
      ...existing,
      pendingSync: false,
      syncState: 'synced',
      lastSyncError: null,
      updatedAt: Date.now(),
    };

    return this.save(record, { pendingSync: false, syncState: 'synced' });
  }

  /**
   * Guarda el error producido durante la sincronización.
   */
  async markSyncError(id, error) {
    const existing = await this.getById(id);
    if (!existing) return;

    const record = {
      ...existing,
      pendingSync: true,
      syncState: 'error',
      lastSyncError: error ? String(error) : 'Error desconocido',
      updatedAt: Date.now(),
    };

    return this.save(record, { pendingSync: true, syncState: 'error', lastSyncError: record.lastSyncError });
  }

  /**
   * Fusiona un embarque existente con nuevos datos y lo guarda.
   * @param {string} id
   * @param {Object|Function} updates - Objeto con campos a fusionar o función que recibe el registro actual.
   * @param {Object} options
   */
  async mergeSave(id, updates = {}, options = {}) {
    await this.init();

    const existing = await this.getById(id);
    let merged;
    let mergedOptions = { ...options };

    if (typeof updates === 'function') {
      const result = updates(existing ? { ...existing } : null);
      if (!result) {
        return null;
      }

      if (result.record) {
        merged = result.record;
        mergedOptions = { ...mergedOptions, ...(result.options || {}) };
      } else {
        merged = result;
      }
    } else {
      merged = {
        ...(existing || {}),
        ...(updates || {})
      };
    }

    if (!merged) {
      return null;
    }

    if (!merged.id) {
      merged.id = id;
    }

    return this.save(merged, mergedOptions);
  }
}

export default new EmbarquesOfflineService();
