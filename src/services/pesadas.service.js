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

export function crearDiaPesadas(fecha) {
  if (!fechaPesadasValida(fecha)) throw new Error('Fecha inválida.');
  const reference = doc(db, 'pesadasDiarias', fecha);
  return runTransaction(db, async transaction => {
    const current = await transaction.get(reference);
    // Existing active days retain all of their capture. A deleted day starts clean.
    if (current.exists() && !current.data().eliminado) return;
    transaction.set(reference, {
      fecha, eliminado: false, creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(),
      columnas: {}, personas: {}, pesos: {}
    });
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
