// Quién carga en el embarque según el día de la semana (regla de Allan, 2026-11-13).
// Lun, jue, sáb → Caminante; mar, mié, vie → Porro. El domingo no tiene regla:
// se deja sin asignar ('') para que Allan elija a mano.
//
// La misma regla vive en functions/lib/embarquesEscritura.js (POST /embarques):
// si un lado cambia, cambiar los dos.
export const RESPONSABLE_CARGA_CAMINANTE = 'Caminante';
export const RESPONSABLE_CARGA_PORRO = 'Porro';

const RESPONSABLE_POR_DIA = Object.freeze({
  0: '', // domingo: sin regla
  1: RESPONSABLE_CARGA_CAMINANTE, // lunes
  2: RESPONSABLE_CARGA_PORRO, // martes
  3: RESPONSABLE_CARGA_PORRO, // miércoles
  4: RESPONSABLE_CARGA_CAMINANTE, // jueves
  5: RESPONSABLE_CARGA_PORRO, // viernes
  6: RESPONSABLE_CARGA_CAMINANTE, // sábado
});

export function responsableCargaParaFecha(fechaISO) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fechaISO || '').trim());
  if (!partes) return '';
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(ano, mes - 1, dia);
  if (fecha.getFullYear() !== ano || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return '';
  return RESPONSABLE_POR_DIA[fecha.getDay()] || '';
}
