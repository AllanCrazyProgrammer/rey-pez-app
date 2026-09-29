const STATES = ['Presente', 'Falta', 'Permiso', 'Vacaciones', 'Descanso', 'Incapacidad'];
function minutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) throw new Error('Captura una hora válida.');
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
function duration(start, end, nextDay, pause = 0) {
  const total = minutes(end) - minutes(start) + (nextDay ? 1440 : 0);
  if (!Number.isInteger(Number(pause)) || pause < 0 || total <= 0 || total > 1440 || pause >= total) throw new Error('Revisa las horas, el día de salida y el descanso.');
  return total - Number(pause);
}
function validateRecord(r) {
  if (!r.employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !STATES.includes(r.status)) throw new Error('Selecciona empleado, fecha y estado.');
  duration(r.scheduledStart, r.scheduledEnd, r.scheduledNextDay, r.scheduledBreak);
  if (r.status !== 'Presente' && (r.actualStart || r.actualEnd)) throw new Error('Solo los registros presentes pueden tener entradas y salidas.');
  if (r.actualEnd && !r.actualStart) throw new Error('Captura la entrada antes de la salida.');
  if (r.actualStart) minutes(r.actualStart);
  if (r.actualEnd) duration(r.actualStart, r.actualEnd, r.actualNextDay, r.actualBreak);
  if (!Number.isInteger(Number(r.actualBreak)) || r.actualBreak < 0) throw new Error('Revisa los minutos de descanso.');
}
function totals(r) {
  const worked = r.actualStart && r.actualEnd ? duration(r.actualStart, r.actualEnd, r.actualNextDay, r.actualBreak) : null;
  const scheduled = duration(r.scheduledStart, r.scheduledEnd, r.scheduledNextDay, r.scheduledBreak);
  return { worked, extra: worked === null ? 0 : Math.max(0, worked - scheduled), late: r.actualStart ? Math.max(0, minutes(r.actualStart) - minutes(r.scheduledStart)) : 0 };
}
function hours(value) { return value === null ? 'Pendiente' : `${Math.floor(value / 60)} h ${String(value % 60).padStart(2, '0')} min`; }
function csvCell(value) { const s = String(value == null ? '' : value); return '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""') + '"'; }
module.exports = { STATES, minutes, duration, validateRecord, totals, hours, csvCell };
