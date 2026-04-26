export const COSTO_TARA_LIMPIO = 70;
export const COSTO_TARA_CRUDO = 60;

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

export function calcularMontoDia(flete, costos = {}) {
  const costoLimpio = costos.limpio || COSTO_TARA_LIMPIO;
  const costoCrudo = costos.crudo || COSTO_TARA_CRUDO;

  return ((flete.tarasLimpioJoselito || 0) * costoLimpio) +
    ((flete.tarasCrudoJoselito || 0) * costoCrudo) +
    ((flete.tarasLimpioVeronica || 0) * costoLimpio) +
    ((flete.tarasCrudoVeronica || 0) * costoCrudo);
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

  if (!clienteJoselito && !clienteVeronica) {
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
