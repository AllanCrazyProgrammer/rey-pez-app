import pdfMake, { configurarPdfMake, estilosPdf, layoutTablaConTotal, configuracionDocumento } from './config';
import { loadImageAsBase64, formatearFecha } from './formatters';

const LOGO_VERONICA_URL = 'https://res.cloudinary.com/hwkcovsmr/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,f_png,b_transparent/v1757615801/allan_logo_ra8ruv.jpg';

const formatCurrency = (value) => {
  const numericValue = Number(value) || 0;
  return '$' + numericValue.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const sumArray = (items = []) => items.reduce((total, item) => total + (Number(item.monto) || 0), 0);

export const generarReporteCuentasVeronica = async ({ fechaInicio, fechaFin, registros = [] }) => {
  if (!Array.isArray(registros)) {
    throw new Error('Los registros de cuentas no tienen el formato esperado.');
  }

  const registrosOrdenados = [...registros].sort((a, b) => {
    const fechaA = a.fecha || '';
    const fechaB = b.fecha || '';
    return fechaA.localeCompare(fechaB);
  });

  if (!registrosOrdenados.length) {
    throw new Error('No hay registros de cuentas en el rango seleccionado.');
  }

  configurarPdfMake();

  let logoBase64 = null;
  try {
    logoBase64 = await loadImageAsBase64(LOGO_VERONICA_URL);
  } catch (error) {
    console.warn('No se pudo cargar el logo de Verónica para el PDF:', error);
  }

  const tablaBody = [
    [
      { text: 'Fecha', style: 'tableHeader', alignment: 'center' },
      { text: 'Saldo del día', style: 'tableHeader', alignment: 'right' },
      { text: 'Abonos', style: 'tableHeader', alignment: 'right' },
      { text: 'Total día', style: 'tableHeader', alignment: 'right' },
      { text: 'Saldo acumulado', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  const detallesAbonos = [];
  const resumenTotales = {
    saldoDia: 0,
    cobros: 0,
    abonos: 0,
    totalDia: 0
  };

  let saldoAcumulado = registrosOrdenados[0]?.saldoAcumuladoAnterior || 0;

  registrosOrdenados.forEach((registro) => {
    const saldoDelDia = Number(registro.totalGeneralVenta) || 0;
    const cobros = Array.isArray(registro.cobros) ? registro.cobros : [];
    const abonos = Array.isArray(registro.abonos) ? registro.abonos : [];

    const totalCobros = sumArray(cobros);
    const totalAbonos = sumArray(abonos);
    const totalDia = saldoDelDia - totalCobros - totalAbonos;

    const saldoAnterior = registro.saldoAcumuladoAnterior != null
      ? Number(registro.saldoAcumuladoAnterior)
      : saldoAcumulado;

    let saldoFinal = registro.nuevoSaldoAcumulado != null
      ? Number(registro.nuevoSaldoAcumulado)
      : saldoAnterior + totalDia;

    if (saldoFinal < 0) {
      saldoFinal = 0;
    }

    saldoAcumulado = saldoFinal;

    tablaBody.push([
      { text: formatearFecha(registro.fecha), alignment: 'center' },
      { text: formatCurrency(saldoDelDia), alignment: 'right' },
      { text: formatCurrency(totalAbonos), alignment: 'right' },
      { text: formatCurrency(totalDia), alignment: 'right' },
      { text: formatCurrency(saldoFinal), alignment: 'right' }
    ]);

    resumenTotales.saldoDia += saldoDelDia;
    resumenTotales.cobros += totalCobros;
    resumenTotales.abonos += totalAbonos;
    resumenTotales.totalDia += totalDia;

    if (abonos.length) {
      detallesAbonos.push({
        fecha: registro.fecha,
        abonos: abonos.map((abono) => ({
          descripcion: abono.descripcion || 'Sin descripción',
          monto: Number(abono.monto) || 0
        }))
      });
    }
  });

  tablaBody.push([
    { text: 'Totales del período', alignment: 'right', bold: true, fillColor: '#fdebd0' },
    { text: formatCurrency(resumenTotales.saldoDia), alignment: 'right', bold: true, fillColor: '#fdebd0' },
    { text: formatCurrency(resumenTotales.abonos), alignment: 'right', bold: true, fillColor: '#fdebd0' },
    { text: formatCurrency(resumenTotales.totalDia), alignment: 'right', bold: true, fillColor: '#fdebd0' },
    { text: formatCurrency(saldoAcumulado), alignment: 'right', bold: true, fillColor: '#fdebd0' }
  ]);

  const fechaInicioTexto = fechaInicio ? formatearFecha(fechaInicio) : formatearFecha(registrosOrdenados[0].fecha);
  const fechaFinTexto = fechaFin ? formatearFecha(fechaFin) : formatearFecha(registrosOrdenados[registrosOrdenados.length - 1].fecha);

  const docDefinition = {
    ...configuracionDocumento,
    defaultStyle: {
      fontSize: 11,
      color: '#2c3e50'
    },
    styles: {
      ...estilosPdf,
      tituloPrincipal: {
        fontSize: 22,
        bold: true,
        color: '#d35400',
        margin: [0, 0, 0, 4]
      },
      subTitulo: {
        fontSize: 12,
        color: '#7f8c8d',
        margin: [0, 0, 0, 12]
      },
      resumenItem: {
        fontSize: 12,
        margin: [0, 2, 0, 2]
      },
      saldoAcumuladoActual: {
        fontSize: 13,
        bold: true,
        color: '#d35400',
        margin: [0, 12, 0, 0]
      }
    },
    content: [
      {
        columns: [
          logoBase64
            ? { image: logoBase64, width: 90, alignment: 'left', margin: [0, 0, 10, 0] }
            : { text: '', width: 90 }
          ,
          {
            stack: [
              { text: 'Resumen de Cuentas y Abonos', style: 'tituloPrincipal', alignment: 'center' },
              { text: `Periodo: ${fechaInicioTexto} - ${fechaFinTexto}`, style: 'subTitulo', alignment: 'center' }
            ]
          },
          { text: '', width: 90 }
        ]
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto'],
          body: tablaBody
        },
        layout: layoutTablaConTotal
      },
      {
        text: `Saldo acumulado al día de hoy (${formatearFecha(new Date())}): ${formatCurrency(saldoAcumulado)}`,
        style: 'saldoAcumuladoActual',
        margin: [0, 14, 0, 0]
      }
    ]
  };

  if (detallesAbonos.length) {
    docDefinition.content.push({ text: '\n' });
    docDefinition.content.push({
      text: 'Detalle de abonos por día',
      style: 'tituloPrincipal',
      fontSize: 16,
      margin: [0, 10, 0, 6]
    });

    detallesAbonos.forEach((detalle) => {
      docDefinition.content.push({
        text: formatearFecha(detalle.fecha),
        bold: true,
        margin: [0, 4, 0, 2]
      });

      docDefinition.content.push({
        ul: detalle.abonos.map((abono) => `${abono.descripcion}: ${formatCurrency(abono.monto)}`),
        margin: [0, 0, 0, 4]
      });
    });
  }

  pdfMake.createPdf(docDefinition).open();

  return true;
};

export default generarReporteCuentasVeronica;
