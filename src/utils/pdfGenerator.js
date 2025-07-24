//Generador de Notas de Venta Pdf

import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { db } from '@/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Manejar inicialización de pdfMake de manera más robusta
try {
  // Intentar usar la versión importada
  if (pdfFonts.default) {
    pdfMake.vfs = pdfFonts.default;
  } else if (typeof pdfFonts === 'object') {
    pdfMake.vfs = pdfFonts;
  }
} catch (error) {
  console.warn('Error al inicializar pdfMake local:', error);
}

// Verificar disponibilidad global como fallback
if (typeof window !== 'undefined' && window.pdfMake) {
  console.log('Usando pdfMake global (CDN)');
  pdfMake = window.pdfMake;
}

// Función para obtener el precio actual de un producto para un cliente específico
async function obtenerPrecioProductoCatarro(nombreProducto) {
  try {
    const preciosRef = collection(db, 'precios');
    
    // Buscar todos los precios para este producto
    const q = query(
      preciosRef, 
      where('producto', '==', nombreProducto)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    
    // Separar precios específicos de Catarro y precios generales
    const preciosCatarro = [];
    const preciosGenerales = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.clienteId === 'catarro') {
        preciosCatarro.push(data);
      } else if (!data.clienteId) {
        preciosGenerales.push(data);
      }
    });
    
    // Ordenar por fecha (más reciente primero)
    const ordenarPorFecha = (a, b) => {
      const fechaA = a.fecha ? new Date(a.fecha) : new Date(0);
      const fechaB = b.fecha ? new Date(b.fecha) : new Date(0);
      return fechaB - fechaA;
    };
    
    // Priorizar precio específico de Catarro si existe
    if (preciosCatarro.length > 0) {
      preciosCatarro.sort(ordenarPorFecha);
      return preciosCatarro[0].precio;
    }
    
    // Si no hay precio específico, usar precio general más reciente
    if (preciosGenerales.length > 0) {
      preciosGenerales.sort(ordenarPorFecha);
      return preciosGenerales[0].precio;
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener precio:', error);
    return null;
  }
}

