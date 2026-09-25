import Vue from 'vue';
import { collection, doc, documentId, getDocsFromServer, limit, orderBy, query, runTransaction, serverTimestamp, startAfter } from 'firebase/firestore';
import { db } from '@/firebase';
import offline from './EmbarquesOfflineService';
import { snapshotEmbarque } from '@/utils/embarqueOfflineSnapshot';
import { useAuthStore } from '@/stores/auth';

export const estadoOffline = Vue.observable({
  online: navigator.onLine, shellReady: Boolean(window.desktop), downloading: false,
  syncing: false, count: 0, pending: 0, conflicts: [], error: '', archiveReady: false
});

class EmbarquesSync {
  editorId = null;
  running = null;

  async refresh(records = null) {
    records = records || await offline.getAllRecords();
    estadoOffline.count = records.filter(r => !r.deleted).length;
    estadoOffline.pending = records.filter(r => r.pendingSync).length;
    estadoOffline.conflicts = records.filter(r => r.syncState === 'conflict').map(r => ({ id: r.id, fecha: r.fecha }));
    const signature = records.map(r => [r.id, r.localVersion, r.pendingSync, r.deleted, r.syncState].join(':')).join('|');
    if (signature !== this.lastListSignature) {
      this.lastListSignature = signature;
      window.dispatchEvent(new Event('embarques-local-updated'));
    }
  }

  start() {
    if (this.started) {
      if (!estadoOffline.archiveReady) this.prepare();
      return;
    }
    this.started = true;
    const reconnect = () => {
      estadoOffline.online = navigator.onLine;
      if (navigator.onLine) { this.sync(); this.prepare(); }
    };
    window.addEventListener('online', reconnect);
    window.addEventListener('offline', reconnect);
    this.timer = setInterval(() => {
      if (navigator.onLine) this.sync();
      else this.refresh().catch(() => {});
    }, 15000);
    this.refresh().catch(error => { estadoOffline.error = error.message; });
    reconnect();
  }

  async prepare() {
    if (estadoOffline.downloading || !navigator.onLine || !useAuthStore().isAuthenticated) return;
    estadoOffline.downloading = true;
    estadoOffline.error = '';
    try {
      await navigator.storage?.persist?.();
      let cursor = null;
      // Pagination by ID includes legacy documents without a date field.
      do {
        const constraints = [orderBy(documentId()), limit(100)];
        if (cursor) constraints.push(startAfter(cursor));
        const page = await getDocsFromServer(query(collection(db, 'embarques'), ...constraints));
        await offline.saveBatch(page.docs.map(item => snapshotEmbarque(item.id, item.data())), { preservePending: true });
        await this.refresh();
        cursor = page.size === 100 ? page.docs[page.docs.length - 1] : null;
      } while (cursor && navigator.onLine);
      if (!navigator.onLine) throw new Error('Descarga interrumpida. Se conservan los embarques ya descargados.');
      // Warm the persistent Firestore cache for new shipments and selectors.
      await Promise.all(['precios', 'medidas'].map(name => getDocsFromServer(collection(db, name))));
      estadoOffline.archiveReady = true;
    } catch (error) {
      estadoOffline.error = 'No se completó la descarga del historial. ' + error.message;
    } finally {
      estadoOffline.downloading = false;
    }
  }

  sync() {
    if (this.running) return this.running;
    if (!navigator.onLine || !useAuthStore().isAuthenticated) return Promise.resolve();
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }

  async drain() {
    estadoOffline.syncing = true;
    try {
      const auth = useAuthStore();
      const records = await offline.getAllRecords();
      const pending = offline.ordenarPorFecha(records.filter(record => record.pendingSync));
      if (!pending.length) {
        await this.refresh(records);
        return;
      }
      for (const record of pending) {
        if (!navigator.onLine) break;
        if (record.id === this.editorId) continue;
        // Deletions require backup and human review; never silently resurrect or discard them.
        if (record.syncState === 'conflict') continue;
        try {
          let confirmed;
          await runTransaction(db, async transaction => {
            const reference = doc(db, 'embarques', record.id);
            const remote = await transaction.get(reference);
            const remoteData = remote.exists() ? remote.data() : null;
            const baseRev = Number(record.baseRev ?? record.docData?.rev) || 0;
            if ((remoteData && (Number(remoteData.rev) || 0) !== baseRev) ||
                (!remoteData && baseRev > 0)) {
              const error = new Error('Este embarque cambió en otro equipo. Ábrelo para revisar y combinar los cambios.');
              error.code = 'offline-conflict';
              throw error;
            }
            if (record.deleted) {
              if (!record.deletedByUser) throw new Error('Borrado sin confirmación local');
              if (remoteData) {
                const backup = doc(collection(db, 'respaldos_emergencia'));
                transaction.set(backup, { embarqueOriginalId: record.id, datosOriginales: remoteData, fechaRespaldo: serverTimestamp(), razonRespaldo: 'eliminacion_offline', tipoRespaldo: 'emergencia', version: '1.0' });
                transaction.delete(reference);
              }
              confirmed = { ...record, pendingSync: false };
              return;
            }
            if (!record.docData) throw new Error('Falta el contenido local del embarque');
            const payload = { ...record.docData, rev: baseRev + 1,
              ultimaEdicion: { userId: auth.userId, username: auth.user.username, timestamp: serverTimestamp() } };
            if (remoteData) {
              ['totalGanancias', 'rendimientoManual', 'fletePagado', 'fletePagos', 'fletePagoActualizadoEn', 'fletePagoActualizadoPor'].forEach(key => delete payload[key]);
            }
            // Preserve fields owned by other screens (freight payments, totals).
            if (remote.exists()) transaction.update(reference, payload);
            else transaction.set(reference, payload);
            confirmed = snapshotEmbarque(record.id, {
              ...remoteData, ...payload,
              ultimaEdicion: { userId: auth.userId, username: auth.user.username }
            });
          });
          await offline.acknowledge(record, confirmed);
        } catch (error) {
          await offline.mutate(record.id, current => current?.localVersion === record.localVersion
            ? { ...current, pendingSync: true, syncState: error.code === 'offline-conflict' ? 'conflict' : 'error', lastSyncError: error.message }
            : current);
          if (error.code !== 'offline-conflict') estadoOffline.error = 'Cambios conservados en el equipo; se reintentará la subida. ' + error.message;
        }
      }
      await this.refresh();
    } catch (error) {
      estadoOffline.error = error.message;
    } finally {
      estadoOffline.syncing = false;
    }
  }
}
export default new EmbarquesSync();
