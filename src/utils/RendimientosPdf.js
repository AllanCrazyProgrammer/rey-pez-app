import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';

// Asignar las fuentes directamente desde el módulo vfsFonts
if (typeof vfsFonts === 'object') {
    if (vfsFonts.pdfMake && vfsFonts.pdfMake.vfs) {
        pdfMake.vfs = vfsFonts.pdfMake.vfs;
    } else if (vfsFonts.vfs) {
        pdfMake.vfs = vfsFonts.vfs;
    } else {
        pdfMake.vfs = vfsFonts;
    }
}

// También necesitamos asegurarnos de que las fuentes estén disponibles globalmentew
if (typeof window !== 'undefined' && !window.pdfMake) {
    window.pdfMake = pdfMake;
}

export const generarPDFRendimientos = async (datosRendimientos, embarqueData, gananciasCalculadas, tarasCrudosPorMedida = {}, gananciasVisiblesCrudos = {}, costosCrudos = {}, configuracionPesos = {}, gananciasVisiblesMaquila = {}) => {
  try {
    const logoBase64 = await loadImageAsBase64('https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png');
    
    const nombresMedidasPersonalizados = embarqueData?.nombresMedidasPersonalizados || {};

    // Función auxiliar para formatear la fecha
    const formatearFecha = (fecha) => {
      if (!fecha) return 'Sin fecha';
      
      let fechaObj;
      // Si la fecha es un objeto Timestamp de Firestore
      if (fecha && typeof fecha.toDate === 'function') {
        fechaObj = fecha.toDate();
      } 
      // Si la fecha es una cadena ISO
      else if (typeof fecha === 'string') {
        fechaObj = new Date(fecha);
      }
      // Si ya es un objeto Date
      else if (fecha instanceof Date) {
        fechaObj = fecha;
      }
      
      // Verificar si la fecha es válida
      if (isNaN(fechaObj.getTime())) {
        return 'Fecha inválida';
      }

      // Ajustar la zona horaria a la hora local de México
      const fechaLocal = new Date(fechaObj.getTime() + (fechaObj.getTimezoneOffset() * 60000));
      
      // Formatear la fecha
      return fechaLocal.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Mexico_City'
      });
    };

    const docDefinition = {
      content: [
        // PRIMERA PÁGINA - RENDIMIENTOS
        {
          columns: [
            {
              image: logoBase64,
              width: 80,
              alignment: 'left',
              margin: [0, 0, 0, 5]
            },
            {
              text: 'Reporte de Rendimientos',
              style: 'header',
              alignment: 'center',
              margin: [0, 10, 0, 0]
            },
            {
              stack: [
                {
                  text: `Fecha: ${formatearFecha(embarqueData.fecha)}`,
                  alignment: 'right',
                  margin: [0, 10, 0, 0]
                },
              ]
            }
          ]
        },
        { text: '\n', height: 5 },
        generarTablaRendimientos(datosRendimientos, nombresMedidasPersonalizados, embarqueData),
        
        // SALTO DE PÁGINA
        { text: '', pageBreak: 'after' },
        
        // SEGUNDA PÁGINA - RESÚMENES
   
        generarTablaGanancias(gananciasCalculadas, nombresMedidasPersonalizados, embarqueData, gananciasVisiblesMaquila),
        { text: '\n', height: 10 },
        generarTablaTarasCrudo(tarasCrudosPorMedida, gananciasVisiblesCrudos, costosCrudos, configuracionPesos),
        { text: '\n', height: 10 },
        generarResumenGananciasTotal(gananciasCalculadas, gananciasVisiblesMaquila, gananciasVisiblesCrudos)
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#3760b0',
          margin: [0, 0, 0, 5]
        },
        tableHeader: {
          bold: true,
          fontSize: 14,
          color: 'white',
          fillColor: '#3760b0'
        },
        rendimientoAlto: {
          color: '#27ae60',
          bold: true
        },
        rendimientoBajo: {
          color: '#000000'
        },
        costoStyle: {
          color: '#e74c3c',
          bold: true
        },
        gananciaPositiva: {
          color: '#27ae60',
          bold: true
        },
        gananciaNegativa: {
          color: '#e74c3c',
          bold: true
        },
        tableTotal: {
          bold: true,
          fontSize: 20,
          color: '#2c3e50',
          fillColor: '#e8f4f8'
        },
        tableTotalNegativo: {
          bold: true,
          fontSize: 20,
          color: '#e74c3c',
          fillColor: '#e8f4f8'
        }
      },
      defaultStyle: {
        fontSize: 18
      },
      footer: function(currentPage, pageCount) {
        return {
          columns: [
            { 
              text: '© 2025 Rey Pez - Tampico, Tamps.', 
              alignment: 'center', 
              margin: [0, 5, 0, 0],
              fontSize: 8,
              color: '#3760b0'
            },
          ]
        };
      }
    };

    // Después de agregar toda la información de rendimientos, agregar la nota
    if (embarqueData.notaRendimientos) {
      docDefinition.content.push({
        text: '\n',
        height: 5
      });
      docDefinition.content.push({
        text: 'Nota:',
        style: 'header',
        color: 'red',
        alignment: 'center',
        margin: [0, 10, 0, 0]
      });
      docDefinition.content.push({
        text: ' ' + embarqueData.notaRendimientos,
        style: 'header',
        alignment: 'center',
        color: 'black',
        margin: [0, 10, 0, 0]
      });
    }

    pdfMake.createPdf(docDefinition).open();
  } catch (error) {
    console.error('Error al generar el PDF de rendimientos:', error);
  }
};

