import { db } from '@/firebase';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';

// Estas deudas nunca participan en el saldo acumulado, las ventas ni el stash.
const COLECCION = 'deudasCatarroIndependientes';
const referenciaDeuda = id => doc(db, COLECCION, id);
const referenciaAbono = (deudaId, id) => doc(db, COLECCION, deudaId, 'abonos', id);

export function montoACentavos(valor) {
  const texto = String(valor == null ? '' : valor).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    throw new Error('Escribe un monto positivo con un máximo de dos decimales.');
  }
  const [enteros, decimales = ''] = texto.split('.');
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos) || centavos <= 0) {
    throw new Error('El monto debe ser mayor que cero y estar dentro del límite permitido.');
  }
  return centavos;
}

function validarFecha(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ||
      Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) {
    throw new Error('Selecciona una fecha válida.');
  }
  return fecha;
}

export const nuevoIdDeuda = () => doc(collection(db, COLECCION)).id;
export const nuevoIdAbono = deudaId => doc(collection(db, COLECCION, deudaId, 'abonos')).id;

export function escucharDeudas(callback, alError) {
  return onSnapshot(collection(db, COLECCION), snapshot => {
    const deudas = snapshot.docs.map(documento => ({ ...documento.data(), id: documento.id }));
    deudas.sort((a, b) => (a.creadoEn?.seconds || 0) - (b.creadoEn?.seconds || 0) || a.id.localeCompare(b.id));
    callback(deudas);
  }, alError);
}

export function escucharAbonos(deudaId, callback, alError) {
  return onSnapshot(collection(db, COLECCION, deudaId, 'abonos'), snapshot => {
    const abonos = snapshot.docs.map(documento => ({ ...documento.data(), id: documento.id }));
    abonos.sort((a, b) => b.fecha.localeCompare(a.fecha) ||
      (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0) || a.id.localeCompare(b.id));
    callback(abonos);
  }, alError);
}

export async function crearDeuda(id, datos) {
  const nombre = String(datos.nombre || '').trim();
  if (!nombre || nombre.length > 80) throw new Error('Escribe un nombre de hasta 80 caracteres para la pestaña.');
  const montoInicialCentavos = montoACentavos(datos.monto);
  const fecha = validarFecha(datos.fecha);
  const ref = referenciaDeuda(id);
  await runTransaction(db, async transaccion => {
    const existente = await transaccion.get(ref);
    // Conservar el ID al reintentar evita duplicar una operación ya confirmada.
    if (existente.exists()) {
      const deuda = existente.data();
      if (deuda.nombre !== nombre || deuda.montoInicialCentavos !== montoInicialCentavos || deuda.fecha !== fecha) {
        throw new Error('Esta pestaña ya existe con otros datos. Vuelve a abrir el formulario.');
      }
      return;
    }
    transaccion.set(ref, { nombre, fecha, montoInicialCentavos, totalAbonadoCentavos: 0,
      creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() });
  });
  return id;
}

export async function registrarAbono(deudaId, id, datos) {
  const montoCentavos = montoACentavos(datos.monto);
  const fecha = validarFecha(datos.fecha);
  const descripcion = String(datos.descripcion || '').trim();
  if (descripcion.length > 240) throw new Error('La descripción admite hasta 240 caracteres.');
  const deudaRef = referenciaDeuda(deudaId);
  const abonoRef = referenciaAbono(deudaId, id);
  await runTransaction(db, async transaccion => {
    const deudaDoc = await transaccion.get(deudaRef);
    const abonoDoc = await transaccion.get(abonoRef);
    if (!deudaDoc.exists()) throw new Error('La deuda ya no está disponible.');
    if (abonoDoc.exists()) {
      const abono = abonoDoc.data();
      if (abono.montoCentavos !== montoCentavos || abono.fecha !== fecha || abono.descripcion !== descripcion) {
        throw new Error('El abono ya se guardó con otros datos. Revisa el historial.');
      }
      return;
    }
    const deuda = deudaDoc.data();
    const totalAbonadoCentavos = deuda.totalAbonadoCentavos + montoCentavos;
    if (totalAbonadoCentavos > deuda.montoInicialCentavos) {
      throw new Error('El abono supera el saldo pendiente de esta deuda.');
    }
    transaccion.set(abonoRef, { montoCentavos, fecha, descripcion, anulado: false, creadoEn: serverTimestamp() });
    transaccion.update(deudaRef, { totalAbonadoCentavos, actualizadoEn: serverTimestamp() });
  });
}

export async function anularAbono(deudaId, id) {
  const deudaRef = referenciaDeuda(deudaId);
  const abonoRef = referenciaAbono(deudaId, id);
  await runTransaction(db, async transaccion => {
    const deudaDoc = await transaccion.get(deudaRef);
    const abonoDoc = await transaccion.get(abonoRef);
    if (!deudaDoc.exists() || !abonoDoc.exists()) throw new Error('No se encontró la deuda o el abono.');
    const abono = abonoDoc.data();
    if (abono.anulado) return;
    const totalAbonadoCentavos = deudaDoc.data().totalAbonadoCentavos - abono.montoCentavos;
    if (totalAbonadoCentavos < 0) throw new Error('No se pudo comprobar el saldo. Actualiza la página e intenta de nuevo.');
    transaccion.update(abonoRef, { anulado: true, anuladoEn: serverTimestamp() });
    transaccion.update(deudaRef, { totalAbonadoCentavos, actualizadoEn: serverTimestamp() });
  });
}
