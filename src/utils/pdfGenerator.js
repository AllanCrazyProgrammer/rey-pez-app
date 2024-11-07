import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.default;

export async function generarNotaVentaPDF(embarque, clientesDisponibles, clientesJuntarMedidas) {
  try {
    console.log('Datos del embarque para PDF:', {
      productos: embarque.productos,
      kilosCrudos: embarque.kilosCrudos,
      clienteCrudos: embarque.clienteCrudos,
      fecha: embarque.fecha,
      cargaCon: embarque.cargaCon,
      clientesJuntarMedidas: clientesJuntarMedidas
    });

    if (!embarque || !embarque.productos) {
      console.warn('El embarque no contiene datos de productos válidos');
      return;
    }

    const logoBase64 = await loadImageAsBase64('https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png');
    
    const docDefinition = {
      content: [
        {
          columns: [
            {
              image: logoBase64,
              width: 100,
              alignment: 'left',
              margin: [0, 0, 0, 10]
            },
            {
              text: 'Nota de Venta',
              style: 'notaVentaHeader',
              alignment: 'center',
              margin: [0, 20, 0, 0]
            },
            {
              stack: [
                {
                  text: `Fecha: ${new Date(embarque.fecha).toLocaleString('es-MX', { 
                    timeZone: 'UTC',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })}`,
                  alignment: 'right',
                  margin: [0, 20, 0, 0]
                },
                {
                  text: `Carga con: ${embarque.cargaCon || 'No especificado'}`,
                  alignment: 'right',
                  margin: [0, 5, 0, 0]
                }
              ]
            }
          ]
        },
        { text: '\n' },
        ...generarContenidoClientes(embarque, clientesDisponibles, clientesJuntarMedidas),
        // Agregar la nueva sección de rendimientos
        ...generarSeccionRendimientos({
          ...embarque,
          // Asegurarnos de que los kilos crudos estén disponibles
          kilosCrudos: embarque.kilosCrudos || {}
        }, clientesDisponibles),
      ],
      styles: {
        notaVentaHeader: {
          color: '#3760b0',
          fontSize: 30,
          bold: true,
          italics: true,
        },
        header: {
          fontSize: 30,
          bold: true,
          color: '#2980b9',
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 25,
          bold: true,
          margin: [0, 10, 0, 5]
        },
        tableHeader: {
          bold: true,
          fontSize: 23,
          color: 'black',
          fillColor: '#ecf0f1'
        },
        clienteJoselito: {
          color: '#FFFFFF',
          background: '#0000FF',
          padding: [2, 2, 2, 2]
        },
        clienteCatarro: {
          color: '#FFFFFF',
          background: '#FF0000',
          padding: [2, 2, 2, 2]
        },
        clienteOtilio: {
          color: '#000000',
          background: '#FFD700',
          padding: [2, 2, 2, 2]
        },
        clienteOzuna: {
          color: '#FFFFFF',
          background: '#008000',
          padding: [2, 2, 2, 2]
        },
        clienteOtro: {
          color: '#000000',
          background: '#808080',
          padding: [2, 2, 2, 2]
        },
        medidaHeader: {
          fontSize: 24,
          bold: true,
          color: '#2c3e50',
          margin: [0, 10, 0, 5]
        },
        precio: {
          color: '#FFFFFF',
          background: '#FF0000',
          padding: [2, 2, 2, 2]
        },
        tipoConAgua: {
          color: '#2980b9',  // Color azul
          bold: true
        }
      },
      defaultStyle: {
        fontSize: 20
      },
      footer: function(currentPage, pageCount) {
        return {
          columns: [
            { text: ' 2024 Rey Pez - Tampico, Tamps.', alignment: 'center', margin: [0, 10, 0, 0] },
          ],
          margin: [40, 0, 40, 0],
          fontSize: 15,
          color: '#3760b0'
        };
      }
    };

    // Crear el documento PDF y verificar número de páginas
    pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
      // Crear un Uint8Array del buffer para contar las páginas
      const pdfData = new Uint8Array(buffer);
      // Contar ocurrencias de "/Page" para estimar número de páginas
      const numPages = buffer.toString().match(/\/Page\W/g).length;
      
      if (numPages > 1) {
        // Ajustar tamaños si excede una página
        const docDefinitionAjustado = {
          ...docDefinition,
          defaultStyle: {
            ...docDefinition.defaultStyle,
            fontSize: 16 // Reducir de 20 a 16
          },
          styles: {
            ...docDefinition.styles,
            notaVentaHeader: {
              ...docDefinition.styles.notaVentaHeader,
              fontSize: 24 // Reducir de 30 a 24
            },
            header: {
              ...docDefinition.styles.header,
              fontSize: 24 // Reducir de 30 a 24
            },
            subheader: {
              ...docDefinition.styles.subheader,
              fontSize: 20 // Reducir de 25 a 20
            },
            tableHeader: {
              ...docDefinition.styles.tableHeader,
              fontSize: 18 // Reducir de 23 a 18
            },
            medidaHeader: {
              ...docDefinition.styles.medidaHeader,
              fontSize: 20 // Reducir de 24 a 20
            }
          }
        };
        
        // Crear y descargar el PDF con los ajustes
        pdfMake.createPdf(docDefinitionAjustado).download('nota-venta.pdf');
      } else {
        // Si es una sola página, descargar el original
        pdfMake.createPdf(docDefinition).download('nota-venta.pdf');
      }
    });

  } catch (error) {
    console.error('Error al generar el PDF:', error);
  }
}

