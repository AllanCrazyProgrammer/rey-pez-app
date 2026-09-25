import offline from './EmbarquesOfflineService';
import { snapshotEmbarque } from '@/utils/embarqueOfflineSnapshot';

export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const FORMAT = 'reypez-embarques-pendientes';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };

function validateTree(value, depth = 0) {
  if (depth > 40) fail('El respaldo tiene una estructura demasiado profunda.');
  if (typeof value === 'number' && !Number.isFinite(value)) fail('El respaldo contiene un número inválido.');
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('El respaldo contiene una propiedad no permitida.');
      validateTree(value[key], depth + 1);
    }
  }
}

function validateRecord(record) {
  if (!object(record) || typeof record.id !== 'string' || !/^[a-zA-Z0-9_-]{1,1500}$/.test(record.id)) fail('Hay un identificador de embarque inválido.');
  if (record.pendingSync !== true || !object(record.docData)) fail('El archivo debe contener embarques pendientes con sus datos completos.');
  const data = record.docData;
  if (!Array.isArray(data.clientes)) fail('Falta la lista de clientes del embarque.');
  if (typeof data.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha) ||
      Number.isNaN(Date.parse(data.fecha)) || new Date(data.fecha).toISOString().slice(0, 10) !== data.fecha) fail('La fecha del embarque no es válida.');
  if (record.deleted && record.deletedByUser !== true) fail('El respaldo contiene una eliminación sin confirmar.');
  const revision = record.baseRev ?? data.rev ?? 0;
  if (!Number.isSafeInteger(revision) || revision < 0) fail('La revisión del embarque no es válida.');
  const clients = new Set();
  const products = new Set();
  for (const client of data.clientes) {
    if (!object(client) || !['string', 'number'].includes(typeof client.id) || !Array.isArray(client.productos) || !Array.isArray(client.crudos)) fail('Hay un cliente incompleto en el respaldo.');
    if (clients.has(String(client.id))) fail('Hay clientes repetidos en un embarque.');
    clients.add(String(client.id));
    for (const product of client.productos) {
      if (!object(product) || typeof product.id !== 'string' || !product.id || products.has(product.id)) fail('Hay productos inválidos o repetidos.');
      if ((product.kilos !== undefined && !Array.isArray(product.kilos)) || (product.taras !== undefined && !Array.isArray(product.taras))) fail('Los kilos o taras del respaldo no son válidos.');
      products.add(product.id);
    }
    if (!client.crudos.every(object)) fail('Hay datos de crudos inválidos.');
  }
  if (record.mergeBase !== undefined && (!object(record.mergeBase) ||
      !Array.isArray(record.mergeBase.productos) || !Array.isArray(record.mergeBase.crudos) ||
      ![...record.mergeBase.productos, ...record.mergeBase.crudos].every(pair => Array.isArray(pair) && pair.length === 2))) fail('Las referencias para combinar cambios no son válidas.');
}

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function content(record) {
  return stable({ id: record.id, docData: record.docData, deleted: Boolean(record.deleted), baseRev: record.baseRev ?? record.docData?.rev ?? 0 });
}
async function fingerprint(record) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content(record)));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function parseBackup(text) {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) fail('El respaldo supera el límite de 50 MB.');
  let data;
  try { data = JSON.parse(text); } catch (_) { fail('Este archivo no es un respaldo JSON válido.'); }
  validateTree(data);
  if (!object(data) || data.format !== FORMAT || data.version !== 1 || !Array.isArray(data.records) || data.records.length > 5000) fail('El formato o versión del respaldo no es compatible con ReyPez.');
  const ids = new Set();
  for (const record of data.records) {
    validateRecord(record);
    if (ids.has(record.id)) fail('El archivo contiene el mismo embarque más de una vez.');
    ids.add(record.id);
  }
  return data;
}

export async function exportPending() {
  const records = await offline.getPendingSync(true);
  if (!records.length) fail('No hay embarques pendientes para exportar.');
  // Do not change pending flags: downloading a file is not a cloud acknowledgement.
  const backup = { format: FORMAT, version: 1, createdAt: new Date().toISOString(), records };
  const text = JSON.stringify(backup, null, 2);
  parseBackup(text); // Ensure anything we export can be imported by this version.
  return { text, count: records.length, filename: `ReyPez-pendientes-${backup.createdAt.replace(/[:.]/g, '-')}.json` };
}

export async function importBackup(text, blockedId = null) {
  const backup = parseBackup(text);
  const prepared = await Promise.all(backup.records.map(async record => ({ record, key: await fingerprint(record) })));
  const db = await offline.getDb();
  if (!db) fail('No se puede guardar el respaldo en este equipo. No se importó ningún embarque.');
  return new Promise((resolve, reject) => {
    const result = { imported: [], duplicates: [], skipped: [] };
    const tx = db.transaction('embarques', 'readwrite');
    const store = tx.objectStore('embarques');
    let failure;
    for (const {record, key} of prepared) {
      const request = store.get(record.id);
      request.onsuccess = () => {
        try {
          const current = request.result;
          const summary = { id: record.id, fecha: record.docData.fecha };
          if (current?.transferReceipts?.includes(key)) { result.duplicates.push(summary); return; }
          if (record.id === blockedId) {
            result.skipped.push({ ...summary, reason: 'Está abierto en el editor. Vuelve a la lista antes de importarlo.' }); return;
          }
          if (current && content(current) === content(record)) {
            store.put({ ...current, transferReceipts: [...(current.transferReceipts || []), key] });
            result.duplicates.push(summary); return;
          }
          if (current && (current.pendingSync || current.deleted || Number(current.baseRev ?? current.docData?.rev ?? 0) > Number(record.baseRev ?? record.docData.rev ?? 0))) {
            result.skipped.push({ ...summary, reason: 'Este equipo tiene cambios pendientes, una eliminación o una revisión más reciente. No se reemplazó.' }); return;
          }
          const normalized = snapshotEmbarque(record.id, record.docData);
          const imported = offline.buildRecord({ ...normalized,
            baseRev: record.baseRev ?? record.docData.rev ?? 0,
            ...(record.mergeBase ? { mergeBase: record.mergeBase } : {}),
            preciosActuales: Array.isArray(record.preciosActuales) ? record.preciosActuales : [],
            deleted: Boolean(record.deleted), deletedByUser: Boolean(record.deletedByUser),
            transferReceipts: [...(current?.transferReceipts || []), key],
            localVersion: `${Date.now()}-${Math.random()}`
          }, { pendingSync: true, syncState: record.deleted ? 'pending-delete' : 'pending' });
          store.put(imported);
          result.imported.push(summary);
        } catch (error) { failure = error; tx.abort(); }
      };
    }
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure || tx.error || new Error('La importación se canceló. No se guardó ningún cambio.'));
    tx.onerror = () => { failure = tx.error; };
  });
}