function generarTablaRendimientos(datosRendimientos, nombresMedidasPersonalizados, embarqueData) {
  const datosAgrupados = datosRendimientos.reduce((acc, dato) => {
    const nombreMedida = nombresMedidasPersonalizados[dato.medida] || dato.medida;
    
    // Condicional simple para detectar "mixta" o "Mixta"
    if (nombreMedida.includes('mixta') || nombreMedida.includes('Mixta')) {
      if (!acc['Mixta']) {
        acc['Mixta'] = {
          medida: 'Mixta',
          kilosCrudos: 0,
          totalEmbarcado: 0,
          costoFinal: 0
        };
      }
      
      // Sumamos los kilos crudos
      if (dato.kilosCrudos) {
        if (typeof dato.kilosCrudos === 'object') {
          acc['Mixta'].kilosCrudos += 
            (parseFloat(dato.kilosCrudos.medida1) || 0) + 
            (parseFloat(dato.kilosCrudos.medida2) || 0);
        } else {
          acc['Mixta'].kilosCrudos += parseFloat(dato.kilosCrudos) || 0;
        }
      }
      
      // Sumamos el total embarcado
      acc['Mixta'].totalEmbarcado += parseFloat(dato.totalEmbarcado) || 0;
      
      // Sumamos el costo final
      acc['Mixta'].costoFinal += parseFloat(dato.costoFinal) || 0;
    } else {
      // Si no es mixta, la procesamos normalmente
      acc[nombreMedida] = {
        medida: nombreMedida,
        kilosCrudos: parseFloat(dato.kilosCrudos) || 0,
        totalEmbarcado: parseFloat(dato.totalEmbarcado) || 0,
        costoFinal: dato.costoFinal || 0
      };
    }
    return acc;
  }, {});

  // Siempre mostrar la columna de costos si está habilitada
  const mostrarColumnaCosto = embarqueData.mostrarColumnaCosto;

  const body = [
    [
      { text: 'Kilos en Crudo', style: 'tableHeader' },
      { text: 'Medida', style: 'tableHeader' },
      { text: 'Rendimiento', style: 'tableHeader' },
      ...(mostrarColumnaCosto ? [{ text: 'Costo Final', style: 'tableHeader' }] : [])
    ],
    ...Object.values(datosAgrupados).map(dato => {
      const rendimiento = dato.totalEmbarcado > 0 ? dato.kilosCrudos / dato.totalEmbarcado : 0;
      const rendimientoStyle = rendimiento > 1 ? 'rendimientoAlto' : 'rendimientoBajo';
      
      // Preparamos el texto de la medida
      let medidaTexto = dato.medida;
      if (dato.medidasIncluidas) {
        const medidasArray = Array.from(dato.medidasIncluidas);
        medidaTexto = `Mixta (${medidasArray.join(', ')})`;
      }
      
      return [
        formatearKilos(dato.kilosCrudos),
        medidaTexto,
        {
          text: `(${formatearRendimiento(rendimiento)})`,
          style: rendimientoStyle
        },
        ...(mostrarColumnaCosto ? [{
          text: dato.costoFinal ? `$${Number(dato.costoFinal).toFixed(1)}` : '$0.0',
          style: 'costoStyle'
        }] : [])
      ];
    })
  ];

  return {
    table: {
      headerRows: 1,
      widths: mostrarColumnaCosto ? ['25%', '25%', '25%', '25%'] : ['35%', '35%', '30%'],
      body: body
    },
    layout: {
      hLineWidth: function(i, node) { 
        return (i === 0 || i === node.table.body.length) ? 1.5 : 0.5;
      },
      vLineWidth: function(i, node) { 
        return (i === 0 || i === node.table.widths.length) ? 1.5 : 0.5;
      },
      hLineColor: function(i, node) { 
        return (i === 0 || i === node.table.body.length) ? '#3760b0' : '#cccccc';
      },
      vLineColor: function(i, node) { 
        return (i === 0 || i === node.table.widths.length) ? '#3760b0' : '#cccccc';
      },
      fillColor: function(rowIndex, node, columnIndex) {
        return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
      },
      paddingLeft: function(i) { return 4; },
      paddingRight: function(i) { return 4; },
      paddingTop: function(i) { return 2; },
      paddingBottom: function(i) { return 2; }
    }
  };
}

