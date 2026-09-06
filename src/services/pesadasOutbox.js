import { aplicarCamposPesadas } from '../utils/pesadas';

export const PESADAS_PENDING_PREFIX = 'reypez.pesadas.pending.';

export function leerOperacionesPesadas(storage, fecha = '') {
  const prefix = PESADAS_PENDING_PREFIX + fecha + (fecha ? ':' : '');
  const operations = {};
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key || !key.startsWith(prefix)) continue;
    const raw = storage.getItem(key);
    if (!raw) continue;
    const op = JSON.parse(raw);
    if (!op || !op.fields || !Number.isSafeInteger(op.order)) throw new Error('Respaldo local inválido.');
    operations[key] = op;
  }
  return operations;
}

export function camposOperacionesPesadas(operations) {
  const fields = {};
  Object.entries(operations).sort(([keyA, a], [keyB, b]) => a.order - b.order || keyA.localeCompare(keyB))
    .forEach(([, op]) => Object.assign(fields, op.fields));
  return fields;
}

// Immutable local records let different tabs append edits without replacing a
// shared map. Acknowledgements remove only the exact operations sent in a batch.
export class PesadasOutbox {
  constructor({ fecha, storage, write, notify = () => {}, delay = 650 }) {
    this.fecha = fecha;
    this.key = PESADAS_PENDING_PREFIX + fecha;
    this.storage = storage;
    this.write = write;
    this.notify = notify;
    this.delay = delay;
    this.remote = {};
    this.remoteRevision = 0;
    this.operations = {};
    this.unpersisted = new Set();
    this.inFlight = false;
    this.disposed = false;
    this.error = '';
    this.storageError = false;
    this.read();
  }

  read() {
    try {
      const saved = leerOperacionesPesadas(this.storage, this.fecha);
      this.operations = this.storageError ? { ...saved, ...this.operations } : saved;
      this.storageError = false;
    } catch (_error) { this.storageError = true; }
  }

  get fields() { return camposOperacionesPesadas(this.operations); }

  emit() {
    if (!this.disposed) this.notify({
      data: aplicarCamposPesadas(this.remote, this.fields),
      pending: Object.keys(this.operations).length > 0,
      saving: this.inFlight, error: this.error, storageError: this.storageError
    });
  }

  receive(data) {
    this.remote = data || {};
    this.remoteRevision++;
    this.emit();
  }

  syncStorage() {
    this.read();
    this.emit();
    this.schedule();
  }

  edit(fields) {
    this.read();
    const order = Math.max(Date.now() * 1000, ...Object.values(this.operations).map(op => op.order + 1));
    const id = `${order}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    const newKey = `${this.key}:${id}`;
    this.operations[newKey] = { fields, order };
    this.unpersisted.add(newKey);
    this.error = '';
    try {
      // Retry any edits retained only in memory after a storage failure.
      this.unpersisted.forEach(key => {
        this.storage.setItem(key, JSON.stringify(this.operations[key]));
        this.unpersisted.delete(key);
      });
      this.storageError = false;
    } catch (_error) { this.storageError = true; }
    this.emit();
    this.schedule();
  }

  schedule() {
    clearTimeout(this.timer);
    if (!this.disposed && Object.keys(this.operations).length) this.timer = setTimeout(() => this.flush(), this.delay);
  }

  async flush() {
    clearTimeout(this.timer);
    if (this.inFlight || this.disposed) return;
    this.read();
    const batch = { ...this.operations };
    if (!Object.keys(batch).length) return;
    const fields = camposOperacionesPesadas(batch);
    const remoteRevision = this.remoteRevision;
    this.inFlight = true;
    this.error = '';
    this.emit();
    try {
      await this.write(fields);
      if (this.remoteRevision === remoteRevision) this.remote = aplicarCamposPesadas(this.remote, fields);
      this.read();
      Object.keys(batch).forEach(key => {
        try {
          this.storage.removeItem(key);
          delete this.operations[key];
          this.unpersisted.delete(key);
        } catch (_error) {
          this.storageError = true;
          this.error = 'Guardado en la nube, pero no se pudo actualizar el respaldo local. Reintenta el guardado.';
        }
      });
    } catch (error) {
      this.error = `No se pudo sincronizar. ${error.message || 'Intenta nuevamente.'}`;
    } finally {
      this.inFlight = false;
      this.emit();
      if (!this.error) this.schedule();
    }
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
  }
}