export async function generarNotaVentaPDF(embarque, clientesDisponibles, clientesJuntarMedidas, clientesReglaOtilio = {}, clientesIncluirPrecios = {}, clientesSumarKgCatarro = {}, clientesCuentaEnPdf = {}) {
  try {
    // Validación más robusta de los datos de entrada
    if (!embarque || !embarque.productos || !Array.isArray(embarque.productos)) {
      console.warn('El embarque no contiene datos de productos válidos', { embarque });
      return;
    }

    // Asegurarse de que clientesDisponibles sea un array
    if (!Array.isArray(clientesDisponibles)) {
      console.warn('Lista de clientes no válida, usando array vacío');
      clientesDisponibles = [];
    }

    const logoBase64 = await loadImageAsBase64('https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png');
    
    // Primero generamos el contenido con precios
    const contenidoConPrecios = [
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
              ...(await generarContenidoClientes(embarque, clientesDisponibles, clientesJuntarMedidas, clientesReglaOtilio, clientesIncluirPrecios, clientesSumarKgCatarro, clientesCuentaEnPdf)),
      // Agregar la nueva sección de rendimientos
      ...generarSeccionRendimientos({
        ...embarque,
        // Asegurarnos de que los kilos crudos estén disponibles
        kilosCrudos: embarque.kilosCrudos || {}
      }, clientesDisponibles),
    ];
    
    // Determinar si se deben mostrar precios en la segunda página
    // Solo mostrar precios en la segunda página si están incluidas las cuentas en PDF
    const mostrarPreciosSegundaPagina = {};
    const mostrarCuentasSegundaPagina = {};
    
    // Iterar sobre cada cliente para determinar si debe mostrar precios en la segunda página
    Object.keys(clientesIncluirPrecios || {}).forEach(clienteId => {
      const incluirPrecios = clientesIncluirPrecios[clienteId];
      const cuentaEnPdf = clientesCuentaEnPdf[clienteId];
      
      // Solo mostrar precios en la segunda página si incluirPrecios es true Y cuentaEnPdf es true
      mostrarPreciosSegundaPagina[clienteId] = incluirPrecios && cuentaEnPdf;
      mostrarCuentasSegundaPagina[clienteId] = cuentaEnPdf;
    });

    // Ahora generamos el contenido sin precios (segunda página)
    const contenidoSinPrecios = [
      {
        columns: [
          {
            image: logoBase64,
            width: 100,
            alignment: 'left',
            margin: [0, 0, 0, 10]
          },
          {
            text: 'Nota de Embarque',
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
              ...(await generarContenidoClientesSinPrecios(embarque, clientesDisponibles, clientesJuntarMedidas, clientesReglaOtilio, mostrarPreciosSegundaPagina, clientesSumarKgCatarro, mostrarCuentasSegundaPagina)),
    ];

    const docDefinition = {
      content: [
        // Primera página con precios
        ...contenidoConPrecios,
        // Salto de página
        { text: '', pageBreak: 'before' },
        // Segunda página sin precios
        ...contenidoSinPrecios
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
        clienteElizabeth: {
          color: '#FFFFFF',
          background: '#9b59b6',
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
        totalPrecio: {
          color: '#FFFFFF',
          background: '#9b59b6',
          padding: [2, 2, 2, 2],
          bold: true,
          fontSize: 21
        },
        granTotal: {
          color: '#FFFFFF',
          background: '#8e44ad', // Un poco más oscuro que el morado normal
          padding: [4, 4, 4, 4],
          bold: true,
          fontSize: 24
        },
        tipoConAgua: {
          color: '#2980b9',  // Color azul
          bold: true
        },
        precioInline: {
          color: '#FFFFFF',  // Fuente blanca
          background: '#FF0000',  // Fondo rojo
          padding: [2, 2, 2, 2],
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
            { text: ' 2025 Rey Pez - Tampico, Tamps.', alignment: 'center', margin: [0, 10, 0, 0] },
          ],
          margin: [40, 0, 40, 0],
          fontSize: 20,
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
      
      // Contamos el total de productos para ambas páginas
      const totalProductos = contarTotalProductos(embarque);
      
      console.log(`Total de productos: ${totalProductos}, Páginas generadas: ${numPages}`);
      
      // Determinar el nivel de reducción de escala basado en el número de productos y páginas
      let nivelReduccion = 'ninguno';
      
      if (totalProductos >= 8 && totalProductos < 12) {
        nivelReduccion = 'moderado';
      } else if (totalProductos >= 12 || numPages > 2) {
        nivelReduccion = 'agresivo';
      }
      
      if (nivelReduccion !== 'ninguno') {
        const docDefinitionAjustado = {
          ...docDefinition,
          defaultStyle: {
            ...docDefinition.defaultStyle,
            fontSize: nivelReduccion === 'moderado' ? 16 : 14 // Reducir a 14 si es agresivo
          },
          styles: {
            ...docDefinition.styles,
            notaVentaHeader: {
              ...docDefinition.styles.notaVentaHeader,
              fontSize: nivelReduccion === 'moderado' ? 24 : 20 // Reducir de 30 a 20 si es agresivo
            },
            header: {
              ...docDefinition.styles.header,
              fontSize: nivelReduccion === 'moderado' ? 24 : 20 // Reducir de 30 a 20 si es agresivo
            },
            subheader: {
              ...docDefinition.styles.subheader,
              fontSize: nivelReduccion === 'moderado' ? 20 : 17 // Reducir de 25 a 17 si es agresivo
            },
            tableHeader: {
              ...docDefinition.styles.tableHeader,
              fontSize: nivelReduccion === 'moderado' ? 18 : 15 // Reducir de 23 a 15 si es agresivo
            },
            medidaHeader: {
              ...docDefinition.styles.medidaHeader,
              fontSize: nivelReduccion === 'moderado' ? 20 : 16 // Reducir de 24 a 16 si es agresivo
            },
            nota: {
              ...docDefinition.styles.nota,
              fontSize: nivelReduccion === 'moderado' ? 15 : 12 // Reducir de 18 a 12 si es agresivo
            },
            totalPrecio: {
              ...docDefinition.styles.totalPrecio,
              fontSize: nivelReduccion === 'moderado' ? 18 : 15 // Reducir de 21 a 15 si es agresivo
            },
            granTotal: {
              ...docDefinition.styles.granTotal,
              fontSize: nivelReduccion === 'moderado' ? 20 : 17 // Reducir de 24 a 17 si es agresivo
            }
          },
          footer: function(currentPage, pageCount) {
            return {
              columns: [
                { text: ' 2025 Rey Pez - Tampico, Tamps.', alignment: 'center', margin: [0, 10, 0, 0] },
              ],
              margin: [40, 0, 40, 0],
              fontSize: nivelReduccion === 'moderado' ? 16 : 14, // Reducir también el footer
              color: '#3760b0'
            };
          }
        };
        
        // Crear y descargar el PDF con los ajustes
        pdfMake.createPdf(docDefinitionAjustado).download('nota-venta.pdf');
        console.log(`PDF generado con nivel de reducción: ${nivelReduccion}`);
      } else {
        // Si son pocos productos, descargar el original
        pdfMake.createPdf(docDefinition).download('nota-venta.pdf');
        console.log('PDF generado sin reducción de escala');
      }
    });

  } catch (error) {
    console.error('Error al generar el PDF:', error);
  }
}

// Función auxiliar para contar el total de productos
function contarTotalProductos(embarque) {
  let contador = 0;
  
  // Contar productos normales con kilos > 0
  if (embarque.productos && Array.isArray(embarque.productos)) {
    contador += embarque.productos.filter(producto => {
      const kilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
      return kilos > 0;
    }).length;
  }
  
  // Contar productos crudos con kilos > 0
  if (embarque.clienteCrudos) {
    Object.values(embarque.clienteCrudos).forEach(crudos => {
      // Verificar que crudos sea un array antes de usar forEach
      if (Array.isArray(crudos)) {
        crudos.forEach(crudo => {
          if (crudo && Array.isArray(crudo.items)) {
            contador += crudo.items.filter(item => {
              // Simplificamos la verificación para el conteo
              return item && (item.taras || item.sobrante);
            }).length;
          }
        });
      }
    });
  }
  
  return contador;
}

async function generarContenidoClientes(embarque, clientesDisponibles, clientesJuntarMedidas, clientesReglaOtilio = {}, clientesIncluirPrecios = {}, clientesSumarKgCatarro = {}, clientesCuentaEnPdf = {}) {
  const contenido = [];
  let totalTarasLimpio = 0;
  let totalTarasCrudos = 0;

  // Validar que embarque y productos existan
  if (!embarque || !embarque.productos || !Array.isArray(embarque.productos)) {
    console.warn('Datos de embarque inválidos o productos no encontrados');
    return [{
      text: 'No hay datos de productos disponibles',
      italics: true,
      margin: [0, 5, 0, 10]
    }];
  }

  // Validar que clientesDisponibles sea un array
  if (!Array.isArray(clientesDisponibles)) {
    console.warn('Lista de clientes no válida');
    clientesDisponibles = [];
  }

  // Agrupar productos por cliente
  const productosPorCliente = embarque.productos.reduce((acc, producto) => {
    if (!acc[producto.clienteId]) {
      acc[producto.clienteId] = [];
    }
    acc[producto.clienteId].push(producto);
    return acc;
  }, {});

  // Determinar si hay algún cliente Elizabeth o Catarro con precios
  let hayClienteConPrecios = false;
  let totalDineroGeneral = 0;
  
  Object.entries(productosPorCliente).forEach(([clienteId]) => {
    const nombreCliente = obtenerNombreCliente(clienteId, clientesDisponibles);
    const incluirPreciosCliente = clientesIncluirPrecios && clientesIncluirPrecios[clienteId];
    if ((nombreCliente.toLowerCase().includes('elizabeth') || nombreCliente.toLowerCase().includes('catarro')) && incluirPreciosCliente) {
      hayClienteConPrecios = true;
    }
  });

  for (const [clienteId, productos] of Object.entries(productosPorCliente)) {
    const nombreCliente = obtenerNombreCliente(clienteId, clientesDisponibles);
    const estiloCliente = obtenerEstiloCliente(nombreCliente);
    
    // Verificar si este cliente específico tiene activada la opción de juntar medidas
    const debeJuntarMedidas = clientesJuntarMedidas && clientesJuntarMedidas[clienteId];
    
    // Verificar si este cliente específico tiene activada la regla de Otilio
    const aplicarReglaOtilioCliente = clientesReglaOtilio && clientesReglaOtilio[clienteId];
    
    // Verificar si este cliente específico tiene activada la opción de incluir precios
    const incluirPreciosCliente = clientesIncluirPrecios && clientesIncluirPrecios[clienteId];
    
    // Verificar si este cliente específico tiene activada la opción de cuenta en PDF
    const cuentaEnPdfCliente = clientesCuentaEnPdf && clientesCuentaEnPdf[clienteId];
    
    // Verificar si este cliente específico tiene activada la opción de sumar kg para Catarro
    const esCatarro = nombreCliente.toLowerCase().includes('catarro');
    const sumarKgCatarroCliente = clientesSumarKgCatarro && clientesSumarKgCatarro.hasOwnProperty(clienteId) 
      ? clientesSumarKgCatarro[clienteId] 
      : esCatarro; // Por defecto true para Catarro, false para otros
    
    if (esCatarro) {
      console.log('[DEBUG] Configuración para cliente Catarro:', {
        clienteId,
        nombreCliente,
        esCatarro,
        clientesSumarKgCatarro,
        tienePropiedad: clientesSumarKgCatarro && clientesSumarKgCatarro.hasOwnProperty(clienteId),
        valorDirecto: clientesSumarKgCatarro ? clientesSumarKgCatarro[clienteId] : 'N/A',
        sumarKgCatarroCliente
      });
    }
    
    const productosConKilos = productos.filter(producto => {
      const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilioCliente, sumarKgCatarroCliente);
      return kilos > 0;
    });
    
    // Agregar encabezado del cliente
    contenido.push(
      { 
        text: `Cliente: ${nombreCliente}`, 
        style: ['subheader', estiloCliente],
        margin: [0, 5, 0, 5]
      }
    );

    // Verificar si hay productos (limpio) con kilos reales para este cliente
    if (productosConKilos.length > 0) {
      // Procesar los productos según la configuración de juntar medidas
      let productosAProcesar = productosConKilos;
      if (debeJuntarMedidas) {
        const productosAgrupados = {};
        
        productosConKilos.forEach(producto => {
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
              reporteBolsas: [...(producto.reporteBolsas || [])],
              // Crear un array para rastrear qué taras tienen descuento
              tarasInfo: producto.taras.map(tara => ({
                valor: tara,
                restarTaras: producto.restarTaras
              }))
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
            // Agregar la información de las nuevas taras
            productosAgrupados[clave].tarasInfo.push(
              ...producto.taras.map(tara => ({
                valor: tara,
                restarTaras: producto.restarTaras
              }))
            );
            // Mantener el array de taras sincronizado
            productosAgrupados[clave].taras = productosAgrupados[clave].tarasInfo.map(t => t.valor);
          }
        });
        
        productosAProcesar = Object.values(productosAgrupados);
      }
      
      // Agrupar productos por medida y tipo
      let productosAgrupados = agruparProductos(productosAProcesar);
      
      // Verificar nuevamente si después de agrupar hay productos válidos con kilos
      // (puede ocurrir que al combinar queden solo productos con 0 kilos)
      const hayProductosValidos = productosAgrupados.some(producto => {
        const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilioCliente, sumarKgCatarroCliente);
        return kilos > 0;
      });
      
      if (hayProductosValidos) {
        // Si tiene activado incluir precios, obtener precios de Firestore
        if (incluirPreciosCliente) {
          const promesasPrecios = productosAgrupados.map(async (producto) => {
            if (!producto.precio) {
              const nombreProducto = producto.nombreAlternativoPDF || producto.medida;
              const precio = await obtenerPrecioProductoCatarro(nombreProducto);
              if (precio) {
                producto.precio = precio;
              }
            }
            return producto;
          });
          
          productosAgrupados = await Promise.all(promesasPrecios);
        }
        
        // Mostrar sección de limpios solo si hay productos con kilos válidos
        contenido.push(
          { 
            text: 'Limpio:', 
            style: ['subheader', estiloCliente],
            margin: [0, 5, 0, 5]
          },
          generarTablaProductos(productosAgrupados, estiloCliente, nombreCliente, aplicarReglaOtilioCliente, sumarKgCatarroCliente, incluirPreciosCliente, cuentaEnPdfCliente),
          { text: '\n' }
        );

        const tarasLimpioCliente = productos.reduce((sum, producto) => sum + totalTaras(producto), 0);
        if (tarasLimpioCliente > 0) {
          totalTarasLimpio += tarasLimpioCliente;
          contenido.push(
            { 
              text: `Taras de limpio: ${tarasLimpioCliente}`, 
              margin: [0, 5, 0, 5]
            },
            { text: '\n' }
          );
        }
      }
    }

    // Verificar si hay crudos para este cliente
    if (embarque.clienteCrudos && embarque.clienteCrudos[clienteId]) {
      // Verificar si hay crudos con kilos reales
      const hayKilosCrudos = verificarKilosCrudos(embarque.clienteCrudos, clienteId, nombreCliente);
      
      if (hayKilosCrudos) {
        // Si tiene activado incluir precios, obtener precios para los crudos
        let crudosConPrecios = embarque.clienteCrudos[clienteId];
        if (incluirPreciosCliente) {
          const promesasPrecios = crudosConPrecios.map(async (crudo) => {
            const itemsConPrecios = await Promise.all(crudo.items.map(async (item) => {
              if (!item.precio && item.talla) {
                // Buscar precio basado en la talla del crudo
                const precio = await obtenerPrecioProductoCatarro(item.talla);
                if (precio) {
                  item.precio = precio;
                }
              }
              return item;
            }));
            return { ...crudo, items: itemsConPrecios };
          });
          crudosConPrecios = await Promise.all(promesasPrecios);
        }
        
        contenido.push(
          { 
            text: 'Crudos:', 
            style: ['subheader', estiloCliente],
            margin: [0, 5, 0, 5]
          },
          generarTablaCrudos(crudosConPrecios, estiloCliente, incluirPreciosCliente),
          { text: '\n' }
        );

        const tarasCrudosCliente = embarque.clienteCrudos[clienteId].reduce((sum, crudo) => 
          sum + crudo.items.reduce((itemSum, item) => itemSum + calcularTarasTotales(item), 0), 0);
        
        if (tarasCrudosCliente > 0) {
          totalTarasCrudos += tarasCrudosCliente;
          contenido.push(
            { 
              text: `Taras de crudo: ${tarasCrudosCliente}`, 
              margin: [0, 5, 0, 5]
            },
            { text: '\n' }
          );
        }
      }
    }
    
    // Si no hay ni productos con kilos ni crudos con kilos, mostrar mensaje
    const hayProductosConKilos = productosConKilos.length > 0;
    const hayKilosCrudos = embarque.clienteCrudos && embarque.clienteCrudos[clienteId] && 
                          embarque.clienteCrudos[clienteId].some(crudo => 
                            crudo.items.some(item => {
                              const kilosTexto = calcularKilosCrudos(item, nombreCliente);
                              const kilos = parseFloat(kilosTexto);
                              return kilos > 0;
                            })
                          );
                          
    if (!hayProductosConKilos && !hayKilosCrudos) {
      contenido.push(
        { 
          text: 'No hay medidas registradas para este cliente', 
          italics: true,
          margin: [0, 5, 0, 10]
        },
        { text: '\n' }
      );
    }

    // Calcular el total de dinero para este cliente específico
    let totalDineroCliente = 0;
    
    // Sumar totales de productos limpios de este cliente
    productos.forEach(producto => {
      if (producto.precio) {
        let totalProducto = 0;
        if (producto.tipo === 'c/h20') {
          // Para productos c/h2o: calcular kilos reales usando taras × bolsas × valor_neto
          let kilosReales = 0;
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          const valorNeto = producto.camaronNeto || 0.65;
          
          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsas = parseInt(reporteBolsas[i]) || 0;
            kilosReales += taras * bolsas * valorNeto;
          }
          totalProducto = kilosReales * Number(producto.precio);
        } else {
          const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilioCliente, sumarKgCatarroCliente);
          // Usar exactamente los mismos kilos que se muestran en la tabla
          const kilosMostrados = nombreCliente.toLowerCase().includes('ozuna') ? 
            Number(kilos.toFixed(1)) : Math.round(kilos);
          totalProducto = kilosMostrados * Number(producto.precio);
        }
        totalDineroCliente += totalProducto;
      }
    });

    // Sumar totales de crudos de este cliente
    if (embarque.clienteCrudos && embarque.clienteCrudos[clienteId]) {
      procesarCrudosDeFormaSegura(embarque.clienteCrudos, clienteId, clientesDisponibles, (item) => {
        if (item.precio) {
          const kilos = parseFloat(calcularKilosCrudos(item, nombreCliente));
          // Usar exactamente los mismos kilos que se muestran en la tabla (redondeados)
          const kilosMostrados = Math.round(kilos);
          totalDineroCliente += kilosMostrados * Number(item.precio);
        }
      });
    }
    
    // Acumular en el total general
    totalDineroGeneral += totalDineroCliente;
  }

  // Agregar total general de taras y dinero al final
  if (totalTarasLimpio + totalTarasCrudos > 0) {
    contenido.push(
      ...generarTotalGeneral(totalTarasLimpio, totalTarasCrudos, totalDineroGeneral, hayClienteConPrecios)
    );
  }

  return contenido;
}

