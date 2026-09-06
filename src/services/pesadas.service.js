import { collection, doc, FieldPath, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { aplicarCamposPesadas, fechaPesadasValida } from '@/utils/pesadas';

export function observarHistorialPesadas(onData, onError) {
  return onSnapshot(query(collection(db, 'pesadasDiarias'), orderBy('fecha', 'desc')),
    { includeMetadataChanges: true }, snapshot => onData(snapshot.docs.map(item => ({
      ...item.data(), id: item.id, pendiente: item.metadata.hasPendingWrites
    })), snapshot.metadata.fromCache), onError);
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
