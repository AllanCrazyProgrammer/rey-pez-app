import moment from 'moment';

// Match fechaRegistro/guardarDiaLimpio. Never use the device timezone for
// calendar days in the inventory editor. Changing the displayed offset keeps
// existing instants intact; this module does not rewrite historical records.
export const ZONA_INVENTARIO = 'America/Mexico_City';
const formatoZona = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_INVENTARIO,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

function offsetInventario(date) {
  const parts = formatoZona.formatToParts(date);
  const number = name => Number(parts.find(part => part.type === name).value);
  const localAsUTC = Date.UTC(number('year'), number('month') - 1, number('day'),
    number('hour'), number('minute'), number('second'));
  return (localAsUTC - (date.getTime() - date.getUTCMilliseconds())) / 60000;
}

export function momentoInventario(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const calendar = moment.utc(value, 'YYYY-MM-DD', true);
    if (!calendar.isValid()) return moment.invalid();
    // Resolve midnight using the timezone's rules for that date, including
    // historical DST. Recheck the offset because noon and midnight may differ.
    const midnightUTC = calendar.valueOf();
    let date = new Date(midnightUTC);
    for (let pass = 0; pass < 3; pass += 1) {
      date = new Date(midnightUTC - offsetInventario(date) * 60000);
    }
    return moment.utc(date).utcOffset(offsetInventario(date));
  }
  const seconds = value && (value.seconds ?? value._seconds);
  const raw = value && typeof value.toDate === 'function' ? value.toDate()
    : typeof seconds === 'number' ? new Date(seconds * 1000)
    : value;
  const instant = typeof raw === 'string' ? moment.parseZone(raw) : moment(raw);
  if (!instant.isValid()) return instant;
  return instant.utcOffset(offsetInventario(instant.toDate()));
}

// Day cutoffs need the offset at each midnight, not the offset of an arbitrary
// instant inside that day (historical DST transitions can change it).
export function inicioDiaInventario(value) {
  const day = momentoInventario(value);
  return day.isValid() ? momentoInventario(day.format('YYYY-MM-DD')) : day;
}

export function finDiaInventario(value) {
  const day = momentoInventario(value);
  if (!day.isValid()) return day;
  const next = moment.utc(day.format('YYYY-MM-DD'), 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
  return momentoInventario(next).subtract(1, 'millisecond');
}
