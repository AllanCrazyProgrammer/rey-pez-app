// Agregar esta función al inicio del archivo, antes de generarResumenLimpios
function getClienteColor(clienteId) {
  // Colores predefinidos para cada cliente
  const colores = {
    '1': '#3498db', // Joselito (azul)
    '2': '#e74c3c', // Catarro (rojo)
    '3': '#f1c40f', // Otilio (amarillo)
    '4': '#2ecc71'  // Ozuna (verde)
  };
  return colores[clienteId] || '#95a5a6'; // Color gris por defecto
}

export function generarResumenLimpios(productosPorCliente, clienteColors, escala = 100, clientesPersonalizados = []) {
  const factorEscala = escala / 100;
  const contenido = [
    { text: '', pageBreak: 'before' }
  ];

  let totalTarasGlobal = 0;
  let totalKilosGlobal = 0;

  // Ajustar dimensiones base
  const rectWidth = 120;
  const rectHeight = 25;

  // Separar clientes predefinidos de personalizados, EXCLUYENDO los de 0 kilos
  const clientesPredefinidos = [];
  const clientesExtra = [];

  Object.entries(productosPorCliente).forEach(([clienteId, productos]) => {
    const kilosCliente = calcularTotalKilos(productos);
    if (kilosCliente > 0) {
      // Verificar si es un cliente predefinido (1-4) o personalizado
      if (["1", "2", "3", "4"].includes(clienteId)) {
        clientesPredefinidos.push([clienteId, productos]);
      } else {
        clientesExtra.push([clienteId, productos]);
      }
    }
  });

  // Procesar clientes personalizados en tríos
  for (let i = 0; i < clientesExtra.length; i += 3) {
    const columnas = [];
    
    // Procesar hasta tres clientes por fila
    for (let j = 0; j < 3 && (i + j) < clientesExtra.length; j++) {
      const [clienteId, productos] = clientesExtra[i + j];
      const nombreCliente = obtenerNombreCliente(clienteId, clientesPersonalizados);
      const tarasCliente = calcularTotalTaras(productos);
      const kilosCliente = calcularTotalKilos(productos);
      totalTarasGlobal += tarasCliente;
      totalKilosGlobal += kilosCliente;

      columnas.push({
        stack: [
          // Header del cliente
          {
            columns: [
              {
                width: 'auto',
                stack: [
                  {
                    canvas: [
                      {
                        type: 'rect',
                        x: 0,
                        y: 0,
                        w: rectWidth * 0.8,
                        h: rectHeight,
                        r: 8,
                        color: getClienteColor(clienteId)
                      }
                    ]
                  },
                  {
                    text: nombreCliente,
                    color: 'white',
                    fontSize: 11 * factorEscala,
                    relativePosition: { x: 10, y: -20 }
                  }
                ]
              },
              {
                text: `${tarasCliente}T|${formatearKilos(kilosCliente)}Kg`,
                style: 'total',
                alignment: 'right',
                color: getClienteColor(clienteId),
                fontSize: 11 * factorEscala
              }
            ],
            margin: [0, 3, 0, 3]
          },
          // Productos del cliente
          ...productos.map(producto => ({
            stack: [
              {
                text: generarTextoMedida(producto),
                fontSize: 11 * factorEscala,
                bold: true,
                margin: [0, 0, 0, 1],
                alignment: 'center'
              },
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 1,
                    x2: 120,
                    y2: 1,
                    lineWidth: 0.5,
                    lineColor: '#000000'
                  }
                ],
                margin: [0, 0, 0, 1]
              },
              {
                text: calcularTotalTarasSimple(producto) === 0 ? 
                  [{ text: `${formatearKilos(calcularKilosProducto(producto))}`, color: 'red', bold: true }] :
                  [
                    { text: `${calcularTotalTarasSimple(producto)}-`, bold: true },
                    { text: `${formatearKilos(calcularKilosProducto(producto))}`, color: 'red', bold: true }
                  ],
                fontSize: 11 * factorEscala,
                margin: [0, 1, 0, 1],
                alignment: 'center'
              },
              {
                text: generarTextoTarasYBolsas(producto),
                fontSize: 10 * factorEscala,
                margin: [0, 0, 0, 1],
                alignment: 'center'
              }
            ],
            margin: [0, 0, 0, 5]
          }))
        ],
        width: '32%'
      });
    }

    // Agregar las columnas al contenido
    contenido.push({
      columns: columnas,
      columnGap: 10,
      margin: [0, 0, 0, 15]
    });
  }

  // Procesar clientes predefinidos de manera vertical
  clientesPredefinidos.forEach(([clienteId, productos]) => {
    const nombreCliente = obtenerNombreCliente(clienteId, clientesPersonalizados);
    const tarasCliente = calcularTotalTaras(productos);
    const kilosCliente = calcularTotalKilos(productos);
    
    totalTarasGlobal += tarasCliente;
    totalKilosGlobal += kilosCliente;

    // Calcular el tamaño de fuente basado en la cantidad de productos
    const totalProductos = productos.length;
    let fontSize = 13;
    let marginBottom = 15;
    
    if (totalProductos > 30) {
      fontSize = 9;
      marginBottom = 6;
    } else if (totalProductos > 24) {
      fontSize = 10;
      marginBottom = 8;
    } else if (totalProductos > 18) {
      fontSize = 11;
      marginBottom = 10;
    } else if (totalProductos > 12) {
      fontSize = 12;
      marginBottom = 12;
    }

    // Header del cliente
    contenido.push({
      columns: [
        {
          width: 'auto',
          stack: [
            {
              canvas: [
                {
                  type: 'rect',
                  x: 0,
                  y: 0,
                  w: rectWidth,
                  h: rectHeight,
                  r: 8,
                  color: getClienteColor(clienteId)
                }
              ]
            },
            {
              text: nombreCliente,
              color: 'white',
              fontSize: fontSize * factorEscala,
              relativePosition: { x: 10, y: -20 }
            }
          ]
        },
        {
          text: `Total: ${tarasCliente}T | ${formatearKilos(kilosCliente)}Kg`,
          style: 'total',
          alignment: 'right',
          color: getClienteColor(clienteId),
          fontSize: fontSize * factorEscala
        }
      ],
      margin: [0, 3, 0, 3]
    });

    // Calcular cuántas medidas por fila
    let medidasPorFila = 3;
    if (totalProductos > 30) {
      medidasPorFila = 4;
    }

    // Agrupar productos en filas
    const productosPorFila = [];
    for (let i = 0; i < productos.length; i += medidasPorFila) {
      productosPorFila.push(productos.slice(i, i + medidasPorFila));
    }

    // Generar filas de productos
    productosPorFila.forEach(filaProductos => {
      contenido.push({
        columns: filaProductos.map(producto => ({
          stack: [
            {
              text: generarTextoMedida(producto),
              fontSize: fontSize * factorEscala,
              bold: true,
              margin: [0, 0, 0, 1],
              alignment: 'center'
            },
            {
              canvas: [
                {
                  type: 'line',
                  x1: 0,
                  y1: 1,
                  x2: 150,
                  y2: 1,
                  lineWidth: 0.5,
                  lineColor: '#000000'
                }
              ],
              margin: [0, 0, 0, 1]
            },
            {
              text: calcularTotalTarasSimple(producto) === 0 ? 
                [{ text: `${formatearKilos(calcularKilosProducto(producto))}`, color: 'red', bold: true }] :
                [
                  { text: `${calcularTotalTarasSimple(producto)}-`, bold: true },
                  { text: `${formatearKilos(calcularKilosProducto(producto))}`, color: 'red', bold: true }
                ],
              fontSize: fontSize * factorEscala,
              margin: [0, 1, 0, 1],
              alignment: 'center'
            },
            {
              text: generarTextoTarasYBolsas(producto),
              fontSize: (fontSize - 1) * factorEscala,
              margin: [0, 0, 0, 1],
              alignment: 'center'
            }
          ],
          width: `${100/medidasPorFila}%`,
          alignment: 'center'
        })),
        columnGap: 5,
        margin: [0, 0, 0, marginBottom]
      });
    });

    // Separador entre clientes
    contenido.push({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 2,
          x2: 515,
          y2: 2,
          lineWidth: 0.5,
          lineColor: '#CCCCCC'
        }
      ],
      margin: [0, 5, 0, 5]
    });
  });

  return contenido;
}

