// Fuente única para el saldo de las deudas de Procesos.
// saldoPendiente = suma(productos.total) − suma(abonos.monto), redondeado a centavos.
// Todas las mutaciones pasan por una transacción que lee el documento de la deuda;
// como cada escritura también actualiza ese documento, dos escrituras simultáneas
// chocan y Firestore reintenta la segunda con los datos frescos.
import { collection, doc, getDocs, runTransaction, query, where, limit } from 'firebase/firestore';
import { db } from '@/firebase';

const TOLERANCIA = 0.005;

export const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function totalProducto(kilos, precio) {
  return redondear(Number(kilos) * Number(precio));
}

export function calcularSaldo(productos = [], abonos = []) {
  const total = redondear(productos.reduce((s, p) => s + (Number(p.total) || 0), 0));
  const totalAbonos = redondear(abonos.reduce((s, a) => s + (Number(a.monto) || 0), 0));
  const saldoPendiente = redondear(total - totalAbonos);
  return {
    total,
    totalAbonos,
    saldoPendiente,
    estado: saldoPendiente > TOLERANCIA ? 'pendiente' : 'pagado'
  };
}

export function validarProducto({ kilos, precio, producto }) {
  if (!producto || !String(producto).trim()) return 'El producto necesita nombre.';
  if (!(Number(kilos) > 0)) return 'Los kilos deben ser mayores a 0.';
  if (!(Number(precio) > 0)) return 'El precio debe ser mayor a 0.';
  return null;
}

export class SobrepagoError extends Error {
  constructor(saldo) {
    super(`La operación dejaría un sobrepago de $${Math.abs(saldo).toFixed(2)}. Ajusta los abonos antes.`);
    this.name = 'SobrepagoError';
    this.saldo = saldo;
  }
}

async function leerSub(deudaId, sub) {
  const snap = await getDocs(collection(db, 'deudas', deudaId, sub));
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
}

/**
 * Ejecuta un cambio sobre una deuda y recalcula su saldo dentro de una transacción.
 * cambio({ deuda, productos, abonos }) devuelve { productos, abonos, ops } donde
 * productos/abonos son las listas resultantes y ops las escrituras a hacer:
 *   { tipo: 'set'|'update'|'delete', ref, data }
 */
export async function mutarDeuda(deudaId, cambio, { permitirSobrepago = false } = {}) {
  const deudaRef = doc(db, 'deudas', deudaId);
  return runTransaction(db, async (tx) => {
    const deudaSnap = await tx.get(deudaRef);
    if (!deudaSnap.exists()) throw new Error('La deuda ya no existe.');
    const productos = await leerSub(deudaId, 'productos');
    const abonos = await leerSub(deudaId, 'abonos');
    const res = (await cambio({ deuda: { id: deudaId, ...deudaSnap.data() }, productos, abonos })) || {};
    const saldo = calcularSaldo(res.productos || productos, res.abonos || abonos);
    if (!permitirSobrepago && saldo.saldoPendiente < -TOLERANCIA) throw new SobrepagoError(saldo.saldoPendiente);
    for (const op of res.ops || []) {
      if (op.tipo === 'set') tx.set(op.ref, op.data);
      else if (op.tipo === 'update') tx.update(op.ref, op.data);
      else if (op.tipo === 'delete') tx.delete(op.ref);
    }
    const datos = {
      total: saldo.total,
      saldoPendiente: saldo.saldoPendiente,
      estado: saldo.estado,
      fechaActualizacion: new Date()
    };
    tx.update(deudaRef, datos);
    return { ...datos, totalAbonos: saldo.totalAbonos };
  });
}

export function registrarAbono(deudaId, abono) {
  const monto = redondear(abono.monto);
  if (!(monto > 0)) return Promise.reject(new Error('El monto del abono debe ser mayor a cero.'));
  return mutarDeuda(deudaId, ({ abonos }) => {
    const ref = doc(collection(db, 'deudas', deudaId, 'abonos'));
    const data = {
      descripcion: abono.descripcion,
      monto,
      fecha: abono.fecha,
      fechaCreacion: new Date(),
      esAbonoGeneral: Boolean(abono.esAbonoGeneral),
      ...(abono.abonoGeneralId ? { abonoGeneralId: abono.abonoGeneralId } : {})
    };
    return { abonos: [...abonos, data], ops: [{ tipo: 'set', ref, data }] };
  });
}

