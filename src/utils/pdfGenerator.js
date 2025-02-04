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
        },
        nota: {
          fontSize: 18,
          color: '#666666',
          italics: true
        }
      },
      defaultStyle: {
        fontSize: 20
      },
      footer: function(currentPage, pageCount) {
        return {
          columns: [
            { text: ' 20 Rey Pez - Tampico, Tamps.', alignment: 'center', margin: [0, 10, 0, 0] },
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
      const productosAgrupados = {};
      
      productos.forEach(producto => {
        const medidaNombre = producto.nombreAlternativoPDF || producto.medida;
        const tipo = producto.tipo || '';
        const valorNeto = producto.camaronNeto || 0.65;
        
        // Crear una clave única para agrupar
        const clave = tipo === 'c/h20' 
          ? `${medidaNombre}-${tipo}-${valorNeto}`
          : `${medidaNombre}-${tipo}`;
        
        if (!productosAgrupados[clave]) {
          productosAgrupados[clave] = {
            ...producto,
            medida: medidaNombre,
            kilos: [...producto.kilos],
            taras: [...producto.taras],
            tarasExtra: [...(producto.tarasExtra || [])],
            reporteTaras: [...(producto.reporteTaras || [])],
            reporteBolsas: [...(producto.reporteBolsas || [])]
          };
        } else {
          // Combinar los kilos y taras
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
        }
      });
      
      productosAProcesar = Object.values(productosAgrupados);
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

function extraerMedidaBase(medida) {
  // Eliminar cualquier texto después de un espacio y convertir a minúsculas
  return medida.split(' ')[0].toLowerCase();
}

function agruparProductos(productos) {
  // Ordenar productos por medida y tipo, manteniendo separados los c/h2o con diferentes valores netos
  return productos.sort((a, b) => {
    // Usar nombreAlternativoPDF si existe, sino usar medida
    const medidaA = extraerMedidaBase(a.nombreAlternativoPDF || a.medida);
    const medidaB = extraerMedidaBase(b.nombreAlternativoPDF || b.medida);
    
    if (medidaA !== medidaB) {
      return medidaA.localeCompare(medidaB);
    }
    
    // Si las medidas son iguales, ordenar por tipo
    if (a.tipo !== b.tipo) {
      return a.tipo.localeCompare(b.tipo);
    }
    
    // Si son del mismo tipo y es c/h2o, ordenar por valor neto
    if (a.tipo === 'c/h20' && b.tipo === 'c/h20') {
      const valorNetoA = a.camaronNeto || 0.65;
      const valorNetoB = b.camaronNeto || 0.65;
      return valorNetoA - valorNetoB;
    }
    
    return 0;
  });
}

function generarTablaProductos(productos, estiloCliente, nombreCliente) {
  // Verificar si algún producto tiene notas o hilos
  const hayNotas = productos.some(producto => producto.nota && producto.nota.trim() !== '');
  const hayHilos = productos.some(producto => producto.hilos);

  // Definir las columnas del header
  const headerRow = [
    { text: 'Kg', style: 'tableHeader' },
    { text: 'Producto', style: 'tableHeader' },
    { text: 'Taras', style: 'tableHeader' }
  ];

  if (hayHilos) {
    headerRow.push({ text: 'Hilos', style: 'tableHeader' });
  }
  if (hayNotas) {
    headerRow.push({ text: 'Notas', style: 'tableHeader' });
  }

  const body = [headerRow];

  productos.forEach(producto => {
    const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
    const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
    
    const tarasTotales = tarasNormales + tarasExtra;
    let tarasTexto = `${tarasTotales} ${combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas)}`;

    const row = [
      `${totalKilos(producto, nombreCliente)} kg`,
      formatearProducto(producto),
      tarasTexto
    ];

    if (hayHilos) {
      row.push(producto.hilos || '');
    }
    if (hayNotas) {
      row.push({
        text: producto.nota || '',
        style: 'nota'
      });
    }

    body.push(row);
  });

  let widths;
  if (hayHilos && hayNotas) {
    widths = ['15%', '25%', '25%', '15%', '20%'];
  } else if (hayHilos) {
    widths = ['20%', '30%', '30%', '20%'];
  } else if (hayNotas) {
    widths = ['20%', '30%', '30%', '20%'];
  } else {
    widths = ['25%', '35%', '40%'];
  }

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
  // Verificar si algún ítem tiene precio
  const hayPrecios = crudos.some(crudo => 
    crudo.items.some(item => item.precio && item.precio.toString().trim() !== '')
  );

  // Definir las columnas del header según si hay precios o no
  const headerRow = [
    { text: 'Cantidad', style: 'tableHeader' },
    { text: 'Talla', style: 'tableHeader' },
    { text: 'Taras', style: 'tableHeader' }
  ];

  // Agregar columna de precio solo si hay precios
  if (hayPrecios) {
    headerRow.push({ text: 'Precio', style: 'tableHeader' });
  }

  const body = [headerRow];

  // Agregar las filas de datos
  crudos.forEach(crudo => 
    crudo.items.forEach(item => {
      const row = [
        `${calcularKilosCrudos(item)} kg`,
        {
          text: item.talla.replace(/\s*c\/\s*c$/i, ' c/c'),
          style: 'default',
          noWrap: true
        },
        calcularTarasTotales(item)
      ];

      // Agregar precio formateado solo si la columna existe
      if (hayPrecios) {
        row.push(item.precio ? { text: `$${Number(item.precio).toLocaleString('en-US')}`, style: 'precio' } : '');
      }

      body.push(row);
    })
  );

  // Definir los anchos de columna según si hay precios o no
  const widths = hayPrecios
    ? ['25%', '30%', '25%', '20%']  // Con columna de precio
    : ['30%', '40%', '30%'];        // Sin columna de precio

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

function obtenerEstiloCliente(nombreCliente) {
  const nombreLowerCase = nombreCliente.toLowerCase();
  if (nombreLowerCase.includes('joselito')) return 'clienteJoselito';
  if (nombreLowerCase.includes('catarro')) return 'clienteCatarro';
  if (nombreLowerCase.includes('otilio')) return 'clienteOtilio';
  if (nombreLowerCase.includes('ozuna')) return 'clienteOzuna';
  return 'clienteOtro';
}

function formatearProducto(producto) {
  let medida = (producto.nombreAlternativoPDF || producto.medida || '').trim();
  let precioStr = producto.precio ? ` $${Number(producto.precio).toLocaleString('en-US')}` : '';
  
  // Si es c/h20, agregar el indicador pero mantener el nombre original
  if (producto.tipo === 'c/h20') {
    return [
      { text: `${medida} c/h2o`, style: 'tipoConAgua' },
      { text: precioStr, style: 'precio' }
    ].filter(item => item.text);
  }
  
  // Si es s/h20, agregar el indicador pero mantener el nombre original
  if (producto.tipo === 's/h20') {
    return [
      { text: `${medida} s/h2o`, style: 'default' },
      { text: precioStr, style: 'precio' }
    ].filter(item => item.text);
  }
  
  // Para otros tipos, mostrar el nombre exacto con el tipo si existe
  let tipoProducto = producto.tipo === 'otro' ? producto.tipoPersonalizado : producto.tipo;
  let textoFinal = tipoProducto ? `${medida} ${tipoProducto}` : medida;
  
  return [
    { text: textoFinal, style: 'default' },
    { text: precioStr, style: 'precio' }
  ].filter(item => item.text);
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
  const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
  const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
  return tarasNormales + tarasExtra;
}

function totalKilos(producto, nombreCliente) {
  const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (kilo || 0), 0);
  const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
  const descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
  
  let resultado = sumaKilos - descuentoTaras;
  
  // Modificar esta parte para considerar noSumarKilos
  if (!producto.noSumarKilos && 
      (producto.tipo.toLowerCase().includes('s/h2o') || 
       producto.tipo.toLowerCase().includes('s/h20'))) {
    if (nombreCliente.toLowerCase().includes('catarro')) {
      resultado += 1;
    }
    // Comentado: ya no sumar 3kg para Otilio
    // if (nombreCliente.toLowerCase().includes('otilio')) {
    //   resultado += 3;
    // }
  }
  
  return Number(resultado.toFixed(1));
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
    // Usar nombreAlternativoPDF si existe, sino usar medida
    const medidaNombre = producto.nombreAlternativoPDF || producto.medida;
    const tipo = producto.tipo || '';
    const valorNeto = producto.camaronNeto || 0.65;
    
    // Para productos c/h2o, incluir el valor neto en la clave para mantenerlos separados
    const clave = tipo === 'c/h20' 
      ? `${medidaNombre}-${tipo}-${valorNeto}`
      : `${medidaNombre}-${tipo}`;
    
    if (!productosAgrupados[clave]) {
      productosAgrupados[clave] = {
        ...producto,
        medida: medidaNombre,
        kilos: [...producto.kilos],
        taras: [...producto.taras],
        tarasExtra: [...(producto.tarasExtra || [])],
        reporteTaras: [...(producto.reporteTaras || [])],
        reporteBolsas: [...(producto.reporteBolsas || [])]
      };
    } else {
      // Combinar los kilos y taras
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
    }
  });
  
  return Object.values(productosAgrupados);
}