function generarContenidoClientes(embarque, clientesDisponibles, clientesJuntarMedidas) {
  const contenido = [];
  let totalTarasLimpio = 0;
  let totalTarasCrudos = 0;

  // Agrupar productos por cliente
  const productosPorCliente = embarque.productos.reduce((acc, producto) => {
    if (!acc[producto.clienteId]) {
      acc[producto.clienteId] = [];
    }
    acc[producto.clienteId].push(producto);
    return acc;
  }, {});

  Object.entries(productosPorCliente).forEach(([clienteId, productos]) => {
    const nombreCliente = obtenerNombreCliente(clienteId, clientesDisponibles);
    const estiloCliente = obtenerEstiloCliente(nombreCliente);
    
    // Verificar si este cliente específico tiene activada la opción de juntar medidas
    const debeJuntarMedidas = clientesJuntarMedidas && clientesJuntarMedidas[clienteId];
    
    // Procesar los productos según la configuración de juntar medidas
    let productosAProcesar = productos;
    if (debeJuntarMedidas) {
      productosAProcesar = combinarProductosSimilares(productos);
    }
    
    // Agrupar productos por medida y tipo
    const productosAgrupados = agruparProductos(productosAProcesar);
    
    contenido.push(
      { 
        text: `Cliente: ${nombreCliente}`, 
        style: ['subheader', estiloCliente],
        margin: [0, 5, 0, 5]
      },
      generarTablaProductos(productosAgrupados, estiloCliente, nombreCliente),
      { text: '\n' }
    );

    const tarasLimpioCliente = productos.reduce((sum, producto) => sum + totalTaras(producto), 0);
    totalTarasLimpio += tarasLimpioCliente;

    contenido.push(
      { 
        text: `Taras de limpio: ${tarasLimpioCliente}`, 
        margin: [0, 5, 0, 5]
      },
      { text: '\n' }
    );

    if (embarque.clienteCrudos && embarque.clienteCrudos[clienteId]) {
      contenido.push(
        { 
          text: 'Crudos:', 
          style: ['subheader', estiloCliente],
          margin: [0, 5, 0, 5]
        },
        generarTablaCrudos(embarque.clienteCrudos[clienteId], estiloCliente),
        { text: '\n' }
      );

      const tarasCrudosCliente = embarque.clienteCrudos[clienteId].reduce((sum, crudo) => 
        sum + crudo.items.reduce((itemSum, item) => itemSum + calcularTarasTotales(item), 0), 0);
      totalTarasCrudos += tarasCrudosCliente;

      contenido.push(
        { 
          text: `Taras de crudo: ${tarasCrudosCliente}`, 
          margin: [0, 5, 0, 5]
        },
        { text: '\n' }
      );

      // Agregar sección de rendimientos para Ozuna
      if (nombreCliente.toLowerCase().includes('ozuna')) {
        contenido.push(
          { 
            text: 'Rendimientos de Maquila:', 
            style: ['subheader', estiloCliente],
            margin: [0, 10, 0, 5]
          }
        );

        let totalKilosCrudos = 0;
        let totalKilosLimpios = 0;

        embarque.clienteCrudos[clienteId].forEach(crudo => {
          crudo.items.forEach(item => {
            const kilosCrudos = parseFloat(calcularKilosCrudos(item));
            const kilosLimpios = productos.reduce((sum, producto) => 
              sum + (producto.medida === item.talla && !producto.esVenta ? totalKilos(producto, nombreCliente) : 0), 0);
            
            totalKilosCrudos += kilosCrudos;
            totalKilosLimpios += kilosLimpios;

            const rendimiento = kilosLimpios > 0 ? (kilosCrudos / kilosLimpios).toFixed(2) : 'N/A';
            
            contenido.push(
              { 
                text: `Talla: ${item.talla}, Kilos Crudos: ${kilosCrudos.toFixed(2)} kg, Kilos Limpios: ${kilosLimpios.toFixed(2)} kg, Rendimiento: ${rendimiento}`, 
                margin: [0, 5, 0, 5]
              }
            );
          });
        });

        // Calcular y mostrar el rendimiento total
        const rendimientoTotal = totalKilosLimpios > 0 ? (totalKilosCrudos / totalKilosLimpios).toFixed(2) : 'N/A';
        contenido.push(
          { 
            text: `Rendimiento Total: ${rendimientoTotal}`, 
            style: ['subheader', estiloCliente],
            margin: [0, 10, 0, 5]
          }
        );
        
        contenido.push({ text: '\n' });
      }
    }
  });

  contenido.push(
    { text: `Total general de taras: ${totalTarasLimpio + totalTarasCrudos}`, style: 'subheader', margin: [0, 5, 0, 5] }
  );

  return contenido;
}