function generarTablaGanancias(gananciasCalculadas, nombresMedidasPersonalizados, embarqueData, gananciasVisiblesMaquila = {}) {
  // Verificar si hay datos de ganancias normales o de maquila
  const tieneGananciasNormales = gananciasCalculadas && Object.keys(gananciasCalculadas).length > 0;
  const tieneGananciasMaquila = gananciasVisiblesMaquila && Object.keys(gananciasVisiblesMaquila).length > 0;

  if (!tieneGananciasNormales && !tieneGananciasMaquila) {
    return {
      text: 'No hay datos de ganancias disponibles',
      style: 'header',
      alignment: 'center',
      margin: [0, 10, 0, 10]
    };
  }

  // Filtrar medidas que no estén ocultas
  const medidasOcultas = embarqueData?.medidaOculta || {};
  const gananciasVisibles = tieneGananciasNormales ? 
    Object.entries(gananciasCalculadas).filter(([medida]) => !medidasOcultas[medida]) : [];

  // Preparar las filas de ganancias normales
  const filasGananciasNormales = gananciasVisibles.map(([medida, ganancia]) => {
    const nombreMedida = nombresMedidasPersonalizados[medida] || medida;
    const gananciaUnitaria = ganancia.gananciaUnitaria || 0;
    const gananciaTotal = ganancia.gananciaTotal || 0;
    const totalEmbarcado = ganancia.totalEmbarcado || 0;
    const precioVenta = ganancia.precioVenta || 0;
    const costoBase = ganancia.costoBase || 0;
    
    return [
      nombreMedida,
      `${formatearNumero(totalEmbarcado)} kg`,
      {
        stack: [
          {
            text: `Compra: $${formatearPrecio(costoBase)}`,
            fontSize: 14,
            alignment: 'center',
            margin: [0, 0, 0, 2],
            color: '#e74c3c'
          },
          {
            text: `Venta: $${formatearPrecio(precioVenta)}`,
            fontSize: 14,
            alignment: 'center',
            color: '#27ae60'
          }
        ],
        alignment: 'center'
      },
      {
        text: `$${formatearPrecio(gananciaUnitaria)}`,
        style: gananciaUnitaria >= 0 ? 'gananciaPositiva' : 'gananciaNegativa'
      },
      {
        text: `$${formatearPrecio(gananciaTotal)}`,
        style: gananciaTotal >= 0 ? 'gananciaPositiva' : 'gananciaNegativa'
      }
    ];
  });

  // Preparar las filas de ganancias de maquila
  const filasGananciasMaquila = Object.entries(gananciasVisiblesMaquila).map(([medida, ganancia]) => {
    const nombreMedida = nombresMedidasPersonalizados[medida] || medida;
    const precioMaquila = ganancia.precioMaquila || 0;
    const gananciaTotal = ganancia.gananciaTotal || 0;
    const totalEmbarcado = ganancia.totalEmbarcado || 0;
    
    return [
      `${nombreMedida} (Maquila)`,
      `${formatearNumero(totalEmbarcado)} kg`,
      {
        stack: [
          {
            text: `Compra: N/A`,
            fontSize: 14,
            alignment: 'center',
            margin: [0, 0, 0, 2],
            color: '#6c757d'
          },
          {
            text: `Venta: $${formatearPrecio(precioMaquila)}`,
            fontSize: 14,
            alignment: 'center',
            color: '#27ae60'
          }
        ],
        alignment: 'center'
      },
      {
        text: `$${formatearPrecio(precioMaquila)}`,
        style: 'gananciaPositiva'
      },
      {
        text: `$${formatearPrecio(gananciaTotal)}`,
        style: 'gananciaPositiva'
      }
    ];
  });

  // Calcular totales
  const totalGananciasNormales = gananciasVisibles.reduce((total, [medida, ganancia]) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGananciasMaquila = Object.values(gananciasVisiblesMaquila).reduce((total, ganancia) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGeneral = totalGananciasNormales + totalGananciasMaquila;

  // Si no hay datos para mostrar después del filtro
  if (filasGananciasNormales.length === 0 && filasGananciasMaquila.length === 0) {
    return {
      text: 'No hay datos de ganancias para mostrar',
      style: 'header',
      alignment: 'center',
      margin: [0, 10, 0, 10]
    };
  }

  const body = [
    [
      { text: 'Medida', style: 'tableHeader' },
      { text: 'Kilos', style: 'tableHeader' },
      { text: 'Precios', style: 'tableHeader' },
      { text: 'Ganancia/kg', style: 'tableHeader' },
      { text: 'Ganancia Total', style: 'tableHeader' }
    ],
    ...filasGananciasNormales,
    ...filasGananciasMaquila,
    // Fila del total
    [
      { text: 'TOTAL GANANCIAS', style: 'tableTotal' },
      { text: '', style: 'tableTotal' },
      { text: '', style: 'tableTotal' },
      { text: '', style: 'tableTotal' },
      { 
        text: `$${formatearPrecio(totalGeneral)}`, 
        style: totalGeneral >= 0 ? 'tableTotal' : 'tableTotalNegativo' 
      }
    ]
  ];

  return {
    stack: [
      {
        text: 'Resumen de limpios',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['25%', '15%', '25%', '15%', '20%'],
          body: body
        },
        layout: {
          hLineWidth: function(i, node) { 
            return (i === 0 || i === node.table.body.length || i === node.table.body.length - 1) ? 1.5 : 0.5;
          },
          vLineWidth: function(i, node) { 
            return (i === 0 || i === node.table.widths.length) ? 1.5 : 0.5;
          },
          hLineColor: function(i, node) { 
            return (i === 0 || i === node.table.body.length || i === node.table.body.length - 1) ? '#3760b0' : '#cccccc';
          },
          vLineColor: function(i, node) { 
            return (i === 0 || i === node.table.widths.length) ? '#3760b0' : '#cccccc';
          },
          fillColor: function(rowIndex, node, columnIndex) {
            if (rowIndex === node.table.body.length - 1) {
              return '#e8f4f8'; // Color de fondo para la fila del total
            }
            return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
          },
          paddingLeft: function(i) { return 4; },
          paddingRight: function(i) { return 4; },
          paddingTop: function(i) { return 2; },
          paddingBottom: function(i) { return 2; }
        }
      }
    ]
  };
}

function generarTablaTarasCrudo(tarasCrudosPorMedida, gananciasVisiblesCrudos = {}, costosCrudos = {}, configuracionPesos = {}) {
  if (!tarasCrudosPorMedida || Object.keys(tarasCrudosPorMedida).length === 0) {
    return {
      text: 'No hay datos de taras de crudo disponibles',
      style: 'header',
      alignment: 'center',
      margin: [0, 10, 0, 10]
    };
  }

  // Obtener pesos configurados o usar valores por defecto
  const pesoTaraCosto = configuracionPesos.pesoTaraCosto || 19;
  const pesoTaraVenta = configuracionPesos.pesoTaraVenta || 20;

  // Función para calcular kilos usando un peso específico
  const calcularKilosConPeso = (medida, pesoTara) => {
    const data = tarasCrudosPorMedida[medida];
    if (!data || !data.detalles) return 0;

    let totalKilos = 0;
    data.detalles.forEach(detalle => {
      // Procesar taras principales
      if (detalle.taras) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(detalle.taras);
        if (formatoGuion) {
          const cantidad = parseInt(formatoGuion[1]) || 0;
          let peso = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso original es 19, usar el peso configurado
          if (peso === 19) {
            peso = pesoTara;
          }
          
          totalKilos += cantidad * peso;
        }
      }

      // Procesar sobrantes
      if (detalle.sobrante) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(detalle.sobrante);
        if (formatoGuion) {
          const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
          let pesoSobrante = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso original es 19, usar el peso configurado
          if (pesoSobrante === 19) {
            pesoSobrante = pesoTara;
          }
          
          totalKilos += cantidadSobrante * pesoSobrante;
        }
      }
    });

    return totalKilos;
  };

  // Calcular totales para costos (usando peso de costo)
  const totalKilosCosto = Object.keys(tarasCrudosPorMedida).reduce((total, medida) => {
    return total + calcularKilosConPeso(medida, pesoTaraCosto);
  }, 0);

  // Calcular totales para ventas (usando peso de venta)
  const totalKilosVenta = Object.keys(tarasCrudosPorMedida).reduce((total, medida) => {
    return total + calcularKilosConPeso(medida, pesoTaraVenta);
  }, 0);

  // Calcular total de ganancias
  const totalGanancias = Object.entries(tarasCrudosPorMedida).reduce((total, [medida, data]) => {
    const gananciaCrudo = gananciasVisiblesCrudos[medida];
    const costoCrudo = costosCrudos[medida];
    
    if (gananciaCrudo && costoCrudo) {
      const kilosVenta = calcularKilosConPeso(medida, pesoTaraVenta);
      const kilosCosto = calcularKilosConPeso(medida, pesoTaraCosto);
      
      if (kilosVenta > 0 && kilosCosto > 0) {
        const ingresoTotal = gananciaCrudo.precioVenta * kilosVenta;
        const costoTotal = costoCrudo.costoFinal * kilosCosto;
        const gananciaTotal = ingresoTotal - costoTotal;
        return total + gananciaTotal;
      }
    }
    return total;
  }, 0);

  const body = [
    [
      { text: 'Medida', style: 'tableHeader' },
      { text: 'Kilos', style: 'tableHeader' },
      { text: 'Precio', style: 'tableHeader' },
      { text: 'Costo', style: 'tableHeader' },
      { text: 'Ganancia', style: 'tableHeader' }
    ],
    ...Object.entries(tarasCrudosPorMedida).map(([medida, data]) => {
      // Calcular kilos para venta y costo por separado
      const kilosVenta = calcularKilosConPeso(medida, pesoTaraVenta);
      const kilosCosto = calcularKilosConPeso(medida, pesoTaraCosto);
      
      // Obtener el precio desde las ganancias de crudos
      const gananciaCrudo = gananciasVisiblesCrudos[medida];
      const precio = gananciaCrudo ? gananciaCrudo.precioVenta : null;
      
      // Obtener el costo desde los costos de crudos
      const costoCrudo = costosCrudos[medida];
      const costo = costoCrudo ? costoCrudo.costoFinal : null;
      
      // Calcular ganancia total para esta medida
      let gananciaTotal = null;
      if (precio && costo && kilosVenta > 0 && kilosCosto > 0) {
        const ingresoTotal = precio * kilosVenta;
        const costoTotal = costo * kilosCosto;
        gananciaTotal = ingresoTotal - costoTotal;
      }
      
      return [
        medida,
        {
          stack: [
            {
              text: `Kilos C: ${Math.floor(kilosCosto)} kg`,
              fontSize: 14,
              alignment: 'center',
              margin: [0, 0, 0, 2]
            },
            {
              text: `Kilos V: ${Math.floor(kilosVenta)} kg`,
              fontSize: 14,
              alignment: 'center'
            }
          ],
          alignment: 'center'
        },
        {
          text: precio ? `$${formatearPrecio(precio)}` : 'N/A',
          alignment: 'center',
          style: precio ? 'gananciaPositiva' : 'rendimientoBajo'
        },
        {
          text: costo ? `$${costo.toFixed(2)}` : 'N/A',
          alignment: 'center',
          style: costo ? 'costoStyle' : 'rendimientoBajo'
        },
        {
          text: gananciaTotal !== null ? `$${formatearPrecio(gananciaTotal)}` : 'N/A',
          alignment: 'center',
          style: gananciaTotal !== null ? (gananciaTotal >= 0 ? 'gananciaPositiva' : 'gananciaNegativa') : 'rendimientoBajo'
        }
      ];
    }),
    // Fila del total
    [
      { text: 'TOTAL', style: 'tableTotal' },
      {
        stack: [
          {
            text: `Kilos C: ${Math.floor(totalKilosCosto)} kg`,
            fontSize: 14,
            alignment: 'center',
            margin: [0, 0, 0, 2],
            bold: true
          },
          {
            text: `Kilos V: ${Math.floor(totalKilosVenta)} kg`,
            fontSize: 14,
            alignment: 'center',
            bold: true
          }
        ],
        alignment: 'center',
        fillColor: '#e8f4f8'
      },
      { text: '', style: 'tableTotal', alignment: 'center' },
      { text: '', style: 'tableTotal', alignment: 'center' },
      { 
        text: `$${formatearPrecio(totalGanancias)}`, 
        style: totalGanancias >= 0 ? 'tableTotal' : 'tableTotalNegativo', 
        alignment: 'center' 
      }
    ]
  ];

  return {
    stack: [
      {
        text: 'Resumen de Crudos',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['25%', '20%', '18%', '18%', '19%'],
          body: body
        },
        layout: {
          hLineWidth: function(i, node) { 
            return (i === 0 || i === node.table.body.length || i === node.table.body.length - 1) ? 1.5 : 0.5;
          },
          vLineWidth: function(i, node) { 
            return (i === 0 || i === node.table.widths.length) ? 1.5 : 0.5;
          },
          hLineColor: function(i, node) { 
            return (i === 0 || i === node.table.body.length || i === node.table.body.length - 1) ? '#3760b0' : '#cccccc';
          },
          vLineColor: function(i, node) { 
            return (i === 0 || i === node.table.widths.length) ? '#3760b0' : '#cccccc';
          },
          fillColor: function(rowIndex, node, columnIndex) {
            if (rowIndex === node.table.body.length - 1) {
              return '#e8f4f8'; // Color de fondo para la fila del total
            }
            return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
          },
          paddingLeft: function(i) { return 4; },
          paddingRight: function(i) { return 4; },
          paddingTop: function(i) { return 2; },
          paddingBottom: function(i) { return 2; }
        }
      }
    ]
  };
}

