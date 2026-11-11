/**
 * Rendimientos de embarques por API.
 *
 * La vista Rendimientos.vue calcula todo en el front; aquí se reproduce
 * ese cálculo en el servidor, con las mismas fórmulas y el mismo orden
 * de búsqueda de precios y costos. Nada de lo que calcula GET se escribe.
 *
 * Rutas:
 * - GET  /rendimientos?embarqueId=<id>  cálculo completo del embarque
 *        (fusiona los camiones del mismo día como la vista: mezcla los
 *        clientes y los mapas de configuración, y conserva los
 *        kilosCrudos del embarque principal).
 * - GET  /costos?medida=&fecha=         costo más reciente por medida
 *        en historial_costos (solo lectura).
 * - POST /rendimientos/guardar          escribe SOLO los 13 campos de
 *        CAMPOS_RENDIMIENTOS (la lista real de la app en
 *        src/utils/embarqueRevision.js; la SPEC decía 12 y omitía
 *        kilosCrudos). Con dryRun e idempotencyKey. Nunca toca clientes,
 *        productos, crudos, fecha ni camionNumero. No sube `rev` (la
 *        SPEC ordena escribir solo esos campos; la vista detecta el
 *        cambio por valor en su siguiente guardado).
 * - POST /rendimientos/deshacer         restaura los valores previos
 *        de un guardar por idempotencyKey (mismo patrón que
 *        /abonos/deshacer).
 *
 * Fórmulas (Rendimientos.vue):
 * - totalEmbarcado(medida) = sum(kilos[]) - (restarTaras ? sum(taras[])*3 : 0);
 *   con tipo c/h20: sum(reporteTaras[i]*reporteBolsas[i]) * camaronNeto (0.65).
 *   Medidas mix: suma de sus dos partes.
 * - rendimiento(medida) = kilosCrudos / floor(totalEmbarcado); mix suma
 *   medida1+medida2; refri con análisis activado usa rendimientoManual.
 * - costoFinal = round(costo * rendimientoRedondeado2dec) + costoExtra
 *   (def. 18) si debeAplicarCostoExtra(medida): la medida es numérica
 *   (empieza con N/N, N seguido de espacio, o número solo) y no es
 *   "maquila ozuna"; el mapa aplicarCostoExtra del doc manda sobre la regla.
 *   costo sale de embarque.costosPorMedida y si no está, del más reciente
 *   en historial_costos.
 * - precioVenta: precio general más reciente con fecha <= fecha del
 *   embarque; el específico del cliente solo si es más reciente que el
 *   general. Para embarques recientes (<= 3 días) o de hoy/futuro se usa
 *   el más reciente sin mirar la fecha.
 * - gananciaUnitaria = round(precioUnitario - costoFinal);
 *   gananciaTotal = round(gananciaUnitaria * totalEmbarcado).
 * - totalGanancias = round(suma de ganancias visibles de limpios +
 *   maquila + crudos).
 * - Crudos por talla: costoFinal = costoBase + 3.5; totalCosto =
 *   costoFinal * totalKilosCosto (kilos con peso de costo 19);
 *   gananciaTotal = totalVentas - totalCosto.
 */

const admin = require('firebase-admin');
const { normalizarNombreProductoPrecio, fechaHoyMexico } = require('./preciosVenta');
const { serializar, fechaValida } = require('./embarquesLectura');

// Lista real de la app (src/utils/embarqueRevision.js). La SPEC decía 12;
// incluye kilosCrudos como campo 13.
const CAMPOS_RENDIMIENTOS = [
  'kilosCrudos',
  'medidaOculta',
  'analizarGanancia',
  'analizarGananciaCrudos',
  'rendimientoManual',
  'analizarMaquilaGanancia',
  'precioMaquila',
  'pesoTaraCosto',
  'pesoTaraVenta',
  'nombresMedidasPersonalizados',
  'notaRendimientos',
  'totalGanancias',
  'costosPorMedida'
];

const DIAS_RECIENTES = 3;
const COSTO_EXTRA_DEFECTO = 18;
const PESO_TARA_COSTO_DEFECTO = 19;
const PESO_TARA_VENTA_DEFECTO = 20;

function deepClone(valor) {
  if (valor === undefined || valor === null) return valor;
  try {
    return JSON.parse(JSON.stringify(valor));
  } catch (error) {
    return valor;
  }
}

// --- Fechas (mismo comportamiento que src/utils/rendimientosCalculos.js) ---

function normalizarFecha(fecha) {
  if (!fecha) return null;
  try {
    if (typeof fecha === 'object' && fecha.seconds) {
      return new Date(fecha.seconds * 1000);
    }
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const fechaObj = new Date(fecha);
    if (Number.isNaN(fechaObj.getTime())) return null;
    return fechaObj;
  } catch (error) {
    return null;
  }
}

