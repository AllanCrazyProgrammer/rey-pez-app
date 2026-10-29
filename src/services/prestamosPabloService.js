import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { validarMovimientoPablo } from '@/utils/prestamosPablo';

export const COLECCION_PABLO = 'prestamosPablo';

export async function cargarMovimientosPablo() {
  const snap = await getDocs(collection(db, COLECCION_PABLO));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function agregarMovimientoPablo(datos) {
  const r = validarMovimientoPablo(datos);
  if (!r.ok) throw new Error(r.errores.join('. '));
  const ref = await addDoc(collection(db, COLECCION_PABLO), { ...r.movimiento, fechaCreacion: serverTimestamp() });
  return ref.id;
}

export function eliminarMovimientoPablo(id) {
  return deleteDoc(doc(db, COLECCION_PABLO, id));
}
