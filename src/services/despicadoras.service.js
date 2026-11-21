import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

// Catálogo de despicadoras para el modo rápido de pesadas.
// Cada registro: { nombre, apodo, activo, creadoEn, actualizadoEn }.
// La búsqueda del modo rápido encuentra por nombre o por apodo.

export function observarDespicadoras(onData, onError) {
  return onSnapshot(query(collection(db, 'despicadoras'), orderBy('nombre')),
    { includeMetadataChanges: true }, snapshot => onData(snapshot.docs.map(item => ({
      ...item.data(), id: item.id, pendiente: item.metadata.hasPendingWrites
    })), snapshot.metadata.fromCache), onError);
}

export function guardarDespicadora({ id, nombre, apodo }) {
  const limpio = { nombre: String(nombre || '').trim(), apodo: String(apodo || '').trim(), actualizadoEn: serverTimestamp() };
  if (!limpio.nombre) throw new Error('Escribe el nombre de la despicadora.');
  if (id) return updateDoc(doc(db, 'despicadoras', id), limpio);
  return addDoc(collection(db, 'despicadoras'), { ...limpio, activo: true, creadoEn: serverTimestamp() });
}

export function desactivarDespicadora(id) {
  if (!id) throw new Error('Falta la despicadora.');
  return updateDoc(doc(db, 'despicadoras', id), { activo: false, actualizadoEn: serverTimestamp() });
}

export function reactivarDespicadora(id) {
  if (!id) throw new Error('Falta la despicadora.');
  return updateDoc(doc(db, 'despicadoras', id), { activo: true, actualizadoEn: serverTimestamp() });
}
