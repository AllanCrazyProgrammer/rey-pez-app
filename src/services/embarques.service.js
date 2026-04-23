import { db } from '@/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  where,
  onSnapshot,
} from 'firebase/firestore';

const COLECCION = 'embarques';
const _ref = () => collection(db, COLECCION);
const _doc = (id) => doc(db, COLECCION, id);

export const embarquesService = {
  async getAll() {
    const snap = await getDocs(query(_ref(), orderBy('fecha', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getAllRaw() {
    const snap = await getDocs(_ref());
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getById(id) {
    const snap = await getDoc(_doc(id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async getDocSnapshot(id) {
    return await getDoc(_doc(id));
  },

  async getByFecha(fecha) {
    const q = query(_ref(), where('fecha', '==', fecha));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  subscribeToOne(id, callback) {
    return onSnapshot(_doc(id), callback);
  },

  subscribeToAll(callback, opts = {}) {
    const constraints = [];
    if (opts.orderBy) constraints.push(orderBy(opts.orderBy, opts.direction || 'asc'));
    return onSnapshot(query(_ref(), ...constraints), callback);
  },

  async create(data) {
    return await addDoc(_ref(), data);
  },

  async createWithId(id, data) {
    await setDoc(_doc(id), data);
    return _doc(id);
  },

  async update(id, data) {
    await updateDoc(_doc(id), data);
  },

  async delete(id) {
    const snap = await getDoc(_doc(id));
    if (snap.exists()) {
      await deleteDoc(_doc(id));
    }
  },

  docRef(id) {
    return _doc(id);
  },
};
