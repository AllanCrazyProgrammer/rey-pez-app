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

test('despique avisa cuando hay versión nueva y cuando ya se actualizó', () => {
  const app = leer('src/despique/AppDespique.vue');
  assert.match(app, /<AppUpdateNotice v-if="actualizaciones\.fuente"[^>]*nombre="Despique"/);
  const fuente = leer('src/despique/actualizacion.js');
  assert.match(fuente, /actualizaciones\.fuente = fuente;/);
  assert.match(leer('src/despique/main.js'), /yaSeActualizo\(/);
  const cuerpo = fuente.match(/export function yaSeActualizo[\s\S]*?\n}\n/)[0].replace('export ', '');
  const yaSeActualizo = new Function('CLAVE_PAQUETE', `${cuerpo}; return yaSeActualizo;`)('k');
  const almacen = (inicial) => { const m = new Map(inicial ? [['k', inicial]] : []); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
  assert.equal(yaSeActualizo(200, almacen(null)), false, 'instalación nueva: sin aviso');
  assert.equal(yaSeActualizo(200, almacen('100')), true, 'paquete más nuevo: avisa');
  assert.equal(yaSeActualizo(200, almacen('200')), false, 'mismo paquete: sin aviso');
  const a = almacen('100');
  yaSeActualizo(200, a);
  assert.equal(yaSeActualizo(200, a), false, 'avisa una sola vez');
});

test('despique no muestra pagos en el resumen ni en el pie de la hoja', () => {
  const dia = leer('src/views/Pesadas/PesadasDia.vue');
  assert.match(dia, /<footer v-if="esDespique" class="pesadas-sheet-footer">(?:(?!<\/footer>)[\s\S])*Más kilos(?:(?!<\/footer>)[\s\S])*Total: \{\{ numero\(resumen\.kilos\) \}\} kg<\/strong><\/footer>/);
  const pie = dia.match(/<footer v-if="esDespique"[\s\S]*?<\/footer>/)[0];
  assert.ok(!/pago|\$\{\{/i.test(pie), 'el pie de despique no habla de pagos');
  const tarjeta = dia.match(/<div v-if="esDespique" class="pesadas-best-card">[\s\S]*?<\/div>/)[0];
  assert.ok(!/pago|\$\{\{/i.test(tarjeta), 'la tarjeta de más kilos no muestra pago');
});
