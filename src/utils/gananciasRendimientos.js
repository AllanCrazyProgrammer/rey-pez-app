// Reglas únicas del análisis de ganancia de Rendimientos (lógica pura, sin this).
// Rendimientos.vue y Gestión de Costos las usan para que ambas pantallas
// calculen lo mismo. Pruebas: node --test tests/ganancias-rendimientos.test.cjs
//
// PRECIO DE VENTA (por línea del embarque, en este orden):
//   1. El precio escrito en el producto del embarque (`producto.precio`, la
//      etiqueta "Venta $X"). Es el mismo que va a la cuenta del cliente: el
//      embarque lo asigna con prioridad al precio específico del cliente y
//      respeta el capturado a mano con el botón "$".
//   2. Si la línea no tiene precio: catálogo de Precios a la fecha del
//      embarque. El precio específico del cliente SIEMPRE gana al general
//      (como en las cuentas y en el modal de Precios, donde "Mantener precio
//      específico" es la opción por defecto). Antes Rendimientos solo usaba el
//      específico si era más nuevo que el general.
//   Las líneas de maquila de Ozuna no usan `producto.precio` (ahí es la cuota
//   de maquila, no un precio de venta).
//
// COSTO BASE (por medida):
//   manual del embarque > catálogo (medida + proveedor) > guardado en el embarque.
//   El costo manual es una corrección explícita para ese embarque; antes se
//   mostraba con la etiqueta "Manual" pero el cálculo usaba el del catálogo.

