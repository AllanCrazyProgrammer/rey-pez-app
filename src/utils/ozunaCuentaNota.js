/**
 * Cuenta del día de Ozuna generada al imprimir su nota PDF desde embarques.
 *
 * La cuenta vive en `cuentasOzuna` (mismo documento que el módulo Cuentas Ozuna).
 * Los datos los arma `prepararDatosCuentaOzuna` (EmbarqueCuentasService); aquí solo
 * se decide si crear, reusar o actualizar y se arma la página del PDF.
 */
import { formatNumber } from './formatters';

export const OZUNA_CLIENTE_ID = '4';
const ABONO_AUTOMATICO = /^Venta de (limpio|crudo): /;

/**
 * Nota creada por un abono del asistente, todavía sin productos del embarque.
 * El embarque la completa; una nota con renglones capturados a mano no entra aquí.
 */
export function esNotaOzunaPendienteDeEmbarque(data) {
  if (!data || data.pendienteEmbarque !== true || data.firmaEmbarque) return false;
  return !(Array.isArray(data.items) && data.items.length);
}

/** Items del embarque + abonos automáticos de venta, conservando los abonos manuales. */
export function fusionarNotaOzunaConEmbarque(guardada, nueva, origen) {
  const abonosManuales = (guardada.abonos || []).filter((a) => !ABONO_AUTOMATICO.test(a.descripcion || ''));
  const datos = {
    ...guardada,
    items: nueva.items,
    abonos: [...(nueva.abonos || []), ...abonosManuales],
    cobros: guardada.cobros || [],
    saldoAcumuladoAnterior: nueva.saldoAcumuladoAnterior,
    ultimaActualizacion: nueva.ultimaActualizacion,
  };
  if (origen) Object.assign(datos, origen);
  if (guardada.pendienteEmbarque) datos.pendienteEmbarque = false;
  const fusion = { ...datos, ...totales(datos) };
  Object.keys(fusion).forEach((clave) => {
    if (fusion[clave] === undefined) delete fusion[clave];
  });
  return fusion;
}

const num = (v) => Math.round((Number(v) || 0) * 100) / 100;

/** Parte de la cuenta que sale del embarque: items y abonos automáticos de venta. */
export function parteDelEmbarque(cuenta = {}) {
  return {
    items: (cuenta.items || []).map((i) => ({
      kilos: num(i.kilos),
      medida: String(i.medidaOriginal ?? i.medida ?? ''),
      costo: num(i.costo),
      esVenta: !!i.esVenta,
    })),
    abonos: (cuenta.abonos || [])
      .filter((a) => ABONO_AUTOMATICO.test(a.descripcion || ''))
      .map((a) => ({ descripcion: a.descripcion, monto: num(a.monto) })),
  };
}

