import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { generarResumenLimpios } from './resumenLimpios';

// Verificar y asignar vfs de manera segura
if (typeof pdfFonts === 'object' && pdfFonts.hasOwnProperty('default')) {
  pdfMake.vfs = pdfFonts.default;
} else if (typeof pdfFonts === 'object' && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else {
  console.error('No se pudo inicializar vfs para pdfMake');
}

pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

// Definir colores para cada cliente
const clienteColors = {
  'Joselito': '#3498db',
  'Catarro': '#e74c3c',
  'Otilio': '#f1c40f',
  'Ozuna': '#2ecc71',
  'Canelo': '#9b59b6'
};

// Definir el orden específico de las medidas
const ordenMedidas = [
  'Med',
  'Med-Esp',
  'Med-Gde',
  'Gde',
  'Extra',
  'Jumbo'
];

// Función auxiliar para ordenar medidas según el orden específico
const ordenarMedidas = (medidas) => {
  return medidas.sort((a, b) => {
    // Convertir a mayúsculas para la comparación
    const aUpper = a.toUpperCase();
    const bUpper = b.toUpperCase();
    
    const indexA = ordenMedidas.findIndex(m => m.toUpperCase() === aUpper);
    const indexB = ordenMedidas.findIndex(m => m.toUpperCase() === bUpper);
    
    // Si ambas medidas están en la lista de orden específico
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // Si solo una medida está en la lista, ponerla primero
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    // Para medidas que no están en la lista, ordenar alfabéticamente
    return a.localeCompare(b);
  });
};

// Función auxiliar para ordenar taras
const ordenarTaras = (taras) => {
  if (!Array.isArray(taras) || taras.length === 0) return [];

  // Función para extraer la medida de una tara
  const obtenerMedida = (tara) => {
    if (typeof tara === 'string') {
      const partes = tara.split('-');
      return partes.length > 1 ? Number(partes[1]) : 0;
    }
    return 0;
  };

  // Agrupar por medida
  const tarasPorMedida = {};
  taras.forEach(tara => {
    if (!tara) return; // Ignorar valores nulos o undefined
    
    const medida = obtenerMedida(tara);
    if (!tarasPorMedida[medida]) {
      tarasPorMedida[medida] = [];
    }
    tarasPorMedida[medida].push(tara);
  });

  // Ordenar las medidas (19 primero, luego el resto)
  const medidas = Object.keys(tarasPorMedida)
    .map(Number)
    .sort((a, b) => {
      if (a === 19) return -1;
      if (b === 19) return 1;
      return a - b;
    });

  // Construir el resultado final
  return medidas.reduce((resultado, medida) => {
    return resultado.concat(tarasPorMedida[medida]);
  }, []);
};

export const generarResumenEmbarquePDF = (embarque, productosPorCliente, obtenerNombreCliente, clientesPersonalizados = [], escala = 100) => {
  // Obtener y ordenar las medidas de los crudos del embarque
  let medidasCrudos = [];
  if (embarque.medidasCrudos && Array.isArray(embarque.medidasCrudos)) {
    medidasCrudos = embarque.medidasCrudos
      .map(medida => medida.replace('c/c', '').trim());
    
    // Aplicar el ordenamiento específico
    medidasCrudos = ordenarMedidas([...new Set(medidasCrudos)]);
  }

  console.log('Medidas de crudos encontradas:', medidasCrudos);

  // Configuración de la página en tamaño carta vertical
  const scaleFactor = escala / 100;
  const docDefinition = {
    pageSize: 'LETTER',
    pageOrientation: 'portrait',
    content: [
      {
        table: {
          widths: ['*', 'auto', '*'],
          body: [
            [
              { text: `Carga: ${embarque.cargaCon}`, alignment: 'left', fontSize: 20 * scaleFactor, border: [false, false, false, true] },
              { text: 'Embarque', alignment: 'center', fontSize: 25 * scaleFactor, bold: true, border: [false, false, false, true] },
              { text: `${new Date(new Date(embarque.fecha).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                timeZone: 'America/Mexico_City'
              })}`, alignment: 'right', fontSize: 20 * scaleFactor, border: [false, false, false, true] }
            ]
          ]
        },
        margin: [0, 0, 0, 20 * scaleFactor]
      }
    ],
    styles: {
      header: {
        fontSize: 25 * scaleFactor,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 0]
      },
      tableHeader: {
        bold: true,
        fontSize: 19 * scaleFactor,
        fillColor: '#eeeeee',
        alignment: 'center'
      },
      clienteHeader: {
        fontSize: 18 * scaleFactor,
        bold: true,
        color: 'white',
      },
      clienteCell: {
        bold: true,
        fontSize: 17 * scaleFactor,
        alignment: 'left',
        color: 'white'
      },
      dataCell: {
        fontSize: 19 * scaleFactor,
        alignment: 'center'
      },
      total: {
        fontSize: 18 * scaleFactor,
        bold: true,
        color: 'white'
      }
    }
  };

  // Crear encabezados de la tabla
  const tableHeaders = [
    { text: 'Cliente', style: 'tableHeader' },
    ...medidasCrudos.map(medida => {
      // Buscar si algún crudo con esta medida tiene textoAlternativo
      const crudoConAlt = embarque.crudos.find(c => 
        c.medida.replace('c/c', '').trim() === medida && c.textoAlternativo
      );
      
      // Usar el textoAlternativo si existe
      const textoMostrado = crudoConAlt ? crudoConAlt.textoAlternativo : medida;
      
      return { text: textoMostrado, style: 'tableHeader' };
    })
  ];

  // Preparar datos de la tabla
  const tableData = [];
  const clienteIds = new Set(embarque.crudos.map(c => c.clienteId));
  
  clienteIds.forEach(clienteId => {
    const nombreCliente = obtenerNombreCliente(clienteId);
    const nombreMostrado = nombreCliente === 'Joselito' ? '8A' : nombreCliente;
    const clienteColor = clienteColors[nombreCliente] || '#95a5a6'; // Color gris por defecto
    
    const row = [{ 
      text: nombreMostrado, 
      style: 'clienteCell',
      fillColor: clienteColor
    }];
    
    // Llenar datos para cada medida
    medidasCrudos.forEach(medida => {
      const crudosCliente = embarque.crudos.filter(c => 
        c.clienteId === clienteId && 
        c.medida.replace('c/c', '').trim() === medida
      );
      
      if (crudosCliente.length > 0) {
        let todasLasTaras = [];
        let mostrarPrecio = false;
        let precio = null;
        
        crudosCliente.forEach(crudo => {
          if (crudo.taras && Array.isArray(crudo.taras)) {
            todasLasTaras = todasLasTaras.concat(crudo.taras.filter(tara => tara));
          }
          // Guardar el precio si existe
          if (crudo.precio) {
            mostrarPrecio = true;
            precio = crudo.precio;
          }
        });
        
        const tarasOrdenadas = ordenarTaras(todasLasTaras);
        
        // Crear un stack con las taras y, si existe, el precio
        const contenido = [{ text: tarasOrdenadas.join('\n'), style: 'dataCell' }];
        
        if (mostrarPrecio) {
          contenido.push({ 
            text: `$${Number(precio).toLocaleString('en-US')}`, 
            color: 'red', 
            bold: true,
            fontSize: 16
          });
        }
        
        row.push({ 
          stack: contenido,
          style: 'dataCell'
        });
      } else {
        row.push({ text: '', style: 'dataCell' });
      }
    });
    
    tableData.push(row);
  });

  // Calcular totales por medida
  const totalesRow = [{ 
    text: 'TOTAL', 
    style: 'total',
    fillColor: '#7f8c8d',
    alignment: 'center'
  }];

  // Calcular el total para cada medida
  medidasCrudos.forEach(medida => {
    let totalTaras = 0;
    embarque.crudos.forEach(crudo => {
      if (crudo.medida.replace('c/c', '').trim() === medida && crudo.taras && Array.isArray(crudo.taras)) {
        // Contar el número de taras para esta medida
        totalTaras += crudo.taras.filter(tara => tara).length;
      }
    });

    totalesRow.push({ 
      text: totalTaras > 0 ? totalTaras.toString() : '', 
      style: 'total',
      fillColor: '#7f8c8d',
      alignment: 'center'
    });
  });

  // Agregar la fila de totales
  tableData.push(totalesRow);

  // Agregar la tabla al documento
  docDefinition.content.push({
    table: {
      headerRows: 1,
      widths: [60, ...medidasCrudos.map(() => {
        const baseWidth = Math.min(100, (515 - 120) / medidasCrudos.length);
        return baseWidth;
      })],
      body: [tableHeaders, ...tableData]
    },
    layout: {
      hLineWidth: function(i, node) {
        return 1;
      },
      vLineWidth: function(i, node) {
        return 1;
      },
      hLineColor: function(i, node) {
        return '#000000';
      },
      vLineColor: function(i, node) {
        return '#000000';
      },
      paddingLeft: function(i) { return 4; },
      paddingRight: function(i) { return 4; },
      paddingTop: function(i) { return 4; },
      paddingBottom: function(i) { return 4; }
    }
  });

  // Agregar espacio después de la primera tabla
  docDefinition.content.push(
    { text: '\n\n' },
    { text: 'Desglose por Medida', style: 'header', margin: [0, 0, 0, 10] }
  );

  // Crear tabla de desglose por medida
  const desgloseHeaders = [
    { text: 'Medida', style: 'tableHeader' },
    { text: 'Cliente', style: 'tableHeader' },
    { text: 'Barco', style: 'tableHeader' }
  ];

  const desglosePorMedida = [];
  
  // Organizar datos por medida
  medidasCrudos.forEach(medida => {
    const crudosDeMedida = embarque.crudos.filter(c => 
      c.medida.replace('c/c', '').trim() === medida
    );

    // Agregar la primera fila con la medida
    if (crudosDeMedida.length > 0) {
      const primerCrudo = crudosDeMedida[0];
      const nombreCliente = obtenerNombreCliente(primerCrudo.clienteId);
      const nombreMostrado = nombreCliente === 'Joselito' ? '8A' : nombreCliente;
      
      // Usar textoAlternativo si está disponible
      const medidaMostrada = primerCrudo.textoAlternativo || medida;
      
      desglosePorMedida.push([
        { 
          text: medidaMostrada, 
          style: 'dataCell', 
          rowSpan: crudosDeMedida.length,
          alignment: 'center',
          verticalAlignment: 'middle'
        },
        { 
          text: nombreMostrado, 
          style: 'clienteCell',
          fillColor: clienteColors[nombreCliente] || '#95a5a6'
        },
        { text: primerCrudo.barco || '-', style: 'dataCell' }
      ]);

      // Agregar el resto de los crudos de la misma medida sin repetir la medida
      for (let i = 1; i < crudosDeMedida.length; i++) {
        const crudo = crudosDeMedida[i];
        const nombreCliente = obtenerNombreCliente(crudo.clienteId);
        const nombreMostrado = nombreCliente === 'Joselito' ? '8A' : nombreCliente;
        
        desglosePorMedida.push([
          '', // Celda vacía porque está usando rowSpan
          { 
            text: nombreMostrado, 
            style: 'clienteCell',
            fillColor: clienteColors[nombreCliente] || '#95a5a6'
          },
          { text: crudo.barco || '-', style: 'dataCell' }
        ]);
      }
    }
  });

  // Agregar tabla de desglose al documento
  docDefinition.content.push({
    table: {
      headerRows: 1,
      widths: ['*', 100, '*'],
      body: [desgloseHeaders, ...desglosePorMedida]
    },
    layout: {
      hLineWidth: function(i, node) { return 1; },
      vLineWidth: function(i, node) { return 1; },
      hLineColor: function(i, node) { return '#000000'; },
      vLineColor: function(i, node) { return '#000000'; },
      paddingLeft: function(i) { return 4; },
      paddingRight: function(i) { return 4; },
      paddingTop: function(i) { return 4; },
      paddingBottom: function(i) { return 4; },
      fillColor: function(i, node) {
        return null;
      },
      defaultBorder: true,
      vLineAlignment: function(i, node) { return 'center'; }
    }
  });

  // Modificar el estilo de las celdas de medida
  desglosePorMedida.forEach(row => {
    if (row[0].text) {  // Solo para las celdas que tienen texto (no las vacías del rowSpan)
      row[0] = {
        ...row[0],
        alignment: 'center',
        margin: [0, 10, 0, 10],  // Agregar margen para mejor centrado vertical
      };
    }
  });

  // Agregar el contenido del resumen de productos limpios
  docDefinition.content.push(
    ...generarResumenLimpios(productosPorCliente, clienteColors, escala, clientesPersonalizados)
  );

  // Generar y descargar el PDF
  pdfMake.createPdf(docDefinition).download('resumen-embarque-completo.pdf');
};

// Función auxiliar para calcular kilos
const calcularKilosProducto = (producto) => {
  if (!producto.taras || producto.taras.length === 0) return 0;
  return producto.taras.reduce((sum, tara) => sum + (tara || 0), 0);
};