function toLocalYMD(fecha) {
  if (!fecha) return '';
  let d;
  if (typeof fecha === 'object' && fecha.seconds) {
    d = new Date(fecha.seconds * 1000);
  } else if (fecha instanceof Date) {
    d = fecha;
  } else if (typeof fecha === 'string' && fecha.includes('-')) {
    const [y, m, day] = fecha.split('-');
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(fecha);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- Cálculos puros (Rendimientos.vue / rendimientosCalculos.js / calculations.js) ---

function esMedidaMix(medida) {
  return String(medida || '').toLowerCase().includes('mix');
}

function esMedidaRefri(medida) {
  return String(medida || '').toLowerCase().includes('refri');
}

function calcularTotalKilos(producto) {
  if (!producto || !producto.kilos) return 0;
  const sumaKilos = producto.kilos.reduce((total, kilo) => total + (Number(kilo) || 0), 0);
  const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  const descuentoTaras = producto.restarTaras ? tarasNormales * 3 : 0;
  return sumaKilos - descuentoTaras;
}

function calcularTotalTaras(producto) {
  const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  return tarasNormales + tarasExtra;
}

function calcularTotalBolsas(producto) {
  const reporteTaras = producto.reporteTaras || [];
  const reporteBolsas = producto.reporteBolsas || [];
  let sumaTotalKilos = 0;
  for (let i = 0; i < reporteTaras.length; i += 1) {
    const taras = parseInt(reporteTaras[i], 10) || 0;
    const bolsa = parseInt(reporteBolsas[i], 10) || 0;
    sumaTotalKilos += taras * bolsa;
  }
  return sumaTotalKilos;
}

function calcularKilosCrudosItem(item, pesoTaraVenta = PESO_TARA_VENTA_DEFECTO) {
  if (!item) return 0;
  let kilosTotales = 0;
  [item.taras, item.sobrante, item.sobrante2].forEach((texto) => {
    if (!texto) return;
    const formatoGuion = /^(\d+)-(\d+)$/.exec(String(texto));
    if (formatoGuion) {
      const cantidad = parseInt(formatoGuion[1], 10) || 0;
      let peso = parseInt(formatoGuion[2], 10) || 0;
      if (peso === 19) peso = pesoTaraVenta;
      kilosTotales += cantidad * peso;
    } else {
      const [cantidad, peso] = String(texto).split('-').map(Number);
      kilosTotales += (cantidad || 0) * (peso || 0);
    }
  });
  return kilosTotales;
}

function obtenerClienteIdParaPrecios(nombreCliente) {
  const nombre = String(nombreCliente || '').toLowerCase();
  if (nombre.includes('joselito')) return 'joselito';
  if (nombre.includes('catarro')) return 'catarro';
  if (nombre.includes('otilio')) return 'otilio';
  if (nombre.includes('ozuna')) return 'ozuna';
  if (nombre.includes('veronica') || nombre.includes('lorena')) return 'veronica';
  return null;
}

// Grupo de precios por nombre con alias (src/utils/preciosAliasCatalogo.js).
function obtenerGrupoPreciosPorNombre(catalogo, medida) {
  const nombreCanonico = normalizarNombreProductoPrecio(medida);
  if (!nombreCanonico) return null;
  const clave = nombreCanonico.toLowerCase().trim();
  const grupos = Object.entries(catalogo).filter(([producto, precios]) =>
    normalizarNombreProductoPrecio(producto).toLowerCase().trim() === clave && precios.length > 0);
  if (grupos.length === 0) return null;
  const precios = grupos.length === 1
    ? grupos[0][1]
    : grupos.flatMap(([, registros]) => registros)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return { medidaEncontrada: nombreCanonico, precios };
}

function encontrarPreciosParaMedida(medida, preciosVenta) {
  const grupoAlias = obtenerGrupoPreciosPorNombre(preciosVenta, medida);
  if (grupoAlias) return grupoAlias;

  let preciosProducto = preciosVenta[String(medida).toLowerCase().trim()];
  if (preciosProducto && preciosProducto.length > 0) {
    return { medidaEncontrada: medida, precios: preciosProducto };
  }

  const medidaNormalizada = String(medida).toLowerCase().trim()
    .replace(' maquila ozuna', '')
    .replace(/\s+(vayon|ahumada|sin\s+cal|cal|c\/c|crudo|limpio).*$/g, '')
    .trim();

  preciosProducto = obtenerGrupoPreciosPorNombre(preciosVenta, medidaNormalizada)?.precios;
  if (preciosProducto && preciosProducto.length > 0) {
    return { medidaEncontrada: medidaNormalizada, precios: preciosProducto };
  }

  const medidaConEspacio = medidaNormalizada.replace(/-/g, ' ');
  const medidaConGuion = medidaNormalizada.replace(/ /g, '-');
  preciosProducto = obtenerGrupoPreciosPorNombre(preciosVenta, medidaConEspacio)?.precios
    || obtenerGrupoPreciosPorNombre(preciosVenta, medidaConGuion)?.precios;
  if (preciosProducto && preciosProducto.length > 0) {
    return { medidaEncontrada: medidaNormalizada, precios: preciosProducto };
  }
  return null;
}

function obtenerPrecioVentaParaFecha(medida, fechaEmbarque, clienteId, preciosVenta) {
  const resultadoBusqueda = encontrarPreciosParaMedida(medida, preciosVenta);
  if (!resultadoBusqueda) return null;
  const { medidaEncontrada, precios: preciosProducto } = resultadoBusqueda;
  if (!preciosProducto || preciosProducto.length === 0) return null;

  const fechaEmbarqueNormalizada = normalizarFecha(fechaEmbarque);
  if (!fechaEmbarqueNormalizada) return null;
  const fechaEmbarqueStr = toLocalYMD(fechaEmbarqueNormalizada);
  const fechaHoy = fechaHoyMexico();
  const fechaEmbarqueObj = new Date(fechaEmbarqueStr);
  const fechaHoyObj = new Date(fechaHoy);
  const diasDiferencia = Math.floor((fechaHoyObj - fechaEmbarqueObj) / (1000 * 60 * 60 * 24));
  const embarqueEsReciente = diasDiferencia <= DIAS_RECIENTES;
  const embarqueEsHoyOFuturo = fechaEmbarqueStr >= fechaHoy;
  const debeUsarPreciosRecientes = embarqueEsReciente || embarqueEsHoyOFuturo;

  if (debeUsarPreciosRecientes) {
    if (clienteId) {
      const precioEspecificoReciente = preciosProducto.find((p) => p.clienteId === clienteId);
      if (precioEspecificoReciente) return precioEspecificoReciente;
    }
    const precioGeneralReciente = preciosProducto.find((p) => !p.clienteId);
    if (precioGeneralReciente) return precioGeneralReciente;
  } else {
    if (clienteId) {
      for (const precio of preciosProducto) {
        const fechaPrecioNormalizada = normalizarFecha(precio.fecha);
        if (!fechaPrecioNormalizada) continue;
        const fechaPrecioStr = toLocalYMD(fechaPrecioNormalizada);
        if (fechaPrecioStr <= fechaEmbarqueStr && precio.clienteId === clienteId) return precio;
      }
    }
    for (const precio of preciosProducto) {
      const fechaPrecioNormalizada = normalizarFecha(precio.fecha);
      if (!fechaPrecioNormalizada) continue;
      const fechaPrecioStr = toLocalYMD(fechaPrecioNormalizada);
      if (fechaPrecioStr <= fechaEmbarqueStr && !precio.clienteId) return precio;
    }
  }

  const preciosGenerales = preciosProducto.filter((p) => !p.clienteId);
  if (preciosGenerales.length > 0) return preciosGenerales[preciosGenerales.length - 1];
  return preciosProducto[preciosProducto.length - 1];
}

// Medidas únicas del embarque (Ozuna maquila aparte; pares mix).
function obtenerMedidasUnicas(clientes, kilosCrudos) {
  const medidasMap = new Map();
  const mixMedidas = new Map();
  (clientes || []).forEach((cliente) => {
    (cliente.productos || []).forEach((producto) => {
      if (!producto.medida) return;
      const medidaNormalizada = String(producto.medida).toLowerCase().trim();
      if (!medidaNormalizada) return;
      let nombreMedida = String(producto.medida).trim();
      let claveUnica = medidaNormalizada;
      if (cliente.nombre === 'Ozuna' && !producto.esVenta) {
        nombreMedida = `${String(producto.medida).trim()} Maquila Ozuna`;
        claveUnica = `${medidaNormalizada}_maquila_ozuna`;
      }
      if (medidaNormalizada.endsWith('mix')) {
        const baseSize = medidaNormalizada.split(' ')[0];
        mixMedidas.set(baseSize, nombreMedida);
      } else if (!medidasMap.has(claveUnica)) {
        medidasMap.set(claveUnica, nombreMedida);
      }
    });
  });

  const kilos = { ...(kilosCrudos || {}) };
  const mixKeys = Array.from(mixMedidas.keys()).sort();
  if (mixKeys.length >= 2) {
    for (let i = 0; i < mixKeys.length; i += 2) {
      if (i + 1 < mixKeys.length) {
        const combinedName = `${mixKeys[i]}-${mixKeys[i + 1]} mix`;
        const combinedNameNormalizado = combinedName.toLowerCase();
        if (!medidasMap.has(combinedNameNormalizado)) {
          medidasMap.set(combinedNameNormalizado, combinedName);
        }
        if (!kilos[combinedName]) {
          kilos[combinedName] = {
            medida1: 0,
            medida2: 0,
            etiqueta1: `Kilos en crudo (${mixKeys[i]})`,
            etiqueta2: `Kilos en crudo (${mixKeys[i + 1]})`
          };
        }
      }
    }
  }
  return { medidas: Array.from(medidasMap.values()), kilosCrudos: kilos };
}

function calcularTotalParaMedida(medida, clientes) {
  const esOzuna = String(medida).includes('Maquila Ozuna');
  const medidaBase = String(medida).replace(' Maquila Ozuna', '').toLowerCase().trim();
  return (clientes || []).reduce((total, cliente) => total + (cliente.productos || [])
    .filter((p) => {
      if (!p.medida) return false;
      if (esOzuna) {
        return String(p.medida).toLowerCase().trim() === medidaBase
          && cliente.nombre === 'Ozuna' && !p.esVenta;
      }
      return String(p.medida).toLowerCase().trim() === medidaBase
        && (cliente.nombre !== 'Ozuna' || p.esVenta);
    })
    .reduce((subtotal, producto) => {
      if (producto.tipo === 'c/h20') {
        const totalBolsas = calcularTotalBolsas(producto);
        const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
        return subtotal + (totalBolsas * valorNeto);
      }
      return subtotal + calcularTotalKilos(producto);
    }, 0), 0);
}

function obtenerTotalEmbarcado(medida, clientes) {
  if (String(medida).includes('-') && String(medida).endsWith('mix')) {
    const [medida1, medida2] = String(medida).split('-').map((m) => m.trim());
    const total1 = calcularTotalParaMedida(`${medida1} mix`, clientes);
    const total2 = calcularTotalParaMedida(`${medida2.replace(' mix', '')} mix`, clientes);
    return total1 + total2;
  }
  return calcularTotalParaMedida(medida, clientes);
}

// Clientes con productos de la medida. La vista excluye los productos
// refrigerados del cálculo de ganancias (producto.refrigerar).
function obtenerClientesConMedida(medida, clientes) {
  const clientesConMedida = [];
  const esOzuna = String(medida).includes('Maquila Ozuna');
  const medidaBase = String(medida).replace(' Maquila Ozuna', '').toLowerCase().trim();
  (clientes || []).forEach((cliente) => {
    let totalEmbarcado = 0;
    (cliente.productos || []).forEach((producto) => {
      if (!producto.medida) return;
      let incluir = false;
      if (esOzuna) {
        incluir = String(producto.medida).toLowerCase().trim() === medidaBase
          && cliente.nombre === 'Ozuna' && !producto.esVenta;
      } else {
        incluir = String(producto.medida).toLowerCase().trim() === medidaBase
          && (cliente.nombre !== 'Ozuna' || producto.esVenta);
      }
      if (incluir && !producto.refrigerar) {
        if (producto.tipo === 'c/h20') {
          const totalBolsas = calcularTotalBolsas(producto);
          const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
          totalEmbarcado += (totalBolsas * valorNeto);
        } else {
          totalEmbarcado += calcularTotalKilos(producto);
        }
      }
    });
    if (totalEmbarcado > 0) {
      clientesConMedida.push({ cliente, totalEmbarcado });
    }
  });
  return clientesConMedida;
}

function calcularRendimiento(medida, ctx) {
  if (esMedidaRefri(medida) && ctx.analizarGanancia[medida]) {
    return Number(ctx.rendimientoManual[medida]) || 0;
  }
  const totalEmbarcado = Math.floor(Number(obtenerTotalEmbarcado(medida, ctx.clientes)) || 0);
  if (totalEmbarcado <= 0) return 0;
  let kilosCrudos;
  if (esMedidaMix(medida)) {
    kilosCrudos = Number(ctx.kilosCrudos[medida]?.medida1 || 0)
      + Number(ctx.kilosCrudos[medida]?.medida2 || 0);
  } else {
    kilosCrudos = Number(ctx.kilosCrudos[medida] || 0);
  }
  return kilosCrudos / totalEmbarcado;
}

function debeAplicarCostoExtra(medida, aplicarCostoExtra) {
  if (!medida) return false;
  const mapa = aplicarCostoExtra || {};
  if (Object.prototype.hasOwnProperty.call(mapa, medida)) {
    return Boolean(mapa[medida]);
  }
  const medidaNormalizada = String(medida || '').trim();
  const esMaquilaOzuna = /maquila\s+ozuna/i.test(medidaNormalizada);
  const esNumerica = /^(\d+\/\d+)/.test(medidaNormalizada)
    || /^(\d+)\s/.test(medidaNormalizada)
    || /^\d+$/.test(medidaNormalizada);
  return esNumerica && !esMaquilaOzuna;
}

// Costo de una medida: primero en el embarque, luego en el historial
// global (el más reciente por medida).
function encontrarCostoParaMedida(medida, costosPorMedida, costosGlobales) {
  const costosEmbarque = costosPorMedida || {};
  let costo = Number(costosEmbarque[medida]);
  if (costo && costo > 0) return { medidaEncontrada: medida, costo, origen: 'embarque' };
  const medidaLower = String(medida).toLowerCase().trim();
  for (const [claveMedida, costoValue] of Object.entries(costosEmbarque)) {
    if (String(claveMedida).toLowerCase().trim() === medidaLower) {
      const valor = Number(costoValue);
      if (valor > 0) return { medidaEncontrada: claveMedida, costo: valor, origen: 'embarque' };
    }
  }
  if (costosGlobales && costosGlobales[medida]) {
    return { medidaEncontrada: medida, costo: costosGlobales[medida].costoBase, origen: 'historial_costos' };
  }
  if (costosGlobales) {
    for (const [claveMedida, info] of Object.entries(costosGlobales)) {
      if (String(claveMedida).toLowerCase().trim() === medidaLower) {
        return { medidaEncontrada: claveMedida, costo: info.costoBase, origen: 'historial_costos' };
      }
    }
  }
  return null;
}

function calcularCostoFinal(medida, ctx) {
  const resultadoBusqueda = encontrarCostoParaMedida(medida, ctx.costosPorMedida, ctx.costosGlobales);
  const costo = resultadoBusqueda ? resultadoBusqueda.costo : 0;
  const rendimientoOriginal = calcularRendimiento(medida, ctx);
  const rendimiento = Math.round(rendimientoOriginal * 100) / 100;
  const costoExtra = Number(ctx.costoExtra) || COSTO_EXTRA_DEFECTO;
  const aplicarExtra = debeAplicarCostoExtra(medida, ctx.aplicarCostoExtra);
  if (aplicarExtra) return Math.round((costo * rendimiento) + costoExtra);
  return Math.round(costo * rendimiento);
}

function calcularPrecioYGanancias(medida, fechaEmbarque, clientesConMedida, costoFinal, costoBase, preciosVenta) {
  const gananciasPorCliente = [];
  let totalEmbarcadoGeneral = 0;
  let gananciaTotalSumada = 0;
  let totalVentasPonderadas = 0;

  const precioGeneral = obtenerPrecioVentaParaFecha(medida, fechaEmbarque, null, preciosVenta);
  const fechaGeneral = precioGeneral ? normalizarFecha(precioGeneral.fecha) : null;

  clientesConMedida.forEach(({ cliente, totalEmbarcado }) => {
    const clienteIdParaPrecios = obtenerClienteIdParaPrecios(cliente.nombre);
    const precioEspecifico = obtenerPrecioVentaParaFecha(medida, fechaEmbarque, clienteIdParaPrecios, preciosVenta);
    let precioAUsar = precioGeneral;
    let esEspecifico = false;
    if (precioEspecifico && precioEspecifico.clienteId) {
      const fechaEspecifico = normalizarFecha(precioEspecifico.fecha);
      if (fechaEspecifico && (!fechaGeneral || fechaEspecifico > fechaGeneral)) {
        precioAUsar = precioEspecifico;
        esEspecifico = true;
      }
    }
    if (precioAUsar) {
      const precioUnitario = Math.round(precioAUsar.precio);
      const gananciaUnitaria = Math.round(precioUnitario - costoFinal);
      const gananciaTotal = Math.round(gananciaUnitaria * totalEmbarcado);
      gananciasPorCliente.push({
        cliente: cliente.nombre,
        precioVenta: precioUnitario,
        totalEmbarcado,
        gananciaUnitaria,
        gananciaTotal,
        fechaPrecio: precioAUsar.fecha,
        esEspecifico,
        clienteId: precioAUsar.clienteId || null
      });
      totalEmbarcadoGeneral += totalEmbarcado;
      gananciaTotalSumada += gananciaTotal;
      totalVentasPonderadas += precioUnitario * totalEmbarcado;
    }
  });

  if (gananciasPorCliente.length === 0) return null;

  const precioPromedioPonderado = totalEmbarcadoGeneral > 0
    ? Math.round(totalVentasPonderadas / totalEmbarcadoGeneral) : 0;
  const clientesConEspecifico = gananciasPorCliente.filter((g) => g.esEspecifico);
  const preciosUnicos = new Set(gananciasPorCliente.map((g) => g.precioVenta));
  const tieneMultiplesPrecios = preciosUnicos.size > 1;
  const soloUnCliente = gananciasPorCliente.length === 1;

  let infoMostrar = {
    esPromedio: tieneMultiplesPrecios,
    esEspecifico: false,
    clienteEspecifico: null,
    clientesConEspecifico: clientesConEspecifico.map((c) => c.cliente),
    fechaMasReciente: gananciasPorCliente.reduce((fecha, g) => {
      const fechaActual = normalizarFecha(g.fechaPrecio);
      return !fecha || (fechaActual && fechaActual > fecha) ? fechaActual : fecha;
    }, null)
  };
  if (clientesConEspecifico.length === 1 && soloUnCliente) {
    infoMostrar.esEspecifico = true;
    infoMostrar.esPromedio = false;
    infoMostrar.clienteEspecifico = clientesConEspecifico[0].cliente;
  }

  return {
    precioVenta: precioPromedioPonderado,
    costoFinal: Math.round(costoFinal),
    costoBase: Math.round(costoBase || 0),
    gananciaUnitaria: Math.round(precioPromedioPonderado - costoFinal),
    gananciaTotal: gananciaTotalSumada,
    totalEmbarcado: Math.round(totalEmbarcadoGeneral),
    fechaPrecio: infoMostrar.fechaMasReciente
      ? toLocalYMD(infoMostrar.fechaMasReciente) : null,
    esPromedio: infoMostrar.esPromedio,
    esEspecifico: infoMostrar.esEspecifico,
    clienteEspecifico: infoMostrar.clienteEspecifico,
    clientesConEspecifico: infoMostrar.clientesConEspecifico,
    detallesPorCliente: gananciasPorCliente
  };
}

function calcularGanancias(ctx) {
  const ganancias = {};
  const fechaEmbarque = ctx.fechaEmbarque;
  ctx.medidasUnicas.forEach((medida) => {
    if (!ctx.analizarGanancia[medida]) return;
    const costoFinal = calcularCostoFinal(medida, ctx);
    const costoBase = Number((ctx.costosPorMedida || {})[medida]) || 0;
    const clientesConMedida = obtenerClientesConMedida(medida, ctx.clientes);
    const resultadoCalculo = calcularPrecioYGanancias(
      medida, fechaEmbarque, clientesConMedida, costoFinal, costoBase, ctx.preciosVenta);
    if (!resultadoCalculo) return;
    ganancias[medida] = resultadoCalculo;
  });
  return ganancias;
}

// --- Crudos (Rendimientos.vue: calcularGananciasCrudos) ---

function obtenerTallasCrudosUnicas(clientes) {
  const tallasSet = new Set();
  (clientes || []).forEach((cliente) => {
    (cliente.crudos || []).forEach((crudo) => {
      (crudo && crudo.items ? crudo.items : []).forEach((item) => {
        if (item.talla) {
          const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
          if (esVenta) tallasSet.add(item.talla);
        }
      });
    });
  });
  return Array.from(tallasSet).sort();
}

// Kilos de costo por talla: mismo parseo que calcularKilosCrudosItem pero
// con el peso de costo (19) cuando el peso es 19.
function calcularTarasCrudosPorMedida(clientes, pesoTaraCosto) {
  const tarasPorMedida = {};
  (clientes || []).forEach((cliente) => {
    (cliente.crudos || []).forEach((crudo) => {
      (crudo && crudo.items ? crudo.items : []).forEach((item) => {
        if (!item.talla) return;
        const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
        if (!esVenta) return;
        const medida = item.talla;
        if (!tarasPorMedida[medida]) {
          tarasPorMedida[medida] = { totalTaras: 0, totalKilos: 0, detalles: [] };
        }
        let tarasItem = 0;
        let kilosItem = 0;
        [item.taras, item.sobrante, item.sobrante2].forEach((texto) => {
          if (!texto) return;
          const formatoGuion = /^(\d+)-(\d+)$/.exec(String(texto));
          if (formatoGuion) {
            const cantidad = parseInt(formatoGuion[1], 10) || 0;
            let peso = parseInt(formatoGuion[2], 10) || 0;
            if (peso === 19) peso = pesoTaraCosto;
            tarasItem += cantidad;
            kilosItem += cantidad * peso;
          } else {
            const [cantidad, peso] = String(texto).split('-').map(Number);
            tarasItem += cantidad || 0;
            kilosItem += (cantidad || 0) * (peso || 0);
          }
        });
        tarasPorMedida[medida].totalTaras += tarasItem;
        tarasPorMedida[medida].totalKilos += kilosItem;
      });
    });
  });
  return tarasPorMedida;
}

function calcularCostoCrudoPorTalla(talla, costosPorMedida, costosGlobales) {
  const costosEmbarque = costosPorMedida || {};
  let costo = Number(costosEmbarque[talla]) || 0;
  if (costo === 0) {
    const tallaLower = String(talla).toLowerCase();
    for (const [medida, costoValue] of Object.entries(costosEmbarque)) {
      if (String(medida).toLowerCase() === tallaLower) {
        costo = Number(costoValue) || 0;
        break;
      }
    }
  }
  if (costo === 0 && costosGlobales) {
    if (costosGlobales[talla]) {
      costo = Number(costosGlobales[talla].costoBase) || 0;
    } else {
      const tallaLower = String(talla).toLowerCase();
      for (const [medida, info] of Object.entries(costosGlobales)) {
        if (String(medida).toLowerCase() === tallaLower) {
          costo = Number(info.costoBase) || 0;
          break;
        }
      }
    }
  }
  return costo;
}

function calcularGananciasPorTallaCrudo(talla, fechaEmbarque, ctx) {
  let totalKilosVenta = 0;
  let totalVentas = 0;
  const detallesPorCliente = [];
  let hayPreciosIndividuales = false;

  const costoBase = calcularCostoCrudoPorTalla(talla, ctx.costosPorMedida, ctx.costosGlobales);
  const costoFinal = costoBase + 3.5;
  const tarasData = calcularTarasCrudosPorMedida(ctx.clientes, ctx.pesoTaraCosto);
  const totalKilosCosto = tarasData[talla]?.totalKilos || 0;
  const totalTaras = tarasData[talla]?.totalTaras || 0;

  (ctx.clientes || []).forEach((cliente) => {
    (cliente.crudos || []).forEach((crudo) => {
      (crudo && crudo.items ? crudo.items : []).forEach((item) => {
        if (item.talla !== talla) return;
        const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
        if (!esVenta) return;
        const kilosVentaItem = calcularKilosCrudosItem(item, ctx.pesoTaraVenta);
        totalKilosVenta += kilosVentaItem;
        let precioAUsar = null;
        let fuentePrecio = '';
        if (item.precio && item.precio > 0) {
          precioAUsar = item.precio;
          fuentePrecio = 'individual';
          hayPreciosIndividuales = true;
        } else {
          const clienteIdParaPrecios = obtenerClienteIdParaPrecios(cliente.nombre);
          const precioSistema = obtenerPrecioVentaParaFecha(talla, fechaEmbarque, clienteIdParaPrecios, ctx.preciosVenta);
          if (precioSistema) {
            precioAUsar = precioSistema.precio;
            fuentePrecio = precioSistema.clienteId ? 'sistema-especifico' : 'sistema-general';
          }
        }
        if (precioAUsar && kilosVentaItem > 0) {
          totalVentas += precioAUsar * kilosVentaItem;
          detallesPorCliente.push({
            cliente: cliente.nombre,
            kilos: kilosVentaItem,
            precioVenta: precioAUsar,
            gananciaUnitaria: 0,
            gananciaTotal: 0,
            fuentePrecio,
            taras: item.taras,
            sobrante: item.sobrante,
            sobrante2: item.sobrante2
          });
        }
      });
    });
  });

  if (totalKilosVenta === 0) return null;

  const totalCosto = costoFinal * totalKilosCosto;
  const totalGanancias = totalVentas - totalCosto;
  const precioPromedioPonderado = totalKilosVenta > 0 ? totalVentas / totalKilosVenta : 0;
  const gananciaUnitariaPromedio = totalKilosVenta > 0 ? totalGanancias / totalKilosVenta : 0;

  detallesPorCliente.forEach((detalle) => {
    detalle.gananciaUnitaria = gananciaUnitariaPromedio;
    detalle.gananciaTotal = detalle.gananciaUnitaria * detalle.kilos;
  });

  return {
    talla,
    totalKilos: Math.round(totalKilosVenta),
    totalKilosCosto: Math.round(totalKilosCosto),
    totalTaras,
    precioVenta: Math.round(precioPromedioPonderado),
    costoBase: costoFinal,
    costoTotal: Math.round(totalCosto),
    gananciaUnitaria: Math.round(gananciaUnitariaPromedio),
    gananciaTotal: Math.round(totalGanancias),
    hayPreciosIndividuales,
    detallesPorCliente,
    fechaCalculo: fechaHoyMexico()
  };
}

function calcularGananciasCrudos(ctx) {
  const ganancias = {};
  const tallasCrudos = obtenerTallasCrudosUnicas(ctx.clientes);
  tallasCrudos.forEach((talla) => {
    if (!ctx.analizarGananciaCrudos[talla]) return;
    const resultadoCalculo = calcularGananciasPorTallaCrudo(talla, ctx.fechaEmbarque, ctx);
    if (resultadoCalculo) ganancias[talla] = resultadoCalculo;
  });
  return ganancias;
}

function calcularGananciaMaquila(medida, clientes, precioMaquila) {
  const totalEmbarcado = obtenerTotalEmbarcado(medida, clientes);
  const precio = Number((precioMaquila || {})[medida]) || 0;
  return totalEmbarcado * precio;
}

function calcularTotalGeneralGanancias(ctx, ganancias, gananciasCrudos) {
  const totalNormales = Object.entries(ganancias || {})
    .filter(([medida]) => !ctx.medidaOculta[medida] && ctx.analizarGanancia[medida])
    .reduce((total, [, ganancia]) => total + (Number(ganancia?.gananciaTotal) || 0), 0);
  const totalMaquila = Object.keys(ctx.analizarMaquilaGanancia || {})
    .filter((medida) => ctx.analizarMaquilaGanancia[medida] && !ctx.medidaOculta[medida])
    .reduce((total, medida) => total + (Number(calcularGananciaMaquila(medida, ctx.clientes, ctx.precioMaquila)) || 0), 0);
  const totalCrudos = Object.entries(gananciasCrudos || {})
    .filter(([talla]) => ctx.analizarGananciaCrudos[talla])
    .reduce((total, [, ganancia]) => total + (Number(ganancia?.gananciaTotal) || 0), 0);
  return Math.round(totalNormales + totalMaquila + totalCrudos);
}

// Fusión de camiones del mismo día (Rendimientos.vue:
// combinarEmbarquesPorFecha). Mezcla los clientes (productos y crudos del
// mismo cliente se concatenan) y los mapas de configuración (solo rellena
// las claves que faltan). Los kilosCrudos son los del embarque principal:
// la vista expone combinarKilosCrudos / fusionarKilosCrudosSiVacio como
// métodos pero no los llama al cargar (verificado en código 2026-11-08);
// la SPEC decía que se sumaban, pero el comportamiento real de la vista
// es conservar los del principal.
function combinarEmbarquesPorFecha(embarques, embarqueIdPrincipal) {
  if (!Array.isArray(embarques) || embarques.length === 0) return null;
  const principal = embarques.find((item) => item.id === embarqueIdPrincipal) || embarques[0];
  const combinado = deepClone(principal.data || {});
  combinado.clientes = Array.isArray(combinado.clientes) ? combinado.clientes : [];
  combinado.kilosCrudos = deepClone(combinado.kilosCrudos || {});

  const mergeConfig = (campo, valor) => {
    if (valor === undefined || valor === null) return;
    if (typeof valor === 'object' && !Array.isArray(valor)) {
      combinado[campo] = combinado[campo] || {};
      Object.entries(valor).forEach(([clave, contenido]) => {
        if (combinado[campo][clave] === undefined) combinado[campo][clave] = contenido;
      });
      return;
    }
    if (combinado[campo] === undefined) combinado[campo] = valor;
  };

  embarques.forEach((item) => {
    if (!item || !item.data || item.id === principal.id) return;
    const data = item.data;
    (Array.isArray(data.clientes) ? data.clientes : []).forEach((cliente) => {
      const clienteId = cliente.id?.toString();
      const existente = combinado.clientes.find((c) => c.id?.toString() === clienteId);
      if (existente) {
        const productos = Array.isArray(cliente.productos) ? cliente.productos : [];
        const crudos = Array.isArray(cliente.crudos) ? cliente.crudos : [];
        existente.productos = [...(existente.productos || []), ...productos];
        existente.crudos = [...(existente.crudos || []), ...crudos];
      } else {
        combinado.clientes.push(deepClone(cliente));
      }
    });
    mergeConfig('nombresMedidasPersonalizados', data.nombresMedidasPersonalizados);
    mergeConfig('medidaOculta', data.medidaOculta);
    mergeConfig('analizarGanancia', data.analizarGanancia);
    mergeConfig('analizarGananciaCrudos', data.analizarGananciaCrudos);
    mergeConfig('analizarMaquilaGanancia', data.analizarMaquilaGanancia);
    mergeConfig('precioMaquila', data.precioMaquila);
    mergeConfig('aplicarCostoExtra', data.aplicarCostoExtra);
  });

  return combinado;
}

// Costos globales: el más reciente por medida en historial_costos
// (mismo criterio que precargarCostos en la vista).
function parsearFechaCosto(valor) {
  if (!valor) return null;
  if (typeof valor === 'object' && valor.seconds) return new Date(valor.seconds * 1000);
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [y, m, d] = valor.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function construirCostosGlobales(docs, fechaLimiteISO) {
  const costos = {};
  docs.forEach((doc) => {
    if (doc.eliminado || doc.medidaEliminada) return;
    const medida = doc.medida;
    if (!medida) return;
    const fecha = parsearFechaCosto(doc.fecha);
    if (!fecha) return;
    if (fechaLimiteISO && toLocalYMD(fecha) > fechaLimiteISO) return;
    const timestampMs = doc.timestamp?.seconds ? doc.timestamp.seconds * 1000
      : (doc.timestamp ? new Date(doc.timestamp).getTime() : 0);
    const existente = costos[medida];
    if (!existente
      || fecha > existente._fecha
      || (fecha.getTime() === existente._fecha.getTime() && timestampMs > existente._timestampMs)) {
      costos[medida] = {
        costoBase: Number(doc.costoBase) || 0,
        fecha: toLocalYMD(fecha),
        id: doc.id,
        _fecha: fecha,
        _timestampMs: timestampMs
      };
    }
  });
  Object.values(costos).forEach((info) => {
    delete info._fecha;
    delete info._timestampMs;
  });
  return costos;
}

// --- Carga de datos ---

async function cargarResumenSacadas(db, fechaISO) {
  if (!fechaISO) return { fecha: fechaISO, encontrado: false };
  try {
    const indiceSnap = await db.collection('sacadasDias').doc(fechaISO).get();
    if (!indiceSnap.exists) return { fecha: fechaISO, encontrado: false };
    const sacadaId = indiceSnap.data().sacadaId;
    const sacadaSnap = await db.collection('sacadas').doc(sacadaId).get();
    if (!sacadaSnap.exists) return { fecha: fechaISO, encontrado: false };
    const data = sacadaSnap.data() || {};
    return {
      fecha: fechaISO,
      encontrado: true,
      sacadaId,
      totalEntradas: Number(data.totalEntradas) || 0,
      totalSalidas: Number(data.totalSalidas) || 0,
      nEntradas: Array.isArray(data.entradas) ? data.entradas.length : 0,
      nSalidas: Array.isArray(data.salidas) ? data.salidas.length : 0
    };
  } catch (error) {
    return { fecha: fechaISO, encontrado: false, error: error.message };
  }
}

async function cargarDatosRendimientos(db, embarqueId) {
  const embarqueRef = db.collection('embarques').doc(embarqueId);
  const embarqueSnap = await embarqueRef.get();
  if (!embarqueSnap.exists) return null;
  const embarqueBase = embarqueSnap.data() || {};
  const fechaISO = toLocalYMD(normalizarFecha(embarqueBase.fecha));

  const relacionados = [{ id: embarqueId, data: embarqueBase }];
  if (fechaISO) {
    const inicioMs = Date.parse(`${fechaISO}T00:00:00.000Z`);
    const inicio = admin.firestore.Timestamp.fromMillis(inicioMs);
    const fin = admin.firestore.Timestamp.fromMillis(inicioMs + 24 * 60 * 60 * 1000);
    const [texto, legado] = await Promise.all([
      db.collection('embarques').where('fecha', '==', fechaISO).get(),
      db.collection('embarques').where('fecha', '>=', inicio).where('fecha', '<', fin).get()
    ]);
    texto.docs.forEach((docSnap) => {
      if (docSnap.id !== embarqueId) relacionados.push({ id: docSnap.id, data: docSnap.data() || {} });
    });
    legado.docs.forEach((docSnap) => {
      if (docSnap.id === embarqueId || relacionados.some((r) => r.id === docSnap.id)) return;
      const data = docSnap.data() || {};
      const fechaDoc = data.fecha && typeof data.fecha.toDate === 'function'
        ? toLocalYMD(data.fecha) : null;
      if (fechaDoc === fechaISO) relacionados.push({ id: docSnap.id, data });
    });
  }

  const combinado = combinarEmbarquesPorFecha(relacionados, embarqueId) || embarqueBase;

  const preciosSnap = await db.collection('precios').orderBy('fecha', 'desc').get();
  const preciosVenta = {};
  preciosSnap.docs.forEach((docSnap) => {
    const precio = { id: docSnap.id, ...docSnap.data() };
    const clave = normalizarNombreProductoPrecio(precio.producto).toLowerCase().trim();
    if (!preciosVenta[clave]) preciosVenta[clave] = [];
    preciosVenta[clave].push(precio);
  });
  Object.values(preciosVenta).forEach((lista) =>
    lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));

  const costosSnap = await db.collection('historial_costos').get();
  const costosGlobales = construirCostosGlobales(
    costosSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));

  const sacadas = await cargarResumenSacadas(db, fechaISO);

  return {
    embarqueId,
    embarqueBase,
    combinado,
    fechaISO,
    relacionados: relacionados.map((r) => r.id),
    preciosVenta,
    costosGlobales,
    sacadas
  };
}

function crearManejadorRendimientos({ db }) {
  async function obtenerRendimientos(req, res) {
    const embarqueId = String(req.query.embarqueId || '').trim();
    if (!embarqueId) {
      return res.status(400).json({
        success: false,
        error: 'EMBARQUE_ID_REQUERIDO',
        message: 'El parámetro embarqueId es requerido.'
      });
    }

    let datos;
    try {
      datos = await cargarDatosRendimientos(db, embarqueId);
    } catch (error) {
      console.error('[Rendimientos] Error al cargar el embarque:', error);
      return res.status(500).json({ success: false, error: 'ERROR_INTERNO', message: 'No se pudo calcular los rendimientos.' });
    }
    if (!datos) {
      return res.status(404).json({
        success: false,
        error: 'EMBARQUE_NO_ENCONTRADO',
        message: `No existe el embarque ${embarqueId}.`
      });
    }

    const doc = datos.combinado;
    const { medidas: medidasUnicas, kilosCrudos } = obtenerMedidasUnicas(doc.clientes, doc.kilosCrudos);
    medidasUnicas.forEach((medida) => {
      if (kilosCrudos[medida] === undefined) {
        kilosCrudos[medida] = esMedidaMix(medida)
          ? { medida1: 0, medida2: 0, etiqueta1: 'Kilos en crudo (Medida 1)', etiqueta2: 'Kilos en crudo (Medida 2)' }
          : 0;
      }
    });

    const ctx = {
      clientes: doc.clientes || [],
      kilosCrudos,
      medidasUnicas,
      fechaEmbarque: datos.fechaISO,
      analizarGanancia: doc.analizarGanancia || {},
      analizarGananciaCrudos: doc.analizarGananciaCrudos || {},
      analizarMaquilaGanancia: doc.analizarMaquilaGanancia || {},
      rendimientoManual: doc.rendimientoManual || {},
      aplicarCostoExtra: doc.aplicarCostoExtra || {},
      precioMaquila: doc.precioMaquila || {},
      costosPorMedida: doc.costosPorMedida || {},
      costosGlobales: datos.costosGlobales,
      pesoTaraCosto: Number(doc.pesoTaraCosto) || PESO_TARA_COSTO_DEFECTO,
      pesoTaraVenta: Number(doc.pesoTaraVenta) || PESO_TARA_VENTA_DEFECTO,
      costoExtra: doc.costoExtra,
      medidaOculta: doc.medidaOculta || {},
      preciosVenta: datos.preciosVenta
    };

    const medidas = {};
    medidasUnicas.forEach((medida) => {
      const totalEmbarcado = obtenerTotalEmbarcado(medida, ctx.clientes);
      const rendimientoCrudo = calcularRendimiento(medida, ctx);
      const rendimiento = Math.round(rendimientoCrudo * 100) / 100;
      const costoBuscado = encontrarCostoParaMedida(medida, ctx.costosPorMedida, ctx.costosGlobales);
      const costoFinal = calcularCostoFinal(medida, ctx);
      const kilosValor = kilosCrudos[medida];
      const entrada = {
        totalEmbarcado: Math.round(totalEmbarcado * 100) / 100,
        kilosCrudos: deepClone(kilosValor),
        kilosCrudosTotal: esMedidaMix(medida)
          ? Math.round((Number(kilosValor?.medida1 || 0) + Number(kilosValor?.medida2 || 0)) * 100) / 100
          : Number(kilosValor) || 0,
        rendimiento,
        rendimientoManual: esMedidaRefri(medida)
          ? (Number(ctx.rendimientoManual[medida]) || 0) : null,
        costoBase: costoBuscado ? costoBuscado.costo : 0,
        costoOrigen: costoBuscado ? costoBuscado.origen : 'ausente',
        costoFinal,
        aplicaCostoExtra: debeAplicarCostoExtra(medida, ctx.aplicarCostoExtra),
        analizarGanancia: Boolean(ctx.analizarGanancia[medida]),
        visible: !ctx.medidaOculta[medida],
        precioVenta: null,
        gananciaUnitaria: null,
        gananciaTotal: null,
        fechaPrecio: null,
        esPromedio: false,
        esEspecifico: false,
        detallesPorCliente: []
      };
      medidas[medida] = entrada;
    });

    const ganancias = calcularGanancias(ctx);
    Object.entries(ganancias).forEach(([medida, resultado]) => {
      if (!medidas[medida]) return;
      medidas[medida].precioVenta = resultado.precioVenta;
      medidas[medida].gananciaUnitaria = resultado.gananciaUnitaria;
      medidas[medida].gananciaTotal = resultado.gananciaTotal;
      medidas[medida].fechaPrecio = resultado.fechaPrecio;
      medidas[medida].esPromedio = resultado.esPromedio;
      medidas[medida].esEspecifico = resultado.esEspecifico;
      medidas[medida].clienteEspecifico = resultado.clienteEspecifico;
      medidas[medida].clientesConEspecifico = resultado.clientesConEspecifico;
      medidas[medida].detallesPorCliente = resultado.detallesPorCliente;
      medidas[medida].totalEmbarcado = resultado.totalEmbarcado;
    });

    const crudos = {};
    const tallasCrudos = obtenerTallasCrudosUnicas(ctx.clientes);
    const tarasData = calcularTarasCrudosPorMedida(ctx.clientes, ctx.pesoTaraCosto);
    const gananciasCrudos = calcularGananciasCrudos(ctx);
    tallasCrudos.forEach((talla) => {
      const calculado = gananciasCrudos[talla];
      // Kilos de venta siempre (aunque no esté activado el análisis de la
      // talla); las ganancias solo existen cuando está activado.
      let totalKilosVenta = 0;
      (ctx.clientes || []).forEach((cliente) => {
        (cliente.crudos || []).forEach((crudo) => {
          (crudo && crudo.items ? crudo.items : []).forEach((item) => {
            if (item.talla !== talla) return;
            const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
            if (esVenta) totalKilosVenta += calcularKilosCrudosItem(item, ctx.pesoTaraVenta);
          });
        });
      });
      crudos[talla] = {
        totalKilos: Math.round(totalKilosVenta),
        totalKilosCosto: Math.round(tarasData[talla]?.totalKilos || 0),
        totalTaras: tarasData[talla]?.totalTaras || 0,
        precioVenta: calculado ? calculado.precioVenta : null,
        costoBase: calculado ? calculado.costoBase : null,
        costoTotal: calculado ? calculado.costoTotal : null,
        gananciaUnitaria: calculado ? calculado.gananciaUnitaria : null,
        gananciaTotal: calculado ? calculado.gananciaTotal : null,
        hayPreciosIndividuales: calculado ? calculado.hayPreciosIndividuales : false,
        analizarGananciaCrudos: Boolean(ctx.analizarGananciaCrudos[talla]),
        visible: !ctx.medidaOculta[talla],
        detallesPorCliente: calculado ? calculado.detallesPorCliente : []
      };
    });

    const maquila = {};
    Object.keys(ctx.analizarMaquilaGanancia || {})
      .filter((medida) => ctx.analizarMaquilaGanancia[medida] && !ctx.medidaOculta[medida])
      .forEach((medida) => {
        maquila[medida] = {
          totalEmbarcado: Math.round(obtenerTotalEmbarcado(medida, ctx.clientes) * 100) / 100,
          precioMaquila: Number(ctx.precioMaquila[medida]) || 0,
          gananciaTotal: Math.round(calcularGananciaMaquila(medida, ctx.clientes, ctx.precioMaquila) * 100) / 100
        };
      });

    const totalGanancias = calcularTotalGeneralGanancias(ctx, ganancias, gananciasCrudos);
    const totalGananciasGuardado = Number(doc.totalGanancias);
    return res.json({
      success: true,
      embarqueId,
      fecha: datos.fechaISO,
      camionNumero: Number(doc.camionNumero) || null,
      cargaCon: doc.cargaCon || null,
      embarquesMismoDia: datos.relacionados,
      medidas,
      crudos,
      maquila,
      totalGanancias,
      totalGananciasGuardado: Number.isFinite(totalGananciasGuardado) ? totalGananciasGuardado : null,
      sacadas: datos.sacadas
    });
  }

  async function obtenerCostos(req, res) {
    const medida = String(req.query.medida || '').trim();
    if (req.query.fecha !== undefined && req.query.fecha !== '' && !fechaValida(req.query.fecha)) {
      return res.status(400).json({
        success: false,
        error: 'FECHA_INVALIDA',
        message: 'La fecha debe ser real en formato YYYY-MM-DD.'
      });
    }
    const fechaPedida = req.query.fecha ? String(req.query.fecha) : fechaHoyMexico();
    try {
      const costosSnap = await db.collection('historial_costos').get();
      const costosGlobales = construirCostosGlobales(
        costosSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        fechaPedida);
      if (medida) {
        let encontrado = costosGlobales[medida] || null;
        let medidaEncontrada = medida;
        if (!encontrado) {
          const medidaLower = medida.toLowerCase().trim();
          for (const [clave, info] of Object.entries(costosGlobales)) {
            if (clave.toLowerCase().trim() === medidaLower) {
              encontrado = info;
              medidaEncontrada = clave;
              break;
            }
          }
        }
        if (!encontrado) {
          return res.status(404).json({
            success: false,
            error: 'COSTO_NO_ENCONTRADO',
            message: `No hay costo registrado para "${medida}" con fecha <= ${fechaPedida}.`
          });
        }
        return res.json({
          success: true,
          fecha: fechaPedida,
          medida: medidaEncontrada,
          costoBase: encontrado.costoBase,
          fechaCosto: encontrado.fecha,
          id: encontrado.id
        });
      }
      const costos = Object.entries(costosGlobales)
        .map(([nombre, info]) => ({ medida: nombre, costoBase: info.costoBase, fecha: info.fecha, id: info.id }))
        .sort((a, b) => a.medida.localeCompare(b.medida));
      return res.json({ success: true, fecha: fechaPedida, total: costos.length, costos });
    } catch (error) {
      console.error('[Rendimientos] Error al leer costos:', error);
      return res.status(500).json({ success: false, error: 'ERROR_INTERNO', message: 'No se pudieron leer los costos.' });
    }
  }

  function validarCamposGuardar(body) {
    const campos = {};
    CAMPOS_RENDIMIENTOS.forEach((campo) => {
      if (body[campo] !== undefined) campos[campo] = body[campo];
    });
    if (Object.keys(campos).length === 0) {
      return { error: 'CAMPOS_REQUERIDOS', message: 'Indica al menos uno de los 13 campos de rendimientos.' };
    }
    const mapas = ['medidaOculta', 'analizarGanancia', 'analizarGananciaCrudos',
      'analizarMaquilaGanancia', 'precioMaquila', 'nombresMedidasPersonalizados', 'costosPorMedida'];
    for (const campo of mapas) {
      if (campos[campo] !== undefined
        && (typeof campos[campo] !== 'object' || campos[campo] === null || Array.isArray(campos[campo]))) {
        return { error: 'CAMPO_INVALIDO', message: `El campo ${campo} debe ser un objeto.` };
      }
    }
    if (campos.kilosCrudos !== undefined) {
      if (typeof campos.kilosCrudos !== 'object' || campos.kilosCrudos === null || Array.isArray(campos.kilosCrudos)) {
        return { error: 'KILOS_CRUDOS_INVALIDOS', message: 'kilosCrudos debe ser un objeto por medida.' };
      }
      for (const [medida, valor] of Object.entries(campos.kilosCrudos)) {
        if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
          if (![valor.medida1, valor.medida2].every((v) => Number.isFinite(Number(v)) && Number(v) >= 0)) {
            return { error: 'KILOS_CRUDOS_INVALIDOS', message: `kilosCrudos[${medida}] debe tener medida1 y medida2 >= 0.` };
          }
        } else if (!Number.isFinite(Number(valor)) || Number(valor) < 0) {
          return { error: 'KILOS_CRUDOS_INVALIDOS', message: `kilosCrudos[${medida}] debe ser un número >= 0.` };
        }
      }
    }
    if (campos.rendimientoManual !== undefined) {
      if (typeof campos.rendimientoManual !== 'object' || campos.rendimientoManual === null || Array.isArray(campos.rendimientoManual)) {
        return { error: 'RENDIMIENTO_MANUAL_INVALIDO', message: 'rendimientoManual debe ser un objeto por medida.' };
      }
      for (const [medida, valor] of Object.entries(campos.rendimientoManual)) {
        if (!Number.isFinite(Number(valor)) || Number(valor) < 0) {
          return { error: 'RENDIMIENTO_MANUAL_INVALIDO', message: `rendimientoManual[${medida}] debe ser un número >= 0.` };
        }
      }
    }
    for (const campo of ['pesoTaraCosto', 'pesoTaraVenta']) {
      if (campos[campo] !== undefined && (!Number.isFinite(Number(campos[campo])) || Number(campos[campo]) <= 0)) {
        return { error: 'PESO_TARA_INVALIDO', message: `${campo} debe ser un número mayor a 0.` };
      }
    }
    if (campos.notaRendimientos !== undefined && typeof campos.notaRendimientos !== 'string') {
      return { error: 'CAMPO_INVALIDO', message: 'notaRendimientos debe ser texto.' };
    }
    if (campos.totalGanancias !== undefined && !Number.isFinite(Number(campos.totalGanancias))) {
      return { error: 'CAMPO_INVALIDO', message: 'totalGanancias debe ser un número.' };
    }
    return { campos };
  }

  async function guardarRendimientos(req, res) {
    const body = req.body || {};
    const embarqueId = String(body.embarqueId || '').trim();
    if (!embarqueId) {
      return res.status(400).json({ success: false, error: 'EMBARQUE_ID_REQUERIDO', message: 'embarqueId es requerido.' });
    }
    const { idempotencyKey, dryRun = false } = body;
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.includes('/')) {
      return res.status(400).json({ success: false, error: 'IDEMPOTENCY_KEY_REQUERIDA', message: 'idempotencyKey es requerido y no puede contener "/".' });
    }
    const validado = validarCamposGuardar(body);
    if (validado.error) {
      return res.status(400).json({ success: false, error: validado.error, message: validado.message });
    }
    const campos = validado.campos;

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const idemSnap = await idemRef.get();
      if (idemSnap.exists && idemSnap.data().operation === 'rendimientos_guardar') {
        return res.json(idemSnap.data().response);
      }

      const embarqueRef = db.collection('embarques').doc(embarqueId);
      const embarqueSnap = await embarqueRef.get();
      if (!embarqueSnap.exists) {
        return res.status(404).json({ success: false, error: 'EMBARQUE_NO_ENCONTRADO', message: `No existe el embarque ${embarqueId}.` });
      }
      const dataActual = embarqueSnap.data() || {};
      const antes = {};
      const camposAusentes = [];
      Object.keys(campos).forEach((campo) => {
        if (Object.prototype.hasOwnProperty.call(dataActual, campo)) antes[campo] = deepClone(dataActual[campo]);
        else camposAusentes.push(campo);
      });
      const resultado = {};
      CAMPOS_RENDIMIENTOS.forEach((campo) => {
        if (campos[campo] !== undefined) resultado[campo] = deepClone(campos[campo]);
        else if (Object.prototype.hasOwnProperty.call(dataActual, campo)) resultado[campo] = deepClone(dataActual[campo]);
      });

      const response = {
        success: true,
        operation: 'rendimientos_guardar',
        embarqueId,
        campos: Object.keys(campos),
        antes,
        camposAusentes,
        despues: deepClone(campos),
        resultado
      };

      if (dryRun) {
        return res.json({ ...response, dryRun: true, message: 'Simulación exitosa (sin escribir a Firestore)' });
      }

      await db.runTransaction(async (transaction) => {
        const idemActual = await transaction.get(idemRef);
        if (idemActual.exists && idemActual.data().operation === 'rendimientos_guardar') {
          throw { code: 'IDEMPOTENTE', response: idemActual.data().response };
        }
        const frescoSnap = await transaction.get(embarqueRef);
        if (!frescoSnap.exists) {
          throw { code: 'EMBARQUE_NO_ENCONTRADO', message: `No existe el embarque ${embarqueId}.`, status: 404 };
        }
        const dataFresca = frescoSnap.data() || {};
        const antesFresco = {};
        const ausentesFrescos = [];
        Object.keys(campos).forEach((campo) => {
          if (Object.prototype.hasOwnProperty.call(dataFresca, campo)) antesFresco[campo] = deepClone(dataFresca[campo]);
          else ausentesFrescos.push(campo);
        });
        transaction.update(embarqueRef, campos);
        const logRef = db.collection('asistenteLog').doc();
        transaction.set(logRef, {
          operation: 'rendimientos_guardar',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          embarqueId,
          campos: Object.keys(campos),
          antes: antesFresco,
          camposAusentes: ausentesFrescos,
          despues: deepClone(campos),
          request: { embarqueId, campos: Object.keys(campos) }
        });
        const respuestaFinal = { ...response, antes: antesFresco, camposAusentes: ausentesFrescos };
        transaction.set(idemRef, {
          operation: 'rendimientos_guardar',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          response: respuestaFinal,
          logId: logRef.id
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) {
        return res.status(error.status || 500).json({ success: false, error: error.code, message: error.message });
      }
      console.error('Error en POST /rendimientos/guardar:', error);
      return res.status(500).json({ success: false, error: 'ERROR_INTERNO', message: 'Error al guardar los rendimientos: ' + error.message });
    }
  }

  async function deshacerRendimientos(req, res) {
    const { idempotencyKey, undoIdempotencyKey, dryRun = false } = req.body || {};
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return res.status(400).json({ success: false, error: 'IDEMPOTENCY_KEY_REQUERIDA', message: 'Indica el idempotencyKey del guardar a deshacer.' });
    }
    const undoKey = undoIdempotencyKey || `undo:${idempotencyKey}`;
    if (undoKey.includes('/')) {
      return res.status(400).json({ success: false, error: 'UNDO_IDEMPOTENCY_KEY_INVALIDA', message: 'undoIdempotencyKey no puede contener "/".' });
    }

    try {
      const undoRef = db.collection('asistenteIdem').doc(undoKey);
      const undoSnap = await undoRef.get();
      if (undoSnap.exists && undoSnap.data().operation === 'rendimientos_deshacer') {
        return res.json(undoSnap.data().response);
      }

      const logs = await db.collection('asistenteLog').where('idempotencyKey', '==', idempotencyKey).get();
      const original = logs.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .find((log) => log.operation === 'rendimientos_guardar');
      if (!original) {
        return res.status(404).json({ success: false, error: 'OPERACION_NO_ENCONTRADA', message: 'No se encontró un guardar de rendimientos con ese idempotencyKey.' });
      }
      const ya = logs.docs.some((docSnap) => docSnap.data().operation === 'rendimientos_deshacer'
        && docSnap.data().originalIdempotencyKey === idempotencyKey);
      if (ya) {
        return res.status(400).json({ success: false, error: 'YA_DESHECHO', message: 'Este guardar de rendimientos ya fue deshecho.' });
      }

      if (dryRun) {
        return res.json({
          dryRun: true,
          operation: 'rendimientos_deshacer',
          embarqueId: original.embarqueId,
          campos: original.campos || [],
          antes: original.antes || {},
          camposAusentes: original.camposAusentes || []
        });
      }

      const response = {
        success: true,
        operation: 'rendimientos_deshacer',
        embarqueId: original.embarqueId,
        originalIdempotencyKey: idempotencyKey,
        camposRestaurados: original.campos || []
      };

      await db.runTransaction(async (transaction) => {
        const undoActual = await transaction.get(undoRef);
        if (undoActual.exists && undoActual.data().operation === 'rendimientos_deshacer') {
          throw { code: 'IDEMPOTENTE', response: undoActual.data().response };
        }
        const embarqueRef = db.collection('embarques').doc(original.embarqueId);
        const embarqueSnap = await transaction.get(embarqueRef);
        if (!embarqueSnap.exists) {
          throw { code: 'EMBARQUE_NO_ENCONTRADO', message: `No existe el embarque ${original.embarqueId}.`, status: 404 };
        }
        const restaurar = {};
        (original.campos || []).forEach((campo) => {
          if ((original.camposAusentes || []).includes(campo)) {
            restaurar[campo] = admin.firestore.FieldValue.delete();
          } else if (original.antes && Object.prototype.hasOwnProperty.call(original.antes, campo)) {
            restaurar[campo] = original.antes[campo];
          }
        });
        if (Object.keys(restaurar).length > 0) transaction.update(embarqueRef, restaurar);
        const logRef = db.collection('asistenteLog').doc();
        transaction.set(logRef, {
          operation: 'rendimientos_deshacer',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          idempotencyKey: undoKey,
          originalIdempotencyKey: idempotencyKey,
          embarqueId: original.embarqueId,
          campos: original.campos || [],
          originalLogId: original.id
        });
        transaction.set(undoRef, {
          operation: 'rendimientos_deshacer',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          response,
          logId: logRef.id
        });
      });

      const guardada = await undoRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) {
        return res.status(error.status || 500).json({ success: false, error: error.code, message: error.message });
      }
      console.error('Error en POST /rendimientos/deshacer:', error);
      return res.status(500).json({ success: false, error: 'ERROR_INTERNO', message: 'Error al deshacer los rendimientos: ' + error.message });
    }
  }

  return { obtenerRendimientos, obtenerCostos, guardarRendimientos, deshacerRendimientos };
}

