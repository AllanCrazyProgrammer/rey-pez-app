const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const { EventEmitter } = require('node:events');
const pdfMake = require('pdfmake/build/pdfmake');
const vfs = require('pdfmake/build/vfs_fonts');

const files = new Set(['utils/pdf/pesadas.js', 'utils/pesadas.js'].map(file => path.resolve(__dirname, '../src', file)));
const originalJs = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => {
  if (!files.has(filename)) return originalJs(module, filename);
  module._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs', '@babel/plugin-transform-dynamic-import']
  }).code, filename);
};
const { crearPdfPesadas } = require('../src/utils/pdf/pesadas');
require.extensions['.js'] = originalJs;

const sample = () => ({
  columnas: { c1: { precio: 10, orden: '0' } },
  personas: { p1: { nombre: 'María', orden: '0' } },
  pesos: { p1: { c1: 2.9 } }
});

test('genera el resumen con Roboto local aunque el VFS global esté vacío y las fuentes sean remotas', { timeout: 5000 }, async () => {
  pdfMake.addVirtualFileSystem({});
  pdfMake.setFonts({ Roboto: { normal: 'https://invalid.example/font.ttf' } });
  const previousXHR = global.XMLHttpRequest;
  global.XMLHttpRequest = class {
    constructor() { throw new Error('El resumen no debe acceder a la red'); }
  };
  try {
    const { pdf, blob } = await crearPdfPesadas('2026-09-30', sample());
    assert.equal(blob.type, 'application/pdf');
    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    assert.match(bytes.toString('latin1'), /%%EOF/);
    assert.equal(pdf.fonts.Roboto.bold, 'Roboto-Medium.ttf');
    assert.ok(pdf.vfs['Roboto-Medium.ttf']);
    // Imprimir vuelve a generar el documento con las mismas fuentes locales.
    const printed = await new Promise(resolve => pdf.getBlob(resolve));
    assert.equal(printed.type, 'application/pdf');
  } finally {
    global.XMLHttpRequest = previousXHR;
    pdfMake.clearFonts();
    pdfMake.addVirtualFileSystem(vfs);
  }
});

test('rechaza los errores de maquetación y del stream para que la vista salga del estado de carga', { timeout: 5000 }, async () => {
  const originalCreate = pdfMake.createPdf;
  try {
    pdfMake.createPdf = () => ({ getStream() { throw new Error('Error de maquetación'); } });
    await assert.rejects(crearPdfPesadas('2026-09-30', sample()), /Error de maquetación/);
    pdfMake.createPdf = () => ({ getStream() {
      const stream = new EventEmitter();
      stream.end = () => queueMicrotask(() => stream.emit('error', new Error('Error del stream')));
      return stream;
    } });
    await assert.rejects(crearPdfPesadas('2026-09-30', sample()), /Error del stream/);
  } finally {
    pdfMake.createPdf = originalCreate;
  }
});