/** Firma estable (djb2) de la parte que sale del embarque. */
export function firmaCuentaOzuna(cuenta) {
  const texto = JSON.stringify(parteDelEmbarque(cuenta));
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

const totales = (cuenta) => {
  const totalGeneral = (cuenta.items || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
  const cobros = (cuenta.cobros || []).reduce((s, c) => s + (Number(c.monto) || 0), 0);
  const abonos = (cuenta.abonos || []).reduce((s, a) => s + (Number(a.monto) || 0), 0);
  const saldo = (Number(cuenta.saldoAcumuladoAnterior) || 0) + totalGeneral + cobros - abonos;
  return { totalGeneral, totalSaldo: saldo, nuevoSaldoAcumulado: saldo };
};

/**
 * Decide qué hacer con la cuenta del día.
 * @param {Array<{id:string,data:object}>} existentes cuentas de esa fecha
 * @param {object} nueva datos de prepararDatosCuentaOzuna
 * @param {string} embarqueId
 * @returns {{accion:'crear'|'reusar'|'actualizar'|'manual', id?:string, datos:object, aviso?:string}}
 */
export function decidirCuentaOzunaNota(existentes, nueva, embarqueId) {
  const firma = firmaCuentaOzuna(nueva);
  const origen = { embarqueId: String(embarqueId || ''), firmaEmbarque: firma };
  if (!existentes.length) return { accion: 'crear', datos: { ...nueva, ...origen } };

  const { id, data: guardada } = existentes[0];
  const aviso = existentes.length > 1 ? `Hay ${existentes.length} cuentas de Ozuna para ${nueva.fecha}; se usó ${id}.` : undefined;
  // El saldo anterior guardado puede estar desfasado (se editaron días previos);
  // se usa siempre el recalculado, igual que la pantalla Cuentas Ozuna.
  const saldoCambio = num(guardada.saldoAcumuladoAnterior) !== num(nueva.saldoAcumuladoAnterior);
  const data = { ...guardada, saldoAcumuladoAnterior: nueva.saldoAcumuladoAnterior };
  const conSaldo = { ...data, ...totales(data) };
  // Abono dictado antes de que exista el embarque: se completa esta misma nota.
  if (esNotaOzunaPendienteDeEmbarque(guardada)) {
    return {
      accion: 'actualizar', id,
      datos: fusionarNotaOzunaConEmbarque(guardada, nueva, origen),
      aviso,
    };
  }
  const ligada = data.firmaEmbarque && String(data.embarqueId || '') === origen.embarqueId;
  // Sin firma o editada a mano en Cuentas Ozuna: no se pisan sus renglones.
  if (!ligada || firmaCuentaOzuna(data) !== data.firmaEmbarque) {
    return {
      accion: 'manual', id, datos: conSaldo,
      aviso: [aviso, `La cuenta de Ozuna del ${nueva.fecha} fue creada o editada a mano; se imprimió tal cual y no se modificó.`].filter(Boolean).join(' '),
    };
  }
  if (data.firmaEmbarque === firma) {
    return saldoCambio
      ? { accion: 'actualizar', id, datos: conSaldo, aviso }
      : { accion: 'reusar', id, datos: guardada, aviso };
  }

  // Cambió el embarque: se reemplazan items y abonos automáticos; se conservan cobros y abonos manuales.
  return {
    accion: 'actualizar', id,
    datos: fusionarNotaOzunaConEmbarque(data, nueva, origen),
    aviso,
  };
}

/**
 * Crea, actualiza o reusa la cuenta. `repo` hace la E/S:
 *  buscarPorFecha(fecha) -> [{id,data}], crear(fecha, datos) -> id, actualizar(id, datos)
 */
export async function sincronizarCuentaOzunaNota({ embarqueId, nueva, repo }) {
  const existentes = await repo.buscarPorFecha(nueva.fecha);
  const r = decidirCuentaOzunaNota(existentes, nueva, embarqueId);
  if (r.accion === 'crear') r.id = await repo.crear(nueva.fecha, r.datos);
  if (r.accion === 'actualizar') await repo.actualizar(r.id, r.datos);
  return r;
}

const fechaLarga = (fecha) =>
  new Date(`${String(fecha).slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

/** Página pdfmake con las mismas tablas que "Imprimir" en Cuentas Ozuna. */
export function paginaCuentaOzunaPdf(cuenta) {
  const t = totales(cuenta);
  const $ = (v) => `$${formatNumber(v)}`;
  const fila = (a, b, bold) => [{ text: a, bold }, { text: b, bold }];
  return [
    { text: `Cuentas Ozuna - ${fechaLarga(cuenta.fecha)}`, fontSize: 26, bold: true, alignment: 'center', margin: [0, 0, 0, 12] },
    { text: 'Detalles de la cuenta', fontSize: 22, bold: true, margin: [0, 6, 0, 6] },
    {
      table: {
        headerRows: 1, widths: ['*', '*', '*', '*'],
        body: [
          ['Kilos', 'Medida', 'Costo', 'Total'].map((h) => ({ text: h, bold: true })),
          ...(cuenta.items || []).map((i) => [formatNumber(i.kilos), String(i.medidaOriginal ?? i.medida ?? ''), $(i.costo), $(i.total)]),
          [{ text: 'Total', bold: true, colSpan: 3, alignment: 'right' }, {}, {}, { text: $(t.totalGeneral), bold: true }],
        ],
      },
      fontSize: 16, margin: [0, 0, 0, 16],
    },
    { text: 'Resumen de saldo', fontSize: 22, bold: true, margin: [0, 6, 0, 6] },
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          fila('Saldo Anterior', $(cuenta.saldoAcumuladoAnterior)),
          fila('Saldo Hoy', $(t.totalGeneral)),
          ...(cuenta.cobros || []).map((c) => fila(c.descripcion || '', $(c.monto))),
          ...(cuenta.abonos || []).map((a) => fila(`${a.descripcion || ''} (Abono)`, `-${$(a.monto)}`)),
          fila('Total', $(t.totalSaldo), true),
        ],
      },
      fontSize: 16,
    },
  ];
}
