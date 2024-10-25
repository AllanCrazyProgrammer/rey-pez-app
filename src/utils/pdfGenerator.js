import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

export async function generarNotaVentaPDF(embarque, clientesDisponibles) {
  try {
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
                    timeZone: 'UTC', // Cambiado de 'America/Mexico_City' a 'UTC'
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
    }
  });

  contenido.push(
    { text: `Total general de taras: ${totalTarasLimpio + totalTarasCrudos}`, style: 'subheader', margin: [0, 5, 0, 5] }
  );

  return contenido;
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
  
  // Si el tipo es "otro", usamos la medida y luego el tipo personalizado
  if (producto.tipo === 'otro' && producto.tipoPersonalizado) {
    return `${medida} ${producto.tipoPersonalizado.trim()}`.trim();
  }
  
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
    
    return h2o ? `${medida} ${h2o}` : medida;
  }
  
  // Mostrar solo la medida si no hay tipo
  if (medida && !tipoProducto) {
    return medida.trim();
  }
  
  // Para casos como "51/60 - Especial"
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
  // Primero calcular la suma de kilos
  const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => {
    // Convertir cada kilo a número, manejar tanto strings como números
    const kiloNum = typeof kilo === 'string' ? parseFloat(kilo) : (kilo || 0);
    return sum + kiloNum;
  }, 0);

  // Si el producto es de tipo c/h20, usar el cálculo basado en reporteTaras y reporteBolsas
  if (producto.tipo === 'c/h20') {
    const reporteTaras = producto.reporteTaras || [];
    const reporteBolsas = producto.reporteBolsas || [];
    let sumaTotalKilos = 0;

    for (let i = 0; i < reporteTaras.length; i++) {
      const taras = parseInt(reporteTaras[i]) || 0;
      const bolsa = parseInt(reporteBolsas[i]) || 0;
      sumaTotalKilos += taras * bolsa;
    }

    // Multiplicar por el valor neto (0.65 por defecto)
    const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
    return Number(kilosReales.toFixed(1));
  } else {
    // Para otros productos, calcular usando la lógica de taras
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
    
    // Agregar 3 kg si el producto es s/h2o y el cliente es Otilio
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
    const [cantidad] = item.taras.split('-').map(Number);
    kilosTotales += cantidad * 20.5;
  }
  if (item.sobrante) {
    const [, kilosSobrante] = item.sobrante.split('-').map(Number);
    kilosTotales += kilosSobrante;
  }
  return kilosTotales.toFixed(1);
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

