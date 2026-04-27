const resolveVfs = (fontsModule) => {
  if (!fontsModule || typeof fontsModule !== 'object') {
    return null;
  }

  if (fontsModule.default && fontsModule.default.pdfMake && fontsModule.default.pdfMake.vfs) {
    return fontsModule.default.pdfMake.vfs;
  }

  if (fontsModule.default && fontsModule.default.vfs) {
    return fontsModule.default.vfs;
  }

  if (fontsModule.pdfMake && fontsModule.pdfMake.vfs) {
    return fontsModule.pdfMake.vfs;
  }

  if (fontsModule.vfs) {
    return fontsModule.vfs;
  }

  return fontsModule.default || fontsModule;
};

const getPdfMake = async () => {
  if (typeof window !== 'undefined' && window.pdfMake && typeof window.pdfMake.createPdf === 'function') {
    return window.pdfMake;
  }

  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts')
  ]);

  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const vfs = resolveVfs(pdfFontsModule);

  if (vfs) {
    pdfMake.vfs = vfs;
  }

  if (typeof window !== 'undefined') {
    window.pdfMake = pdfMake;
  }

  return pdfMake;
};

const toSafeDate = (value) => {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
};

const KILOS_POR_CAJA = 20;

/**
 * Misma lógica que el modal ListaMedidasPedido (normalizeGroups) para datos de Firestore o UI.
 */
export const normalizarGruposListaMedidasParaPdf = (grupos) => {
  if (!Array.isArray(grupos)) return [];
  return grupos
    .map((group) => {
      const base = {
        medidaPedido: (group.medidaPedido || '').trim(),
        ozuna: group.ozuna || false,
        items: (group.items || [])
          .map((item) => ({
            medida: (item.medida || '').trim(),
            cajas: Number(item.cajas),
            esKilos: item.esKilos || false
          }))
          .filter((item) => item.medida && Number.isFinite(item.cajas) && item.cajas > 0)
      };
      const rend = Number(group.rendimiento);
      if (Number.isFinite(rend) && rend > 0) {
        base.rendimiento = rend;
      }
      return base;
    })
    .filter((group) => group.medidaPedido && group.items.length > 0);
};

export const estilosResumenMedidasSacada = {
  title: {
    fontSize: 32,
    bold: true,
    color: '#1f4f9c',
    margin: [0, 0, 0, 8]
  },
  meta: {
    fontSize: 20,
    color: '#344054'
  },
  metaStrong: {
    fontSize: 24,
    bold: true,
    color: '#101828'
  },
  metaLimpios: {
    fontSize: 24,
    bold: true,
    color: '#1f4f9c'
  },
  pedidoTitle: {
    fontSize: 22,
    bold: true,
    color: '#1d2939'
  },
  pedidoItem: {
    fontSize: 20,
    color: '#344054'
  },
  pedidoEmpty: {
    fontSize: 18,
    color: '#98a2b3',
    italics: true
  },
  pedidoSubtotal: {
    fontSize: 20,
    bold: true,
    color: '#101828'
  },
  pedidoDestacadoLimpios: {
    fontSize: 20,
    bold: true,
    color: '#1f4f9c'
  }
};

/** Título por defecto al generar desde sacadas / modal "PDF resumido". */
export const TITULO_RESUMEN_MEDIDAS_SACADA_DEFAULT = 'De mañana para pasado';

/** Título cuando la misma plantilla va incrustada en el PDF de rendimientos. */
export const TITULO_RESUMEN_MEDIDAS_DESDE_RENDIMIENTOS = 'Se saco para hoy:';

/**
 * Fragmentos de contenido pdfmake del "PDF resumido" (grupos ya normalizados).
 * @param {string} [tituloPrincipal] — Por defecto {@link TITULO_RESUMEN_MEDIDAS_SACADA_DEFAULT}.
 */