module.exports = crearManejadorRendimientos;
module.exports.CAMPOS_RENDIMIENTOS = CAMPOS_RENDIMIENTOS;
module.exports._internos = {
  deepClone,
  normalizarFecha,
  toLocalYMD,
  esMedidaMix,
  esMedidaRefri,
  calcularTotalKilos,
  calcularTotalTaras,
  calcularTotalBolsas,
  calcularKilosCrudosItem,
  obtenerClienteIdParaPrecios,
  obtenerGrupoPreciosPorNombre,
  encontrarPreciosParaMedida,
  obtenerPrecioVentaParaFecha,
  obtenerMedidasUnicas,
  calcularTotalParaMedida,
  obtenerTotalEmbarcado,
  obtenerClientesConMedida,
  calcularRendimiento,
  debeAplicarCostoExtra,
  encontrarCostoParaMedida,
  calcularCostoFinal,
  calcularPrecioYGanancias,
  calcularGanancias,
  obtenerTallasCrudosUnicas,
  calcularTarasCrudosPorMedida,
  calcularCostoCrudoPorTalla,
  calcularGananciasPorTallaCrudo,
  calcularGananciasCrudos,
  calcularGananciaMaquila,
  calcularTotalGeneralGanancias,
  combinarEmbarquesPorFecha,
  construirCostosGlobales
};