function generarSeccionRendimientos(embarque, clientesDisponibles) {
  const contenido = [];
  
  const productosMaquilaOzuna = embarque.productos.filter(producto => 
    producto.clienteId === "4" && !producto.esVenta
  );

  if (productosMaquilaOzuna.length > 0) {
    contenido.push(
      { text: 'Rendimientos de Maquila:', style: 'subheader', margin: [0, 20, 0, 10] }
    );

    const tablaRendimientos = {
      table: {
        headerRows: 1,
        widths: ['33%', '33%', '34%'],
        body: [
          [
            { text: 'Medida', style: 'tableHeader' },
            { text: 'Kilos en Crudo', style: 'tableHeader' },
            { text: 'Rendimiento', style: 'tableHeader' }
          ]
        ]
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => '#008000',
        vLineColor: () => '#008000',
      }
    };

    let totalKilosCrudos = 0;
    let totalKilosLimpios = 0;

    const productosPorMedida = productosMaquilaOzuna.reduce((acc, producto) => {
      const medida = producto.medida;
      if (!acc[medida]) {
        acc[medida] = [];
      }
      acc[medida].push(producto);
      return acc;
    }, {});

    Object.entries(productosPorMedida).forEach(([medida, productos]) => {
      const kilosLimpios = productos.reduce((sum, producto) => 
        sum + calcularKilosLimpios(producto), 0);

      let kilosCrudos = 0;
      const medidaKey = `${medida} Maquila Ozuna`;
      
      if (embarque.kilosCrudos && embarque.kilosCrudos[medidaKey]) {
        if (typeof embarque.kilosCrudos[medidaKey] === 'object') {
          kilosCrudos = Number(embarque.kilosCrudos[medidaKey].medida1 || 0) + 
                       Number(embarque.kilosCrudos[medidaKey].medida2 || 0);
        } else {
          kilosCrudos = Number(embarque.kilosCrudos[medidaKey]);
        }
      }

      const rendimiento = kilosLimpios > 0 ? kilosCrudos / kilosLimpios : 0;

      totalKilosCrudos += kilosCrudos;
      totalKilosLimpios += kilosLimpios;

      tablaRendimientos.table.body.push([
        { text: medida, alignment: 'center' },
        { text: `${kilosCrudos.toFixed(2)} kg`, alignment: 'center' },
        { 
          text: rendimiento.toFixed(2), 
          alignment: 'center',
          color: rendimiento > 1 ? '#27ae60' : '#000000',
          bold: rendimiento > 1
        }
      ]);
    });

    const rendimientoTotal = totalKilosLimpios > 0 ? totalKilosCrudos / totalKilosLimpios : 0;
    
    tablaRendimientos.table.body.push([
      { text: 'TOTAL', style: 'tableHeader', alignment: 'center' },
      { text: `${totalKilosCrudos.toFixed(2)} kg`, style: 'tableHeader', alignment: 'center' },
      { 
        text: rendimientoTotal.toFixed(2), 
        style: 'tableHeader',
        alignment: 'center',
        color: rendimientoTotal > 1 ? '#27ae60' : '#000000',
        bold: rendimientoTotal > 1
      }
    ]);

    contenido.push(tablaRendimientos);
  }

  return contenido;
}

