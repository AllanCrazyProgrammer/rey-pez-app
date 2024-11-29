export function generarResumenLimpios(productosPorCliente, clienteColors) {
  const contenido = [
    { text: '', pageBreak: 'before' }
  ];

  let totalTarasGlobal = 0;
  let totalKilosGlobal = 0;

  Object.entries(productosPorCliente).forEach(([clienteId, productos]) => {
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

    // Header del cliente con tamaño ajustado
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
                  w: 120,
                  h: 25,
                  r: 8,
                  color: getClienteColor(clienteId)
                }
              ]
            },
            {
              text: obtenerNombreCliente(clienteId),
              color: 'white',
              fontSize: fontSize + 1,
              relativePosition: { x: 10, y: -20 }
            }
          ]
        },
        {
          text: `Total: ${tarasCliente}T | ${formatearKilos(kilosCliente)}Kg`,
          style: 'total',
          alignment: 'right',
          color: getClienteColor(clienteId),
          fontSize: fontSize + 1
        }
      ],
      margin: [0, 3, 0, 3]
    });

    // Calcular cuántas medidas por fila basado en el total
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
              fontSize: fontSize,
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
              margin: [0, 0, 0, 1],
              alignment: 'center'
            },
            {
              text: calcularTotalTarasSimple(producto) === 0 ? 
                [{ text: `${formatearKilos(calcularKilosProducto(producto))}`, color: 'red', bold: true }] :
                [
                  { text: `${calcularTotalTarasSimple(producto)}-`, bold: true },
                  { text: `${formatearKilos(calcularKilosProducto(producto))}`, color: 'red', bold: true }
                ],
              fontSize: fontSize,
              margin: [0, 1, 0, 1],
              alignment: 'center'
            },
            {
              text: generarTextoTarasYBolsas(producto),
              fontSize: fontSize - 1,
              margin: [0, 0, 0, 1],
              alignment: 'center'
            }
          ],
          width: `${100/medidasPorFila}%`,
          unbreakable: true,
          alignment: 'center'
        })),
        columnGap: 5,
        margin: [0, 0, 0, marginBottom],
        unbreakable: true
      });
    });

    // Separador entre clientes más delgado
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

function obtenerNombreCliente(clienteId) {
  const nombres = {
    '1': 'Joselito',
    '2': 'Catarro',
    '3': 'Otilio',
    '4': 'Ozuna'
  };
  return nombres[clienteId] || 'Cliente';
}

// Funciones auxiliares
function generarTextoMedida(producto) {
  let texto = producto.medida || '';
  
  if (producto.fecha) {
    texto += ` ${producto.fecha}`;
  }

  if (producto.tipo === 'c/h20') {
    texto += ` c/h20 (${producto.camaronNeto || 0.65})`;
  } else if (producto.tipo === 'otro') {
    texto += ` ${producto.tipoPersonalizado}`;
  } else if (producto.tipo) {
    texto += ` ${producto.tipo}`;
  }

  if (producto.precio) {
    texto += ` $${producto.precio}`;
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
