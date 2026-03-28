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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
};

const KILOS_POR_CAJA = 20;

const buildDocDefinition = ({ fecha, grupos }) => {
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

  const content = [
    { text: 'De mañana para pasado', style: 'title' },
    { text: `Fecha: ${fecha || 'Sin fecha'}`, style: 'meta' },
    { text: `Total: ${resumenTotal}`, style: 'metaStrong', margin: [0, 0, 0, 10] }
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

      return {
        stack: [
          { text: `${group.ozuna ? '🟢 ' : ''}${numeroPedido}) ${group.medidaPedido || '-'}`, style: 'pedidoTitle' },
          ...(group.items && group.items.length > 0
            ? group.items.map((item) => ({
                text: `${item.medida || '-'}: ${item.cajas || 0} ${item.esKilos ? 'kg' : 'cajas'}`,
                style: 'pedidoItem'
              }))
            : [{ text: 'Sin medidas', style: 'pedidoEmpty' }]),
          { text: `Total: ${subtotalTexto}`, style: 'pedidoSubtotal', margin: [0, 6, 0, 0] }
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

  return {
    pageSize: 'A4',
    pageMargins: [20, 24, 20, 20],
    content,
    styles: {
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
        color: '#1f4f9c'
      }
    },
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

