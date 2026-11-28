// Hoja "Análisis de ganancia" del PDF de Rendimientos con la forma del
// cuaderno: un recuadro por medida en cuadrícula de 2 columnas.
//
//   ┌ 71/90 (Selecta) ───────────────────────┐
//   │ $29 /kg               Joselito  150×.65=97│
//   │ venta $165 - $136     Catarro          95│
//   │ ( = $10,150 )         ...                │
//   │ 400 kg × $103                   ──────── │
//   │ = $41,200                            350 │
//   │ (1.15) = ( $136 )                        │
//   └──────────────────────────────────────────┘
//
// Al final, el resumen del día: Limpios / Maquila / Crudos / Total.
// Usa los datos ya calculados por la pantalla (no recalcula ganancias).

const TINTA = '#1f2a44';
const GRIS = '#6b7785';
const VERDE = '#1b7f3b';
const ROJO = '#c0392b';
const LINEA = '#4a5a70';
const MARCO_TITULO = '#e8a0a8';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const num = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const conComas = (entero) => String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** $ entero con comas ("-$1,200" si es negativo). */
export const dinero = (valor) => {
  const n = Math.round(num(valor));
  return `${n < 0 ? '-' : ''}$${conComas(n)}`;
};

/** Precio: entero sin decimales, con centavos solo si los tiene ($199.50). */
export const precioTexto = (valor) => {
  const n = num(valor);
  if (Number.isInteger(n)) return dinero(n);
  const [entero, centavos] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}$${conComas(Number(entero))}.${centavos}`;
};

/** Kilos enteros con comas (sin decimales, como en pantalla). */
export const kilosTexto = (valor) => conComas(Math.floor(num(valor) + 1e-9));

/** Neto por bolsa como lo escribe el papá: 0.65 -> ".65". */
export const factorTexto = (valor) => String(num(valor)).replace(/^0\./, '.');

/** "Jueves" y "26/nov/26" a partir de la fecha del embarque. */
export function fechaCuaderno(fecha) {
  let d = null;
  if (!fecha) return { dia: '', fecha: '' };
  if (typeof fecha.toDate === 'function') d = fecha.toDate();
  else if (typeof fecha === 'object' && Number.isFinite(fecha.seconds)) d = new Date(fecha.seconds * 1000);
  else if (fecha instanceof Date) d = fecha;
  else if (typeof fecha === 'string') {
    const m = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
    d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(fecha);
  }
  if (!d || Number.isNaN(d.getTime())) return { dia: '', fecha: '' };
  return {
    dia: DIAS[d.getDay()],
    fecha: `${d.getDate()}/${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`
  };
}

/** Precio con más kilos (el "normal" del recuadro); los demás van en óvalo. */
export function precioPrincipal(filas) {
  const porPrecio = new Map();
  (filas || []).forEach(f => {
    if (!(num(f.precio) > 0)) return;
    porPrecio.set(f.precio, (porPrecio.get(f.precio) || 0) + num(f.kilos));
  });
  let mejor = null;
  porPrecio.forEach((kilos, precio) => {
    if (mejor === null || kilos > porPrecio.get(mejor)) mejor = precio;
  });
  return mejor;
}

/** Renglones de la columna de kilos de una medida limpia. */
export function filasLimpio(ganancia) {
  const detalles = Array.isArray(ganancia?.detallesPorCliente) ? ganancia.detallesPorCliente : [];
  const vendidos = detalles.filter(d => !d.noCuenta).map(d => ({
    cliente: d.cliente,
    kilos: Math.floor(num(d.totalEmbarcado) + 1e-9),
    precio: num(d.precioVenta),
    bolsas: num(d.bolsas) > 0 ? num(d.bolsas) : null,
    factorBolsa: num(d.factorBolsa) > 0 ? num(d.factorBolsa) : null
  }));
  const refri = detalles.filter(d => d.noCuenta).map(d => ({
    cliente: d.cliente,
    kilos: Math.floor(num(d.totalEmbarcado) + 1e-9)
  }));
  const principal = precioPrincipal(vendidos);
  vendidos.forEach(f => { f.precioDistinto = principal !== null && f.precio !== principal; });
  const total = vendidos.reduce((s, f) => s + f.kilos, 0);
  return { vendidos, refri, total, principal };
}

/** Renglones de una talla de crudo: por cliente y precio, kilos enteros. */
export function filasCrudo(gananciaCrudo) {
  const grupos = new Map();
  (gananciaCrudo?.detallesPorCliente || []).forEach(d => {
    const precio = num(d.precioVenta);
    const clave = `${d.cliente}__${precio}`;
    if (!grupos.has(clave)) grupos.set(clave, { cliente: d.cliente, precio, kilosExactos: 0 });
    grupos.get(clave).kilosExactos += num(d.kilos);
  });
  const vendidos = Array.from(grupos.values()).map(g => ({
    cliente: g.cliente,
    precio: g.precio,
    kilos: Math.floor(g.kilosExactos + 1e-9)
  }));
  const principal = precioPrincipal(vendidos);
  vendidos.forEach(f => { f.precioDistinto = principal !== null && f.precio !== principal; });
  return { vendidos, refri: [], total: vendidos.reduce((s, f) => s + f.kilos, 0), principal };
}

// ─── Piezas de dibujo ─────────────────────────────────────────────────────

/** Texto encerrado en un óvalo (como los totales encerrados a lápiz). */
export function ovalo(texto, { ancho, alto = 24, fontSize = 15, color = TINTA, bold = true, grosor = 1.2 } = {}) {
  const altoLinea = fontSize * 1.17;
  const arriba = alto / 2 + altoLinea / 2;
  return {
    width: ancho,
    stack: [
      {
        canvas: [{
          type: 'ellipse',
          x: ancho / 2,
          y: alto / 2,
          r1: ancho / 2 - grosor,
          r2: alto / 2 - grosor,
          lineWidth: grosor,
          lineColor: color
        }]
      },
      {
        text: texto,
        fontSize,
        bold,
        color,
        alignment: 'center',
        margin: [0, -arriba, 0, Math.max(0, alto / 2 - altoLinea / 2)]
      }
    ]
  };
}

// Sin costo: la pantalla no encontró costo (costoFuente null). Si el dato no
// trae la fuente, se decide por el costo mismo.
const esSinCosto = (g, costo) => (g?.costoFuente === undefined ? !(num(costo) > 0) : !g.costoFuente);

const enRenglon = (nodo) => ({ columns: [nodo, { width: '*', text: '', fontSize: 6 }] });

const anchoOvalo = (texto, fontSize, holgura = 22) => Math.max(holgura + 12, Math.ceil(texto.length * fontSize * 0.62) + holgura);

function columnaKilos({ vendidos, refri, total }, { sinPrecio = 0, clientesSinPrecio = [] } = {}) {
  const body = vendidos.map(f => {
    const valor = f.bolsas && f.factorBolsa
      ? [
          { text: `${kilosTexto(f.bolsas)}×${factorTexto(f.factorBolsa)}=`, fontSize: 8, color: GRIS },
          { text: kilosTexto(f.kilos), fontSize: 11, color: TINTA }
        ]
      : [{ text: kilosTexto(f.kilos), fontSize: 11, color: TINTA }];
    return [
      { text: f.cliente || '', fontSize: 8, color: GRIS, noWrap: true, margin: [0, 2, 0, 0] },
      { text: valor, alignment: 'right', noWrap: true },
      f.precioDistinto
        ? ovalo(precioTexto(f.precio), { ancho: anchoOvalo(precioTexto(f.precio), 7.5, 10), alto: 13, fontSize: 7.5, bold: false, grosor: 0.8 })
        : { text: '', fontSize: 6 }
    ];
  });
  body.push([
    { text: '', margin: [0, 1, 0, 0] },
    { text: kilosTexto(total), fontSize: 12, bold: true, color: TINTA, alignment: 'right', margin: [0, 1, 0, 0] },
    { text: 'kg', fontSize: 8, color: GRIS, margin: [0, 4, 0, 0] }
  ]);
  refri.forEach(f => {
    body.push([
      { text: f.cliente || 'refri', fontSize: 8, color: GRIS, italics: true, noWrap: true },
      { text: kilosTexto(f.kilos), fontSize: 9, color: GRIS, italics: true, alignment: 'right' },
      { text: 'no cuenta', fontSize: 7, color: GRIS, italics: true, noWrap: true, margin: [0, 1, 0, 0] }
    ]);
  });
  if (num(sinPrecio) > 0) {
    body.push([
      { text: 'sin precio', fontSize: 8, color: ROJO, noWrap: true },
      { text: kilosTexto(sinPrecio), fontSize: 9, color: ROJO, alignment: 'right' },
      { text: (clientesSinPrecio || []).join(', '), fontSize: 7, color: ROJO }
    ]);
  }
  const filaTotal = vendidos.length; // índice del renglón del total
  return {
    table: { widths: ['auto', '*', 'auto'], body },
    layout: {
      hLineWidth: (i) => (i === filaTotal && filaTotal > 0 ? 1 : 0),
      vLineWidth: () => 0,
      hLineColor: () => TINTA,
      paddingLeft: () => 2,
      paddingRight: () => 2,
      paddingTop: () => 2,
      paddingBottom: () => 2
    }
  };
}

function encabezadoCaja(titulo, detalle, colorDetalle = GRIS) {
  return {
    text: [
      { text: titulo, bold: true, fontSize: 14, color: TINTA },
      detalle ? { text: `  (${detalle})`, fontSize: 11, color: colorDetalle } : ''
    ],
    alignment: 'center',
    margin: [0, 0, 0, 6]
  };
}

function gananciaPorKilo(valor, nota, { sinCosto = false } = {}) {
  const color = sinCosto ? GRIS : (valor < 0 ? ROJO : TINTA);
  return [
    { text: [{ text: precioTexto(valor), fontSize: 20, bold: true, color }, { text: ' /kg', fontSize: 9, color: GRIS }] },
    nota ? { text: nota, fontSize: 8, color: GRIS, margin: [0, 0, 0, 3] } : { text: '', margin: [0, 0, 0, 3] }
  ];
}

function totalEnOvalo(total, { sinCosto = false } = {}) {
  const texto = `= ${dinero(total)}`;
  const nodo = enRenglon(ovalo(texto, {
    ancho: anchoOvalo(texto, 14),
    alto: 26,
    fontSize: 14,
    color: sinCosto ? GRIS : (total < 0 ? ROJO : VERDE)
  }));
  if (!sinCosto) return nodo;
  // Sin costo la ganancia sale inflada: se avisa en el mismo recuadro.
  return { stack: [nodo, { text: 'Sin costo: esta ganancia sale inflada', fontSize: 8, bold: true, color: ROJO, margin: [0, 1, 0, 0] }] };
}

function cajaLimpio(nombre, g) {
  const filas = filasLimpio(g);
  const costoFinal = num(g.costoFinal);
  // Como en el cuaderno: la ganancia por kilo del precio principal; los
  // clientes con otro precio van en óvalo y el total es la suma exacta.
  const precioBase = filas.principal ?? num(g.precioVenta);
  const gananciaKg = precioBase - costoFinal;
  const nota = `venta ${precioTexto(precioBase)} - ${dinero(costoFinal)}`;

  let detalleTitulo = g.proveedorCosto || '';
  let colorDetalle = GRIS;
  if (!detalleTitulo && g.costoFuente === 'manual') detalleTitulo = 'costo manual';
  const costoBase = num(g.costoBase);
  const sinCosto = esSinCosto(g, costoBase);
  if (sinCosto) { detalleTitulo = 'sin costo'; colorDetalle = ROJO; }

  const izquierda = [...gananciaPorKilo(gananciaKg, nota, { sinCosto }), totalEnOvalo(g.gananciaTotal, { sinCosto })];

  if (num(g.kilosCrudo) > 0) {
    izquierda.push(
      { text: `${kilosTexto(g.kilosCrudo)} kg × ${precioTexto(costoBase)}`, fontSize: 10, color: TINTA, margin: [0, 6, 0, 0] },
      { text: `= ${dinero(num(g.kilosCrudo) * costoBase)}`, fontSize: 10, color: TINTA }
    );
  } else {
    izquierda.push({ text: `costo ${precioTexto(costoBase)}`, fontSize: 10, color: TINTA, margin: [0, 6, 0, 0] });
  }

  const rendimiento = num(g.rendimientoUsado).toFixed(2);
  const costoTexto = dinero(costoFinal);
  izquierda.push({
    columns: [
      { width: 'auto', text: `(${rendimiento}) =`, fontSize: 11, color: TINTA, margin: [0, 4, 0, 0] },
      ovalo(costoTexto, { ancho: anchoOvalo(costoTexto, 12), alto: 20, fontSize: 12 }),
      { width: '*', text: '', fontSize: 6 }
    ],
    columnGap: 4,
    margin: [0, 3, 0, 0]
  });
  const notas = [];
  if (g.rendimientoTexto) notas.push(`rend. ${g.rendimientoTexto}`);
  if (num(g.costoExtraAplicado) > 0) notas.push(`incluye +${dinero(g.costoExtraAplicado)} extra`);
  if (notas.length) izquierda.push({ text: notas.join(' · '), fontSize: 7.5, color: GRIS, margin: [0, 2, 0, 0] });

  return contenidoCaja(
    encabezadoCaja(nombre, detalleTitulo, colorDetalle),
    izquierda,
    columnaKilos(filas, { sinPrecio: g.kilosSinPrecio, clientesSinPrecio: g.clientesSinPrecio })
  );
}

function cajaMaquila(nombre, g) {
  const kilos = Math.floor(num(g.totalEmbarcado) + 1e-9);
  const izquierda = [
    ...gananciaPorKilo(num(g.precioMaquila), 'precio de maquila'),
    totalEnOvalo(g.gananciaTotal)
  ];
  const derecha = columnaKilos({ vendidos: [], refri: [], total: kilos });
  return contenidoCaja(encabezadoCaja(nombre, 'maquila'), izquierda, derecha);
}

function cajaCrudo(talla, g) {
  const filas = filasCrudo(g);
  const costoKg = num(g.costoBase);
  const kilosCosto = num(g.totalKilosCosto);
  const precioBase = filas.principal ?? num(g.precioVenta);
  const sinCosto = esSinCosto(g, g.costoSinSobrecosto);
  // Ganancia por kilo vendido al precio principal: el costo se reparte por
  // kilo vendido (kilos costo × costo / kilos vendidos), como en la pantalla.
  const costoPorKgVendido = num(g.totalKilos) > 0 ? (kilosCosto * costoKg) / num(g.totalKilos) : costoKg;
  const izquierda = [
    ...gananciaPorKilo(
      Math.round((precioBase - costoPorKgVendido) * 100) / 100,
      `venta ${precioTexto(precioBase)} - ${precioTexto(Math.round(costoPorKgVendido * 100) / 100)}`,
      { sinCosto }
    ),
    totalEnOvalo(g.gananciaTotal, { sinCosto }),
    { text: `${kilosTexto(kilosCosto)} kg × ${precioTexto(costoKg)}`, fontSize: 10, color: TINTA, margin: [0, 6, 0, 0] },
    { text: `= ${dinero(kilosCosto * costoKg)}`, fontSize: 10, color: TINTA }
  ];
  if (num(g.sobrecostoKg) > 0) {
    izquierda.push({
      text: `costo ${precioTexto(g.costoSinSobrecosto)} + ${precioTexto(g.sobrecostoKg)} de crudo`,
      fontSize: 7.5,
      color: GRIS,
      margin: [0, 2, 0, 0]
    });
  }
  return contenidoCaja(
    encabezadoCaja(talla, sinCosto ? 'crudo · sin costo' : 'crudo', sinCosto ? ROJO : GRIS),
    izquierda,
    columnaKilos(filas)
  );
}

function contenidoCaja(encabezado, izquierda, derecha) {
  return {
    stack: [
      encabezado,
      { columns: [{ width: '43%', stack: izquierda }, { width: '57%', stack: [derecha] }], columnGap: 4 }
    ],
    margin: [2, 4, 2, 6]
  };
}

function cajaResumen({ limpios, maquila, crudos, hayMaquila, hayCrudos, sinCosto = [] }) {
  const total = limpios + maquila + crudos;
  const renglon = (etiqueta, valor) => [
    { text: etiqueta, fontSize: 13, color: TINTA },
    { text: dinero(valor), fontSize: 13, color: valor < 0 ? ROJO : TINTA, alignment: 'right' }
  ];
  const body = [renglon('Limpios', limpios)];
  if (hayMaquila) body.push(renglon('Maquila', maquila));
  if (hayCrudos) body.push(renglon('Crudos', crudos));
  const lineaTotal = body.length;
  const textoTotal = dinero(total);
  body.push([
    { text: 'Total', fontSize: 13, bold: true, color: TINTA, margin: [0, 8, 0, 0] },
    {
      columns: [
        { width: '*', text: '', fontSize: 6 },
        ovalo(textoTotal, { ancho: anchoOvalo(textoTotal, 17), alto: 30, fontSize: 17, color: total < 0 ? ROJO : VERDE })
      ],
      margin: [0, 2, 0, 0]
    }
  ]);
  const avisoSinCosto = sinCosto.length
    ? [{
        text: [
          { text: 'Sin costo: ', bold: true },
          sinCosto.map(m => `${m.nombre} (${dinero(m.ganancia)})`).join(', '),
          '. Su ganancia está sumada y sale inflada; captura el costo en Rendimientos.'
        ],
        fontSize: 8.5,
        color: ROJO,
        margin: [0, 8, 0, 0]
      }]
    : [];
  return {
    stack: [
      { text: 'Ganancia del día', bold: true, fontSize: 14, color: TINTA, margin: [0, 0, 0, 6] },
      {
        table: { widths: ['auto', '*'], body },
        layout: {
          hLineWidth: (i) => (i === lineaTotal ? 1 : 0),
          vLineWidth: () => 0,
          hLineColor: () => TINTA,
          paddingLeft: () => 2,
          paddingRight: () => 2,
          paddingTop: () => 2,
          paddingBottom: () => 2
        }
      },
      ...avisoSinCosto
    ],
    margin: [6, 6, 6, 6]
  };
}

function encabezadoHoja(embarqueData) {
  const { dia, fecha } = fechaCuaderno(embarqueData?.fecha);
  const anchoTitulo = 300;
  const altoTitulo = 40;
  return {
    columns: [
      { width: '*', text: '', fontSize: 6 },
      {
        width: anchoTitulo,
        stack: [
          { canvas: [{ type: 'rect', x: 0, y: 0, w: anchoTitulo, h: altoTitulo, r: 10, lineWidth: 1.2, lineColor: MARCO_TITULO }] },
          { text: 'Rendimientos', fontSize: 26, color: TINTA, alignment: 'center', margin: [0, -altoTitulo + 4, 0, 4] }
        ]
      },
      {
        width: '*',
        stack: [
          { text: dia, fontSize: 14, color: TINTA, alignment: 'right' },
          { text: fecha, fontSize: 14, color: TINTA, alignment: 'right' }
        ]
      }
    ],
    margin: [0, 0, 0, 4]
  };
}

/**
 * Hoja de análisis de ganancia (reemplaza las tablas de resumen de limpios y
 * crudos y el total general).
 * @param {object} p
 * @param {object} p.gananciasLimpios medida -> resultado de calcularGanancias (visibles y con análisis)
 * @param {object} p.gananciasMaquila medida -> { totalEmbarcado, precioMaquila, gananciaTotal }
 * @param {object} p.gananciasCrudos talla -> resultado de calcularGananciasPorTallaCrudo
 * @param {object} p.nombresMedidas nombres personalizados
 * @param {object} p.embarqueData para la fecha
 */
export function generarHojaGanancias({ gananciasLimpios = {}, gananciasMaquila = {}, gananciasCrudos = {}, nombresMedidas = {}, embarqueData = {} } = {}) {
  const ocultas = embarqueData?.medidaOculta || {};
  const limpios = Object.entries(gananciasLimpios || {}).filter(([medida]) => !ocultas[medida]);
  const maquila = Object.entries(gananciasMaquila || {});
  const crudos = Object.entries(gananciasCrudos || {});

  if (!limpios.length && !maquila.length && !crudos.length) {
    return { text: 'No hay medidas con análisis de ganancia', fontSize: 14, color: GRIS, alignment: 'center', margin: [0, 20, 0, 0] };
  }

  const nombre = (medida) => nombresMedidas[medida] || medida;
  const cajas = [
    ...limpios.map(([medida, g]) => cajaLimpio(nombre(medida), g)),
    ...maquila.map(([medida, g]) => cajaMaquila(nombre(medida), g)),
    ...crudos.map(([talla, g]) => cajaCrudo(talla, g))
  ].map(caja => ({ ...caja, border: [true, true, true, true] }));

  const sumar = (lista) => lista.reduce((s, [, g]) => s + num(g.gananciaTotal), 0);
  const resumen = {
    ...cajaResumen({
      limpios: sumar(limpios),
      maquila: sumar(maquila),
      crudos: sumar(crudos),
      hayMaquila: maquila.length > 0,
      hayCrudos: crudos.length > 0,
      sinCosto: [
        ...limpios.filter(([, g]) => esSinCosto(g, g.costoBase)).map(([medida, g]) => ({ nombre: nombre(medida), ganancia: num(g.gananciaTotal) })),
        ...crudos.filter(([, g]) => esSinCosto(g, g.costoSinSobrecosto)).map(([talla, g]) => ({ nombre: talla, ganancia: num(g.gananciaTotal) }))
      ]
    }),
    border: [false, false, false, false]
  };

  const celdas = [...cajas, resumen];
  if (celdas.length % 2 === 1) celdas.push({ text: '', border: [false, false, false, false] });
  const body = [];
  for (let i = 0; i < celdas.length; i += 2) body.push([celdas[i], celdas[i + 1]]);

  return {
    fontSize: 10,
    stack: [
      encabezadoHoja(embarqueData),
      { text: 'Análisis de ganancia', fontSize: 11, color: GRIS, alignment: 'center', margin: [0, 0, 0, 8] },
      {
        table: { widths: ['*', '*'], body, dontBreakRows: true },
        layout: {
          hLineWidth: () => 1.2,
          vLineWidth: () => 1.2,
          hLineColor: () => LINEA,
          vLineColor: () => LINEA,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4
        }
      }
    ]
  };
}

/** Totales de la hoja (para pruebas y para cuadrar con la pantalla). */
export function totalesHojaGanancias({ gananciasLimpios = {}, gananciasMaquila = {}, gananciasCrudos = {}, embarqueData = {} } = {}) {
  const ocultas = embarqueData?.medidaOculta || {};
  const sumar = (obj, filtrar = false) => Object.entries(obj || {})
    .filter(([medida]) => !filtrar || !ocultas[medida])
    .reduce((s, [, g]) => s + num(g.gananciaTotal), 0);
  const limpios = sumar(gananciasLimpios, true);
  const maquila = sumar(gananciasMaquila);
  const crudos = sumar(gananciasCrudos);
  return { limpios, maquila, crudos, total: limpios + maquila + crudos };
}
