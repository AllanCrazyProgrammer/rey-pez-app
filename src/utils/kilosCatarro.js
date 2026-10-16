import { normalizarFechaValor } from './dateUtils';
import { obtenerSobrantesDeItem } from './sobrantesCrudos';

export const FECHA_KILOS_DECIMALES_CATARRO = '2026-10-16';

export const usarKilosDecimalesCatarro = fecha => {
  const fechaISO = normalizarFechaValor(fecha);
  return !!fechaISO && fechaISO >= FECHA_KILOS_DECIMALES_CATARRO;
};

// Eliminar únicamente el ruido de coma flotante, sin redondear a kilos enteros.
export const normalizarKilosCatarro = kilos => Number(kilos.toFixed(10));
export const formatearKilosCatarro = kilos => Number.isInteger(kilos) ? kilos.toFixed(1) : String(kilos);

export function calcularKilosProductoCatarro(producto, sumarKg = true) {
  let kilos;
  if (producto.tipo === 'c/h20') {
    const bolsas = (producto.reporteTaras || []).reduce((total, taras, i) =>
      total + (parseInt(taras) || 0) * (parseInt((producto.reporteBolsas || [])[i]) || 0), 0);
    kilos = bolsas * (Number(producto.camaronNeto) || 0.65);
  } else {
    kilos = (producto.kilos || []).reduce((total, peso) => total + (parseFloat(peso) || 0), 0);
    const descuento = producto.tarasInfo
      ? producto.tarasInfo.reduce((total, tara) => total + (tara.restarTaras ? (Number(tara.valor) || 0) * 3 : 0), 0)
      : producto.restarTaras
        ? (producto.taras || []).reduce((total, tara) => total + (parseInt(tara) || 0) * 3, 0)
        : 0;
    kilos -= descuento;
    if (kilos > 0 && sumarKg && !producto.noSumarKilos && /s\/h2[o0]/i.test(producto.tipo || '')) {
      kilos += 1;
    }
  }
  return normalizarKilosCatarro(kilos);
}

export function calcularKilosCrudoCatarro(item) {
  const taras = String(item.taras || '').trim();
  const formato = /^(\d+)-(\d+(?:\.\d+)?)$/.exec(taras);
  let kilos = formato ? Number(formato[1]) * 20 : (parseFloat(taras) || 0);
  const sobrantes = Array.isArray(item.sobrantes)
    ? obtenerSobrantesDeItem(item)
    : [
      item.mostrarSobrante !== false ? item.sobrante : null,
      item.mostrarSobrante2 !== false ? item.sobrante2 : null,
    ].filter(Boolean);
  sobrantes.forEach(sobrante => {
    const partes = String(sobrante).split('-');
    kilos += parseFloat(partes.length === 2 ? partes[1] : partes[0]) || 0;
  });
  return normalizarKilosCatarro(kilos);
}

// Copias exclusivas del PDF: esta cantidad no se escribe en el embarque.
// Se calcula antes de juntar medidas para sumar los mismos renglones que la cuenta.
export function prepararKilosCatarroParaNota(embarque, clientes, sumarKgPorCliente = {}) {
  if (!usarKilosDecimalesCatarro(embarque?.fecha)) return embarque;
  const esCatarro = id => String(id) === '2' || clientes.some(cliente =>
    String(cliente.id) === String(id) && /catarro/i.test(cliente.nombre || cliente.nombreNotas || ''));
  return {
    ...embarque,
    productos: (embarque.productos || []).map(producto => esCatarro(producto.clienteId)
      ? { ...producto, kilosNotaCatarro: calcularKilosProductoCatarro(producto, sumarKgPorCliente[producto.clienteId] !== false) }
      : producto),
    clienteCrudos: Object.fromEntries(Object.entries(embarque.clienteCrudos || {}).map(([id, crudos]) => [
      id, esCatarro(id) ? (crudos || []).map(crudo => ({
        ...crudo,
        items: (crudo.items || []).map(item => ({ ...item, kilosNotaCatarro: calcularKilosCrudoCatarro(item) })),
      })) : crudos,
    ])),
  };
}
