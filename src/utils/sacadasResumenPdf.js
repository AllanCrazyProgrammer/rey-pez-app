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

const buildDocDefinition = ({ fecha, grupos }) => {
  const pedidosPorFila = 4;
  const totalCajas = grupos.reduce(
    (sum, group) => sum + group.items.reduce((sub, item) => sub + Number(item.cajas || 0), 0),
    0
  );

  const content = [
    { text: 'Resumen de medidas a sacar', style: 'title' },
    { text: `Fecha: ${fecha || 'Sin fecha'}`, style: 'meta' },
    { text: `Total de cajas: ${totalCajas}`, style: 'metaStrong', margin: [0, 0, 0, 10] }
  ];

  const rows = [];
  for (let i = 0; i < grupos.length; i += pedidosPorFila) {
    rows.push(grupos.slice(i, i + pedidosPorFila));
  }

  const body = rows.map((row, rowIndex) => {
    const cells = row.map((group, colIndex) => {
      const numeroPedido = rowIndex * pedidosPorFila + colIndex + 1;
      const items = (group.items || []).map((item) => (
        `${item.medida || '-'}: ${item.cajas || 0}`
      ));

      return {
        stack: [
          { text: `${numeroPedido}) ${group.medidaPedido || '-'}`, style: 'pedidoTitle' },
          ...(items.length > 0
            ? items.map((linea) => ({ text: linea, style: 'pedidoItem' }))
            : [{ text: 'Sin medidas', style: 'pedidoEmpty' }])
        ],
        margin: [4, 4, 4, 4]
      };
    });

    while (cells.length < pedidosPorFila) {
      cells.push({ text: '', margin: [4, 4, 4, 4] });
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
      paddingLeft: () => 2,
      paddingRight: () => 2,
      paddingTop: () => 2,
      paddingBottom: () => 2
    }
  });

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [16, 18, 16, 16],
    content,
    styles: {
      title: {
        fontSize: 28,
        bold: true,
        color: '#1f4f9c',
        margin: [0, 0, 0, 6]
      },
      meta: {
        fontSize: 17,
        color: '#344054'
      },
      metaStrong: {
        fontSize: 20,
        bold: true,
        color: '#101828'
      },
      pedidoTitle: {
        fontSize: 16,
        bold: true,
        color: '#1d2939'
      },
      pedidoItem: {
        fontSize: 14,
        color: '#344054'
      },
      pedidoEmpty: {
        fontSize: 14,
        color: '#98a2b3',
        italics: true
      }
    },
    defaultStyle: {
      fontSize: 14
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