function generarResumenGananciasTotal(gananciasCalculadas, gananciasVisiblesMaquila, gananciasVisiblesCrudos) {
  // Calcular totales por categoría
  const totalGananciasNormales = Object.values(gananciasCalculadas).reduce((total, ganancia) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGananciasMaquila = Object.values(gananciasVisiblesMaquila).reduce((total, ganancia) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGananciasCrudos = Object.values(gananciasVisiblesCrudos).reduce((total, ganancia) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGeneral = totalGananciasNormales + totalGananciasMaquila + totalGananciasCrudos;

  // Si no hay datos, no mostrar nada
  if (totalGeneral === 0) {
    return { text: '', margin: [0, 0, 0, 0] };
  }

  return {
    text: `TOTAL GENERAL: $${formatearPrecio(totalGeneral)}`,
    style: totalGeneral >= 0 ? 'tableTotal' : 'tableTotalNegativo',
    alignment: 'center',
    fontSize: 28,
    margin: [0, 10, 0, 0]
  };
}



function formatearKilos(kilos) {
  if (typeof kilos === 'number') {
    return Math.floor(kilos) + ' kg';
  }
  // Para medidas mixtas que tienen medida1 y medida2
  if (typeof kilos === 'object' && kilos !== null) {
    const total = Math.floor((Number(kilos.medida1) || 0) + (Number(kilos.medida2) || 0));
    return total + ' kg';
  }
  const numero = Math.floor(Number(kilos));
  return numero + ' kg';
}

function formatearRendimiento(rendimiento) {
  return Number(rendimiento).toFixed(2);
}

function formatearPrecio(precio) {
  if (!precio) return '0';
  const numeroRedondeado = Math.round(precio);
  return numeroRedondeado.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatearNumero(numero) {
  if (!numero) return '0';
  // Redondear hacia abajo para eliminar decimales
  const numeroSinDecimales = Math.floor(numero);
  return numeroSinDecimales.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

