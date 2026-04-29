import pdfMake, { configurarPdfMake, estilosPdf, layoutTablaConTotal, configuracionDocumento } from './config';
import { loadImageAsBase64, formatearFecha } from './formatters';

const LOGO_OTILIO_URL = 'https://res.cloudinary.com/hwkcovsmr/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,f_png,b_transparent/v1757615801/allan_logo_ra8ruv.jpg';

const formatCurrency = (value) => {
  const numericValue = Number(value) || 0;
  return '$' + numericValue.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatCurrencyNoDecimals = (value) => {
  const numericValue = Number(value) || 0;
  return '$' + numericValue.toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

const sumArray = (items = []) => items.reduce((total, item) => total + (Number(item.monto) || 0), 0);

const normalizarFechaDia = (valor) => {
  if (!valor) return null;
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    return valor.slice(0, 10);
  }

  if (valor.seconds) {
    return new Date(valor.seconds * 1000).toISOString().slice(0, 10);
  }

  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString().slice(0, 10);
};

const obtenerFechaAbono = (abono = {}, fechaCuenta) =>
  normalizarFechaDia(abono.fechaOriginalStash || abono.fecha || abono.fechaAplicacion || fechaCuenta);

const filtrarAbonosPorRango = (abonos = [], fechaCuenta, fechaInicio, fechaFin) =>
  abonos.filter((abono) => {
    const fechaAbono = obtenerFechaAbono(abono, fechaCuenta);
    if (!fechaAbono) return false;
    if (fechaInicio && fechaAbono < fechaInicio) return false;
    if (fechaFin && fechaAbono > fechaFin) return false;
    return true;
  });

export const generarReporteCuentasOtilio = async ({ fechaInicio, fechaFin, registros = [] }) => {
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
    logoBase64 = await loadImageAsBase64(LOGO_OTILIO_URL);
  } catch (error) {
    console.warn('No se pudo cargar el logo de Otilio para el PDF:', error);
  }

  const tablaBody = [
    [
      { text: 'Fecha', style: 'tableHeader', alignment: 'center' },
      { text: 'Saldo del día', style: 'tableHeader', alignment: 'right' },
      { text: 'Abonos', style: 'tableHeader', alignment: 'right' },
      { text: 'Resta', style: 'tableHeader', alignment: 'right' }
    ]
  ];

  const abonosPorDescripcion = {};
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
    const abonos = filtrarAbonosPorRango(
      Array.isArray(registro.abonos) ? registro.abonos : [],
      registro.fecha,
      fechaInicio,
      fechaFin
    );

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
      { text: formatCurrency(totalDia), alignment: 'right' }
    ]);

    resumenTotales.saldoDia += saldoDelDia;
    resumenTotales.cobros += totalCobros;
    resumenTotales.abonos += totalAbonos;
    resumenTotales.totalDia += totalDia;

    if (abonos.length) {
      abonos.forEach((abono) => {
        let descripcion = abono.descripcion || 'Sin descripción';
        descripcion = descripcion.replace(/\s*\(Aplicación Individual\)\s*/gi, '').trim();
        if (!descripcion) descripcion = 'Sin descripción';

        const monto = Number(abono.monto) || 0;
        const fechaAbono = obtenerFechaAbono(abono, registro.fecha) || registro.fecha;

        if (!abonosPorDescripcion[descripcion]) {
          abonosPorDescripcion[descripcion] = {
            descripcion,
            montoTotal: 0,
            fechasAplicadas: []
          };
        }

        abonosPorDescripcion[descripcion].montoTotal += monto;
        abonosPorDescripcion[descripcion].fechasAplicadas.push({
          fecha: fechaAbono,
          fechaCuenta: registro.fecha,
          monto
        });
      });
    }
  });

  tablaBody.push([
    { text: 'Totales del período', alignment: 'right', bold: true, fillColor: '#fff9c4' },
    { text: formatCurrency(resumenTotales.saldoDia), alignment: 'right', bold: true, fillColor: '#fff9c4' },
    { text: formatCurrency(resumenTotales.abonos), alignment: 'right', bold: true, fillColor: '#fff9c4' },
    { text: formatCurrency(resumenTotales.totalDia), alignment: 'right', bold: true, fillColor: '#fff9c4' }
  ]);

  const fechaInicioTexto = fechaInicio ? formatearFecha(fechaInicio) : formatearFecha(registrosOrdenados[0].fecha);
  const fechaFinTexto = fechaFin ? formatearFecha(fechaFin) : formatearFecha(registrosOrdenados[registrosOrdenados.length - 1].fecha);

  const docDefinition = {
    ...configuracionDocumento,
    defaultStyle: {
      fontSize: 13,
      color: '#2c3e50'
    },
    styles: {
      ...estilosPdf,
      tituloPrincipal: {
        fontSize: 26,
        bold: true,
        color: '#b8860b',
        margin: [0, 0, 0, 6]
      },
      subTitulo: {
        fontSize: 14,
        color: '#7f8c8d',
        margin: [0, 0, 0, 14]
      },
      resumenItem: {
        fontSize: 14,
        margin: [0, 2, 0, 2]
      },
      saldoAcumuladoActual: {
        fontSize: 16,
        bold: true,
        color: '#b8860b',
        margin: [0, 12, 0, 0]
      },
      tableHeader: {
        fontSize: 14,
        bold: true
      }
    },
    content: [
      {
        columns: [
          logoBase64
            ? { image: logoBase64, width: 90, alignment: 'left', margin: [0, 0, 10, 0] }
            : { text: '', width: 90 },
          {
            stack: [
              { text: 'Resumen de Cuentas Otilio', style: 'tituloPrincipal', alignment: 'center' },
              { text: `Periodo: ${fechaInicioTexto} - ${fechaFinTexto}`, style: 'subTitulo', alignment: 'center' }
            ]
          },
          { text: '', width: 90 }
        ]
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto'],
          body: tablaBody
        },
        layout: layoutTablaConTotal
      },
      {
        text: `SALDO RESTANTE DEL PERIODO (${fechaInicioTexto} - ${fechaFinTexto}): ${formatCurrencyNoDecimals(resumenTotales.totalDia)}`,
        style: 'saldoAcumuladoActual',
        bold: true,
        color: '#8b6914',
        alignment: 'center',
        fontSize: 22,
        margin: [0, 18, 0, 0],
        background: '#fff9c4'
      }
    ]
  };

  const abonosAgrupados = Object.values(abonosPorDescripcion);

  if (abonosAgrupados.length) {
    docDefinition.content.push({ text: '\n' });
    docDefinition.content.push({
      text: 'Detalle de abonos',
      style: 'tituloPrincipal',
      fontSize: 20,
      margin: [0, 14, 0, 10]
    });

    const mitad = Math.ceil(abonosAgrupados.length / 2);
    const columnIzquierda = abonosAgrupados.slice(0, mitad);
    const columnDerecha = abonosAgrupados.slice(mitad);

    const generarContenidoAbono = (abonoAgrupado) => {
      const fechasTexto = abonoAgrupado.fechasAplicadas.map(
        (item) => `  • ${formatearFecha(item.fechaCuenta || item.fecha)}: ${formatCurrency(item.monto)}`
      ).join('\n');

      return {
        stack: [
          {
            text: abonoAgrupado.descripcion,
            bold: true,
            fontSize: 14,
            color: '#b8860b',
            margin: [0, 0, 0, 4]
          },
          {
            text: fechasTexto,
            margin: [0, 0, 0, 4],
            fontSize: 12
          },
          {
            text: `Total efectuado: ${formatCurrency(abonoAgrupado.montoTotal)}`,
            bold: true,
            color: '#b8860b',
            margin: [0, 0, 0, 12],
            fontSize: 13
          }
        ]
      };
    };

    docDefinition.content.push({
      columns: [
        {
          width: '48%',
          stack: columnIzquierda.map(generarContenidoAbono)
        },
        {
          width: '4%',
          text: ''
        },
        {
          width: '48%',
          stack: columnDerecha.map(generarContenidoAbono)
        }
      ]
    });
  }

  pdfMake.createPdf(docDefinition).open();

  return true;
};

export default generarReporteCuentasOtilio;
