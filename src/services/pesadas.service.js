import { collection, doc, FieldPath, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { aplicarCamposPesadas, fechaPesadasValida } from '@/utils/pesadas';

export function observarHistorialPesadas(onData, onError) {
  return onSnapshot(query(collection(db, 'pesadasDiarias'), orderBy('fecha', 'desc')),
    { includeMetadataChanges: true }, snapshot => onData(snapshot.docs.map(item => ({
      ...item.data(), id: item.id, pendiente: item.metadata.hasPendingWrites
    })), snapshot.metadata.fromCache), onError);
}

// Keep a tombstone so writes queued in another tab cannot restore the day.
export function eliminarDiaPesadas(fecha) {
  if (!fechaPesadasValida(fecha)) throw new Error('Fecha inválida.');
  return setDoc(doc(db, 'pesadasDiarias', fecha), {
    fecha, eliminado: true, eliminadoEn: serverTimestamp(), actualizadoEn: serverTimestamp()
  });
}

// Sin internet no hay transacciones: el día se anota en la caché local de Firestore (aparece de
// inmediato en el historial) y se sube solo al reconectar. Es un merge de la fecha nada más: nunca
// borra lo que el día ya tenga en el servidor. No se espera la promesa (sin red no termina hasta
// reconectar).
function crearDiaSinConexion(reference, fecha) {
  setDoc(reference, { fecha, actualizadoEn: serverTimestamp() }, { merge: true })
    .catch(error => console.warn('No se pudo anotar el día sin conexión:', error));
}

export function errorSinConexion(error) {
  return Boolean(error && ['unavailable', 'deadline-exceeded'].includes(String(error.code || '').replace(/^firestore\//, '')));
}

export function crearDiaPesadas(fecha, { enLinea = typeof navigator === 'undefined' || navigator.onLine !== false } = {}) {
  if (!fechaPesadasValida(fecha)) throw new Error('Fecha inválida.');
  const reference = doc(db, 'pesadasDiarias', fecha);
  if (!enLinea) {
    crearDiaSinConexion(reference, fecha);
    return Promise.resolve();
  }
  return runTransaction(db, async transaction => {
    const current = await transaction.get(reference);
    // Existing active days retain all of their capture. A deleted day starts clean.
    if (current.exists() && !current.data().eliminado) return;
    transaction.set(reference, {
      fecha, eliminado: false, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(),
      columnas: {}, personas: {}, pesos: {}
    });
  }).catch(error => {
    // La red se cayó a medio camino (el teléfono creía tener internet).
    if (!errorSinConexion(error)) throw error;
    crearDiaSinConexion(reference, fecha);
  });
}

export function conectarPesadas(fecha, onData, onError) {
  if (!fechaPesadasValida(fecha)) throw new Error('Fecha inválida.');
  const reference = doc(db, 'pesadasDiarias', fecha);
  return {
    subscribe: () => onSnapshot(reference, { includeMetadataChanges: true }, snapshot => {
      onData(snapshot.data() || {}, { fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites, exists: snapshot.exists() });
    }, onError),
    write: fields => {
      const changes = { ...fields, fecha, actualizadoEn: serverTimestamp() };
      const payload = aplicarCamposPesadas({}, fields);
      payload.fecha = fecha;
      payload.actualizadoEn = changes.actualizadoEn;
      return setDoc(reference, payload, {
        mergeFields: Object.keys(changes).map(path => new FieldPath(...path.split('.')))
      });
    }
  };
}