function calcularKilosCrudosPorMedida(embarque, medida) {
  // Buscar en los crudos del cliente Ozuna
  const crudosOzuna = embarque.clienteCrudos?.["4"] || [];
  
  let kilosCrudos = 0;
  
  crudosOzuna.forEach(crudo => {
    crudo.items.forEach(item => {
      // Verificar si la talla del crudo corresponde a la medida
      if (convertirTallaAMedida(item.talla) === medida) {
        // Sumar kilos de taras principales
        if (item.taras) {
          const [cantidad, peso] = item.taras.split('-').map(Number);
          kilosCrudos += cantidad * peso;
        }
        // Sumar kilos de sobrante si existe
        if (item.sobrante) {
          const [cantidad, peso] = item.sobrante.split('-').map(Number);
          kilosCrudos += cantidad * peso;
        }
      }
    });
  });
  
  return kilosCrudos;
}

function convertirTallaAMedida(talla) {
  // Mapeo de tallas a medidas
  const mapeoTallas = {
    'Med c/c': '51/60',
    'Med-Esp c/c': '41/50',
    'Med-gde c/c': '36/40',
    'Gde c/c': '31/35',
    'Extra c/c': '21/25',
    'Jumbo c/c': 'U/15'
    // Agregar más mapeos según sea necesario
  };
  
  return mapeoTallas[talla] || talla;
}

function calcularKilosLimpios(producto) {
  if (producto.tipo === 'c/h20') {
    // Para productos con agua
    let totalKilos = 0;
    const reporteTaras = producto.reporteTaras || [];
    const reporteBolsas = producto.reporteBolsas || [];
    
    for (let i = 0; i < reporteTaras.length; i++) {
      const taras = parseInt(reporteTaras[i]) || 0;
      const bolsas = parseInt(reporteBolsas[i]) || 0;
      totalKilos += taras * bolsas;
    }
    
    return totalKilos * (producto.camaronNeto || 0.65);
  } else {
    // Para productos sin agua
    const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
    const sumaTaras = producto.taras.reduce((sum, tara) => sum + (Number(tara) || 0), 0);
    const sumaTarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
    const totalTaras = sumaTaras + sumaTarasExtra;
    const descuentoTaras = producto.restarTaras ? totalTaras * 3 : 0;
    
    return sumaKilos - descuentoTaras;
  }
}

function calcularKilosCrudosDesdeReporte(producto) {
  // Si el producto tiene un valor directo de kilos en crudo, usarlo
  if (producto.kilosCrudos) {
    return Number(producto.kilosCrudos);
  }
  
  let totalKilos = 0;
  
  // Si tenemos reporteTaras y reporteBolsas
  if (producto.reporteTaras && producto.reporteBolsas) {
    for (let i = 0; i < producto.reporteTaras.length; i++) {
      const taras = parseInt(producto.reporteTaras[i]) || 0;
      const bolsas = parseInt(producto.reporteBolsas[i]) || 0;
      totalKilos += taras * bolsas;
    }
  }
  
  return totalKilos;
}

function agruparProductos(productos) {
  // Creamos un objeto para agrupar por medida y tipo
  const grupos = productos.reduce((acc, producto) => {
    // La clave única combina medida y tipo (incluyendo s/h2o o c/h2o)
    const medidaTipo = `${producto.medida || ''} ${producto.tipo || ''}`.trim();
    
    if (!acc[medidaTipo]) {
      acc[medidaTipo] = {
        ...producto,
        kilos: [],
        taras: [],
        reporteTaras: [],
        reporteBolsas: [],
        totalKilos: 0,
        totalTaras: 0
      };
    }
    
    // Agregamos los kilos y taras al grupo
    acc[medidaTipo].kilos = [...acc[medidaTipo].kilos, ...producto.kilos];
    acc[medidaTipo].taras = [...acc[medidaTipo].taras, ...producto.taras];
    acc[medidaTipo].reporteTaras = [...acc[medidaTipo].reporteTaras, ...producto.reporteTaras];
    acc[medidaTipo].reporteBolsas = [...acc[medidaTipo].reporteBolsas, ...producto.reporteBolsas];
    
    // Actualizamos los totales
    acc[medidaTipo].totalKilos = acc[medidaTipo].kilos.reduce((sum, kilo) => sum + (kilo || 0), 0);
    acc[medidaTipo].totalTaras = acc[medidaTipo].taras.reduce((sum, tara) => sum + (tara || 0), 0);
    
    return acc;
  }, {});

  // Convertir a array y ordenar
  return Object.values(grupos).sort((a, b) => {
    // Extraer los números de las medidas (ejemplo: "51/60" -> [51, 60])
    const getMedidaNumeros = (medida) => {
      const match = (medida || '').match(/(\d+)\/(\d+)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2])];
      }
      return [Infinity, Infinity]; // Para medidas sin números
    };

    const [numA1, numA2] = getMedidaNumeros(a.medida);
    const [numB1, numB2] = getMedidaNumeros(b.medida);

    // Ordenar por el primer número (si son iguales, usar el segundo)
    if (numA1 === numB1) {
      return numA2 - numB2;
    }
    return numA1 - numB1;
  });
}

