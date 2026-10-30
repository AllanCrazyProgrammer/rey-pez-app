const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');
const compiler = require('vue-template-compiler');

const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) source = compiler.parseComponent(source).script.content;
  const module = { exports: {} };
  const requireMock = name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('.vue') || name === '@/firebase' || name === '@/stores/ui' || name === 'firebase/firestore') return {};
    if (name.startsWith('@/utils/')) return load(`src/${name.slice(2)}.js`, mocks);
    return require(name);
  };
  const code = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  new Function('require', 'module', 'exports', code)(requireMock, module, module.exports);
  return module.exports;
}
const colors = load('src/utils/coloresMedidas.js');
const print = load('src/views/Procesos/PedidoLimpioImpresion.vue').default;
const nombresCatalogo = ['26/30', '31/35', '36/40', '41/50', '51/60', '61/70', '71/90', '91/110', 'Cristal', 'Golfo', 'Granja desc', 'Piojo', 'Robalo', 'Saladero', 'Salmu', 'Salmureado', 'roca'];
function context(component, extra = {}) {
  const vm = { $set: (obj, key, value) => { obj[key] = value; }, $delete: (obj, key) => { delete obj[key]; }, $emit() {}, ...extra };
  for (const [name, method] of Object.entries(component.methods)) vm[name] = method.bind(vm);
  return vm;
}

test('medidas existentes tienen colores estables y las tallas comunes son distintas', () => {
  const names = ['26/30', '31/35', '36/40', '41/50', '51/60', '61/70', '71/90', '91/110'];
  assert.equal(new Set(names.map(nombre => colors.fondoMedida({ nombre }))).size, names.length);
  assert.equal(colors.fondoMedidaPorNombre(' 51 / 60 '), colors.fondoMedidaPorNombre('51/60'));
  assert.equal(colors.fondoMedidaPorNombre(' GOLFO '), colors.fondoMedidaPorNombre('golfo'));
  assert.equal(colors.fondoMedidaPorNombre(''), '#FFFFFF');
});

test('el color guardado se comparte por nombre y mantiene alto contraste con negro', () => {
  const catalogo = [{ nombre: '51/60', colorPdf: '#000000' }];
  assert.equal(colors.fondoMedidaPorNombre(' 51 / 60 ', catalogo), '#979797');
  // El negro elegido se aclara hasta mantener contraste mayor que 7:1.
  const luminance = ((151 / 255 + 0.055) / 1.055) ** 2.4;
  assert.ok((luminance + 0.05) / 0.05 > 7);
  assert.equal(colors.colorBaseMedida({ nombre: '51/60', colorPdf: 'invalid' }), colors.colorBaseMedida({ nombre: '51/60' }));
});

