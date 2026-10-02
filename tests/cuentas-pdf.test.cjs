const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const pdfMake = require('pdfmake/build/pdfmake');

function load(filename, mocks, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code;
  vm.runInNewContext(code, {
    module, exports: module.exports, console,
    window: { pdfMake: { vfs: {} } },
    require(id) {
      if (id in mocks) return mocks[id];
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id + '.js'), mocks, cache);
      return require(id);
    }
  }, { filename });
  return module.exports;
}

for (const cliente of ['Veronica', 'Otilio']) {
  test(`cuentas de ${cliente}: genera un PDF real aunque otra pantalla cambie las fuentes`, { timeout: 5000 }, async () => {
    const originalCreatePdf = pdfMake.createPdf;
    const originalFonts = pdfMake.fonts;
    const originalVfs = pdfMake.vfs;
    const originalXHR = global.XMLHttpRequest;
    let bytesPromise;
    let opened = false;
    pdfMake.createPdf = (...args) => {
      const pdf = originalCreatePdf(...args);
      return { open() {
        opened = true;
        const stream = pdf.getStream();
        bytesPromise = new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
        stream.end();
      } };
    };
    global.XMLHttpRequest = class {
      constructor() { throw new Error('Las fuentes del reporte no deben depender de la red'); }
    };
    try {
      const report = load(path.resolve(__dirname, `../src/utils/pdf/generarReporteCuentas${cliente}.js`), {
        './formatters': {
          formatearFecha: fecha => fecha,
          loadImageAsBase64: async () => {
            // Simula otra pantalla cambiando pdfmake mientras se carga el logo.
            pdfMake.addVirtualFileSystem({});
            pdfMake.vfs = {};
            pdfMake.fonts = { Roboto: {
              normal: 'https://invalid.example/font.ttf',
              bold: 'Roboto-Medium.ttf',
              italics: 'Roboto-Italic.ttf',
              bolditalics: 'Roboto-MediumItalic.ttf'
            } };
            pdfMake.setFonts(undefined);
            return null;
          }
        }
      });
      await report[`generarReporteCuentas${cliente}`]({
        fechaInicio: '2026-09-21', fechaFin: '2026-10-02',
        registros: [{
          fecha: '2026-09-21', totalGeneralVenta: 1250,
          abonos: [{ fecha: '2026-09-21', monto: 250, descripcion: 'Depósito' }],
          observacion: 'Camarón de México'
        }]
      });
      assert.equal(opened, true);
      const bytes = await bytesPromise;
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
      assert.match(bytes.toString('latin1'), /%%EOF/);
    } finally {
      pdfMake.createPdf = originalCreatePdf;
      pdfMake.fonts = originalFonts;
      pdfMake.vfs = originalVfs;
      pdfMake.addVirtualFileSystem(require('pdfmake/build/vfs_fonts'));
      pdfMake.clearFonts();
      global.XMLHttpRequest = originalXHR;
    }
  });
}