export const COSTO_EXTRA_DEFAULT = 18;
export const SOBRECOSTO_CRUDO_KG = 3.5;

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const fechaYMD = (valor) => {
  if (!valor) return '';
  if (typeof valor === 'string') {
    const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  let d;
  if (typeof valor === 'object' && valor.seconds) d = new Date(valor.seconds * 1000);
  else if (valor instanceof Date) d = valor;
  else d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const marcaTiempo = (precio) => {
  const t = precio?.timestamp;
  if (!t) return 0;
  if (typeof t === 'number') return t;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  return numero(t);
};

// Más reciente primero (fecha y, en empate, hora de captura).
const masRecientePrimero = (a, b) => {
  const fa = fechaYMD(a.fecha);
  const fb = fechaYMD(b.fecha);
  if (fa !== fb) return fa < fb ? 1 : -1;
  return marcaTiempo(b) - marcaTiempo(a);
};

/**
 * Precio de catálogo para una medida (registros de la colección `precios`
 * de ese producto) a la fecha del embarque.
 * Específico del cliente vigente > general vigente. Si no hay ninguno con
 * fecha <= embarque, usa el más antiguo disponible (marcado `posterior`).
 * @returns {{precio:number, fecha:string, clienteId:(string|null), origen:'especifico'|'general', posterior:boolean}|null}
 */
export function resolverPrecioCatalogo(precios, fechaEmbarque, clienteId = null) {
  const lista = (Array.isArray(precios) ? precios : [])
    .filter(p => p && Number.isFinite(Number(p.precio)) && fechaYMD(p.fecha))
    .slice()
    .sort(masRecientePrimero);
  if (lista.length === 0) return null;

  const fechaLimite = fechaYMD(fechaEmbarque) || fechaYMD(new Date());
  const vigentes = lista.filter(p => fechaYMD(p.fecha) <= fechaLimite);
  const crear = (p, posterior = false) => ({
    precio: Number(p.precio),
    fecha: fechaYMD(p.fecha),
    clienteId: p.clienteId || null,
    origen: p.clienteId ? 'especifico' : 'general',
    posterior
  });

  if (clienteId) {
    const especifico = vigentes.find(p => p.clienteId === clienteId);
    if (especifico) return crear(especifico);
  }
  const general = vigentes.find(p => !p.clienteId);
  if (general) return crear(general);

  // Sin precio vigente a esa fecha: el más antiguo (del cliente o general).
  const antiguos = lista.slice().reverse();
  const antiguo = (clienteId && antiguos.find(p => p.clienteId === clienteId)) ||
    antiguos.find(p => !p.clienteId);
  return antiguo ? crear(antiguo, true) : null;
}

/**
 * Precio de venta escrito en la línea del embarque (o null si no tiene).
 * El origen indica cómo se asignó en el embarque.
 */
export function precioVentaDeProducto(producto, { esMaquila = false } = {}) {
  if (!producto || esMaquila) return null;
  const precio = Number(producto.precio);
  if (!(precio > 0)) return null;
  const origenes = { manual: 'manual', especifico: 'especifico', general: 'general' };
  return {
    precio,
    // Sin origen registrado (embarques viejos) cuenta como precio general.
    origen: origenes[producto.precioOrigen] || 'general',
    fecha: producto.precioFecha ? fechaYMD(producto.precioFecha) : '',
    clienteId: producto.precioClienteId || null,
    desdeEmbarque: true
  };
}

/**
 * ¿El "cliente" es refri? En el embarque se anota lo que se manda a
 * refrigerar como un cliente llamado "refri": se muestra en el desglose,
 * pero no se vendió, así que no cuenta en la ganancia del día.
 */
export function esClienteRefri(nombre) {
  return /^\s*refri/i.test(String(nombre || ''));
}

/**
 * Ganancia de una medida limpia a partir de sus líneas de venta.
 * @param {Array<{cliente:string, kilos:number, precio:(number|null), origen?:string, fecha?:string, desdeEmbarque?:boolean}>} lineas
 * @param {number} costoFinal costo por kg ya con rendimiento y costo extra
 * @returns resumen o null si ninguna línea tiene precio
 *   Las líneas del cliente "refri" salen en detallesPorCliente con
 *   noCuenta: true y no suman kilos, ventas ni ganancia.
 */
export function calcularGananciaLimpio(lineas, costoFinal) {
  const costo = numero(costoFinal);
  const grupos = new Map();
  let kilosConPrecio = 0;
  let kilosSinPrecio = 0;
  let kilosRefri = 0;
  let ventas = 0;
  const clientesSinPrecio = new Set();

  (lineas || []).forEach(linea => {
    const kilos = numero(linea.kilos);
    if (!(kilos > 0)) return;
    const noCuenta = esClienteRefri(linea.cliente);
    const precio = Number(linea.precio);
    const tienePrecio = precio > 0;
    if (!tienePrecio && !noCuenta) {
      kilosSinPrecio += kilos;
      clientesSinPrecio.add(linea.cliente);
      return;
    }
    const clave = `${linea.cliente}__${tienePrecio ? precio : 0}__${linea.origen || ''}`;
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        cliente: linea.cliente,
        precioVenta: tienePrecio ? precio : 0,
        origen: linea.origen || 'general',
        fechaPrecio: linea.fecha || '',
        desdeEmbarque: Boolean(linea.desdeEmbarque),
        noCuenta,
        totalEmbarcado: 0
      });
    }
    grupos.get(clave).totalEmbarcado += kilos;
    if (noCuenta) {
      kilosRefri += kilos;
      return;
    }
    kilosConPrecio += kilos;
    ventas += precio * kilos;
  });

  if (grupos.size === 0) return null;

  const detallesPorCliente = Array.from(grupos.values()).map(g => {
    const gananciaUnitaria = g.noCuenta ? 0 : g.precioVenta - costo;
    return {
      ...g,
      clienteId: null,
      esEspecifico: g.origen === 'especifico',
      totalEmbarcado: Math.round(g.totalEmbarcado * 10) / 10,
      gananciaUnitaria: Math.round(gananciaUnitaria * 100) / 100,
      gananciaTotal: g.noCuenta ? 0 : Math.round(gananciaUnitaria * g.totalEmbarcado)
    };
  });
  const vendidos = detallesPorCliente.filter(d => !d.noCuenta);

  const precioPromedio = kilosConPrecio > 0 ? ventas / kilosConPrecio : 0;
  const gananciaTotal = Math.round(ventas - costo * kilosConPrecio);
  const precios = new Set(vendidos.map(d => d.precioVenta));
  const clientesConEspecifico = [...new Set(
    vendidos.filter(d => d.origen === 'especifico' || d.origen === 'manual').map(d => d.cliente)
  )];
  const fechas = vendidos.map(d => d.fechaPrecio).filter(Boolean).sort();

  return {
    precioVenta: Math.round(precioPromedio * 100) / 100,
    costoFinal: Math.round(costo),
    gananciaUnitaria: kilosConPrecio > 0 ? Math.round((precioPromedio - costo) * 100) / 100 : 0,
    gananciaTotal,
    totalEmbarcado: Math.round(kilosConPrecio),
    kilosSinPrecio: Math.round(kilosSinPrecio * 10) / 10,
    kilosRefri: Math.round(kilosRefri * 10) / 10,
    clientesSinPrecio: [...clientesSinPrecio],
    esPromedio: precios.size > 1,
    esEspecifico: vendidos.length === 1 && clientesConEspecifico.length === 1,
    clienteEspecifico: vendidos.length === 1 && clientesConEspecifico.length === 1
      ? clientesConEspecifico[0] : null,
    clientesConEspecifico,
    fechaPrecio: fechas.length ? fechas[fechas.length - 1] : undefined,
    detallesPorCliente
  };
}