function generarSeccionRendimientos(embarque, clientesDisponibles) {
  const contenido = [];
  
  // Validar que embarque y productos existan
  if (!embarque || !embarque.productos || !Array.isArray(embarque.productos)) {
    console.warn('Datos de embarque inválidos o productos no encontrados para rendimientos');
    return [];
  }
  
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

function generarTablaProductos(productos, estiloCliente, nombreCliente, aplicarReglaOtilio = true, sumarKgCatarro = true, incluirPreciosCliente = true, cuentaEnPdfCliente = false) {
  // Filtrar productos que tengan kilos reales
  const productosConKilos = productos.filter(producto => {
    const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilio, sumarKgCatarro);
    return kilos > 0;
  });
  
  // Si no hay productos con kilos, devolver una tabla vacía
  if (productosConKilos.length === 0) {
    return {
      table: {
        headerRows: 1,
        widths: ['100%'],
        body: [
          [{ text: 'No hay productos con kilos registrados', italics: true, alignment: 'center' }]
        ]
      },
      layout: {
        hLineWidth: function(i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
        vLineWidth: function(i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
        hLineColor: function(i, node) { return (i === 0 || i === node.table.body.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
        vLineColor: function(i, node) { return (i === 0 || i === node.table.widths.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
      }
    };
  }
  
  // Verificar si algún producto tiene notas o hilos
  const hayNotas = productosConKilos.some(producto => producto.nota && producto.nota.trim() !== '');
  const hayHilos = productosConKilos.some(producto => producto.hilos);
  // Verificar si hay productos con precio y si se deben incluir precios para este cliente
  const hayPrecios = incluirPreciosCliente && productosConKilos.some(producto => producto.precio && producto.precio.toString().trim() !== '');
  // Solo mostrar columnas separadas de precio y total si está activado "cuenta en PDF"
  const mostrarColumnasPrecio = hayPrecios && cuentaEnPdfCliente;

  // Definir las columnas del header
  const headerRow = [
    { text: 'Kg', style: 'tableHeader' },
    { text: 'Producto', style: 'tableHeader' },
    { text: 'Taras', style: 'tableHeader' }
  ];

  // Agregar columnas de Precio y Total solo si hay precios y está activado "cuenta en PDF"
  if (mostrarColumnasPrecio) {
    headerRow.push({ text: 'Precio', style: 'tableHeader' });
    headerRow.push({ text: 'Total', style: 'tableHeader' });
  }

  if (hayHilos) {
    headerRow.push({ text: 'Hilos', style: 'tableHeader' });
  }
  if (hayNotas) {
    headerRow.push({ text: 'Notas', style: 'tableHeader' });
  }

  const body = [headerRow];
  
  // Variable para calcular el gran total
  let granTotal = 0;

  productosConKilos.forEach(producto => {
    const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
    const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
    
    const tarasTotales = tarasNormales + tarasExtra;
    let tarasTexto = `${tarasTotales} ${combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas)}`;

    // Calcular kilos para este producto
    const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilio, sumarKgCatarro);
    
    // Verificar que tenga kilos > 0
    if (kilos > 0) {
      // Calcular los kilos que se mostrarán en la tabla (exactamente como aparecen)
      const kilosMostrados = nombreCliente.toLowerCase().includes('ozuna') ? 
        Number(kilos.toFixed(1)) : Math.round(kilos);
      
      const row = [
        // Mostrar un decimal para Ozuna
        nombreCliente.toLowerCase().includes('ozuna') ? `${kilos.toFixed(1)} kg` : `${Math.round(kilos)} kg`,
        // Construir el texto del producto según los casos
        hayPrecios 
          ? (mostrarColumnasPrecio 
              // Si hay columnas de precio separadas, mostrar solo el nombre del producto
              ? {
                  text: (producto.nombreAlternativoPDF || producto.medida || '') + (producto.tipo === 'c/h20' ? ' c/h2o' : (producto.tipo === 's/h20' ? ' s/h2o' : (producto.tipo === 'otro' ? ` ${producto.tipoPersonalizado || ''}` : ` ${producto.tipo || ''}`))),
                  ...(producto.tipo === 'c/h20' ? { style: 'tipoConAgua' } : {})
                }
              // Si no hay columnas separadas, crear texto con estilos separados para medida y precio
              : (producto.precio 
                ? {
                    text: [
                      { 
                        text: (producto.nombreAlternativoPDF || producto.medida || '') + (producto.tipo === 'c/h20' ? ' c/h2o' : (producto.tipo === 's/h20' ? ' s/h2o' : (producto.tipo === 'otro' ? ` ${producto.tipoPersonalizado || ''}` : ` ${producto.tipo || ''}`))) + ' - ',
                        ...(producto.tipo === 'c/h20' ? { style: 'tipoConAgua' } : {})
                      },
                      { 
                        text: `$${Number(producto.precio).toLocaleString('en-US')}`,
                        style: 'precioInline'
                      }
                    ]
                  }
                : {
                    text: (producto.nombreAlternativoPDF || producto.medida || '') + (producto.tipo === 'c/h20' ? ' c/h2o' : (producto.tipo === 's/h20' ? ' s/h2o' : (producto.tipo === 'otro' ? ` ${producto.tipoPersonalizado || ''}` : ` ${producto.tipo || ''}`))),
                    ...(producto.tipo === 'c/h20' ? { style: 'tipoConAgua' } : {})
                  }
              )
            )
          : {
              text: formatearProducto(producto),
              ...(producto.tipo === 'c/h20' ? { style: 'tipoConAgua' } : {})
            },
        tarasTexto
      ];

      // Agregar columnas de Precio y Total solo si está activado "cuenta en PDF"
      if (mostrarColumnasPrecio) {
        // Agregar columna de precio
        row.push(producto.precio 
          ? { text: `$${Number(producto.precio).toLocaleString('en-US')}`, style: 'precio' } 
          : '');
        
        // Calcular el total correctamente según el tipo de producto
        let total = 0;
        if (producto.precio) {
          if (producto.tipo === 'c/h20') {
            // Para productos c/h2o: calcular kilos reales usando taras × bolsas × valor_neto
            let kilosReales = 0;
            const reporteTaras = producto.reporteTaras || [];
            const reporteBolsas = producto.reporteBolsas || [];
            const valorNeto = producto.camaronNeto || 0.65;
            
            for (let i = 0; i < reporteTaras.length; i++) {
              const taras = parseInt(reporteTaras[i]) || 0;
              const bolsas = parseInt(reporteBolsas[i]) || 0;
              kilosReales += taras * bolsas * valorNeto;
            }
            total = kilosReales * Number(producto.precio);
          } else {
            // Para otros productos, usar los kilos mostrados
            total = kilosMostrados * Number(producto.precio);
          }
        }
        
        // Sumar al gran total
        granTotal += total;
        
        row.push(producto.precio 
          ? { text: `$${Math.round(total).toLocaleString('en-US')}`, style: 'totalPrecio' } 
          : '');
      }

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
    }
  });

  // Agregar fila con el gran total solo si está activado "cuenta en PDF"
  if (mostrarColumnasPrecio && granTotal > 0) {
    // Crear una fila completa para el gran total
    const numColumnas = headerRow.length; 
    const filaGranTotal = [
      {
        text: 'GRAN TOTAL:',
        bold: true,
        alignment: 'right',
        color: '#9b59b6',
        border: [true, true, true, true],
        colSpan: numColumnas - 1
      }
    ];
    
    // Agregar celdas vacías para mantener la estructura de columnas (excepto la última)
    for (let i = 1; i < numColumnas - 1; i++) {
      filaGranTotal.push({});
    }
    
    // Agregar el valor del gran total
    filaGranTotal.push({ 
      text: `$${Math.round(granTotal).toLocaleString('en-US')}`,
      bold: true,
      fontSize: 24,
      color: '#9b59b6',
      border: [true, true, true, true],
      alignment: 'center'
    });
    
    body.push(filaGranTotal);
  }

  // Si no hay filas con productos, mostrar mensaje
  if (body.length === 1) {
    return {
      table: {
        headerRows: 1,
        widths: ['100%'],
        body: [
          [{ text: 'No hay productos con kilos registrados', italics: true, alignment: 'center' }]
        ]
      },
      layout: {
        hLineWidth: function(i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
        vLineWidth: function(i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
        hLineColor: function(i, node) { return (i === 0 || i === node.table.body.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
        vLineColor: function(i, node) { return (i === 0 || i === node.table.widths.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
      }
    };
  }

  // Calcular los anchos según el número de columnas
  let widths;
  if (mostrarColumnasPrecio) {
    // Columnas base + Precio + Total
    const numColumnas = 5 + (hayHilos ? 1 : 0) + (hayNotas ? 1 : 0);
    
    if (hayHilos && hayNotas) {
      widths = ['10%', '20%', '20%', '15%', '15%', '10%', '10%'];
    } else if (hayHilos) {
      widths = ['15%', '20%', '20%', '15%', '15%', '15%'];
    } else if (hayNotas) {
      widths = ['15%', '20%', '20%', '15%', '15%', '15%'];
    } else {
      widths = ['15%', '25%', '20%', '20%', '20%'];
    }
  } else {
    // Mantener los anchos originales si no hay precios o no se deben mostrar
    if (hayHilos && hayNotas) {
      widths = ['15%', '25%', '25%', '15%', '20%'];
    } else if (hayHilos) {
      widths = ['20%', '30%', '30%', '20%'];
    } else if (hayNotas) {
      widths = ['20%', '30%', '30%', '20%'];
    } else {
      widths = ['25%', '35%', '40%'];
    }
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

function generarTablaCrudos(crudos, estiloCliente, incluirPreciosCliente = false) {
  // Obtener el nombre del cliente a partir del estilo
  const nombreCliente = obtenerNombreClienteDesdeEstilo(estiloCliente);
  
  // Crear una estructura temporal para almacenar los items filtrados
  const itemsFiltrados = [];
  let hayPrecios = false;

  // Procesar los crudos de forma segura
  try {
    if (!Array.isArray(crudos)) {
      console.warn('Los crudos proporcionados no son un array válido');
      return generarTablaVacia(estiloCliente);
    }

    crudos.forEach(crudo => {
      if (!crudo || !Array.isArray(crudo.items)) {
        console.warn('Estructura de crudo no válida', { crudo });
        return;
      }

      crudo.items.forEach(item => {
        if (!item) {
          console.warn('Item no válido en crudo', { crudo });
          return;
        }

        const kilosTexto = calcularKilosCrudos(item, nombreCliente);
        const kilos = parseFloat(kilosTexto);
        
        if (kilos > 0) {
          itemsFiltrados.push(item);
          if (incluirPreciosCliente && item.precio && item.precio.toString().trim() !== '') {
            hayPrecios = true;
          }
        }
      });
    });
  } catch (error) {
    console.error('Error al procesar crudos:', error);
    return generarTablaVacia(estiloCliente);
  }

  // Si no hay items con kilos, devolver una tabla vacía
  if (itemsFiltrados.length === 0) {
    return generarTablaVacia(estiloCliente);
  }

  // Definir las columnas del header según si hay precios o no
  const headerRow = [
    { text: 'Cantidad', style: 'tableHeader' },
    { text: 'Talla', style: 'tableHeader' },
    { text: 'Taras', style: 'tableHeader' }
  ];

  // Agregar columna de precio solo si hay precios
  if (hayPrecios) {
    headerRow.push({ text: 'Precio', style: 'tableHeader' });
    headerRow.push({ text: 'Total', style: 'tableHeader' });
  }

  const body = [headerRow];
  
  // Variable para calcular el gran total
  let granTotal = 0;

  // Agregar las filas de datos
  itemsFiltrados.forEach(item => {
    const kilosTexto = calcularKilosCrudos(item, nombreCliente);
    const kilos = parseFloat(kilosTexto);
    
    // Calcular los kilos que se mostrarán en la tabla (exactamente como aparecen)
    const kilosMostrados = Math.round(kilos);
    
    const row = [
      `${kilosMostrados} kg`,
      {
        text: item.talla.replace(/\s*c\/\s*c$/i, ' c/c'),
        // Aplicar estilo azul si la talla contiene "c/c" (que indica "con cascaron")
        ...(item.talla && item.talla.toLowerCase().includes('c/c') ? { style: 'tipoConAgua' } : { style: 'default' }),
        noWrap: true
      },
      calcularTarasTotales(item)
    ];

    // Agregar precio formateado solo si la columna existe
    if (hayPrecios) {
      row.push(item.precio ? { text: `$${Number(item.precio).toLocaleString('en-US')}`, style: 'precio' } : '');
      
      // Agregar total si hay precios
      const total = item.precio ? kilosMostrados * Number(item.precio) : 0;
      granTotal += total;
      
      row.push(item.precio 
        ? { text: `$${Math.round(total).toLocaleString('en-US')}`, style: 'totalPrecio' } 
        : '');
    }

    body.push(row);
  });
  
  // Agregar fila con el gran total si hay precios
  if (hayPrecios && granTotal > 0) {
    const numColumnas = headerRow.length;
    const filaGranTotal = [
      {
        text: 'GRAN TOTAL:',
        bold: true,
        alignment: 'right',
        color: '#9b59b6',
        border: [true, true, true, true],
        colSpan: numColumnas - 1
      }
    ];
    
    // Agregar celdas vacías para mantener la estructura de columnas
    for (let i = 1; i < numColumnas - 1; i++) {
      filaGranTotal.push({});
    }
    
    // Agregar el valor del gran total
    filaGranTotal.push({ 
      text: `$${Math.round(granTotal).toLocaleString('en-US')}`,
      bold: true,
      fontSize: 24,
      color: '#9b59b6',
      border: [true, true, true, true],
      alignment: 'center'
    });
    
    body.push(filaGranTotal);
  }

  // Definir los anchos de columna según si hay precios o no
  let widths;
  if (hayPrecios) {
    widths = ['20%', '25%', '20%', '15%', '20%']; // Con columna de precio y total
  } else {
    widths = ['30%', '40%', '30%']; // Sin columna de precio
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

function generarTablaVacia(estiloCliente) {
  return {
    table: {
      headerRows: 1,
      widths: ['100%'],
      body: [
        [{ text: 'No hay crudos con kilos registrados', italics: true, alignment: 'center' }]
      ]
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
  if (nombreLowerCase.includes('elizabeth')) return 'clienteElizabeth';
  return 'clienteOtro';
}

function formatearProducto(producto) {
  let medida = (producto.nombreAlternativoPDF || producto.medida || '').trim();
  
  // Si es c/h20, agregar el indicador pero mantener el nombre original
  if (producto.tipo === 'c/h20') {
    return { text: `${medida} c/h2o`, style: 'tipoConAgua' };
  }
  
  // Si es s/h20, agregar el indicador pero mantener el nombre original
  if (producto.tipo === 's/h20') {
    return { text: `${medida} s/h2o`, style: 'default' };
  }
  
  // Para otros tipos, mostrar el nombre exacto con el tipo si existe
  let tipoProducto = producto.tipo === 'otro' ? producto.tipoPersonalizado : producto.tipo;
  let textoFinal = tipoProducto ? `${medida} ${tipoProducto}` : medida;
  
  return { text: textoFinal, style: 'default' };
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

function totalKilos(producto, nombreCliente, aplicarReglaOtilio = true, sumarKgCatarro = true) {
  const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (kilo || 0), 0);
  
  // Calcular el descuento de taras
  let descuentoTaras = 0;
  
  if (producto.tarasInfo) {
    // Si tiene tarasInfo (productos combinados), usar esa información
    descuentoTaras = producto.tarasInfo.reduce((sum, tara) => {
      return sum + (tara.restarTaras ? (Number(tara.valor) || 0) * 3 : 0);
    }, 0);
  } else {
    // Para productos normales (no combinados), usar la lógica original
    const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
    descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
  }
  
  let resultado = sumaKilos - descuentoTaras;
  
  // Acceder a propiedades de forma segura
  const clienteNombreLower = nombreCliente ? nombreCliente.toLowerCase() : '';
  const tipoProducto = producto.tipo || '';
  
  // Modificar esta parte para considerar noSumarKilos
  if (!producto.noSumarKilos && 
      (tipoProducto.toLowerCase().includes('s/h2o') || 
       tipoProducto.toLowerCase().includes('s/h20'))) {
    // Solo sumar 1 kg a Catarro si el parámetro sumarKgCatarro es true
    if (clienteNombreLower.includes('catarro')) {
      console.log('[DEBUG] Cliente Catarro detectado:', {
        nombreCliente,
        sumarKgCatarro,
        resultadoAntes: resultado,
        tipoProducto: producto.tipo,
        medida: producto.medida
      });
      if (sumarKgCatarro) {
        resultado += 1;
        console.log('[DEBUG] Se sumó 1 kg. Resultado después:', resultado);
      } else {
        console.log('[DEBUG] NO se sumó 1 kg porque sumarKgCatarro es false');
      }
    }
    // Para cliente Otilio: sumar 1 kilo por cada 100 kilos en productos s/h2o (solo si aplicarReglaOtilio es true)
    if (aplicarReglaOtilio && 
        (clienteNombreLower.includes('otilio') || 
         (producto.nombreCliente && producto.nombreCliente.toLowerCase().includes('otilio')))) {
      const kilosAdicionales = Math.floor(resultado / 100);
      resultado += kilosAdicionales;
    }
  }
  
  // Retornamos un número redondeado a entero para cliente Elizabeth y Otilio, o con un decimal para Ozuna
  if (clienteNombreLower.includes('elizabeth') || clienteNombreLower.includes('otilio')) {
    return Math.round(resultado);
  } else if (clienteNombreLower.includes('ozuna')) {
    return Number(resultado.toFixed(1));
  } else {
    return Number(resultado.toFixed(1));
  }
}

function calcularKilosCrudos(item, clienteNombre) {
  let kilosTotales = 0;
  
  // Procesar taras principales
  if (item.taras) {
    const [cantidad, peso] = item.taras.split('-').map(Number);
    // Usar multiplicador de 20 para todos los clientes
    const multiplicador = 20;
    kilosTotales += cantidad * multiplicador;
  }

  // Procesar sobrante (se suma directamente el peso especificado)
  if (item.sobrante) {
    const [, kilosSobrante] = item.sobrante.split('-').map(Number);
    kilosTotales += kilosSobrante;
  }
  
  // Para Elizabeth, redondeamos a entero (sin decimales)
  if (clienteNombre && clienteNombre.toLowerCase().includes('elizabeth')) {
    return Math.round(kilosTotales).toString();
  }
  
  // Para Ozuna y otros clientes, mantenemos un decimal
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
    clienteElizabeth: '#9b59b6',
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
        reporteBolsas: [...(producto.reporteBolsas || [])],
        // Crear un array para rastrear qué taras tienen descuento
        tarasInfo: producto.taras.map(tara => ({
          valor: tara,
          restarTaras: producto.restarTaras
        }))
      };
    } else {
      // Combinar los kilos y taras
      productosAgrupados[clave].kilos.push(...producto.kilos);
      
      // Agregar la información de las nuevas taras
      productosAgrupados[clave].tarasInfo.push(
        ...producto.taras.map(tara => ({
          valor: tara,
          restarTaras: producto.restarTaras
        }))
      );
      
      // Mantener el array de taras sincronizado
      productosAgrupados[clave].taras = productosAgrupados[clave].tarasInfo.map(t => t.valor);
      
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

// Nueva función para obtener el nombre del cliente a partir del estilo
function obtenerNombreClienteDesdeEstilo(estiloCliente) {
  switch (estiloCliente) {
    case 'clienteJoselito': return 'joselito';
    case 'clienteCatarro': return 'catarro';
    case 'clienteOtilio': return 'otilio';
    case 'clienteOzuna': return 'ozuna';
    case 'clienteElizabeth': return 'elizabeth';
    default: return 'otro';
  }
}

export async function generarNotaVentaSinPreciosPDF(embarque, clientesDisponibles, clientesJuntarMedidas, clientesReglaOtilio = {}, clientesIncluirPrecios = {}) {
  try {
    // Validación más robusta de los datos de entrada
    if (!embarque || !embarque.productos || !Array.isArray(embarque.productos)) {
      console.warn('El embarque no contiene datos de productos válidos', { embarque });
      return;
    }

    // Asegurarse de que clientesDisponibles sea un array
    if (!Array.isArray(clientesDisponibles)) {
      console.warn('Lista de clientes no válida, usando array vacío');
      clientesDisponibles = [];
    }

    console.log('Generando nota sin precios para PDF:', {
      productos: embarque.productos,
      kilosCrudos: embarque.kilosCrudos,
      clienteCrudos: embarque.clienteCrudos,
      fecha: embarque.fecha,
      cargaCon: embarque.cargaCon
    });

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
              text: 'Nota de Embarque',
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
        ...(await generarContenidoClientesSinPrecios(embarque, clientesDisponibles, clientesJuntarMedidas, clientesReglaOtilio, clientesIncluirPrecios)),
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
        clienteElizabeth: {
          color: '#FFFFFF',
          background: '#9b59b6',
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
        tipoConAgua: {
          color: '#2980b9',  // Color azul
          bold: true
        },
        precioInline: {
          color: '#FFFFFF',  // Fuente blanca
          background: '#FF0000',  // Fondo rojo
          padding: [2, 2, 2, 2],
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
            { text: ' 2025 Rey Pez - Tampico, Tamps.', alignment: 'center', margin: [0, 10, 0, 0] },
          ],
          margin: [40, 0, 40, 0],
          fontSize: 20,
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
      
      // Contamos el total de productos
      const totalProductos = contarTotalProductos(embarque);
      
      console.log(`Total de productos: ${totalProductos}, Páginas generadas: ${numPages}`);
      
      // Determinar el nivel de reducción de escala basado en el número de productos y páginas
      let nivelReduccion = 'ninguno';
      
      if (totalProductos >= 8 && totalProductos < 12) {
        nivelReduccion = 'moderado';
      } else if (totalProductos >= 12 || numPages > 1) {
        nivelReduccion = 'agresivo';
      }
      
      if (nivelReduccion !== 'ninguno') {
        // Ajustar tamaños si excede una página o tiene muchos productos
        const docDefinitionAjustado = {
          ...docDefinition,
          defaultStyle: {
            ...docDefinition.defaultStyle,
            fontSize: nivelReduccion === 'moderado' ? 16 : 14 // Reducir más si es agresivo
          },
          styles: {
            ...docDefinition.styles,
            notaVentaHeader: {
              ...docDefinition.styles.notaVentaHeader,
              fontSize: nivelReduccion === 'moderado' ? 24 : 20 // Reducir más si es agresivo
            },
            header: {
              ...docDefinition.styles.header,
              fontSize: nivelReduccion === 'moderado' ? 24 : 20
            },
            subheader: {
              ...docDefinition.styles.subheader,
              fontSize: nivelReduccion === 'moderado' ? 20 : 17
            },
            tableHeader: {
              ...docDefinition.styles.tableHeader,
              fontSize: nivelReduccion === 'moderado' ? 18 : 15
            },
            medidaHeader: {
              ...docDefinition.styles.medidaHeader,
              fontSize: nivelReduccion === 'moderado' ? 20 : 16
            },
            nota: {
              ...docDefinition.styles.nota,
              fontSize: nivelReduccion === 'moderado' ? 15 : 12
            }
          },
          footer: function(currentPage, pageCount) {
            return {
              columns: [
                { text: ' 2025 Rey Pez - Tampico, Tamps.', alignment: 'center', margin: [0, 10, 0, 0] },
              ],
              margin: [40, 0, 40, 0],
              fontSize: nivelReduccion === 'moderado' ? 16 : 14, // Reducir también el footer
              color: '#3760b0'
            };
          }
        };
        
        // Crear y descargar el PDF con los ajustes
        pdfMake.createPdf(docDefinitionAjustado).download('nota-embarque.pdf');
        console.log(`PDF sin precios generado con nivel de reducción: ${nivelReduccion}`);
      } else {
        // Si es una sola página y menos de 8 productos, descargar el original
        pdfMake.createPdf(docDefinition).download('nota-embarque.pdf');
        console.log('PDF sin precios generado sin reducción de escala');
      }
    });

  } catch (error) {
    console.error('Error al generar el PDF sin precios:', error);
  }
}

async function generarContenidoClientesSinPrecios(embarque, clientesDisponibles, clientesJuntarMedidas, clientesReglaOtilio = {}, clientesIncluirPrecios = {}, clientesSumarKgCatarro = {}, clientesCuentaEnPdf = {}) {
  const contenido = [];
  let totalTarasLimpio = 0;
  let totalTarasCrudos = 0;

  // Validar que embarque y productos existan
  if (!embarque || !embarque.productos || !Array.isArray(embarque.productos)) {
    console.warn('Datos de embarque inválidos o productos no encontrados');
    return [{
      text: 'No hay datos de productos disponibles',
      italics: true,
      margin: [0, 5, 0, 10]
    }];
  }

  // Validar que clientesDisponibles sea un array
  if (!Array.isArray(clientesDisponibles)) {
    console.warn('Lista de clientes no válida');
    clientesDisponibles = [];
  }

  // Agrupar productos por cliente
  const productosPorCliente = embarque.productos.reduce((acc, producto) => {
    if (!acc[producto.clienteId]) {
      acc[producto.clienteId] = [];
    }
    acc[producto.clienteId].push(producto);
    return acc;
  }, {});

  // Determinar si hay algún cliente Elizabeth o Catarro con precios
  let hayClienteConPrecios = false;
  let totalDineroGeneral = 0;
  
  Object.entries(productosPorCliente).forEach(([clienteId]) => {
    const nombreCliente = obtenerNombreCliente(clienteId, clientesDisponibles);
    const incluirPreciosCliente = clientesIncluirPrecios && clientesIncluirPrecios[clienteId];
    if ((nombreCliente.toLowerCase().includes('elizabeth') || nombreCliente.toLowerCase().includes('catarro')) && incluirPreciosCliente) {
      hayClienteConPrecios = true;
    }
  });

  Object.entries(productosPorCliente).forEach(([clienteId, productos]) => {
    const nombreCliente = obtenerNombreCliente(clienteId, clientesDisponibles);
    const estiloCliente = obtenerEstiloCliente(nombreCliente);
    
    // Verificar si este cliente específico tiene activada la opción de juntar medidas
    const debeJuntarMedidas = clientesJuntarMedidas && clientesJuntarMedidas[clienteId];
    
    // Verificar si este cliente específico tiene activada la regla de Otilio
    const aplicarReglaOtilioCliente = clientesReglaOtilio && clientesReglaOtilio[clienteId];
    
    // Verificar si este cliente específico tiene activada la opción de incluir precios
    const incluirPreciosCliente = clientesIncluirPrecios && clientesIncluirPrecios[clienteId];
    
    // Verificar si este cliente específico tiene activada la opción de cuenta en PDF
    const cuentaEnPdfCliente = clientesCuentaEnPdf && clientesCuentaEnPdf[clienteId];
    
    // Verificar si este cliente específico tiene activada la opción de sumar kg para Catarro
    const esCatarro = nombreCliente.toLowerCase().includes('catarro');
    const sumarKgCatarroCliente = clientesSumarKgCatarro && clientesSumarKgCatarro.hasOwnProperty(clienteId) 
      ? clientesSumarKgCatarro[clienteId] 
      : esCatarro; // Por defecto true para Catarro, false para otros
    
    if (esCatarro) {
      console.log('[DEBUG] Configuración para cliente Catarro:', {
        clienteId,
        nombreCliente,
        esCatarro,
        clientesSumarKgCatarro,
        tienePropiedad: clientesSumarKgCatarro && clientesSumarKgCatarro.hasOwnProperty(clienteId),
        valorDirecto: clientesSumarKgCatarro ? clientesSumarKgCatarro[clienteId] : 'N/A',
        sumarKgCatarroCliente
      });
    }
    
    // Filtrar productos que tengan al menos 1 kilo real
    const productosConKilos = productos.filter(producto => {
      const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilioCliente, sumarKgCatarroCliente);
      return kilos > 0;
    });
    
    // Agregar encabezado del cliente
    contenido.push(
      { 
        text: `Cliente: ${nombreCliente}`, 
        style: ['subheader', estiloCliente],
        margin: [0, 5, 0, 5]
      }
    );

    // Verificar si hay productos (limpio) con kilos reales para este cliente
    if (productosConKilos.length > 0) {
      // Procesar los productos según la configuración de juntar medidas
      let productosAProcesar = productosConKilos;
      if (debeJuntarMedidas) {
        const productosAgrupados = {};
        
        productosConKilos.forEach(producto => {
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
              reporteBolsas: [...(producto.reporteBolsas || [])],
              // Crear un array para rastrear qué taras tienen descuento
              tarasInfo: producto.taras.map(tara => ({
                valor: tara,
                restarTaras: producto.restarTaras
              }))
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
            // Agregar la información de las nuevas taras
            productosAgrupados[clave].tarasInfo.push(
              ...producto.taras.map(tara => ({
                valor: tara,
                restarTaras: producto.restarTaras
              }))
            );
            // Mantener el array de taras sincronizado
            productosAgrupados[clave].taras = productosAgrupados[clave].tarasInfo.map(t => t.valor);
          }
        });
        
        productosAProcesar = Object.values(productosAgrupados);
      }
      
      // Agrupar productos por medida y tipo
      const productosAgrupados = agruparProductos(productosAProcesar);
      
      // Verificar nuevamente si después de agrupar hay productos válidos con kilos
      // (puede ocurrir que al combinar queden solo productos con 0 kilos)
      const hayProductosValidos = productosAgrupados.some(producto => {
        const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilioCliente, sumarKgCatarroCliente);
        return kilos > 0;
      });
      
      if (hayProductosValidos) {
        // Mostrar sección de limpios solo si hay productos con kilos válidos
        contenido.push(
          { 
            text: 'Limpio:', 
            style: ['subheader', estiloCliente],
            margin: [0, 5, 0, 5]
          },
          generarTablaProductosSinPrecios(productosAgrupados, estiloCliente, nombreCliente, aplicarReglaOtilioCliente, sumarKgCatarroCliente, incluirPreciosCliente, cuentaEnPdfCliente),
          { text: '\n' }
        );

        const tarasLimpioCliente = productos.reduce((sum, producto) => sum + totalTaras(producto), 0);
        if (tarasLimpioCliente > 0) {
          totalTarasLimpio += tarasLimpioCliente;
          contenido.push(
            { 
              text: `Taras de limpio: ${tarasLimpioCliente}`, 
              margin: [0, 5, 0, 5]
            },
            { text: '\n' }
          );
        }
      }
    }

    // Verificar si hay crudos para este cliente
    if (embarque.clienteCrudos && embarque.clienteCrudos[clienteId]) {
      // Verificar si hay crudos con kilos reales
      const hayKilosCrudos = verificarKilosCrudos(embarque.clienteCrudos, clienteId, nombreCliente);
      
      if (hayKilosCrudos) {
        contenido.push(
          { 
            text: 'Crudos:', 
            style: ['subheader', estiloCliente],
            margin: [0, 5, 0, 5]
          },
          generarTablaCrudos(embarque.clienteCrudos[clienteId], estiloCliente, false),
          { text: '\n' }
        );

        const tarasCrudosCliente = embarque.clienteCrudos[clienteId].reduce((sum, crudo) => 
          sum + crudo.items.reduce((itemSum, item) => itemSum + calcularTarasTotales(item), 0), 0);
        
        if (tarasCrudosCliente > 0) {
          totalTarasCrudos += tarasCrudosCliente;
          contenido.push(
            { 
              text: `Taras de crudo: ${tarasCrudosCliente}`, 
              margin: [0, 5, 0, 5]
            },
            { text: '\n' }
          );
        }
      }
    }
    
    // Si no hay ni productos con kilos ni crudos con kilos, mostrar mensaje
    const hayProductosConKilos = productosConKilos.length > 0;
    const hayKilosCrudos = embarque.clienteCrudos && embarque.clienteCrudos[clienteId] && 
                          embarque.clienteCrudos[clienteId].some(crudo => 
                            crudo.items.some(item => {
                              const kilosTexto = calcularKilosCrudos(item, nombreCliente);
                              const kilos = parseFloat(kilosTexto);
                              return kilos > 0;
                            })
                          );
                          
    if (!hayProductosConKilos && !hayKilosCrudos) {
      contenido.push(
        { 
          text: 'No hay medidas registradas para este cliente', 
          italics: true,
          margin: [0, 5, 0, 10]
        },
        { text: '\n' }
      );
    }

    // Calcular el total de dinero para este cliente específico
    let totalDineroCliente = 0;
    
    // Sumar totales de productos limpios de este cliente
    productos.forEach(producto => {
      if (producto.precio) {
        let totalProducto = 0;
        if (producto.tipo === 'c/h20') {
          // Para productos c/h2o: calcular kilos reales usando taras × bolsas × valor_neto
          let kilosReales = 0;
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          const valorNeto = producto.camaronNeto || 0.65;
          
          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsas = parseInt(reporteBolsas[i]) || 0;
            kilosReales += taras * bolsas * valorNeto;
          }
          totalProducto = kilosReales * Number(producto.precio);
        } else {
          const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilioCliente, sumarKgCatarroCliente);
          // Usar exactamente los mismos kilos que se muestran en la tabla
          const kilosMostrados = nombreCliente.toLowerCase().includes('ozuna') ? 
            Number(kilos.toFixed(1)) : Math.round(kilos);
          totalProducto = kilosMostrados * Number(producto.precio);
        }
        totalDineroCliente += totalProducto;
      }
    });

    // Sumar totales de crudos de este cliente
    if (embarque.clienteCrudos && embarque.clienteCrudos[clienteId]) {
      procesarCrudosDeFormaSegura(embarque.clienteCrudos, clienteId, clientesDisponibles, (item) => {
        if (item.precio) {
          const kilos = parseFloat(calcularKilosCrudos(item, nombreCliente));
          // Usar exactamente los mismos kilos que se muestran en la tabla (redondeados)
          const kilosMostrados = Math.round(kilos);
          totalDineroCliente += kilosMostrados * Number(item.precio);
        }
      });
    }
    
    // Acumular en el total general
    totalDineroGeneral += totalDineroCliente;
  });

  // Agregar solo total general de taras al final (sin total de cuenta en la segunda página)
  if (totalTarasLimpio + totalTarasCrudos > 0) {
    contenido.push(
      ...generarTotalGeneralSinPrecios(totalTarasLimpio, totalTarasCrudos)
    );
  }

  return contenido;
}

function generarTablaProductosSinPrecios(productos, estiloCliente, nombreCliente, aplicarReglaOtilio = true, sumarKgCatarro = true, incluirPreciosCliente = false, cuentaEnPdfCliente = false) {
  // Filtrar productos que tengan kilos reales
  const productosConKilos = productos.filter(producto => {
    const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilio, sumarKgCatarro);
    return kilos > 0;
  });
  
  // Si no hay productos con kilos, devolver una tabla vacía
  if (productosConKilos.length === 0) {
    return {
      table: {
        headerRows: 1,
        widths: ['100%'],
        body: [
          [{ text: 'No hay productos con kilos registrados', italics: true, alignment: 'center' }]
        ]
      },
      layout: {
        hLineWidth: function(i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
        vLineWidth: function(i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
        hLineColor: function(i, node) { return (i === 0 || i === node.table.body.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
        vLineColor: function(i, node) { return (i === 0 || i === node.table.widths.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
      }
    };
  }
  
  // Verificar si algún producto tiene notas o hilos
  const hayNotas = productosConKilos.some(producto => producto.nota && producto.nota.trim() !== '');
  const hayHilos = productosConKilos.some(producto => producto.hilos);

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

  productosConKilos.forEach(producto => {
    const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
    const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
    
    const tarasTotales = tarasNormales + tarasExtra;
    let tarasTexto = `${tarasTotales} ${combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas)}`;

    // Calcular kilos para este producto
    const kilos = totalKilos(producto, nombreCliente, aplicarReglaOtilio, sumarKgCatarro);
    
    // Verificar que tenga kilos > 0
    if (kilos > 0) {
      const row = [
        // Eliminar decimales para los kilos (redondeando al entero más cercano)
        `${Math.round(kilos)} kg`,
        // Formatear el nombre del producto según configuración de precios
        incluirPreciosCliente 
          ? (cuentaEnPdfCliente 
              // Si está activado "cuenta en PDF", mostrar solo el nombre (sin precio)
              ? {
                  text: formatearProductoSinPrecio(producto),
                  ...(producto.tipo === 'c/h20' ? { style: 'tipoConAgua' } : {})
                }
              // Si solo está activado "incluir precios", crear texto con estilos separados para medida y precio
              : (producto.precio 
                ? {
                    text: [
                      { 
                        text: formatearProductoSinPrecio(producto) + ' - ',
                        ...(producto.tipo === 'c/h20' ? { style: 'tipoConAgua' } : {})
                      },
                      { 
                        text: `$${Number(producto.precio).toLocaleString('en-US')}`,
                        style: 'precioInline'
                      }
                    ]
                  }
                : {
                    text: formatearProductoSinPrecio(producto),
                    ...(producto.tipo === 'c/h20' ? { style: 'tipoConAgua' } : {})
                  }
              )
            )
          : {
              text: formatearProductoSinPrecio(producto),
              ...(producto.tipo === 'c/h20' ? { style: 'tipoConAgua' } : {})
            },
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
    }
  });

  // Si no hay filas con productos, mostrar mensaje
  if (body.length === 1) {
    return {
      table: {
        headerRows: 1,
        widths: ['100%'],
        body: [
          [{ text: 'No hay productos con kilos registrados', italics: true, alignment: 'center' }]
        ]
      },
      layout: {
        hLineWidth: function(i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
        vLineWidth: function(i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
        hLineColor: function(i, node) { return (i === 0 || i === node.table.body.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
        vLineColor: function(i, node) { return (i === 0 || i === node.table.widths.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
      }
    };
  }

  // Calcular los anchos según el número de columnas
  let widths;
  // Mantener los anchos originales sin columnas de precio
  if (hayHilos && hayNotas) {
    widths = ['20%', '30%', '25%', '10%', '15%'];
  } else if (hayHilos) {
    widths = ['25%', '35%', '25%', '15%'];
  } else if (hayNotas) {
    widths = ['25%', '35%', '25%', '15%'];
  } else {
    widths = ['25%', '45%', '30%'];
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

function generarTablaCrudosSinPrecios(crudos, estiloCliente) {
  // Obtener el nombre del cliente a partir del estilo
  const nombreCliente = obtenerNombreClienteDesdeEstilo(estiloCliente);
  
  // Filtrar items que tengan kilos reales
  const crudosFiltrados = crudos.map(crudo => {
    const itemsFiltrados = crudo.items.filter(item => {
      const kilosTexto = calcularKilosCrudos(item, nombreCliente);
      const kilos = parseFloat(kilosTexto);
      return kilos > 0;
    });
    return { ...crudo, items: itemsFiltrados };
  }).filter(crudo => crudo.items.length > 0);

  // Si no hay crudos con kilos, devolver una tabla vacía
  if (crudosFiltrados.length === 0 || crudosFiltrados.every(crudo => crudo.items.length === 0)) {
    return {
      table: {
        headerRows: 1,
        widths: ['100%'],
        body: [
          [{ text: 'No hay crudos con kilos registrados', italics: true, alignment: 'center' }]
        ]
      },
      layout: {
        hLineWidth: function(i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
        vLineWidth: function(i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
        hLineColor: function(i, node) { return (i === 0 || i === node.table.body.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
        vLineColor: function(i, node) { return (i === 0 || i === node.table.widths.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
      }
    };
  }

  // Definir las columnas del header (sin precio ni total)
  const headerRow = [
    { text: 'Cantidad', style: 'tableHeader' },
    { text: 'Talla', style: 'tableHeader' },
    { text: 'Taras', style: 'tableHeader' }
  ];

  const body = [headerRow];

  // Agregar las filas de datos
  crudosFiltrados.forEach(crudo => 
    crudo.items.forEach(item => {
      // Calcular kilos para este item
      const kilosTexto = calcularKilosCrudos(item, nombreCliente);
      const kilos = parseFloat(kilosTexto);
      
      // Solo procesar items con kilos > 0
      if (kilos > 0) {
        const row = [
          // Eliminar decimales para los kilos (redondeando al entero más cercano)
          `${Math.round(kilos)} kg`,
          {
            text: item.talla.replace(/\s*c\/\s*c$/i, ' c/c'),
            // Aplicar estilo azul si la talla contiene "c/c" (que indica "con cascaron")
            ...(item.talla && item.talla.toLowerCase().includes('c/c') ? { style: 'tipoConAgua' } : { style: 'default' }),
            noWrap: true
          },
          calcularTarasTotales(item)
        ];

        body.push(row);
      }
    })
  );

  // Si solo tenemos el encabezado pero no filas, mostrar mensaje
  if (body.length === 1) {
    return {
      table: {
        headerRows: 1,
        widths: ['100%'],
        body: [
          [{ text: 'No hay crudos con kilos registrados', italics: true, alignment: 'center' }]
        ]
      },
      layout: {
        hLineWidth: function(i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
        vLineWidth: function(i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
        hLineColor: function(i, node) { return (i === 0 || i === node.table.body.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
        vLineColor: function(i, node) { return (i === 0 || i === node.table.widths.length) ? obtenerColorBorde(estiloCliente) : 'black'; },
      }
    };
  }

  // Definir los anchos de columna (sin columnas de precio ni total)
  const widths = ['30%', '40%', '30%'];

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

function formatearProductoSinPrecio(producto) {
  let medida = (producto.nombreAlternativoPDF || producto.medida || '').trim();
  
  // Si es c/h20, agregar el indicador pero mantener el nombre original
  if (producto.tipo === 'c/h20') {
    return { text: `${medida} c/h2o`, style: 'tipoConAgua' };
  }
  
  // Si es s/h20, agregar el indicador pero mantener el nombre original
  if (producto.tipo === 's/h20') {
    return { text: `${medida} s/h2o`, style: 'default' };
  }
  
  // Para otros tipos, mostrar el nombre exacto con el tipo si existe
  let tipoProducto = producto.tipo === 'otro' ? producto.tipoPersonalizado : producto.tipo;
  let textoFinal = tipoProducto ? `${medida} ${tipoProducto}` : medida;
  
  return { text: textoFinal, style: 'default' };
}

function procesarCrudosDeFormaSegura(clienteCrudos, clienteId, clientesDisponibles, callback) {
  if (!clienteCrudos || !clienteCrudos[clienteId]) {
    return;
  }

  try {
    const crudos = clienteCrudos[clienteId];
    if (!Array.isArray(crudos)) {
      console.warn(`Crudos no válidos para el cliente ${clienteId}`, { crudos });
      return;
    }

    for (const crudo of crudos) {
      if (!crudo || !Array.isArray(crudo.items)) {
        console.warn(`Estructura de crudo no válida para el cliente ${clienteId}`, { crudo });
        continue;
      }

      for (const item of crudo.items) {
        if (!item) {
          console.warn(`Item no válido en crudo para el cliente ${clienteId}`, { crudo });
          continue;
        }

        callback(item);
      }
    }
  } catch (error) {
    console.error(`Error al procesar crudos para el cliente ${clienteId}:`, error);
  }
}

function verificarKilosCrudos(clienteCrudos, clienteId, nombreCliente) {
  let hayKilos = false;
  
  if (!clienteCrudos || !clienteCrudos[clienteId]) {
    return false;
  }

  try {
    const crudos = clienteCrudos[clienteId];
    if (!Array.isArray(crudos)) {
      console.warn(`Crudos no válidos para el cliente ${clienteId}`, { crudos });
      return false;
    }

    for (const crudo of crudos) {
      if (!crudo || !Array.isArray(crudo.items)) {
        console.warn(`Estructura de crudo no válida para el cliente ${clienteId}`, { crudo });
        continue;
      }

      for (const item of crudo.items) {
        if (!item) {
          console.warn(`Item no válido en crudo para el cliente ${clienteId}`, { crudo });
          continue;
        }

        const kilosTexto = calcularKilosCrudos(item, nombreCliente);
        const kilos = parseFloat(kilosTexto);
        if (kilos > 0) {
          hayKilos = true;
          break;
        }
      }
      if (hayKilos) break;
    }
  } catch (error) {
    console.error(`Error al verificar kilos crudos para el cliente ${clienteId}:`, error);
    return false;
  }

  return hayKilos;
}

function generarTotalGeneral(totalTarasLimpio, totalTarasCrudos, totalDinero, hayClienteConPrecios) {
  const contenido = [];

  // Agregar "Total de Cuenta" si hay clientes con precios y hay dinero
  if (hayClienteConPrecios && totalDinero > 0) {
    contenido.push({
      text: `Total de Cuenta: $${Math.round(totalDinero).toLocaleString('en-US')}`,
      style: ['subheader', 'granTotal'],
      alignment: 'center',
      margin: [0, 10, 0, 5]
    });
  }

  // Agregar el total de taras si hay taras
  if (totalTarasLimpio + totalTarasCrudos > 0) {
    contenido.push({
      text: `Total general de taras: ${totalTarasLimpio + totalTarasCrudos}`,
      style: 'subheader',
      alignment: 'center',
      margin: [0, 5, 0, 5]
    });
  }

  return contenido;
}

function generarTotalGeneralSinPrecios(totalTarasLimpio, totalTarasCrudos) {
  const contenido = [];

  // Agregar solo el total de taras (sin total de cuenta)
  if (totalTarasLimpio + totalTarasCrudos > 0) {
    contenido.push({
      text: `Total general de taras: ${totalTarasLimpio + totalTarasCrudos}`,
      style: 'subheader',
      alignment: 'center',
      margin: [0, 5, 0, 5]
    });
  }

  return contenido;
}