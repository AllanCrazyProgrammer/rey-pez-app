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
  onSnapshot,
} from 'firebase/firestore';

const COL_PRECIOS = 'precios';
const COL_HISTORIAL = 'historialPrecios';
const COL_HISTORIAL_CRUDOS = 'historialPreciosCrudos';
const COL_NOTA_VENTA = 'preciosNotaVenta';

const _ref = (col) => collection(db, col);
const _doc = (col, id) => doc(db, col, id);

export const preciosService = {
  // --- Precios actuales ---
  async getPrecios() {
    const snap = await getDocs(_ref(COL_PRECIOS));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getPrecioById(id) {
    const snap = await getDoc(_doc(COL_PRECIOS, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  subscribeToPrecios(callback) {
    return onSnapshot(_ref(COL_PRECIOS), callback);
  },

  async updatePrecio(id, data) {
    await updateDoc(_doc(COL_PRECIOS, id), data);
  },

  async createPrecio(data) {
    return await addDoc(_ref(COL_PRECIOS), data);
  },

  async deletePrecio(id) {
    await deleteDoc(_doc(COL_PRECIOS, id));
  },

  // --- Historial de precios (preparación) ---
  async getHistorial(filtros = {}) {
    const constraints = [orderBy('fecha', 'desc')];
    if (filtros.medida) constraints.push(where('medida', '==', filtros.medida));
    if (filtros.proveedor) constraints.push(where('proveedorId', '==', filtros.proveedor));
    const snap = await getDocs(query(_ref(COL_HISTORIAL), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addHistorial(data) {
    return await addDoc(_ref(COL_HISTORIAL), data);
  },

  async updateHistorial(id, data) {
    await updateDoc(_doc(COL_HISTORIAL, id), data);
  },

  async deleteHistorial(id) {
    await deleteDoc(_doc(COL_HISTORIAL, id));
  },

  // --- Historial precios crudos ---
  async getHistorialCrudos(filtros = {}) {
    const constraints = [orderBy('fecha', 'desc')];
    if (filtros.proveedor) constraints.push(where('proveedorId', '==', filtros.proveedor));
    const snap = await getDocs(query(_ref(COL_HISTORIAL_CRUDOS), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addHistorialCrudos(data) {
    return await addDoc(_ref(COL_HISTORIAL_CRUDOS), data);
  },

  async updateHistorialCrudos(id, data) {
    await updateDoc(_doc(COL_HISTORIAL_CRUDOS, id), data);
  },

  async deleteHistorialCrudos(id) {
    await deleteDoc(_doc(COL_HISTORIAL_CRUDOS, id));
  },

  // --- Nota de venta precios ---
  async addNotaVenta(data) {
    return await addDoc(_ref(COL_NOTA_VENTA), data);
  },

  async getNotasVenta(filtros = {}) {
    const constraints = [orderBy('fecha', 'desc')];
    if (filtros.cliente) constraints.push(where('clienteId', '==', filtros.cliente));
    const snap = await getDocs(query(_ref(COL_NOTA_VENTA), ...constraints));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  subscribeToNotasVenta(callback) {
    return onSnapshot(query(_ref(COL_NOTA_VENTA), orderBy('fecha', 'desc')), callback);
  },
};