/** Valor de un mapa medida -> costo, exacto o sin distinguir mayúsculas. */
export function buscarCostoEnMapa(mapa, medida) {
  if (!mapa || !medida) return 0;
  const exacto = Number(mapa[medida]);
  if (exacto > 0) return exacto;
  const lower = String(medida).toLowerCase().trim();
  for (const [clave, valor] of Object.entries(mapa)) {
    if (String(clave).toLowerCase().trim() === lower) {
      const n = Number(valor);
      return n > 0 ? n : 0;
    }
  }
  return 0;
}

/**
 * Costo base de una medida: manual del embarque > catálogo > guardado.
 * @param {object} p
 * @param {string} p.medida
 * @param {object|null} p.catalogo resultado del catálogo ({costo, medidaEncontrada, proveedorNombre, ...})
 * @param {object} p.manuales costosPorMedidaManuales del embarque
 * @param {object} p.guardados costosPorMedida del embarque
 * @returns {{costo:number, fuente:'manual'|'catalogo'|'embarque', detalle?:object}|null}
 */
export function resolverCostoMedida({ medida, catalogo = null, manuales = {}, guardados = {} }) {
  const manual = buscarCostoEnMapa(manuales, medida);
  if (manual > 0) return { costo: manual, fuente: 'manual' };
  if (catalogo && Number(catalogo.costo) > 0) {
    return { costo: Number(catalogo.costo), fuente: 'catalogo', detalle: catalogo };
  }
  const guardado = buscarCostoEnMapa(guardados, medida);
  if (guardado > 0) return { costo: guardado, fuente: 'embarque' };
  return null;
}

/** Texto corto para mostrar de dónde salió un costo. */
export function describirFuenteCosto(resuelto) {
  if (!resuelto) return 'Sin costo';
  if (resuelto.fuente === 'manual') return 'Manual del embarque';
  if (resuelto.fuente === 'catalogo') {
    const d = resuelto.detalle || {};
    const proveedor = d.proveedorNombre ? ` – ${d.proveedorNombre}` : '';
    return `Catálogo: ${d.medidaEncontrada || ''}${proveedor}`.trim();
  }
  return 'Guardado en el embarque';
}

/** Costo extra del embarque: respeta 0; vacío o inválido usa el default. */
export function normalizarCostoExtra(valor) {
  if (valor === null || valor === undefined || valor === '') return COSTO_EXTRA_DEFAULT;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : COSTO_EXTRA_DEFAULT;
}

/** Costo final por kg limpio: costo × rendimiento (2 decimales) + extra. */
export function calcularCostoFinalKg({ costo, rendimiento, aplicarExtra = false, costoExtra = COSTO_EXTRA_DEFAULT }) {
  const rend = Math.round(numero(rendimiento) * 100) / 100;
  const base = numero(costo) * rend;
  return Math.round(aplicarExtra ? base + normalizarCostoExtra(costoExtra) : base);
}

