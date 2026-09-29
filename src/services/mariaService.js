import { db } from '@/firebase';
import { collection, doc, getDocs, query, where, runTransaction, serverTimestamp } from 'firebase/firestore';
import { duration, validateRecord } from '@/utils/maria/attendance.cjs';

const employees = 'mariaEmployees';
const records = 'mariaAttendance';
export async function loadEmployees() {
  return (await getDocs(collection(db, employees))).docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => a.name.localeCompare(b.name));
}
export async function loadRecords(from, to) {
  return (await getDocs(query(collection(db, records), where('date', '>=', from), where('date', '<=', to)))).docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName));
}
function actor() {
  let user;
  try { user = JSON.parse(localStorage.getItem('user')); } catch (_) { /* invalid session */ }
  if (!user || !user.username) throw new Error('Inicia sesión para registrar cambios con tu usuario.');
  return user.username;
}
async function saveAudited(path, id, data, version, reason) {
  const username = actor();
  const ref = id ? doc(db, path, id) : doc(collection(db, path));
  const historyRef = doc(collection(ref, 'history'));
  await runTransaction(db, async transaction => {
    const current = await transaction.get(ref);
    const before = current.exists() ? current.data() : null;
    if ((before ? before.version : 0) !== version) throw new Error('Este registro cambió en otro dispositivo. Actualiza la lista y vuelve a abrirlo.');
    if (before && !reason.trim()) throw new Error('Escribe el motivo del cambio.');
    const after = { ...data, version: version + 1, updatedBy: username, updatedAt: serverTimestamp() };
    transaction.set(ref, after);
    transaction.set(historyRef, { before, after, reason: reason.trim() || 'Registro inicial', actor: username, changedAt: serverTimestamp() });
  });
  return ref.id;
}
export function saveEmployee(employee, reason) {
  const { id, version = 0, name, area, scheduledStart, scheduledEnd, scheduledNextDay, scheduledBreak, active } = employee;
  if (!name.trim()) throw new Error('Escribe el nombre del empleado.');
  duration(scheduledStart, scheduledEnd, scheduledNextDay, scheduledBreak);
  return saveAudited(employees, id, { name: name.trim(), area: area.trim(), scheduledStart, scheduledEnd, scheduledNextDay, scheduledBreak: Number(scheduledBreak), active }, version, reason);
}
export function saveRecord(record, reason) {
  validateRecord(record);
  const { id, version = 0, updatedAt, updatedBy, deletedAt, deletedBy, ...data } = record;
  return saveAudited(records, `${record.employeeId}_${record.date}`, { ...data, deleted: false }, version, reason);
}
export async function deleteRecord(record, reason) {
  const username = actor();
  if (!reason.trim()) throw new Error('Escribe el motivo de la eliminación.');
  const ref = doc(db, records, record.id);
  const historyRef = doc(collection(ref, 'history'));
  await runTransaction(db, async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists()) throw new Error('Este registro ya no existe. Actualiza la lista.');
    const before = current.data();
    if (before.deleted || before.version !== record.version) throw new Error('Este registro cambió en otro dispositivo. Actualiza la lista y vuelve a abrirlo.');
    const after = { ...before, deleted: true, deletedBy: username, deletedAt: serverTimestamp(), version: before.version + 1, updatedBy: username, updatedAt: serverTimestamp() };
    transaction.set(ref, after);
    transaction.set(historyRef, { before, after, reason: reason.trim(), actor: username, action: 'delete', changedAt: serverTimestamp() });
  });
}
export async function loadHistory(id) {
  return (await getDocs(collection(db, records, id, 'history'))).docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => (b.changedAt?.seconds || 0) - (a.changedAt?.seconds || 0));
}
