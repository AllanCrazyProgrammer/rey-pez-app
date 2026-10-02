import { collection, doc, getDocsFromServer, runTransaction } from 'firebase/firestore';
import { db } from '@/firebase';
import { fechaRegistro } from '@/utils/fechasInventario';

function errorDia(codigo, mensaje) { return Object.assign(new Error(mensaje), { code: codigo }); }
const duplicado = () => errorDia('dia-duplicado', 'Ya existe un registro de limpios para esta fecha. Abre ese día para agregar movimientos; no se permiten días duplicados.');

export async function guardarDiaLimpio(datos, { id = null, fechaOriginal = null } = {}) {
  const fecha = fechaRegistro(datos.fecha);
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw errorDia('fecha-invalida', 'Selecciona una fecha válida para el registro.');

  // Los registros anteriores tienen IDs aleatorios y distintas representaciones
  // de fecha. Consultar al servidor impide omitirlos por una caché desactualizada.
  const anteriores = await getDocsFromServer(collection(db, 'sacadas'));
  const candidatos = anteriores.docs.filter(d => d.id !== id && fechaRegistro(d.data().fecha) === fecha);
  const referencia = id ? doc(db, 'sacadas', id) : doc(collection(db, 'sacadas'));
  const indice = doc(db, 'sacadasDias', fecha);

  await runTransaction(db, async transaction => {
    const actual = await transaction.get(referencia);
    if (id && !actual.exists()) throw errorDia('dia-eliminado', 'Este día fue borrado desde otro equipo. Vuelve al historial antes de guardar.');
    const fechaAnterior = actual.exists() ? fechaRegistro(actual.data().fecha) : null;
    if (id && fechaOriginal && fechaAnterior !== fechaOriginal) throw errorDia('dia-cambiado', 'La fecha del registro cambió desde otro equipo. Vuelve a abrir el día antes de guardar.');

    const ocupado = await transaction.get(indice);
    if (ocupado.exists() && ocupado.data().sacadaId !== referencia.id) {
      const propietario = await transaction.get(doc(db, 'sacadas', ocupado.data().sacadaId));
      if (propietario.exists() && fechaRegistro(propietario.data().fecha) === fecha) throw duplicado();
    }
    for (const candidato of candidatos) {
      const otro = await transaction.get(candidato.ref);
      if (otro.exists() && fechaRegistro(otro.data().fecha) === fecha) throw duplicado();
    }
    const indiceAnterior = fechaAnterior && fechaAnterior !== fecha ? doc(db, 'sacadasDias', fechaAnterior) : null;
    const anterior = indiceAnterior ? await transaction.get(indiceAnterior) : null;

    // El índice se reclama junto con el registro: dos creaciones simultáneas
    // para una fecha compiten por el mismo documento y no pueden duplicar el día.
    if (actual.exists()) transaction.update(referencia, datos);
    else transaction.set(referencia, datos);
    transaction.set(indice, { fecha, sacadaId: referencia.id });
    if (anterior?.exists() && anterior.data().sacadaId === referencia.id) transaction.delete(indiceAnterior);
  });
  return referencia.id;
}