/**
 * Ganancia de una talla de crudo. El costo se paga por los kilos de costo
 * y se reparte por kilo vendido, así la ganancia de cada cliente refleja su
 * propio precio y la suma da exactamente el total.
 * @param {Array<{cliente:string, kilos:number, precioVenta:number}>} detalles
 * @param {number} costoKg costo por kg ya con el sobrecosto de crudo
 * @param {number} kilosCosto kilos sobre los que se paga el costo
 */
export function calcularGananciaCrudo(detalles, costoKg, kilosCosto) {
  const lista = (detalles || []).filter(d => numero(d.kilos) > 0 && numero(d.precioVenta) > 0);
  const kilosVenta = lista.reduce((s, d) => s + numero(d.kilos), 0);
  if (kilosVenta === 0) return null;
  const ventas = lista.reduce((s, d) => s + numero(d.kilos) * numero(d.precioVenta), 0);
  const totalCosto = numero(costoKg) * numero(kilosCosto);
  const costoPorKgVendido = totalCosto / kilosVenta;
  return {
    totalKilos: kilosVenta,
    ventas,
    totalCosto,
    precioPromedio: ventas / kilosVenta,
    gananciaTotal: ventas - totalCosto,
    gananciaUnitaria: (ventas - totalCosto) / kilosVenta,
    detalles: lista.map(d => {
      const gananciaUnitaria = numero(d.precioVenta) - costoPorKgVendido;
      return { ...d, gananciaUnitaria, gananciaTotal: gananciaUnitaria * numero(d.kilos) };
    })
  };
}

/** Precio de maquila ponderado por kilos de las líneas (0 si no hay). */
export function precioMaquilaPonderado(lineas) {
  let kilos = 0;
  let total = 0;
  (lineas || []).forEach(({ kilos: k, precio }) => {
    const kg = numero(k);
    const p = numero(precio);
    if (kg > 0 && p > 0) {
      kilos += kg;
      total += kg * p;
    }
  });
  return kilos > 0 ? Math.round((total / kilos) * 100) / 100 : 0;
}

// ─── Edición de precio desde la tarjeta de ganancia ───────────────────────
// Alcances del modal "Editar precio" (Rendimientos):
//   'embarque' → solo las líneas de ese cliente en este embarque (manual ✋).
//   'cliente'  → precio específico del cliente en Precios + sus líneas (📌).
//   'general'  → precio general en Precios + líneas que van con el general (🌐).
export const ALCANCES_EDICION_PRECIO = ['embarque', 'cliente', 'general'];

const nombreClave = (nombre) => String(nombre || '').trim().toLowerCase();

/** Origen de precio de una línea del embarque (null si no tiene precio). */
export function origenPrecioLinea(producto) {
  if (!(Number(producto?.precio) > 0)) return null;
  return ['manual', 'especifico', 'general'].includes(producto.precioOrigen)
    ? producto.precioOrigen
    : 'general';
}

/** ¿La línea es venta limpia de esa medida? (mismo criterio que la ganancia) */
export function esLineaVentaDeMedida(cliente, producto, medida) {
  if (!producto || !producto.medida || producto.refrigerar) return false;
  if (nombreClave(producto.medida) !== nombreClave(medida)) return false;
  return cliente?.nombre !== 'Ozuna' || Boolean(producto.esVenta);
}

/**
 * Aplica un precio a las líneas de una medida en los clientes de UN embarque.
 * No muta: devuelve copias y cuántas líneas cambiaron.
 * @param {Array} clientes clientes del documento del embarque
 * @param {object} p
 * @param {string} p.medida medida de la tarjeta (sin "Maquila Ozuna")
 * @param {number} p.precio
 * @param {'embarque'|'cliente'|'general'} p.alcance
 * @param {string} p.cliente nombre del cliente que se editó
 * @param {string} p.fecha YYYY-MM-DD del embarque
 * @param {string|null} p.clienteId id de precios del cliente (alcance 'cliente')
 * @param {boolean} p.quitarPropio alcance 'general': el cliente editado deja su precio propio
 */
