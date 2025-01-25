import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Agregar constantes para los colores de los clientes
const COLORES_CLIENTES = {
  'Joselito': '#3498db', // Azul
  'Catarro': '#e74c3c',  // Rojo
  'Otilio': '#f39c12',   // Naranja
  'Ozuna': '#27ae60'     // Verde
};

export function generarResumenTarasPDF(embarqueData, clientesDisponibles) {
  const doc = new jsPDF();
  
  // Configurar el título con el estilo de Rey Pez
  doc.setFontSize(24);
  doc.setTextColor(55, 96, 176); // #3760b0 (azul Rey Pez)
  doc.text('Resumen de Taras', 14, 20);
  
  // Fecha con nuevo estilo
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  const fechaEmbarque = new Date(embarqueData.fecha);
  fechaEmbarque.setDate(fechaEmbarque.getDate() + 1);
  const fecha = fechaEmbarque.toLocaleDateString();
  doc.text(`Fecha: ${fecha}`, 14, 30);

  // Agregar información de quién carga
  doc.setFontSize(18);
  doc.text(`Carga con: ${embarqueData.cargaCon || 'No especificado'}`, 14, 40);

  // Preparar los datos para la tabla
  const datos = prepararDatosTabla(embarqueData, clientesDisponibles);

  // Actualizar configuración de la tabla
  doc.autoTable({
    startY: 50,
    head: [['Cliente', 'Abiertas', 'Cerradas', 'Total']],
    body: datos.filas,
    foot: [['Total', datos.totales.abiertas, datos.totales.cerradas, datos.totales.total]],
    theme: 'grid',
    styles: {
      fontSize: 18,
      cellPadding: 8
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 20,
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 1,
      lineColor: [0, 0, 0]
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 20,
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 1,
      lineColor: [0, 0, 0]
    },
    bodyStyles: {
      fontSize: 18,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250] // #f8f9fa
    },
    didDrawPage: function(data) {
      // Agregar pie de página
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(55, 96, 176);
      doc.text('© 2025 Rey Pez - Tampico, Tamps.', pageSize.width / 2, pageHeight - 10, { align: 'center' });
    }
  });

  // Guardar el PDF
  doc.save('resumen-taras.pdf');
}

function prepararDatosTabla(embarqueData, clientesDisponibles) {
  const resumen = new Map();
  let totales = {
    abiertas: 0,
    cerradas: 0,
    total: 0
  };

  // Inicializar el resumen solo para los clientes predefinidos
  const clientesPredefinidos = [
    { id: '1', nombre: 'Joselito' },
    { id: '2', nombre: 'Catarro' },
    { id: '3', nombre: 'Otilio' },
    { id: '4', nombre: 'Ozuna' }
  ];

  clientesPredefinidos.forEach(cliente => {
    resumen.set(cliente.nombre, { abiertas: 0, cerradas: 0 });
  });

  // Procesar productos (taras abiertas/limpios)
  embarqueData.productos.forEach(producto => {
    const clienteId = producto.clienteId.toString();
    const clientePredefinido = clientesPredefinidos.find(c => c.id === clienteId);
    
    // Solo procesar si es un cliente predefinido
    if (clientePredefinido) {
      const nombreCliente = clientePredefinido.nombre;
      const tarasProducto = calcularTarasProducto(producto);
      const datosCliente = resumen.get(nombreCliente);
      datosCliente.abiertas += tarasProducto;
      totales.abiertas += tarasProducto;
    }
  });

  // Procesar crudos (taras cerradas)
  if (embarqueData.clienteCrudos) {
    Object.entries(embarqueData.clienteCrudos).forEach(([clienteId, crudos]) => {
      const clientePredefinido = clientesPredefinidos.find(c => c.id === clienteId);
      
      // Solo procesar si es un cliente predefinido
      if (clientePredefinido) {
        const nombreCliente = clientePredefinido.nombre;
        const tarasCrudo = calcularTarasCrudos(crudos);
        const datosCliente = resumen.get(nombreCliente);
        datosCliente.cerradas += tarasCrudo;
        totales.cerradas += tarasCrudo;
      }
    });
  }

  // Preparar las filas de la tabla, solo incluyendo clientes con datos
  const filas = Array.from(resumen.entries())
    .filter(([_, datos]) => datos.abiertas > 0 || datos.cerradas > 0)
    .map(([nombreCliente, datos]) => {
      const total = datos.abiertas + datos.cerradas;
      return [
        { 
          content: nombreCliente,
          styles: { textColor: COLORES_CLIENTES[nombreCliente] || '#000000' }
        },
        datos.abiertas,
        datos.cerradas,
        total
      ];
    });

  // Calcular el total general
  totales.total = totales.abiertas + totales.cerradas;

  return {
    filas,
    totales
  };
}

function calcularTarasProducto(producto) {
  // Sumar taras normales
  const tarasNormales = (producto.taras || []).reduce((sum, tara) => {
    return sum + (typeof tara === 'number' ? tara : 0);
  }, 0);

  // Sumar taras extra
  const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => {
    return sum + (typeof tara === 'number' ? tara : 0);
  }, 0);

  return tarasNormales + tarasExtra;
}

function calcularTarasCrudos(crudos) {
  return crudos.reduce((total, crudo) => {
    return total + crudo.items.reduce((itemTotal, item) => {
      let taras = 0;
      
      // Procesar taras principales
      if (item.taras) {
        const [cantidad] = item.taras.split('-').map(Number);
        if (!isNaN(cantidad)) {
          taras += cantidad;
        }
      }
      
      // Procesar sobrantes
      if (item.sobrante) {
        const [cantidadSobrante] = item.sobrante.split('-').map(Number);
        if (!isNaN(cantidadSobrante)) {
          taras += cantidadSobrante;
        }
      }
      
      return itemTotal + taras;
    }, 0);
  }, 0);
}