function obtenerNombreCliente(clienteId, clientesPersonalizados = []) {
  // Convertir clienteId a string para comparación consistente
  const clienteIdStr = clienteId.toString();

  // Si hay clientes personalizados, buscar primero en ellos
  if (Array.isArray(clientesPersonalizados) && clientesPersonalizados.length > 0) {
    const clienteEncontrado = clientesPersonalizados.find(cliente => 
      cliente.id?.toString() === clienteIdStr || 
      cliente.clienteId?.toString() === clienteIdStr
    );

    if (clienteEncontrado) {
      return clienteEncontrado.nombre || clienteEncontrado.nombreCliente;
    }
  }

  // Si no se encuentra en los personalizados, usar los nombres predefinidos
  const nombres = {
    '1': 'Joselito',
    '2': 'Catarro',
    '3': 'Otilio',
    '4': 'Ozuna'
  };

  return nombres[clienteIdStr] || `Cliente ${clienteIdStr}`;
}

// Funciones auxiliares
function generarTextoMedida(producto) {
  let texto = '';
  
  // Si es tipo c/h20, crear un array con elementos coloreados
  if (producto.tipo === 'c/h20') {
    return [
      { text: `${producto.textoAlternativo || producto.medida || ''} ${producto.fecha || ''} `, color: 'black' },
      { text: `c/h20 (${producto.camaronNeto || 0.65})`, color: '#3498db' },
      producto.precio ? { text: ` $${Number(producto.precio).toLocaleString('en-US')}`, color: 'red', bold: true } : {}
    ];
  }

  // Para otros tipos, usar texto alternativo si existe
  texto = producto.textoAlternativo || producto.medida || '';
  
  if (producto.fecha) {
    texto += ` ${producto.fecha}`;
  }

  if (producto.clienteId === '3' && producto.noSumarKilos) {
    texto += ' sellada';
  }

  if (producto.tipo === 'otro') {
    texto += ` ${producto.tipoPersonalizado}`;
  } else if (producto.tipo) {
    texto += ` ${producto.tipo}`;
  }

  if (producto.precio) {
    // No añadir al texto, lo mostraremos separado en rojo
    return [
      { text: texto, color: 'black' },
      { text: ` $${Number(producto.precio).toLocaleString('en-US')}`, color: 'red', bold: true }
    ];
  }

  return texto;
}

