import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

export async function generarNotaVentaPDF(embarque, clientesDisponibles) {
  try {
    console.log('Datos del embarque para PDF:', {
      productos: embarque.productos,
      kilosCrudos: embarque.kilosCrudos,
      clienteCrudos: embarque.clienteCrudos,
      fecha: embarque.fecha,
      cargaCon: embarque.cargaCon
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
        ...generarContenidoClientes(embarque, clientesDisponibles),
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
        }
      },
      defaultStyle: {
        fontSize: 20
      },
      footer: function(currentPage, pageCount) {
        return {
          columns: [
            { text: '© 2024 Rey Pez - Tampico, Tamps.', alignment: 'center', margin: [0, 10, 0, 0] },
          ],
          margin: [40, 0, 40, 0],
          fontSize: 15,
          color: '#3760b0'
        };
      }
    };

    pdfMake.createPdf(docDefinition).download('nota-venta.pdf');
  } catch (error) {
    console.error('Error al generar el PDF:', error);
  }
}

function generarContenidoClientes(embarque, clientesDisponibles) {
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
    
    // Agrupar productos por medida y tipo
    const productosAgrupados = agruparProductos(productos);
    
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
    const medidaTipo = formatearProducto(producto);
    
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

  return Object.values(grupos);
}

function generarTablaProductos(productos, estiloCliente, nombreCliente) {
  const body = [
    [
      { text: 'Cantidad', style: 'tableHeader' },
      { text: 'Producto', style: 'tableHeader' },
      { text: 'Taras', style: 'tableHeader' }
    ],
    ...productos.map(producto => [
      `${totalKilos(producto, nombreCliente)} kg`,
      formatearProducto(producto),
      `${totalTaras(producto)} ${combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas)}`
    ])
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['25%', '35%', '40%'],
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
      { text: 'Taras', style: 'tableHeader' }
    ],
    ...crudos.flatMap(crudo => 
      crudo.items.map(item => [
        `${calcularKilosCrudos(item)} kg`,
        `${item.talla}`,
        calcularTarasTotales(item)
      ])
    )
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['30%', '35%', '35%'],
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
  let medida = producto.medida || '';
  
  // Si la medida tiene el formato numérico (ej. "51/60")
  if (/^\d+\/\d+/.test(medida)) {
    medida = medida.match(/^\d+\/\d+/)[0];
    
    // Verificar si tiene s/h2o o c/h2o en el tipo de producto
    let h2o = '';
    if (tipoProducto.toLowerCase().includes('s/h2o') || tipoProducto.toLowerCase().includes('s/h20')) {
      h2o = 's/h2o';
    } else if (tipoProducto.toLowerCase().includes('c/h2o') || tipoProducto.toLowerCase().includes('c/h20')) {
      h2o = 'c/h2o';
    }
    
    // Si el tipo es "otro", retornar la medida con el tipo personalizado
    if (producto.tipo === 'otro' && producto.tipoPersonalizado) {
      return `${medida} ${producto.tipoPersonalizado}`;
    }
    
    return h2o ? `${medida} ${h2o}` : medida;
  }
  
  // El resto de la función permanece igual...
  if (medida && !tipoProducto) {
    return medida.trim();
  }
  
  if (medida && tipoProducto) {
    return `${medida} ${tipoProducto}`.trim();
  }
  
  return tipoProducto.trim();
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

  if (/\d+\/\d+/.test(tipo)) {
    let parteNumerica = tipo.match(/\d+\/\d+/)[0];
    let h2o = '';
    // Verificar si tiene s/h2o o c/h2o
    if (tipo.toLowerCase().includes('s/h2o') || tipo.toLowerCase().includes('s/h20')) {
      h2o = 's/h2o';
    } else if (tipo.toLowerCase().includes('c/h2o') || tipo.toLowerCase().includes('c/h20')) {
      h2o = 'c/h2o';
    }
    
    return h2o ? `${parteNumerica} ${h2o}` : parteNumerica;
  }
  
  return tipo.trim();
}

function totalTaras(producto) {
  // Asegúrate de que las taras se sumen correctamente
  return producto.taras.reduce((sum, tara) => sum + (tara || 0), 0);
}

function totalKilos(producto, nombreCliente) {
  // Si el producto es de tipo c/h20, usar el cálculo basado en reporteTaras y reporteBolsas
  if (producto.tipo === 'c/h20') {
    const reporteTaras = producto.reporteTaras || [];
    const reporteBolsas = producto.reporteBolsas || [];
    let sumaTotalKilos = 0;

    for (let i = 0; i < reporteTaras.length; i++) {
      const taras = parseInt(reporteTaras[i]) || 0;
      const bolsa = parseInt(reporteBolsas[i]) || 0;
      // Ya no multiplicamos por el multiplicador de bolsas aquí
      sumaTotalKilos += taras * bolsa;
    }

    // Ya no multiplicamos por el valor neto (0.65)
    return Number(sumaTotalKilos.toFixed(1));
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
    
    if ((producto.tipo.toLowerCase().includes('s/h2o') || producto.tipo.toLowerCase().includes('s/h20')) && 
        nombreCliente.toLowerCase().includes('otilio')) {
      return Number((resultado + 3).toFixed(1));
    }
    
    return Number(resultado.toFixed(1));
  }
}


function calcularKilosCrudos(item) {
  let kilosTotales = 0;
  if (item.taras) {
    const [cantidad, peso] = item.taras.split('-').map(Number);
    kilosTotales += cantidad * peso;
  }
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

