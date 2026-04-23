import { db } from '@/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';

const createCuentasService = (coleccion) => ({
  _ref() {
    return collection(db, coleccion);
  },
  _docRef(id) {
    return doc(db, coleccion, id);
  },

  async getAll(opts = {}) {
    const constraints = [];
    if (opts.orderBy) constraints.push(orderBy(opts.orderBy, opts.direction || 'asc'));
    if (opts.limit) constraints.push(limit(opts.limit));
    if (opts.where) constraints.push(where(opts.where[0], opts.where[1], opts.where[2]));
    const snap = await getDocs(query(this._ref(), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getByFecha(fecha) {
    const q = query(this._ref(), where('fecha', '==', fecha));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getById(id) {
    const snap = await getDoc(this._docRef(id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async getDocRef(id) {
    return this._docRef(id);
  },

  async getSaldoAnterior(fecha) {
    const q = query(
      this._ref(),
      where('fecha', '<', fecha),
      orderBy('fecha', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;
    const ultima = snap.docs[0].data();
    const totalCobros = (ultima.cobros || []).reduce((sum, c) => sum + (parseFloat(c.monto) || 0), 0);
    const totalAbonos = (ultima.abonos || []).reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
    const saldoDia = (ultima.totalGeneralVenta || 0) - totalCobros - totalAbonos;
    if (saldoDia <= 0) return 0;
    return (ultima.saldoAcumuladoAnterior || 0) + saldoDia;
  },

  subscribe(opts, callback) {
    const constraints = [];
    if (opts.orderBy) constraints.push(orderBy(opts.orderBy, opts.direction || 'asc'));
    if (opts.where) constraints.push(where(opts.where[0], opts.where[1], opts.where[2]));
    return onSnapshot(query(this._ref(), ...constraints), callback);
  },

  async create(data) {
    return await addDoc(this._ref(), data);
  },

  async update(id, data) {
    await updateDoc(this._docRef(id), data);
  },

  async delete(id) {
    await deleteDoc(this._docRef(id));
  },

  newBatch() {
    return writeBatch(db);
  },
});

export const joselitoCuentas = createCuentasService('cuentasJoselito');
export const otilioCuentas = createCuentasService('cuentasOtilio');
export const veronicaCuentas = createCuentasService('cuentasVeronica');
export const catarrosCuentas = createCuentasService('cuentasCatarro');
export const ozunaCuentas = createCuentasService('cuentasOzuna');
export const otilioIndependienteCuentas = createCuentasService('cuentasOtilioIndependiente');

export { createCuentasService };
