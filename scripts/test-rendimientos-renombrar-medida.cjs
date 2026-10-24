const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const util = require('../src/utils/renombrarMedidaRendimientos');
const { normalizarNombreMedida, renombrarMedidaRendimientos: renombrar } = util;

(async () => {
  const mapa = { '16/20': 'Grande', '21/25': 'Mediano' };
  assert.equal(normalizarNombreMedida('  Grande  '), 'Grande');
  for (const nombre of [null, undefined, '', '   ', ' Grande ']) {
    assert.equal(renombrar(mapa, '16/20', nombre), null);
  }
  assert.deepEqual(renombrar(mapa, '16/20', '  Especial  '), { '16/20': 'Especial', '21/25': 'Mediano' });
  assert.deepEqual(renombrar(mapa, '16/20', '16/20'), { '16/20': '16/20', '21/25': 'Mediano' });
  assert.equal(renombrar({}, '16/20', '16/20'), null);
  assert.deepEqual(mapa, { '16/20': 'Grande', '21/25': 'Mediano' });

  const file = path.join(__dirname, '../src/views/Embarques/Rendimientos.vue');
  const sfc = compiler.parseComponent(fs.readFileSync(file, 'utf8'));
  const compiled = compiler.compile(sfc.template.content);
  assert.deepEqual(compiled.errors, []);
  assert.doesNotMatch(sfc.script.content + compiled.render, /\bprompt\s*\(/);
  // Verifica los eventos de los tres inputs reales de la plantilla.
  const inputs = [];
  function visit(node) {
    if (!node || node.type !== 1) return;
    if (node.tag === 'input' && node.attrsMap.ref === 'editorNombreMedida') inputs.push(node);
    (node.children || []).forEach(visit);
    (node.ifConditions || []).slice(1).forEach(condition => visit(condition.block));
  }
  visit(compiled.ast);
  assert.equal(inputs.length, 3);
  for (const input of inputs) {
    assert.equal(input.attrsMap['v-model'], 'edicionNombreMedida.nombre');
    assert.equal(input.attrsMap['@keydown.enter.prevent'], 'guardarNombreMedida');
    assert.equal(input.attrsMap['@blur'], 'guardarNombreMedida');
    assert.equal(input.attrsMap['@keydown.esc.prevent'], 'cancelarNombreMedida');
  }
  const code = babel.transformSync(sfc.script.content, {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const modulo = { exports: {} };
  vm.runInNewContext(code, {
    module: modulo, exports: modulo.exports, console,
    require: id => id === '@/utils/renombrarMedidaRendimientos' ? util : {},
    prompt() { throw new Error('Electron no soporta prompt'); },
  });
  const component = modulo.exports.default;
  const ctx = Object.assign(component.data(), component.methods);
  let focused = 0;
  let selected = 0;
  ctx.$nextTick = fn => fn();
  ctx.$refs = { editorNombreMedida: [{ focus() { focused++; }, select() { selected++; } }] };
  ctx.$set = (obj, key, value) => { obj[key] = value; };
  const guardados = [];
  ctx.persistirCamposRendimientos = async campos => guardados.push(JSON.parse(JSON.stringify(campos)));
  ctx.nombresMedidasPersonalizados = { ...mapa };
  ctx.kilosCrudos = { '16/20': { medida1: 100, medida2: 50 } };
  ctx.medidaOculta = { '16/20': true };
  const kilos = ctx.kilosCrudos;
  ctx.editarNombreMedida('16/20');
  assert.equal(ctx.edicionNombreMedida.nombre, 'Grande');
  assert.equal(focused, 1);
  assert.equal(selected, 1);
  ctx.edicionNombreMedida.nombre = ' Especial ';
  await ctx.guardarNombreMedida();
  await ctx.guardarNombreMedida(); // blur después de Enter no duplica la escritura.
  assert.equal(guardados.length, 1);
  assert.deepEqual(guardados[0], { nombresMedidasPersonalizados: { '16/20': 'Especial', '21/25': 'Mediano' } });
  assert.equal(ctx.kilosCrudos, kilos);
  assert.equal(ctx.medidaOculta['16/20'], true);
  for (const nombre of [' ', ' Especial ']) {
    ctx.editarNombreMedida('16/20');
    ctx.edicionNombreMedida.nombre = nombre;
    await ctx.guardarNombreMedida();
  }
  ctx.editarNombreMedida('16/20');
  ctx.edicionNombreMedida.nombre = 'Cancelar';
  ctx.cancelarNombreMedida();
  await ctx.guardarNombreMedida();
  assert.equal(guardados.length, 1);
  ctx.editarNombreMedida('16/20');
  ctx.edicionNombreMedida.nombre = '16/20';
  await ctx.guardarNombreMedida();
  assert.deepEqual(guardados[1], { nombresMedidasPersonalizados: { '16/20': '16/20', '21/25': 'Mediano' } });
  let crudosGuardados = 0;
  ctx.guardarCambiosEnTiempoReal = () => { crudosGuardados++; };
  for (const campo of ['medida1', 'medida2']) {
    ctx.editarEtiqueta('16/20', campo);
    ctx.edicionNombreMedida.nombre = '  Etiqueta ' + campo + '  ';
    await ctx.guardarNombreMedida();
  }
  assert.equal(crudosGuardados, 2);
  assert.equal(kilos['16/20'].etiqueta1, 'Etiqueta medida1');
  assert.equal(kilos['16/20'].etiqueta2, 'Etiqueta medida2');
  assert.equal(kilos['16/20'].medida1, 100);
  assert.equal(kilos['16/20'].medida2, 50);
  console.log('OK: renombrado puro, SFC real y edición en línea sin prompt');
})().catch(error => { console.error(error); process.exitCode = 1; });