test('las 17 medidas de la captura tienen fondos diferenciados, sin depender del orden del catálogo', () => {
  const catalogo = nombresCatalogo.map(nombre => ({ nombre }));
  const fondos = catalogo.map(m => colors.fondoMedida(m, catalogo));
  assert.equal(new Set(fondos).size, 17);
  fondos.forEach((fondo, i) => {
    for (const otro of fondos.slice(0, i)) assert.ok(colors.distanciaColores(fondo, otro) >= 20);
    assert.equal(fondo, colors.fondoMedidaPorNombre(catalogo[i].nombre, [...catalogo].reverse()));
    const linear = [1, 3, 5].map(p => parseInt(fondo.slice(p, p + 2), 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    assert.ok((linear.reduce((sum, c, j) => sum + c * [0.2126, 0.7152, 0.0722][j], 0) + 0.05) / 0.05 >= 7);
  });
});

test('conserva colores guardados repetidos o cercanos, también en PDF, sin modificar el catálogo', () => {
  const catalogo = nombresCatalogo.map((nombre, i) => ({ nombre, colorPdf: i % 2 ? '#2196F3' : '#2296F3' }));
  const original = JSON.stringify(catalogo);
  const fondos = catalogo.map(m => colors.fondoMedidaPorNombre(m.nombre, catalogo));
  assert.equal(new Set(fondos).size, 2);
  fondos.forEach((fondo, i) => {
    assert.equal(fondo, colors.fondoDeColor(catalogo[i].colorPdf));
    assert.equal(colors.colorBaseMedida(catalogo[i], [...catalogo].reverse()), catalogo[i].colorPdf);
  });
  assert.equal(JSON.stringify(catalogo), original);
});

test('guarda selecciones manuales similares o repetidas y conserva su color', async () => {
  const writes = [];
  const modal = load('src/components/MedidasModal.vue', {
    'firebase/firestore': { doc() {}, updateDoc: async (_, data) => { writes.push(data); } }
  }).default;
  const vm = context(modal, modal.data());
  vm.medidas = nombresCatalogo.map((nombre, id) => ({ nombre, id: String(id) }));
  for (const color of ['#70C0EF', '#70C0F0']) {
    const input = { value: color };
    await vm.guardarColorMedida(vm.medidas[1], { target: input });
    assert.deepEqual(writes.at(-1), { colorPdf: color });
    assert.equal(input.value, color);
    assert.equal(vm.colorBaseMedida(vm.medidas[1]), color);
    assert.match(vm.estadoColor, /guardado/);
  }
  assert.equal(writes.length, 2);
  const nueva = { nombre: 'Medida adicional' };
  const sugerido = vm.colorBaseMedida(nueva);
  assert.equal(colors.medidaConColorSimilar(sugerido, nueva.nombre, vm.medidas), undefined);
});

test('guardar, recargar y crear una medida conservan su color sin modificar los demás campos', async () => {
  const records = [{ id: 'm1', nombre: '51/60', tipo: 'granja', otro: 'conservar' }];
  let update;
  const modal = load('src/components/MedidasModal.vue', {
    'firebase/firestore': {
      collection() {}, query() {}, orderBy() {}, doc: (_, __, id) => id,
      getDocs: async () => ({ docs: records.map(row => ({ id: row.id, data: () => ({ ...row }) })) }),
      updateDoc: async (id, data) => { update = data; Object.assign(records.find(row => row.id === id), data); },
      addDoc: async (_, data) => { records.push({ id: 'm2', ...data }); return { id: 'm2' }; }
    }
  }).default;
  const vm = context(modal, modal.data());
  await vm.cargarMedidas();
  await vm.guardarColorMedida(vm.medidas[0], { target: { value: '#ff0000' } });
  assert.deepEqual(update, { colorPdf: '#ff0000' });
  await vm.cargarMedidas();
  assert.equal(vm.medidas[0].colorPdf, '#ff0000');
  assert.equal(vm.medidas[0].otro, 'conservar');
  vm.newMedida = { nombre: 'Nueva', tipo: 'granja', colorPdf: '#123456' };
  await vm.agregarMedida();
  assert.equal(records[1].colorPdf, '#123456');
  assert.equal(vm.newMedida.colorPdf, '');
});

test('agrega medidas con colores similares o repetidos y los conserva al recargar y generar ambos PDF', async () => {
  const records = [{ id: 'm1', nombre: '41/50 soles', tipo: 'granja', colorPdf: '#C08040' }];
  const modal = load('src/components/MedidasModal.vue', {
    'firebase/firestore': {
      collection() {}, query() {}, orderBy() {},
      getDocs: async () => ({ docs: records.map(row => ({ id: row.id, data: () => ({ ...row }) })) }),
      addDoc: async (_, data) => {
        const id = `m${records.length + 1}`;
        records.push({ id, ...data });
        return { id };
      }
    }
  }).default;
  const vm = context(modal, modal.data());
  await vm.cargarMedidas();
  for (const [nombre, colorPdf] of [['Piojo panga', '#C08041'], ['Otra medida', '#C08040']]) {
    vm.newMedida = { nombre, tipo: 'granja', colorPdf };
    assert.equal(colors.colorBaseMedida(vm.newMedida, vm.medidas), colorPdf);
    await vm.agregarMedida();
    await vm.cargarMedidas();
    const guardada = vm.medidas.find(m => m.nombre === nombre);
    assert.ok(guardada);
    assert.equal(vm.colorBaseMedida(guardada), colorPdf);
    assert.equal(vm.newMedida.nombre, '');
    assert.equal(vm.newMedida.colorPdf, '');
  }
  const pdf = context(print, { resaltarMedidas: true, medidasCatalogo: vm.medidas, etiquetasPedido: [], etiquetasColoresPedido: {} });
  const items = records.map(m => ({ kilos: 5, medida: m.nombre }));
  for (const table of [pdf.generarTablaCliente(items), pdf.generarTablaClienteReducido(items)]) {
    records.forEach((m, i) => {
      assert.equal(table.table.body[i][1].stack[0].background, colors.fondoDeColor(m.colorPdf));
    });
  }
});

test('si falla el guardado, el selector y la muestra conservan el color anterior', async () => {
  const modal = load('src/components/MedidasModal.vue', {
    'firebase/firestore': { doc() {}, updateDoc: async () => { throw new Error('sin conexión'); } }
  }).default;
  const vm = context(modal, modal.data());
  const medida = { id: 'm1', nombre: '51/60', colorPdf: '#123456' };
  const input = { value: '#ffffff' };
  const originalError = console.error;
  console.error = () => {};
  try { await vm.guardarColorMedida(medida, { target: input }); } finally { console.error = originalError; }
  assert.equal(medida.colorPdf, '#123456');
  assert.equal(input.value, '#123456');
  assert.match(vm.estadoColor, /No se pudo guardar/);
  assert.equal(vm.guardandoColores.m1, undefined);
});

test('ambos formatos del PDF sombrean solo la medida y conservan etiquetas, notas y tipos', async () => {
  const vm = context(print, { resaltarMedidas: true, medidasCatalogo: [{ nombre: '51/60', colorPdf: '#FF0000' }], etiquetasPedido: [], etiquetasColoresPedido: {} });
  const items = [
    { kilos: 5, esTara: true, medida: '51/60', tipo: 'C/H20', nota: 'Kileado', proveedor: 'Proveedor' },
    { kilos: 15, medida: '51/60', tipo: 'S/H20' },
    { kilos: 10, medida: '41/50', tipo: '1.5' }
  ];
  const tables = [vm.generarTablaCliente(items), vm.generarTablaClienteReducido(items)];
  for (const table of tables) {
    const rows = table.table.body;
    assert.equal(rows[0][1].stack[0].background, '#FF5F5F');
    assert.equal(rows[1][1].stack[0].background, '#FF5F5F');
    assert.notEqual(rows[2][1].stack[0].background, '#FF5F5F');
    assert.equal(rows[0][1].stack[0].color, '#000000');
    assert.equal(rows[0][0].background, undefined);
    assert.ok(JSON.stringify(rows).includes('Kileado'));
    assert.ok(JSON.stringify(rows).includes('Proveedor'));
    assert.ok(JSON.stringify(rows).includes('#0000FF'));
  }
  const { crearPreviewPedidoLimpio } = load('src/utils/pdf/pedidoLimpio.js');
  const result = await crearPreviewPedidoLimpio({ content: [tables[0], { text: 'Compacto', pageBreak: 'before' }, tables[1]] });
  assert.equal(result.pageCount, 2);
  assert.ok(result.blob.size > 1000);
});

test('generar la vista PDF espera los colores del catálogo y no continúa si no puede cargarlos', async () => {
  let finish;
  let ready = false;
  const vm = context(print, { resaltarMedidas: true, _cargaMedidasCatalogo: new Promise(resolve => { finish = resolve; }) });
  const pending = vm.prepararColoresPDF().then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false);
  finish(true);
  await pending;
  assert.equal(ready, true);
  vm._cargaMedidasCatalogo = Promise.resolve(false);
  vm.cargarMedidasCatalogo = async () => false;
  await assert.rejects(vm.prepararColoresPDF(), /colores/);
});

test('compilan las plantillas de configuración y vista previa', () => {
  for (const file of ['src/components/MedidasModal.vue', 'src/views/Procesos/PedidoLimpioImpresion.vue']) {
    const sfc = compiler.parseComponent(fs.readFileSync(path.join(root, file), 'utf8'));
    assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
  }
});


test('el resaltado inicia apagado y alterna en pantalla y ambos formatos del PDF', async () => {
  const vm = context(print, { ...print.data.call({}), medidasCatalogo: [{ nombre: '51/60', colorPdf: '#FF0000' }], etiquetasPedido: [], etiquetasColoresPedido: {} });
  assert.equal(vm.resaltarMedidas, false);
  const items = [{ kilos: 5, medida: '51/60', tipo: 'C/H20', nota: 'Kileado' }];
  for (const activo of [false, true, false]) {
    vm.resaltarMedidas = activo;
    assert.equal(vm.estiloMedida('51/60').backgroundColor, activo ? '#FF5F5F' : undefined);
    for (const tabla of [vm.generarTablaCliente(items), vm.generarTablaClienteReducido(items)]) {
      const medida = tabla.table.body[0][1].stack[0];
      assert.equal(medida.text, '51/60');
      assert.equal(medida.background, activo ? '#FF5F5F' : undefined);
      assert.ok(JSON.stringify(tabla).includes('Kileado'));
    }
  }
  vm.cargarMedidasCatalogo = async () => { throw new Error('No requiere colores con resaltado apagado'); };
  await vm.prepararColoresPDF();
});