function calcularKilosProducto(producto) {
  if (producto.tipo === 'c/h20') {
    const camaronNeto = producto.camaronNeto || 0.65;
    const totalBolsas = calcularTotalBolsas(producto);
    return totalBolsas * camaronNeto;
  }

  // Para productos sin h20
  const kilosBrutos = Array.isArray(producto.kilos) ? 
    producto.kilos.reduce((sum, kilo) => sum + (parseFloat(kilo) || 0), 0) : 0;

  if (producto.restarTaras) {
    const totalTaras = (Array.isArray(producto.taras) ? 
      producto.taras.reduce((sum, tara) => sum + (parseInt(tara) || 0), 0) : 0) * 3;
    return kilosBrutos - totalTaras;
  }
  return kilosBrutos;
}

function calcularTotalBolsas(producto) {
  if (!Array.isArray(producto.reporteTaras) || !Array.isArray(producto.reporteBolsas)) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < producto.reporteTaras.length; i++) {
    const tara = parseInt(producto.reporteTaras[i]) || 0;
    const bolsa = parseInt(producto.reporteBolsas[i]) || 0;
    total += tara * bolsa;
  }
  return total;
}

function calcularTotalKilos(productos) {
  return productos.reduce((total, producto) => {
    if (producto.tipo === 'c/h20') {
      // Para productos c/h20, usar el total de bolsas * valor neto
      const totalBolsas = calcularTotalBolsas(producto);
      return total + (totalBolsas * (producto.camaronNeto || 0.65));
    } else {
      // Para productos sin h20
      const kilosBrutos = producto.kilos ? producto.kilos.reduce((sum, kilo) => sum + (parseFloat(kilo) || 0), 0) : 0;
      const taras = producto.taras ? producto.taras.reduce((sum, tara) => sum + (parseInt(tara) || 0), 0) : 0;
      
      // Solo restar kilos por tara si restarTaras está activo
      if (producto.restarTaras) {
        return total + (kilosBrutos - (taras * 3));
      }
      return total + kilosBrutos;
    }
  }, 0);
}

function calcularTotalTaras(productos) {
  return productos.reduce((total, producto) => {
    // Sumar las taras del producto
    const tarasNormales = producto.taras ? producto.taras.reduce((sum, tara) => sum + (parseInt(tara) || 0), 0) : 0;
    const tarasExtra = producto.tarasExtra ? producto.tarasExtra.reduce((sum, tara) => sum + (parseInt(tara) || 0), 0) : 0;
    return total + tarasNormales + tarasExtra;
  }, 0);
}

function formatearKilos(kilos) {
  // Formatear con separador de miles y un decimal
  return kilos.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function generarTextoTarasYBolsas(producto) {
  // Ya no mostramos el total de taras al inicio
  let texto = '';

  // Agregar el detalle de taras y bolsas
  if (Array.isArray(producto.reporteTaras) && Array.isArray(producto.reporteBolsas)) {
    const detalles = [];
    let tarasAcumuladas = [];
    let bolsaActual = null;
    
    // Procesar cada par de tara y bolsa
    for (let i = 0; i < producto.reporteTaras.length; i++) {
      const tara = parseInt(producto.reporteTaras[i]);
      const bolsa = parseInt(producto.reporteBolsas[i]);
      
      if (!isNaN(tara) && !isNaN(bolsa)) {
        if (bolsa === bolsaActual) {
          tarasAcumuladas.push(tara);
        } else {
          if (tarasAcumuladas.length > 0) {
            detalles.push(`(${tarasAcumuladas.join(',')}-${bolsaActual})`);
          }
          tarasAcumuladas = [tara];
          bolsaActual = bolsa;
        }
      }
    }
    
    // Agregar el último grupo
    if (tarasAcumuladas.length > 0 && bolsaActual !== null) {
      detalles.push(`(${tarasAcumuladas.join(',')}-${bolsaActual})`);
    }

    texto = detalles.join('');
  }

  return texto;
}

function calcularTotalTarasSimple(producto) {
  // Sumar las taras del producto
  const tarasNormales = producto.taras ? 
    producto.taras.reduce((sum, tara) => sum + (parseInt(tara) || 0), 0) : 0;
  const tarasExtra = producto.tarasExtra ? 
    producto.tarasExtra.reduce((sum, tara) => sum + (parseInt(tara) || 0), 0) : 0;
  return tarasNormales + tarasExtra;
}
