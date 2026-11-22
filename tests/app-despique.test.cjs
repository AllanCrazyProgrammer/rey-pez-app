// App de despique (docs/APP_DESPIQUE.md): solo Pesadas, sin acceso a otras áreas de Rey Pez.
// Las revisiones del build corren si existe despique-dist (npm run build:despique:web).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const leer = ruta => fs.readFileSync(path.join(root, ruta), 'utf8');

test('el router de despique solo importa el login y las pantallas de Pesadas permitidas', () => {
  const router = leer('src/despique/router.js');
  const importados = [...router.matchAll(/import\s*(?:[\w{}\s,*]+from\s*)?\(?\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const vistas = importados.filter(ruta => ruta.endsWith('.vue')).sort();
  assert.deepEqual(vistas, [
    '@/views/Login.vue',
    '@/views/Pesadas/PesadasDia.vue',
    '@/views/Pesadas/PesadasGranel.vue',
    '@/views/Pesadas/PesadasHistorial.vue',
    '@/views/Pesadas/PesadasRapida.vue'
  ]);
  assert.ok(!/DespicadorasMenu/.test(router), 'el catálogo de despicadoras no entra a la app');
  assert.match(router, /path: '\*', redirect: '\/pesadas'/, 'cualquier otra ruta regresa a la lista de días');
});

test('la entrada de despique no usa el router ni el marco de la app completa', () => {
  const main = leer('src/despique/main.js');
  assert.match(main, /from '\.\/router'/);
  assert.match(main, /from '\.\/AppDespique\.vue'/);
  assert.ok(!/from ['"](?:\.\.\/|@\/)(?:router|App\.vue)['"]/.test(main));
  // No baja las pantallas de la app completa por el canal de actualizaciones.
  assert.ok(!/arranqueActualizacion|autoAplicarActualizacion/.test(main + leer('src/despique/AppDespique.vue')));
});

test('Capacitor: despique es otra app con su propio proyecto nativo; la completa no cambia', () => {
  const ruta = require.resolve(path.join(root, 'capacitor.config.js'));
  const cargar = env => {
    const antes = { ...process.env };
    Object.assign(process.env, env);
    delete require.cache[ruta];
    try { return require(ruta); } finally {
      Object.keys(env).forEach(k => { if (antes[k] === undefined) delete process.env[k]; else process.env[k] = antes[k]; });
      delete require.cache[ruta];
    }
  };
  const despique = cargar({ VUE_APP_VARIANTE: 'despique', VUE_APP_TARGET: 'android' });
  assert.equal(despique.appId, 'com.reypez.despique');
  assert.equal(despique.webDir, 'despique-dist');
  assert.equal(despique.android.path, 'android-despique');
  const completa = cargar({ VUE_APP_TARGET: 'android' });
  assert.equal(completa.appId, 'com.reypez.app');
  assert.equal(completa.webDir, 'android-dist');
  assert.equal(completa.android, undefined);
});

test('los proyectos Android tienen applicationId distinto (se instalan uno junto al otro)', () => {
  assert.match(leer('android-despique/app/build.gradle'), /applicationId "com\.reypez\.despique"/);
  assert.match(leer('android/app/build.gradle'), /applicationId "com\.reypez\.app"/);
  assert.match(leer('android-despique/app/src/main/res/values/strings.xml'), /<string name="app_name">Despique<\/string>/);
});

test('el historial oculta eliminar día y el catálogo en la app de despique', () => {
  const vista = leer('src/views/Pesadas/PesadasHistorial.vue');
  assert.match(vista, /v-if="!esDespique" class="pesadas-button" to="\/despicadoras"/);
  assert.match(vista, /v-if="!esDespique" class="pesadas-button pesadas-delete-day"/);
  assert.match(vista, /if \(ES_DESPIQUE \|\|/);
});

test('la hoja del día oculta + Despicadora, Resumen / imprimir y Sacar cuentas en la app de despique', () => {
  const vista = leer('src/views/Pesadas/PesadasDia.vue');
  assert.match(vista, /v-if="!esDespique" class="pesadas-button primary" @click="agregarPersona\(\)"/);
  assert.match(vista, /v-if="!esDespique" class="pesadas-button" :disabled="!puedeImprimir" @click="abrirResumen"/);
  assert.match(vista, /v-if="!esDespique" class="pesadas-button pesadas-cuentas-button"/);
  assert.match(vista, /esDespique: ES_DESPIQUE/);
});

const dist = path.join(root, 'despique-dist');
test('el build de despique no contiene otras áreas de la app', { skip: !fs.existsSync(path.join(dist, 'index.html')) && 'falta despique-dist' }, () => {
  const js = fs.readdirSync(path.join(dist, 'js')).filter(f => f.endsWith('.js'))
    .map(f => fs.readFileSync(path.join(dist, 'js', f), 'utf8')).join('\n');
  assert.match(js, /Pesar rápido/);
  for (const ajeno of ['Bitácora', 'Préstamos', 'Sacadas', 'Existencias', 'Cuentas M', 'Da de alta a las despicadoras', 'EmbarquesMenu']) {
    assert.ok(!js.includes(ajeno), `el build trae "${ajeno}"`);
  }
});