export function aplicarPrecioEnClientes(clientes, { medida, precio, alcance, cliente, fecha, clienteId = null, quitarPropio = false }) {
  const objetivo = nombreClave(cliente);
  let cambiadas = 0;
  const nuevos = (clientes || []).map(c => {
    const esEditado = nombreClave(c?.nombre) === objetivo;
    const productos = (c?.productos || []).map(producto => {
      if (!esLineaVentaDeMedida(c, producto, medida)) return producto;
      const origen = origenPrecioLinea(producto);
      let cambio = null;
      if (alcance === 'embarque' && esEditado) {
        cambio = { precioOrigen: 'manual', precioMedidaBase: producto.medida };
      } else if (alcance === 'cliente' && esEditado) {
        cambio = { precioOrigen: 'especifico', precioClienteId: clienteId };
      } else if (alcance === 'general') {
        // Al general van las líneas que ya seguían el general (o no tenían
        // precio) y las del cliente editado si deja su precio propio.
        const sigueGeneral = origen === null || origen === 'general';
        if (sigueGeneral || (esEditado && (quitarPropio || origen === 'manual'))) {
          cambio = { precioOrigen: 'general', precioClienteId: null };
        }
      }
      if (!cambio) return producto;
      const actualizado = { ...producto, precio: Number(precio), precioFecha: fecha, ...cambio };
      delete actualizado.precioBorradoManualmente;
      if (alcance !== 'embarque') delete actualizado.precioMedidaBase;
      const iguales = Number(producto.precio) === Number(precio) &&
        producto.precioOrigen === actualizado.precioOrigen;
      if (!iguales) cambiadas += 1;
      return iguales ? producto : actualizado;
    });
    return { ...c, productos };
  });
  return { clientes: nuevos, cambiadas };
}

/** Categoría del catálogo de Precios (misma regla que el modal de Precios). */
export function categoriaProductoPrecio(nombre) {
  const texto = String(nombre || '').toLowerCase();
  if (texto.includes('s/c') || /\d+\/\d+/.test(texto)) return 'Camarón S/C';
  if (texto.includes('c/c')) return 'Camarón C/C';
  return 'Otros';
}

// ─── Costos capturados desde Rendimientos ────────────────────────────────
// "Recordar para los siguientes días" guarda el costo en el catálogo
// `historial_costos` (el mismo de Gestión de Costos). Así cualquier embarque
// posterior con esa medida lo encuentra sin volver a preguntar.

/** Misma normalización de medida que Gestión de Costos. */
export function normalizarMedidaCosto(medida) {
  if (!medida) return '';
  return String(medida)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-');
}

/** Clave medida + proveedor del catálogo (misma que Gestión de Costos). */
export function generarCostoKey(medida, proveedorNombre = '') {
  const proveedor = String(proveedorNombre || '').trim().toLowerCase().replace(/\s+/g, ' ') || 'sin-proveedor';
  return `${normalizarMedidaCosto(medida)}__${proveedor}`;
}

/**
 * Renglón nuevo de `historial_costos` para una medida del embarque.
 * Si el costo actual vino del catálogo con ESA misma medida, actualiza esa
 * entrada (misma medida + proveedor); si vino de otra medida (talla base o
 * coincidencia parcial) o no había, crea la medida exacta sin proveedor, para
 * no cambiar el costo de otras medidas.
 * @param {object} p
 * @param {string} p.medida medida del embarque (o talla de crudo)
 * @param {number} p.costo costo por kg
 * @param {string} p.fecha YYYY-MM-DD del embarque
 * @param {'limpio'|'crudo'} p.tipoCosto
 * @param {object|null} p.detalle resultado del catálogo que se usaba (si había)
 * @param {Date} p.ahora momento de la captura
 */
export function entradaCatalogoCosto({ medida, costo, fecha, tipoCosto = 'limpio', detalle = null, ahora = new Date() }) {
  const mismaMedida = detalle && detalle.medidaEncontrada &&
    normalizarMedidaCosto(detalle.medidaEncontrada) === normalizarMedidaCosto(medida);
  const medidaCatalogo = mismaMedida ? detalle.medidaEncontrada : String(medida).trim();
  const proveedorNombre = mismaMedida ? (detalle.proveedorNombre || '') : '';
  return {
    medida: medidaCatalogo,
    proveedorId: mismaMedida ? (detalle.proveedorId || '') : '',
    proveedorNombre,
    tipoCosto,
    costoKey: generarCostoKey(medidaCatalogo, proveedorNombre),
    costoBase: Number(costo),
    archivado: false,
    timestamp: ahora,
    fecha,
    nuevo: !mismaMedida,
    observacion: 'Capturado en Rendimientos'
  };
}

