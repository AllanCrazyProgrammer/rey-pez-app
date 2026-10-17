const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');

function cargar({ online = true, consultar = async () => true, timers = {} } = {}) {
  const alerts = [], creadas = [], cache = new Map();
  const service = { getById: consultar, getByFecha: async () => [] };
  const mocks = {
    '@/stores/ui': { useUIStore: () => ({ showPdfAlert: text => alerts.push(text) }) },
    '@/utils/services/EmbarqueCuentasService': { crearCuentaCatarro: async data => creadas.push(data) },
    '@/services/cuentas.service': { catarrosCuentas: service, ozunaCuentas: service, veronicaCuentas: service },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
      configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
    }).code;
    vm.runInNewContext(code, {
      module, exports: module.exports, console, navigator: { onLine: online }, setTimeout, clearTimeout, ...timers,
      require(id) {
        if (id in mocks) return mocks[id];
        if (id.startsWith('@/')) return load(path.join(root, 'src', id.slice(2) + '.js'));
        return require(id);
      },
    }, { filename: file });
    cache.set(file, module.exports);
    return module.exports;
  }
  const mixin = load(path.join(root, 'src/views/Embarques/mixins/embarqueCuentasMixin.js')).embarqueCuentasMixin;
  const instance = { ...mixin.data(), ...mixin.methods,
    embarque: { fecha: '2026-10-17', productos: [] }, productosPorCliente: { '2': [] }, clienteCrudos: {},
    clientesSumarKgCatarro: { '2': false }, generarPDF: async () => {},
  };
  return { instance, alerts, creadas };
}

test('sin internet permite el resumen sin consultar ni crear cuentas', async () => {
  let lecturas = 0;
  const { instance, alerts, creadas } = cargar({ online: false, consultar: () => { lecturas++; throw Error('Sin red'); } });
  assert.equal(await instance.verificarCuentasResumenAntesDeGenerar(90), true);
  assert.equal(lecturas, 0);
  assert.equal(instance.mostrarModalCuentasResumen, false);
  assert.equal(instance.verificandoCuentasResumen, false);
  assert.deepEqual(alerts, []);
  assert.deepEqual(creadas, []);
});

test('un fallo de la nube no bloquea el PDF aunque el equipo indique conexión', async () => {
  const { instance, alerts } = cargar({ consultar: async () => { throw Error('unavailable'); } });
  assert.equal(await instance.verificarCuentasResumenAntesDeGenerar(100), true);
  assert.equal(instance.mostrarModalCuentasResumen, false);
  assert.deepEqual(alerts, []);
});

test('una consulta colgada tiene límite y su respuesta tardía no abre el modal', async () => {
  let responder, agotar, limpiado;
  const pendiente = new Promise(resolve => { responder = resolve; });
  const { instance } = cargar({ consultar: () => pendiente, timers: {
    setTimeout(fn, ms) { assert.equal(ms, 5000); agotar = fn; return 1; },
    clearTimeout(id) { limpiado = id; },
  } });
  const verificacion = instance.verificarCuentasResumenAntesDeGenerar(100);
  agotar();
  assert.equal(await verificacion, true);
  assert.equal(limpiado, 1);
  responder(null);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(instance.mostrarModalCuentasResumen, false);
  assert.equal(instance.cuentasFaltantesResumen.length, 0);
});

test('con conexión sigue ofreciendo crear las cuentas faltantes', async () => {
  const { instance } = cargar({ consultar: async () => null });
  assert.equal(await instance.verificarCuentasResumenAntesDeGenerar(90), false);
  assert.equal(instance.mostrarModalCuentasResumen, true);
  assert.equal(instance.cuentasFaltantesResumen.map(c => c.id).join(','), 'ozuna,veronica,catarro');
  assert.equal(instance.escalaResumenPendiente, 90);
});

test('sin fecha no se genera el resumen incluso sin conexión', async () => {
  const { instance, alerts } = cargar({ online: false });
  instance.embarque.fecha = '';
  assert.equal(await instance.verificarCuentasResumenAntesDeGenerar(100), false);
  assert.match(alerts[0], /fecha/);
});

test('crear Catarro desde el resumen conserva la opción de kilos del editor', async () => {
  const { instance, creadas } = cargar();
  instance.cuentasFaltantesResumen = [{ id: 'catarro', clienteId: '2' }];
  await instance.crearCuentasFaltantesYGenerarResumen();
  assert.equal(creadas.length, 1);
  assert.equal(creadas[0].clientesSumarKgCatarro['2'], false);
  assert.notEqual(creadas[0].clientesSumarKgCatarro, instance.clientesSumarKgCatarro);
});
