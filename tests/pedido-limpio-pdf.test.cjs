const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { transformFileSync } = require('@babel/core');
const pdfMake = require('pdfmake/build/pdfmake');

const filename = path.resolve(__dirname, '../src/utils/pdf/pedidoLimpio.js');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(transformFileSync(filename, {
  configFile: false,
  babelrc: false,
  plugins: ['@babel/plugin-transform-modules-commonjs']
}).code, filename);
const { crearPreviewPedidoLimpio } = compiled.exports;

test('genera un PDF multipágina con fuentes locales aunque otra pantalla configure fuentes remotas', { timeout: 5000 }, async () => {
  const previousFonts = pdfMake.fonts;
  const previousXHR = global.XMLHttpRequest;
  pdfMake.fonts = { Roboto: { normal: 'https://invalid.example/font.ttf' } };
  global.XMLHttpRequest = class {
    constructor() { throw new Error('La vista previa no debe acceder a la red'); }
  };
  try {
    const start = performance.now();
    const { blob, pageCount } = await crearPreviewPedidoLimpio({
      content: [
        { text: 'Pedido limpio: Camarón', bold: true },
        { text: 'Otilio', italics: true },
        { text: 'Joselito', bold: true, italics: true },
        { text: 'Segunda página', pageBreak: 'before' }
      ]
    });
    assert.equal(pageCount, 2);
    assert.equal(blob.type, 'application/pdf');
    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    assert.match(bytes.toString('latin1'), /%%EOF/);
    console.log(`Vista previa de 2 páginas sin red: ${Math.round(performance.now() - start)} ms`);
  } finally {
    pdfMake.fonts = previousFonts;
    global.XMLHttpRequest = previousXHR;
  }
});

test('rechaza los errores de generación para poder quitar el estado de carga', { timeout: 5000 }, async () => {
  await assert.rejects(crearPreviewPedidoLimpio({
    content: [{ text: 'Pedido', font: 'FuenteInexistente' }]
  }));
});
