import { db } from '@/firebase';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

/**
 * PapeleraService: respaldo obligatorio antes de borrar documentos sensibles
 * (cuentas de clientes, sacadas, existencias de crudos, etc.).
 *
 * Contrato: `respaldarAntesDeBorrar` LANZA si el respaldo no se pudo escribir.
 * El llamador debe abortar el borrado en ese caso — nunca borrar sin copia.
 */

const COLECCION_PAPELERA = 'papelera';

// Elimina valores `undefined` (que Firestore rechaza) y referencias circulares.
const limpiarParaFirestore = (datos) => {
  try {
    return JSON.parse(JSON.stringify(datos ?? {}));
  } catch (error) {
    console.error('[Papelera] No se pudieron serializar los datos del respaldo:', error);
    return { _errorSerializacion: String(error) };
  }
};

/**
 * Copia un documento a la colección `papelera` antes de que sea borrado.
 * @param {string} coleccionOrigen - Colección de la que se va a borrar (ej. 'cuentasJoselito')
 * @param {string} docId - ID del documento que se va a borrar
 * @param {Object} datos - Contenido del documento (tal como está antes de borrar)
 * @param {string} [razon] - Motivo del borrado (ej. 'borrado manual desde menú de cuentas')
 * @returns {Promise<string>} - ID del respaldo creado
 * @throws {Error} si el respaldo no se pudo escribir; el llamador NO debe borrar
 */
export const respaldarAntesDeBorrar = async (coleccionOrigen, docId, datos, razon = '') => {
  if (!coleccionOrigen || !docId) {
    throw new Error('Papelera: se requiere la colección y el ID del documento a respaldar');
  }

  const respaldoRef = doc(collection(db, COLECCION_PAPELERA));
  await setDoc(respaldoRef, {
    coleccionOrigen,
    docIdOriginal: docId,
    datos: limpiarParaFirestore(datos),
    razon,
    fechaBorrado: serverTimestamp(),
    fechaBorradoISO: new Date().toISOString()
  });

  console.log(`[Papelera] Respaldo ${respaldoRef.id} creado para ${coleccionOrigen}/${docId}`);
  return respaldoRef.id;
};

/**
 * Borra un documento garantizando el respaldo previo a papelera.
 * Si `datos` no se proporciona, lee el documento de Firestore antes de borrar.
 * Si el respaldo falla, LANZA y el documento NO se borra.
 * @param {string} coleccion - Colección del documento
 * @param {string} docId - ID del documento a borrar
 * @param {Object|null} [datos] - Contenido conocido del documento (opcional)
 * @param {string} [razon] - Motivo del borrado
 * @returns {Promise<string>} - ID del respaldo creado
 */
export const borrarConRespaldo = async (coleccion, docId, datos = null, razon = '') => {
  let contenido = datos;
  if (!contenido) {
    const snapshot = await getDoc(doc(db, coleccion, docId));
    contenido = snapshot.exists() ? snapshot.data() : null;
  }
  const respaldoId = await respaldarAntesDeBorrar(coleccion, docId, contenido, razon);
  await deleteDoc(doc(db, coleccion, docId));
  return respaldoId;
};

/**
 * Lista los respaldos más recientes de una colección (para recuperación manual).
 * @param {string} coleccionOrigen
 * @param {number} [maximo=20]
 * @returns {Promise<Array<Object>>}
 */
export const listarRespaldos = async (coleccionOrigen, maximo = 20) => {
  // Sin orderBy en servidor para no requerir índice compuesto; se ordena en cliente.
  const q = query(
    collection(db, COLECCION_PAPELERA),
    where('coleccionOrigen', '==', coleccionOrigen)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => String(b.fechaBorradoISO || '').localeCompare(String(a.fechaBorradoISO || '')))
    .slice(0, maximo);
};

export default {
  respaldarAntesDeBorrar,
  borrarConRespaldo,
  listarRespaldos
};