// ─── Proveedor activo por medida ─────────────────────────────────────────
// Cuando una medida del embarque no dice proveedor (ej. "51/60") y el catálogo
// tiene varios (Honduras, Tirado, ...), se usa: la elección de ESTE embarque,
// luego el default general (última elección en Gestión de Costos o
// Rendimientos, guardada en configuracion/costosProveedorActivo) y, si nunca
// se eligió, el respaldo `ordenarProveedoresDefault`.
export const DOC_PROVEEDOR_ACTIVO = Object.freeze(['configuracion', 'costosProveedorActivo']);

export function proveedorActivoParaMedida(medidaKey, porEmbarque = {}, global = {}) {
  return (porEmbarque && porEmbarque[medidaKey]) || (global && global[medidaKey]) || null;
}

const fechaOrden = (entrada) => {
  const f = entrada?.fecha;
  if (typeof f === 'string') return f.slice(0, 10);
  return fechaYMD(f) || fechaYMD(entrada?.timestamp) || '';
};

/**
 * Respaldo cuando nunca se eligió proveedor: primero la entrada sin
 * proveedor (costo base de la medida), luego la más reciente. Lo usan
 * Rendimientos y Gestión de Costos para mostrar y calcular lo mismo.
 */
export function ordenarProveedoresDefault(entradas) {
  return (entradas || []).filter(e => e && !e.archivado).slice().sort((a, b) => {
    const sinA = a.proveedorNombre ? 1 : 0;
    const sinB = b.proveedorNombre ? 1 : 0;
    if (sinA !== sinB) return sinA - sinB;
    const fa = fechaOrden(a);
    const fb = fechaOrden(b);
    if (fa !== fb) return fa < fb ? 1 : -1;
    return marcaTiempo(b) - marcaTiempo(a);
  });
}

/**
 * Copia profunda de datos planos (objetos y arreglos); los objetos con
 * clase (Timestamp de Firestore, Date) se conservan tal cual. Sirve para
 * la "foto" de los campos del embarque: si se comparte el objeto, editar el
 * mapa también cambia la foto y el guardado cree que no hubo cambios.
 */
export function clonarDatosPlanos(valor) {
  if (Array.isArray(valor)) return valor.map(clonarDatosPlanos);
  if (valor && typeof valor === 'object') {
    const proto = Object.getPrototypeOf(valor);
    if (proto !== Object.prototype && proto !== null) return valor;
    const salida = {};
    Object.keys(valor).forEach(k => { salida[k] = clonarDatosPlanos(valor[k]); });
    return salida;
  }
  return valor;
}

// ─── Costo extra (ej. $18) en medidas de limpio ──────────────────────────
// Se suma por default a TODAS las medidas de limpio (no a Maquila Ozuna).
// Se puede apagar por medida desde Rendimientos o Gestión de Costos; esa
// decisión queda en `costoExtraDecidido`. Embarques viejos: Gestión de Costos
// guardaba solo un `false` automático en medidas sin número al inicio
// ("Piojo panga"); ese false no cuenta como decisión. En medidas con número
// el false solo pudo venir del usuario, así que se respeta.
const esMedidaNumerica = (medida) => {
  const texto = String(medida || '').trim();
  return /^\d+\/\d+/.test(texto) || /^\d+\s/.test(texto) || /^\d+$/.test(texto);
};

export function aplicaCostoExtra(medida, aplicarMapa = {}, decididoMapa = {}) {
  if (!medida) return false;
  const esMaquila = /maquila\s+ozuna/i.test(medida);
  const mapa = aplicarMapa || {};
  if (Object.prototype.hasOwnProperty.call(mapa, medida)) {
    const valor = Boolean(mapa[medida]);
    const decidido = Boolean((decididoMapa || {})[medida]);
    if (valor || decidido || esMedidaNumerica(medida) || esMaquila) return valor;
  }
  return !esMaquila;
}
