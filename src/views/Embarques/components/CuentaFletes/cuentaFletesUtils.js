export const COSTO_TARA_LIMPIO = 70;
export const COSTO_TARA_CRUDO = 60;
export const COSTO_TARA_LIMPIO_NUEVO = 100;
export const COSTO_TARA_CRUDO_NUEVO = 80;
// A partir de esta fecha (inclusive) se aplican los costos nuevos de tara.
export const FECHA_NUEVOS_COSTOS_TARA = '2026-05-11';
// A partir de esta fecha (inclusive) se descuenta DESCUENTO_TARA_LIMPIO_CATARRO_OTILIO
// por cada tara de limpio enviada a Catarro u Otilio.
export const FECHA_DESCUENTO_CATARRO_OTILIO = '2026-06-15';
export const DESCUENTO_TARA_LIMPIO_CATARRO_OTILIO = 20;

export function normalizarTexto(valor) {
  return (valor || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function obtenerClaveChoferPago(chofer) {
  const normalizado = normalizarTexto(chofer);
  if (normalizado.includes('caminante')) return 'caminante';
  if (normalizado.includes('porro')) return 'porro';
  return normalizado || 'sin_chofer';
}

export function fletePerteneceAChofer(flete, chofer) {
  return normalizarTexto(flete.cargaCon).includes(normalizarTexto(chofer));
}

export function obtenerEstadoPagoDesdeData(data, chofer) {
  const pagoKey = obtenerClaveChoferPago(chofer);
  const pagosPorChofer = data.fletePagos || {};

  if (Object.prototype.hasOwnProperty.call(pagosPorChofer, pagoKey)) {
    return pagosPorChofer[pagoKey] === true;
  }

  return data.fletePagado === true;
}

export function obtenerEstadoPagoFlete(flete, chofer) {
  const pagoKey = obtenerClaveChoferPago(chofer);
  const pagosPorChofer = flete.pagosPorChofer || {};

  if (Object.prototype.hasOwnProperty.call(pagosPorChofer, pagoKey)) {
    return pagosPorChofer[pagoKey] === true;
  }

  return flete.pagadoLegacy === true || flete.pagado === true;
}

export function esCargaDeUnSoloChofer(cargaCon, chofer) {
  return normalizarTexto(cargaCon) === normalizarTexto(chofer);
}

export function obtenerFechaISO(fecha) {
  if (!fecha) return '';
  const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(fechaObj.getTime())) return '';
  return fechaObj.toISOString().split('T')[0];
}

export function calcularTarasProductos(productos = []) {
  if (!Array.isArray(productos)) return 0;

  return productos.reduce((total, producto) => {
    const taras = Array.isArray(producto.taras)
      ? producto.taras.reduce((sum, tara) => sum + (parseInt(tara, 10) || 0), 0)
      : 0;
    const tarasExtra = Array.isArray(producto.tarasExtra)
      ? producto.tarasExtra.reduce((sum, tara) => sum + (parseInt(tara, 10) || 0), 0)
      : 0;

    return total + taras + tarasExtra;
  }, 0);
}

export function calcularTarasCrudos(crudos = []) {
  if (!Array.isArray(crudos)) return 0;

  return crudos.reduce((total, crudo) => {
    if (!Array.isArray(crudo.items)) return total;

    return total + crudo.items.reduce((itemTotal, item) => {
      const [cantidad = 0] = (item.taras || '').split('-');
      const [cantidadSobrante = 0] = (item.sobrante || '').split('-');

      return itemTotal + (parseInt(cantidad, 10) || 0) + (parseInt(cantidadSobrante, 10) || 0);
    }, 0);
  }, 0);
}

export function obtenerTotalTaras(item) {
  return (item.tarasLimpioJoselito || 0) +
    (item.tarasCrudoJoselito || 0) +
    (item.tarasLimpioVeronica || 0) +
    (item.tarasCrudoVeronica || 0);
}

export function obtenerCostosTaraPorFecha(fecha) {
  const fechaISO = obtenerFechaISO(fecha);
  if (fechaISO && fechaISO >= FECHA_NUEVOS_COSTOS_TARA) {
    return { limpio: COSTO_TARA_LIMPIO_NUEVO, crudo: COSTO_TARA_CRUDO_NUEVO };
  }
  return { limpio: COSTO_TARA_LIMPIO, crudo: COSTO_TARA_CRUDO };
}

export function calcularMontoDia(flete, costos = {}) {
  const defaults = obtenerCostosTaraPorFecha(flete.fecha);
  const costoLimpio = costos.limpio || defaults.limpio;
  const costoCrudo = costos.crudo || defaults.crudo;

  const subtotal = ((flete.tarasLimpioJoselito || 0) * costoLimpio) +
    ((flete.tarasCrudoJoselito || 0) * costoCrudo) +
    ((flete.tarasLimpioVeronica || 0) * costoLimpio) +
    ((flete.tarasCrudoVeronica || 0) * costoCrudo);

  const descuento = ((flete.tarasLimpioCatarro || 0) + (flete.tarasLimpioOtilio || 0))
    * DESCUENTO_TARA_LIMPIO_CATARRO_OTILIO;

  return subtotal - descuento;
}

export function transformarEmbarqueAFlete(docSnapshot) {
  const data = docSnapshot.data();

  if (data.noEnviadoMexico === true) {
    return null;
  }

  const fecha = data.fecha && data.fecha.toDate ? data.fecha.toDate() : new Date(data.fecha);
  const clientes = Array.isArray(data.clientes) ? data.clientes : [];

  const clienteJoselito = clientes.find(cliente => {
    const id = cliente.id?.toString();
    const nombre = normalizarTexto(cliente.nombre || '');
    return id === '1' || nombre === 'joselito';
  });

  const clienteVeronica = clientes.find(cliente => {
    const id = cliente.id?.toString();
    const nombre = normalizarTexto(cliente.nombre || '');
    const nombreNotas = normalizarTexto(cliente.nombreNotas || '');
    return id === '5' || nombre === 'veronica' || nombre === 'lorena' || nombreNotas === 'lorena';
  });

  const clienteCatarro = clientes.find(cliente => {
    const id = cliente.id?.toString();
    const nombre = normalizarTexto(cliente.nombre || '');
    return id === '2' || nombre === 'catarro';
  });

  const clienteOtilio = clientes.find(cliente => {
    const id = cliente.id?.toString();
    const nombre = normalizarTexto(cliente.nombre || '');
    return id === '3' || nombre === 'otilio';
  });

  const fechaISO = obtenerFechaISO(fecha);
  const aplicaDescuentoCatarroOtilio = fechaISO && fechaISO >= FECHA_DESCUENTO_CATARRO_OTILIO;
  const tarasLimpioCatarro = aplicaDescuentoCatarroOtilio
    ? calcularTarasProductos(clienteCatarro?.productos)
    : 0;
  const tarasLimpioOtilio = aplicaDescuentoCatarroOtilio
    ? calcularTarasProductos(clienteOtilio?.productos)
    : 0;

  if (!clienteJoselito && !clienteVeronica && tarasLimpioCatarro === 0 && tarasLimpioOtilio === 0) {
    return null;
  }

  const cargaCon = data.cargaCon || 'No especificado';
  const pagado = obtenerEstadoPagoDesdeData(data, cargaCon);

  return {
    id: docSnapshot.id,
    fecha,
    tarasLimpioJoselito: calcularTarasProductos(clienteJoselito?.productos),
    tarasCrudoJoselito: calcularTarasCrudos(clienteJoselito?.crudos),
    tarasLimpioVeronica: calcularTarasProductos(clienteVeronica?.productos),
    tarasCrudoVeronica: calcularTarasCrudos(clienteVeronica?.crudos),
    tarasLimpioCatarro,
    tarasLimpioOtilio,
    cargaCon,
    pagado,
    pagadoLegacy: data.fletePagado === true,
    pagosPorChofer: data.fletePagos || {}
  };
}

export function agruparFletesPorFechaYCarga(fletesBase) {
  const fletesAgrupados = new Map();

  fletesBase.forEach(flete => {
    const fechaISO = obtenerFechaISO(flete.fecha);
    const cargaCon = flete.cargaCon || 'No especificado';
    const pagoKey = obtenerClaveChoferPago(cargaCon);
    const key = `${fechaISO}__${cargaCon}`;
    const existente = fletesAgrupados.get(key);

    if (!existente) {
      fletesAgrupados.set(key, {
        id: key,
        ids: [flete.id],
        fecha: flete.fecha,
        tarasLimpioJoselito: flete.tarasLimpioJoselito,
        tarasCrudoJoselito: flete.tarasCrudoJoselito,
        tarasLimpioVeronica: flete.tarasLimpioVeronica,
        tarasCrudoVeronica: flete.tarasCrudoVeronica,
        tarasLimpioCatarro: flete.tarasLimpioCatarro || 0,
        tarasLimpioOtilio: flete.tarasLimpioOtilio || 0,
        cargaCon,
        pagado: flete.pagado,
        pagadoLegacy: flete.pagadoLegacy,
        pagosPorChofer: {
          ...flete.pagosPorChofer,
          [pagoKey]: flete.pagado
        }
      });
      return;
    }

    existente.ids.push(flete.id);
    existente.tarasLimpioJoselito += flete.tarasLimpioJoselito;
    existente.tarasCrudoJoselito += flete.tarasCrudoJoselito;
    existente.tarasLimpioVeronica += flete.tarasLimpioVeronica;
    existente.tarasCrudoVeronica += flete.tarasCrudoVeronica;
    existente.tarasLimpioCatarro += flete.tarasLimpioCatarro || 0;
    existente.tarasLimpioOtilio += flete.tarasLimpioOtilio || 0;
    existente.pagado = existente.pagado && flete.pagado;
    existente.pagadoLegacy = existente.pagadoLegacy && flete.pagadoLegacy;
    existente.pagosPorChofer = {
      ...existente.pagosPorChofer,
      [pagoKey]: Boolean(existente.pagosPorChofer[pagoKey]) && flete.pagado
    };
  });

  return Array.from(fletesAgrupados.values())
    .map(flete => ({
      ...flete,
      id: flete.ids.length === 1 ? flete.ids[0] : flete.id
    }))
    .sort((a, b) => b.fecha - a.fecha);
}

export function filtrarFletesPorChofer(fletes, chofer) {
  return fletes
    .filter(flete => fletePerteneceAChofer(flete, chofer))
    .map(flete => ({
      ...flete,
      pagado: obtenerEstadoPagoFlete(flete, chofer)
    }));
}

export function ordenarMovimientos(fletes, abonos) {
  return [
    ...fletes.map(flete => ({ ...flete, tipo: 'flete' })),
    ...abonos.map(abono => ({ ...abono, tipo: 'abono' }))
  ].sort((a, b) => b.fecha - a.fecha);
}

export function calcularDeudaAcumuladaPorId(items, costos) {
  const acumulados = {};
  let total = 0;

  [...items].sort((a, b) => a.fecha - b.fecha).forEach(item => {
    if (item.tipo === 'abono') {
      total -= Number(item.monto) || 0;
    } else {
      total += item.pagado ? 0 : calcularMontoDia(item, costos);
    }
    acumulados[item.id] = total;
  });

  return acumulados;
}
