import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { mapConcurrent, agruparPrestamos } from '@/utils/prestamos';

// Short-lived shared reads make navigation from the summary to accounts instant.
// Refreshes and every mutation explicitly bypass this cache.
const cache = new Map();
export function cargarCuentasPrestamos(nombreColeccion, persona, actualizar = false) {
  const anterior = cache.get(nombreColeccion);
  if (!actualizar && anterior && Date.now() - anterior.fecha < 30000) return anterior.promise;
  const entrada = { fecha: Date.now() };
  entrada.promise = (async () => {
    const snapshot = await getDocs(collection(db, nombreColeccion));
    const prestamos = await mapConcurrent(snapshot.docs, async documento => {
      const abonos = await getDocs(collection(db, nombreColeccion, documento.id, 'abonos'));
      return { ...documento.data(), id: documento.id,
        abonosCuenta: abonos.docs.map(a => ({ ...a.data(), id: a.id })) };
    });
    return agruparPrestamos(prestamos, persona);
  })().catch(error => {
    if (cache.get(nombreColeccion) === entrada) cache.delete(nombreColeccion);
    throw error;
  });
  cache.set(nombreColeccion, entrada);
  return entrada.promise;
}

export async function eliminarCuentaPrestamos(nombreColeccion, cuenta) {
  const referencias = cuenta.prestamos.flatMap(prestamo => [
    ...prestamo.abonosCuenta.map(abono => doc(db, nombreColeccion, prestamo.id, 'abonos', abono.id)),
    doc(db, nombreColeccion, prestamo.id)
  ]);

  // Firestore accepts at most 500 operations per batch. Leave some margin.
  for (let inicio = 0; inicio < referencias.length; inicio += 450) {
    const batch = writeBatch(db);
    referencias.slice(inicio, inicio + 450).forEach(referencia => batch.delete(referencia));
    await batch.commit();
  }
  cache.delete(nombreColeccion);
}