export const buildResumenMedidasSacadaContent = ({ fecha, grupos, tituloPrincipal = TITULO_RESUMEN_MEDIDAS_SACADA_DEFAULT }) => {
  const pedidosPorFila = 2;

  const allItems = grupos.flatMap((g) => g.items || []);
  const totalCajas = allItems.filter((i) => !i.esKilos).reduce((s, i) => s + Number(i.cajas || 0), 0);
  const totalKilosDirectos = allItems.filter((i) => i.esKilos).reduce((s, i) => s + Number(i.cajas || 0), 0);
  const totalKilosDesdeCajas = totalCajas * KILOS_POR_CAJA;

  const resumenParts = [];
  if (totalCajas > 0) {
    resumenParts.push(`${totalCajas} cajas`);
    resumenParts.push(`${totalKilosDesdeCajas} kg`);
  }
  if (totalKilosDirectos > 0) {
    resumenParts.push(
      totalCajas > 0 ? `${totalKilosDirectos} kg directos` : `${totalKilosDirectos} kg`
    );
  }
  const resumenTotal = resumenParts.length > 0 ? resumenParts.join('  ·  ') : '0';

  const totalKilosLimpios = grupos.reduce((acc, group) => {
    const subtotalCajas = (group.items || [])
      .filter((i) => !i.esKilos)
      .reduce((sum, i) => sum + Number(i.cajas || 0), 0);
    const subtotalKilosDirectos = (group.items || [])
      .filter((i) => i.esKilos)
      .reduce((sum, i) => sum + Number(i.cajas || 0), 0);
    const totalKgGrupo = subtotalCajas * KILOS_POR_CAJA + subtotalKilosDirectos;
    const rendVal = Number(group.rendimiento);
    if (Number.isFinite(rendVal) && rendVal > 0 && totalKgGrupo > 0) {
      return acc + Math.round(totalKgGrupo / rendVal);
    }
    return acc;
  }, 0);

  const content = [
    { text: tituloPrincipal, style: 'title' },
    { text: `Fecha: ${fecha || 'Sin fecha'}`, style: 'meta' },
    {
      text: `Total: ${resumenTotal}`,
      style: 'metaStrong',
      margin: [0, 0, 0, totalKilosLimpios > 0 ? 4 : 10]
    },
    ...(totalKilosLimpios > 0
      ? [
          {
            text: `Total kilos limpios: ${totalKilosLimpios.toLocaleString('es-MX', {
              maximumFractionDigits: 0
            })} kg`,
            style: 'metaLimpios',
            margin: [0, 0, 0, 10]
          }
        ]
      : [])
  ];

  const rows = [];
  for (let i = 0; i < grupos.length; i += pedidosPorFila) {
    rows.push(grupos.slice(i, i + pedidosPorFila));
  }

  const body = rows.map((row, rowIndex) => {
    const cells = row.map((group, colIndex) => {
      const numeroPedido = rowIndex * pedidosPorFila + colIndex + 1;
      const subtotalCajas = (group.items || []).filter((i) => !i.esKilos).reduce((sum, i) => sum + Number(i.cajas || 0), 0);
      const subtotalKilosDirectos = (group.items || []).filter((i) => i.esKilos).reduce((sum, i) => sum + Number(i.cajas || 0), 0);
      const subtotalKilosDesdeCajas = subtotalCajas * KILOS_POR_CAJA;
      const subtotalParts = [];
      if (subtotalCajas > 0) {
        subtotalParts.push(`${subtotalCajas} cajas`);
        subtotalParts.push(`${subtotalKilosDesdeCajas} kg`);
      }
      if (subtotalKilosDirectos > 0) {
        subtotalParts.push(
          subtotalCajas > 0 ? `${subtotalKilosDirectos} kg directos` : `${subtotalKilosDirectos} kg`
        );
      }
      const subtotalTexto = subtotalParts.length > 0 ? subtotalParts.join('  ·  ') : '0';
      const totalKgGrupo = subtotalKilosDesdeCajas + subtotalKilosDirectos;
      const rendVal = Number(group.rendimiento);
      const kilosLimpiosStr =
        Number.isFinite(rendVal) && rendVal > 0 && totalKgGrupo > 0
          ? Math.round(totalKgGrupo / rendVal).toLocaleString('es-MX', {
              maximumFractionDigits: 0
            })
          : '';
      const rendimientoLine =
        kilosLimpiosStr !== ''
          ? [
              {
                text: `${kilosLimpiosStr} Limpios`,
                style: 'pedidoDestacadoLimpios',
                margin: [0, 4, 0, 0]
              }
            ]
          : [];

      return {
        stack: [
          { text: `${group.ozuna ? '🟢 ' : ''}${numeroPedido}) ${group.medidaPedido || '-'}`, style: 'pedidoTitle' },
          ...(group.items && group.items.length > 0
            ? group.items.map((item) => ({
                text: `${item.medida || '-'}: ${item.cajas || 0} ${item.esKilos ? 'kg' : 'cajas'}`,
                style: 'pedidoItem'
              }))
            : [{ text: 'Sin medidas', style: 'pedidoEmpty' }]),
          { text: `Total: ${subtotalTexto}`, style: 'pedidoSubtotal', margin: [0, 6, 0, 0] },
          ...rendimientoLine
        ],
        fillColor: group.ozuna ? '#d1fae5' : null,
        margin: [8, 8, 8, 8]
      };
    });

    while (cells.length < pedidosPorFila) {
      cells.push({ text: '', margin: [8, 8, 8, 8] });
    }

    return cells;
  });

  content.push({
    margin: [0, 4, 0, 0],
    table: {
      headerRows: 0,
      widths: Array.from({ length: pedidosPorFila }, () => '*'),
      body
    },
    layout: {
      hLineColor: () => '#d8dbe2',
      vLineColor: () => '#d8dbe2',
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 6,
      paddingBottom: () => 6
    }
  });

  return content;
};

const buildDocDefinition = ({ fecha, grupos }) => {
  const normalized = normalizarGruposListaMedidasParaPdf(grupos);
  return {
    pageSize: 'A4',
    pageMargins: [20, 24, 20, 20],
    content: buildResumenMedidasSacadaContent({ fecha, grupos: normalized }),
    styles: estilosResumenMedidasSacada,
    defaultStyle: {
      fontSize: 18
    }
  };
};

export const generarResumenMedidasSacadaPDF = async ({ fecha, grupos }) => {
  const pdfMake = await getPdfMake();
  const docDefinition = buildDocDefinition({ fecha, grupos });
  const safeFecha = toSafeDate(fecha);
  const filename = `resumen-sacada-${safeFecha}.pdf`;

  pdfMake.createPdf(docDefinition).download(filename);
};