export function eliminarAbono(deudaId, abonoId) {
  return mutarDeuda(deudaId, ({ abonos }) => {
    const ref = doc(db, 'deudas', deudaId, 'abonos', abonoId);
    return { abonos: abonos.filter((a) => a.id !== abonoId), ops: [{ tipo: 'delete', ref }] };
  });
}

function datosProducto(p) {
  const error = validarProducto(p);
  if (error) throw new Error(error);
  return {
    kilos: Number(p.kilos),
    producto: String(p.producto).trim(),
    precio: Number(p.precio),
    total: totalProducto(p.kilos, p.precio)
  };
}

export function agregarProducto(deudaId, producto) {
  return mutarDeuda(deudaId, ({ productos }) => {
    const data = datosProducto(producto);
    const ref = doc(collection(db, 'deudas', deudaId, 'productos'));
    return { productos: [...productos, { id: ref.id, ...data }], ops: [{ tipo: 'set', ref, data }] };
  });
}

export function actualizarProducto(deudaId, productoId, producto) {
  return mutarDeuda(deudaId, ({ productos }) => {
    const data = datosProducto(producto);
    const ref = doc(db, 'deudas', deudaId, 'productos', productoId);
    return {
      productos: productos.map((p) => (p.id === productoId ? { ...p, ...data } : p)),
      ops: [{ tipo: 'update', ref, data }]
    };
  });
}

export function eliminarProducto(deudaId, productoId) {
  return mutarDeuda(deudaId, ({ productos }) => {
    const ref = doc(db, 'deudas', deudaId, 'productos', productoId);
    return { productos: productos.filter((p) => p.id !== productoId), ops: [{ tipo: 'delete', ref }] };
  });
}

/**
 * Reparte un abono general FIFO sobre las deudas dadas (ya ordenadas, más vieja primero),
 * usando los saldos recalculados dentro de la misma transacción.
 */
export async function aplicarAbonoGeneral(deudaIds, { monto, descripcion, fecha }) {
  let restante = redondear(monto);
  if (!(restante > 0)) throw new Error('El monto debe ser mayor a cero.');
  const abonoGeneralId = doc(collection(db, 'abonosGenerales')).id;
  return runTransaction(db, async (tx) => {
    const estados = [];
    for (const id of deudaIds) {
      const ref = doc(db, 'deudas', id);
      const snap = await tx.get(ref);
      if (!snap.exists()) continue;
      const saldo = calcularSaldo(await leerSub(id, 'productos'), await leerSub(id, 'abonos'));
      estados.push({ id, ref, fecha: snap.data().fecha, ...saldo });
    }
    const pendiente = redondear(estados.reduce((s, e) => s + Math.max(0, e.saldoPendiente), 0));
    if (restante > pendiente + TOLERANCIA) {
      throw new Error(`El monto supera el saldo pendiente actual ($${pendiente.toFixed(2)}).`);
    }
    const fechaCreacion = new Date();
    const distribucion = [];
    for (const e of estados) {
      if (restante <= TOLERANCIA) break;
      if (e.saldoPendiente <= TOLERANCIA) continue;
      const aplicado = redondear(Math.min(restante, e.saldoPendiente));
      const saldoPendiente = redondear(e.saldoPendiente - aplicado);
      tx.set(doc(collection(db, 'deudas', e.id, 'abonos')), {
        descripcion: `${descripcion} (Abono General)`,
        monto: aplicado,
        fecha,
        fechaCreacion,
        esAbonoGeneral: true,
        abonoGeneralId
      });
      tx.update(e.ref, {
        total: e.total,
        saldoPendiente,
        estado: saldoPendiente > TOLERANCIA ? 'pendiente' : 'pagado',
        fechaActualizacion: fechaCreacion
      });
      distribucion.push({ deudaId: e.id, fecha: e.fecha, montoAbono: aplicado, saldoRestante: saldoPendiente });
      restante = redondear(restante - aplicado);
    }
    return { abonoGeneralId, distribucion };
  });
}

export async function proveedorTieneDeudas(proveedorId) {
  const snap = await getDocs(query(collection(db, 'deudas'), where('proveedorId', '==', proveedorId), limit(1)));
  return !snap.empty;
}
