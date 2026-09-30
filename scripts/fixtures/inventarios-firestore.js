// Adaptador aislado para probar las pantallas reales sin leer/escribir Firebase.
const timestamp = date => ({ toDate: () => new Date(date), seconds: Math.floor(new Date(date).getTime() / 1000) });
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(12, 0, 0, 0);
const fecha = timestamp(yesterday);
const older = new Date(yesterday); older.setDate(older.getDate() - 3);
const data = {
  proveedores: { p1: { nombre: 'Proveedor prueba', tipo: 'proveedor' } },
  medidas: { m1: { nombre: '51/60', tipo: 'proveedor', proveedorId: 'p1' } },
  proveedoresCrudos: { c1: { nombre: 'Proveedor crudo' } },
  medidasCrudos: { mc1: { nombre: 'Crudo mediano', proveedorId: 'c1' } },
  sacadas: { limpio1: { fecha, entradas: [{ tipo: 'proveedor', proveedor: 'Proveedor prueba', medida: '51/60', kilos: 100, cajas: 5, cuartoFrio: 'Cuarto 1' }], salidas: [], totalEntradas: 100, totalSalidas: 0 }, limpioAnterior: { fecha: timestamp(older), entradas: [], salidas: [], totalEntradas: 0, totalSalidas: 0 } },
  existenciasCrudos: { crudo1: { fecha, entradas: [{ proveedor: 'Proveedor crudo', producto: 'Crudo mediano', kilos: 80, cuartoFrio: 'Cuarto 1' }], salidas: [], totalEntradas: 80, totalSalidas: 0 } }
};
const listeners = new Set();
window.__inventariosPrueba = { data, escrituras: [], lecturas: [], fallar: null, fallarLecturas: null };
export const collection = (_, name) => ({ name });
export const doc = (_, name, id) => ({ name, id });
export const where = (field, op, value) => ({ field, op, value });
export const orderBy = () => ({});
export const query = (ref, ...filters) => ({ ...ref, filters });
const valueOf = value => value && value.toDate ? value.toDate().getTime() : value instanceof Date ? value.getTime() : value;
const snapDoc = (id, value) => ({ id, exists: () => Boolean(value), data: () => value });
function snapshot(ref) {
  let docs = Object.entries(data[ref.name] || {}).map(([id, value]) => snapDoc(id, value));
  for (const f of ref.filters || []) {
    if (!f.field) continue;
    docs = docs.filter(d => {
      const a = valueOf(d.data()[f.field]); const b = valueOf(f.value);
      return f.op === '>=' ? a >= b : f.op === '<=' ? a <= b : f.op === '==' ? a === b : true;
    });
  }
  return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false }, forEach: callback => docs.forEach(callback) };
}
export async function getDocs(ref) { window.__inventariosPrueba.lecturas.push(ref.name); return snapshot(ref); }
export async function getDoc(ref) { return snapDoc(ref.id, (data[ref.name] || {})[ref.id]); }
export function onSnapshot(ref, optionsOrCallback, callbackOrError, finalError) {
  const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callbackOrError;
  const error = typeof optionsOrCallback === 'function' ? callbackOrError : finalError;
  const listener = { ref, callback, error }; listeners.add(listener);
  window.__inventariosPrueba.lecturas.push(ref.name);
  queueMicrotask(() => {
    if (!listeners.has(listener)) return;
    if (window.__inventariosPrueba.fallarLecturas === ref.name) return error && error(new Error('Fallo de lectura de prueba'));
    callback(ref.id ? snapDoc(ref.id, (data[ref.name] || {})[ref.id]) : snapshot(ref));
  });
  return () => listeners.delete(listener);
}
function write(ref, value, merge) {
  if (window.__inventariosPrueba.fallar === ref.name) throw new Error('Fallo de prueba');
  if (!data[ref.name]) data[ref.name] = {};
  const converted = { ...value, ...(value.fecha instanceof Date ? { fecha: timestamp(value.fecha) } : {}) };
  data[ref.name][ref.id] = merge ? { ...data[ref.name][ref.id], ...converted } : converted;
  window.__inventariosPrueba.escrituras.push({ collection: ref.name, id: ref.id, data: converted });
  for (const listener of listeners) if (listener.ref.name === ref.name) listener.callback(snapshot(listener.ref));
}
export async function addDoc(ref, value) { const result = { ...ref, id: 'nuevo' + Object.keys(data[ref.name] || {}).length }; write(result, value, false); return result; }
export async function updateDoc(ref, value) { write(ref, value, true); }
export async function setDoc(ref, value) { write(ref, value, true); }
export async function deleteDoc(ref) { delete data[ref.name][ref.id]; }
export const serverTimestamp = () => timestamp(new Date());