function generarTablaProductos(productos, estiloCliente, nombreCliente) {
  const headers = [
    { text: 'Cantidad', style: 'tableHeader' },
    { text: 'Producto', style: 'tableHeader' },
    { text: 'Taras', style: 'tableHeader' }
  ];

  // Agregar columna de notas si al menos un producto tiene nota
  const algunProductoTieneNota = productos.some(p => p.nota);
  if (algunProductoTieneNota) {
    headers.push({ text: 'Nota', style: 'tableHeader' });
  }

  const algunProductoTieneHilos = productos.some(p => p.hilos);
  if (algunProductoTieneHilos) {
    headers.push({ text: 'Hilos', style: 'tableHeader' });
  }

  const body = [
    headers,
    ...productos.map(producto => {
      const row = [
        `${totalKilos(producto, nombreCliente)} kg`,
        formatearProducto(producto),
        `${totalTaras(producto)} ${combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas)}`
      ];

      // Agregar columna de nota si existe la columna
      if (algunProductoTieneNota) {
        row.push(producto.nota || '');
      }

      if (algunProductoTieneHilos) {
        row.push(producto.hilos || '');
      }

      return row;
    })
  ];

  const widths = algunProductoTieneHilos 
    ? (algunProductoTieneNota ? ['15%', '25%', '25%', '20%', '15%'] : ['20%', '30%', '30%', '20%'])
    : (algunProductoTieneNota ? ['25%', '30%', '25%', '20%'] : ['25%', '35%', '40%']);

  return {
    table: {
      headerRows: 1,
      widths: widths,
      body: body
    },
    layout: {
      hLineWidth: function(i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
      vLineWidth: function(i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
      hLineColor: function(i, node) { return (i === 0 || i === node.table.body.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
      vLineColor: function(i, node) { return (i === 0 || i === node.table.widths.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
    }
  };
}

function generarTablaCrudos(crudos, estiloCliente) {
  const body = [
    [
      { text: 'Cantidad', style: 'tableHeader' },
      { text: 'Talla', style: 'tableHeader' },
      { text: 'Taras', style: 'tableHeader' },
      { text: 'Precio', style: 'tableHeader' }
    ],
    ...crudos.flatMap(crudo => 
      crudo.items.map(item => [
        `${calcularKilosCrudos(item)} kg`,
        {
          text: item.talla.replace(/\s*c\/\s*c$/i, ' c/c'),
          style: 'default',
          noWrap: true
        },
        calcularTarasTotales(item),
        item.precio ? { text: `$${item.precio}`, style: 'precio' } : ''
      ])
    )
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['25%', '30%', '25%', '20%'],
      body: body
    },
    layout: {
      hLineWidth: function(i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
      vLineWidth: function(i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
      hLineColor: function(i, node) { return (i === 0 || i === node.table.body.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
      vLineColor: function(i, node) { return (i === 0 || i === node.table.widths.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
    }
  };
}

function obtenerEstiloCliente(nombreCliente) {
  const nombreLowerCase = nombreCliente.toLowerCase();
  if (nombreLowerCase.includes('joselito')) return 'clienteJoselito';
  if (nombreLowerCase.includes('catarro')) return 'clienteCatarro';
  if (nombreLowerCase.includes('otilio')) return 'clienteOtilio';
  if (nombreLowerCase.includes('ozuna')) return 'clienteOzuna';
  return 'clienteOtro';
}

function formatearProducto(producto) {
  let tipoProducto = obtenerTipoProducto(producto);
  let medida = (producto.medida || '').replace(/\s+/g, ' ').trim();
  let precioStr = producto.precio ? ` $${producto.precio}` : '';
  
  // Verificar si la medida contiene "especial" (case insensitive)
  const esEspecial = medida.toLowerCase().includes('especial');
  
  if (medida.includes('-')) {
    medida = medida.replace(/\s*-\s*/g, '-');
  }
  
  if (/^\d+\/\d+/.test(medida)) {
    // Extraer solo la parte numérica (ej: "51/60")
    medida = medida.match(/^\d+\/\d+/)[0];
    
    // Si es especial, solo mostrar la medida con "especial"
    if (esEspecial) {
      return [
        { text: `${medida} especial`, style: producto.tipo === 'c/h20' ? 'tipoConAgua' : 'default' },
        { text: precioStr, style: 'precio' }
      ];
    }
    
    // Si no es especial, continuar con la lógica normal de h2o
    let h2o = '';
    if (tipoProducto.toLowerCase().includes('s/h2o') || tipoProducto.toLowerCase().includes('s/h20')) {
      h2o = 's/h2o';
    } else if (tipoProducto.toLowerCase().includes('c/h2o') || tipoProducto.toLowerCase().includes('c/h20')) {
      h2o = 'c/h2o';
    }
    
    if (producto.tipo === 'otro' && producto.tipoPersonalizado) {
      return [
        { text: `${medida} ${producto.tipoPersonalizado}`, style: producto.tipo === 'c/h20' ? 'tipoConAgua' : 'default' },
        { text: precioStr, style: 'precio' }
      ];
    }
    
    return [
      { text: h2o ? `${medida} ${h2o}` : `${medida}`, style: producto.tipo === 'c/h20' ? 'tipoConAgua' : 'default' },
      { text: precioStr, style: 'precio' }
    ];
  }
  
  // Para medidas que no siguen el patrón numérico
  if (medida && !tipoProducto) {
    if (esEspecial && !medida.toLowerCase().endsWith('especial')) {
      medida = `${medida} especial`;
    }
    return [
      { text: medida, style: producto.tipo === 'c/h20' ? 'tipoConAgua' : 'default' },
      { text: precioStr, style: 'precio' }
    ];
  }
  
  if (medida && tipoProducto) {
    if (esEspecial) {
      // Si es especial, solo mostrar la medida con "especial"
      return [
        { text: `${medida} especial`, style: producto.tipo === 'c/h20' ? 'tipoConAgua' : 'default' },
        { text: precioStr, style: 'precio' }
      ];
    }
    return [
      { text: `${medida} ${tipoProducto}`, style: producto.tipo === 'c/h20' ? 'tipoConAgua' : 'default' },
      { text: precioStr, style: 'precio' }
    ];
  }
  
  return [
    { text: tipoProducto, style: producto.tipo === 'c/h20' ? 'tipoConAgua' : 'default' },
    { text: precioStr, style: 'precio' }
  ];
}

function calcularTarasTotales(item) {
  let tarasTotales = 0;
  if (item.taras) {
    const [cantidad] = item.taras.split('-').map(Number);
    tarasTotales += cantidad;
  }
  if (item.sobrante) {
    const [cantidadSobrante] = item.sobrante.split('-').map(Number);
    tarasTotales += cantidadSobrante;
  }
  return tarasTotales;
}

function obtenerNombreCliente(clienteId, clientesDisponibles) {
  if (!clientesDisponibles || !Array.isArray(clientesDisponibles)) {
    console.warn('La lista de clientes disponibles no es válida');
    return 'Cliente Desconocido';
  }
  const cliente = clientesDisponibles.find(c => c.id.toString() === clienteId.toString());
  return cliente ? cliente.nombre : 'Cliente Desconocido';
}

function obtenerTipoProducto(producto) {
  let tipo = producto.tipo === 'otro' ? (producto.tipoPersonalizado || 'Otro') : (producto.tipo || '');

  // Reemplazar saltos de lnea o espacios múltiples con un solo espacio
  tipo = tipo.replace(/\s+/g, ' ').trim();
  
  if (/\d+\/\d+/.test(tipo)) {
    let parteNumerica = tipo.match(/\d+\/\d+/)[0];
    let h2o = '';
    if (tipo.toLowerCase().includes('s/h2o') || tipo.toLowerCase().includes('s/h20')) {
      h2o = 's/h2o';
    } else if (tipo.toLowerCase().includes('c/h2o') || tipo.toLowerCase().includes('c/h20')) {
      h2o = 'c/h2o';
    }
    
    return h2o ? `${parteNumerica} ${h2o}` : parteNumerica;
  }
  
  return tipo;
}

function totalTaras(producto) {
  // Asegúrate de que las taras se sumen correctamente
  return producto.taras.reduce((sum, tara) => sum + (tara || 0), 0);
}

function totalKilos(producto, nombreCliente) {
  // Si el producto es de tipo c/h20
  if (producto.tipo === 'c/h20') {
    const kilosTotales = (producto.kilos || []).reduce((sum, kilo) => {
      const kiloNum = typeof kilo === 'string' ? parseFloat(kilo) : (kilo || 0);
      return sum + kiloNum;
    }, 0);
    
    // Calcular el peso total de las taras
    const pesoTaras = (producto.taras || []).reduce((sum, tara) => {
      const taraNum = typeof tara === 'string' ? parseFloat(tara) : (tara || 0);
      return sum + (taraNum * 3); // Multiplicar por 3 kg que pesa cada tara
    }, 0);
    
    // Restar el peso de las taras si producto.restarTaras es true
    const kilosNetos = producto.restarTaras ? kilosTotales - pesoTaras : kilosTotales;
    
    return Number(kilosNetos.toFixed(1));
  } else {
    // Para otros productos, mantener la lógica existente...
    const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => {
      const kiloNum = typeof kilo === 'string' ? parseFloat(kilo) : (kilo || 0);
      return sum + kiloNum;
    }, 0);

    const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => {
      const taraNum = typeof tara === 'string' ? parseFloat(tara) : (tara || 0);
      return sum + taraNum;
    }, 0);

    const sumaTarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => {
      const taraNum = typeof tara === 'string' ? parseFloat(tara) : (tara || 0);
      return sum + taraNum;
    }, 0);

    const totalTaras = sumaTarasNormales + sumaTarasExtra;
    const descuentoTaras = producto.restarTaras ? totalTaras * 3 : 0;
    
    const resultado = sumaKilos - descuentoTaras;
    
    if (producto.tipo.toLowerCase().includes('s/h2o') || producto.tipo.toLowerCase().includes('s/h20')) {
      if (nombreCliente.toLowerCase().includes('otilio')) {
        return Number((resultado + 3).toFixed(1));
      } else if (nombreCliente.toLowerCase().includes('catarro')) {
        return Number((resultado + 1).toFixed(1));
      }
    }
    
    return Number(resultado.toFixed(1));
  }
}


function calcularKilosCrudos(item) {
  let kilosTotales = 0;
  
  // Procesar taras principales
  if (item.taras) {
    const [cantidad, peso] = item.taras.split('-').map(Number);
    // Multiplicar por 20.5 en lugar del peso especificado
    kilosTotales += cantidad * 20.5;
  }
  
  // Procesar sobrante (se suma directamente el peso especificado)
  if (item.sobrante) {
    const [, kilosSobrante] = item.sobrante.split('-').map(Number);
    kilosTotales += kilosSobrante;
  }
  
  return kilosTotales.toFixed(2);
}

function combinarTarasBolsas(taras, bolsas) {
  const combinado = {};
  
  taras.forEach((tara, index) => {
    const bolsa = bolsas[index] || '';
    if (!combinado[bolsa]) {
      combinado[bolsa] = 0;
    }
    combinado[bolsa] += parseInt(tara || 1);
  });

  return Object.entries(combinado)
    .map(([bolsa, count]) => `(${count}-${bolsa})`)
    .join(' ');
}

function obtenerColorBorde(estiloCliente) {
  const colores = {
    clienteJoselito: '#0000FF',
    clienteCatarro: '#FF0000',
    clienteOtilio: '#FFD700',
    clienteOzuna: '#008000',
    clienteOtro: '#808080'
  };
  return colores[estiloCliente] || '#000000';
}

function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function combinarProductosPorMedida(productos) {
  const productosCombinados = {};

  productos.forEach(producto => {
    const medidaNormalizada = normalizarMedida(producto.medida);
    if (!productosCombinados[medidaNormalizada]) {
      productosCombinados[medidaNormalizada] = {
        ...producto,
        kilos: 0,
        bolsas: 0
      };
    }
    productosCombinados[medidaNormalizada].kilos += producto.kilos;
    productosCombinados[medidaNormalizada].bolsas += producto.bolsas;
  });

  return Object.values(productosCombinados);
}

function normalizarMedida(medida) {
  // Normalizar la medida para combinar productos similares
  return medida.replace(/\s+/g, '').toLowerCase();
}

// Nueva función para combinar productos similares
function combinarProductosSimilares(productos) {
  const productosAgrupados = {};

  productos.forEach(producto => {
    // Extraer solo el número de medida (ej: "51/60" de "51/60 ahumada")
    const medidaBase = extraerMedidaBase(producto.medida);
    const tipo = producto.tipo || '';
    
    // Si la medida base es diferente a la medida completa, significa que tiene texto adicional
    const medidaCompleta = producto.medida || '';
    
    // Crear una clave única dependiendo de si queremos combinar o no
    const clave = `${medidaBase}-${tipo}`;
    
    if (!productosAgrupados[clave]) {
      // Crear una copia del producto como base
      productosAgrupados[clave] = {
        ...producto,
        medida: medidaBase, // Usar la medida base al combinar
        kilos: [...producto.kilos],
        taras: [...producto.taras],
        tarasExtra: [...(producto.tarasExtra || [])],
        reporteTaras: [...(producto.reporteTaras || [])],
        reporteBolsas: [...(producto.reporteBolsas || [])]
      };
    } else {
      // Combinar los arrays de kilos y taras
      productosAgrupados[clave].kilos.push(...producto.kilos);
      productosAgrupados[clave].taras.push(...producto.taras);
      if (producto.tarasExtra) {
        productosAgrupados[clave].tarasExtra.push(...producto.tarasExtra);
      }
      if (producto.reporteTaras) {
        productosAgrupados[clave].reporteTaras.push(...producto.reporteTaras);
      }
      if (producto.reporteBolsas) {
        productosAgrupados[clave].reporteBolsas.push(...producto.reporteBolsas);
      }
      
      // Si hay precio, mantener el más alto
      if (producto.precio) {
        productosAgrupados[clave].precio = Math.max(
          productosAgrupados[clave].precio || 0,
          producto.precio
        );
      }
      
      // Si hay hilos, concatenarlos
      if (producto.hilos) {
        productosAgrupados[clave].hilos = productosAgrupados[clave].hilos 
          ? `${productosAgrupados[clave].hilos}, ${producto.hilos}`
          : producto.hilos;
      }
    }
  });

  return Object.values(productosAgrupados);
}

// Nueva función para extraer la medida base
function extraerMedidaBase(medida) {
  if (!medida) return '';
  // Buscar patrones como "51/60", "36/40", etc.
  const match = medida.match(/\d+\/\d+/);
  return match ? match[0] : medida;
}

// Agregar esta función auxiliar
function formatearMedida(medida) {
  if (medida && medida.toLowerCase().includes('especial')) {
    return `${medida} especial`; // Agrega "(ESP)" a las medidas especiales
  }
  return medida;
}

// Modificar la función que genera las filas de la tabla
function generarFilasTabla(productos, juntarMedidas = false) {
  let filas = [];
  let medidaActual = '';
  let acumulado = {
    taras: 0,
    kilos: 0,
    precio: null,
    hilos: null
  };

  productos.forEach((producto, index) => {
    const medidaFormateada = formatearMedida(producto.medida);
    
    if (juntarMedidas) {
      if (medidaFormateada !== medidaActual) {
        // Si hay acumulado anterior, agregarlo como fila
        if (medidaActual) {
          filas.push([
            medidaActual,
            acumulado.taras.toString(),
            acumulado.kilos.toFixed(1),
            acumulado.precio ? `$${acumulado.precio}` : '',
            acumulado.hilos || ''
          ]);
        }
        // Iniciar nuevo acumulado
        medidaActual = medidaFormateada;
        acumulado = {
          taras: calcularTotalTaras(producto),
          kilos: calcularTotalKilos(producto),
          precio: producto.precio,
          hilos: producto.hilos
        };
      } else {
        // Sumar al acumulado actual
        acumulado.taras += calcularTotalTaras(producto);
        acumulado.kilos += calcularTotalKilos(producto);
      }
    } else {
      // Si no se están juntando medidas, agregar cada producto como una fila individual
      filas.push([
        medidaFormateada,
        calcularTotalTaras(producto).toString(),
        calcularTotalKilos(producto).toFixed(1),
        producto.precio ? `$${producto.precio}` : '',
        producto.hilos || ''
      ]);
    }
  });

  // Agregar el último acumulado si estamos juntando medidas
  if (juntarMedidas && medidaActual) {
    filas.push([
      medidaActual,
      acumulado.taras.toString(),
      acumulado.kilos.toFixed(1),
      acumulado.precio ? `$${acumulado.precio}` : '',
      acumulado.hilos || ''
    ]);
  }

  return filas;
}

