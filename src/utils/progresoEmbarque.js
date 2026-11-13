// Progreso del embarque frente al pedido del día (limpios + crudos).
// Una sola fórmula para la barra superior de NuevoEmbarque.vue.
//
// Pedido (denominador): lo que se pidió ese día, del índice de referencia
// que ya carga NuevoEmbarque (embarquePedidoMixin):
// - Limpios: porMedida trae { kilos, taras } por medida. Los kilos van
//   directos; las líneas pedidas solo en taras (esTara) valen 20 kg c/u,
//   que es la caja de limpio.
// - Crudos: por cliente y medida trae { taras }. El crudo se mide en taras:
//   1 tara = 19 kg, como en la página de pedidos (pedidosCrudoTotales.js:
//   kilos = taras × 19; ej. 20 taras = 380 kg). El embarque, en cambio,
//   cuenta la tara de 19 kg como 20 en sus kilos (embarqueTotales.js:
//   "5-19" → 5 × 20), por eso el progreso de crudo NO usa esos kilos:
//   usarlos inflaría el pedido a 400 kg y el porcentaje. El numerador de
//   crudo es taras pesadas × 19, del mismo resumen del embarque.
//   Ojo: el índice de crudos trae cada medida dos veces — con su nombre
//   original ("Med") y con su nombre normalizado ("Med c/c") — porque
//   construirIndicePedidoReferenciaCrudos mezcla ambas. Se desduplica por
//   talla normalizada quedándose con el máximo, no sumando, para no contar
//   el mismo pedido dos veces.
//
// Pesado (numerador): los kilos ya capturados en el embarque — limpios con
// la misma fórmula del resumen (resumenEmbarque en embarqueTotales.js) y
// crudos por taras × 19 — así la barra nunca discrepa con lo que Allan ya
// ve en pantalla ni con la página de pedidos.
export const KILOS_POR_TARA_LIMPIO = 20;
export const KILOS_POR_TARA_CRUDO = 19;

function numero(valor) {
  const n = Number(typeof valor === 'string' ? valor.replace(',', '.') : valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Equivalencias de tallas de crudo con cabeza (fuente: medidasPedidoCrudo.js).
// Solo se usan para desduplicar el índice de referencia; no cambian nombres.
const TALLAS_CON_CABEZA = Object.freeze({
  chico: 'chico c/c',
  med: 'med c/c',
  'med-esp': 'med-esp c/c',
  'med esp': 'med-esp c/c',
  'med-gde': 'med-gde c/c',
  'med gde': 'med-gde c/c',
  gde: 'gde c/c',
  'gde c/ extra': 'gde c/ extra c/c',
  extra: 'extra c/c',
  jumbo: 'jumbo c/c',
  'lag gde': 'lag gde c/c',
});

export function claveTallaCrudo(medida) {
  const clave = String(medida || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return TALLAS_CON_CABEZA[clave] || clave;
}

export function kilosPedidoLimpio(pedidoReferenciaPorCliente = {}) {
  let kilos = 0;
  Object.values(pedidoReferenciaPorCliente || {}).forEach((referenciaCliente) => {
    Object.values(referenciaCliente?.porMedida || {}).forEach((referencia) => {
      kilos += numero(referencia?.kilos) + numero(referencia?.taras) * KILOS_POR_TARA_LIMPIO;
    });
  });
  return kilos;
}

export function kilosPedidoCrudo(pedidoReferenciaCrudosPorCliente = {}) {
  let kilos = 0;
  Object.values(pedidoReferenciaCrudosPorCliente || {}).forEach((referenciasCliente) => {
    const porTalla = {};
    Object.entries(referenciasCliente || {}).forEach(([medida, referencia]) => {
      const clave = claveTallaCrudo(medida);
      const taras = numero(referencia?.taras);
      if (taras > (porTalla[clave] || 0)) porTalla[clave] = taras;
    });
    Object.values(porTalla).forEach((taras) => {
      kilos += taras * KILOS_POR_TARA_CRUDO;
    });
  });
  return kilos;
}

function porcentaje(parte, total) {
  if (!(total > 0)) return 0;
  if (!(parte > 0)) return 0;
  return Math.min(100, Math.max(1, Math.round((parte / total) * 100)));
}

export function calcularProgresoEmbarque(pesado = {}, pedidoLimpio = {}, pedidoCrudo = {}) {
  const pedidoLimpioKilos = kilosPedidoLimpio(pedidoLimpio);
  const pedidoCrudoKilos = kilosPedidoCrudo(pedidoCrudo);
  const pedidoTotal = pedidoLimpioKilos + pedidoCrudoKilos;
  const pesadoLimpio = numero(pesado?.limpio?.kilos);
  // Crudo por taras (19 kg c/u, como en pedidos): no usar pesado.crudo.kilos,
  // que cuenta la tara de 19 como 20 (ver nota arriba).
  const tarasCrudoPesadas = numero(pesado?.crudo?.taras);
  const pesadoCrudo = tarasCrudoPesadas > 0
    ? tarasCrudoPesadas * KILOS_POR_TARA_CRUDO
    : numero(pesado?.crudo?.kilos);
  const pesadoTotal = pesadoLimpio + pesadoCrudo;
  return {
    pedidoLimpio: pedidoLimpioKilos,
    pedidoCrudo: pedidoCrudoKilos,
    pedidoTotal,
    pesadoLimpio,
    pesadoCrudo,
    pesadoTotal,
    faltante: Math.max(0, pedidoTotal - pesadoTotal),
    tienePedido: pedidoTotal > 0,
    porcentaje: porcentaje(pesadoTotal, pedidoTotal),
    porcentajeLimpio: porcentaje(pesadoLimpio, pedidoLimpioKilos),
    porcentajeCrudo: porcentaje(pesadoCrudo, pedidoCrudoKilos),
    completo: pedidoTotal > 0 && pesadoTotal >= pedidoTotal,
  };
}
