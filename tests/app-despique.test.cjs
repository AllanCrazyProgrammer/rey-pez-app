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
    '@/views/Pesadas/PesadasAjustes.vue',
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

test('pesar rápido: medida de limpio con más de 30 kg pide confirmar antes de registrar', () => {
  const rapida = leer('src/views/Pesadas/PesadasRapida.vue');
  assert.match(rapida, /excedeLimiteMedidaLimpio\(medidaNombre, neto, this\.medidasPorDefecto\)/);
  assert.match(rapida, /this\.alertaKilos = \{ medida: medidaNombre, neto, nombre \}/);
  assert.match(rapida, /<b-modal v-model="alertaKilosVisible" title="Pesada mayor a 30 kg" hide-footer>/);
  assert.match(rapida, /@click="confirmarRegistroKilos">Confirmar<\/button>/);
  assert.match(rapida, /@click="alertaKilos = null">Corregir<\/button>/);
  assert.match(rapida, /components: \{ BModal \}/);
  assert.match(rapida, /import \{ BModal \} from 'bootstrap-vue'/);
});

test('el historial tiene botón de engrane a ajustes y la ruta existe antes de /pesadas/:fecha', () => {
  const historial = leer('src/views/Pesadas/PesadasHistorial.vue');
  assert.match(historial, /to="\/pesadas\/ajustes" aria-label="Ajustes de pesadas"/);
  const router = leer('src/despique/router.js');
  assert.match(router, /path: '\/pesadas\/ajustes', name: 'PesadasAjustes'/);
  assert.ok(router.indexOf("'/pesadas/ajustes'") < router.indexOf("'/pesadas/:fecha'"), 'ajustes va antes de /pesadas/:fecha');
  const principal = leer('src/router.js');
  assert.match(principal, /path: '\/pesadas\/ajustes',\n    name: 'PesadasAjustes'/);
  assert.ok(principal.indexOf("'/pesadas/ajustes'") < principal.indexOf("'/pesadas/:fecha'"), 'ajustes va antes de /pesadas/:fecha en el router principal');
  const ajustes = leer('src/views/Pesadas/PesadasAjustes.vue');
  assert.match(ajustes, /Medidas/);
  assert.match(ajustes, /observarMedidasPesadas|guardarMedidasPesadas/);
  const rapida = leer('src/views/Pesadas/PesadasRapida.vue');
  assert.match(rapida, /medidasPorDefecto/);
  assert.match(rapida, /sugerenciasMedidaUtil\(this\.columnas, this\.editandoColumna\.id, this\.editandoColumna\.valor, this\.medidasPorDefecto\)/);
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

test('despique: botón Conectar báscula en la hoja del día y aviso con Omitir al empezar Pesar rápido', () => {
  const dia = leer('src/views/Pesadas/PesadasDia.vue');
  assert.match(dia, /<BotonBascula v-if="esDespique" \/>/);
  const rapida = leer('src/views/Pesadas/PesadasRapida.vue');
  assert.match(rapida, /ES_DESPIQUE && bascula\.soportada && !bascula\.conectada/);
  assert.match(rapida, /@click="avisoBascula = false">Omitir<\/button>/);
  assert.match(rapida, /@click="conectarBasculaDesdeAviso">Conectar báscula<\/button>/);
  const boton = leer('src/components/Bascula/BotonBascula.vue');
  assert.match(boton, /useBasculaStore/);
});

test('pesar rápido: con la báscula conectada, Registrar a un lado de los kilos pone el peso a un decimal', () => {
  const rapida = leer('src/views/Pesadas/PesadasRapida.vue');
  assert.match(rapida, /<button v-if="bascula\.conectada" type="button" class="pesadas-rapida-bascula"/);
  assert.match(rapida, /return redondearKilos\(kilos, 1\);/);
  assert.match(rapida, /this\.kilosTexto = this\.pesoBascula\.toFixed\(1\);/);
});

test('pesar rápido: botón + después de la última medida para agregar otra', () => {
  const rapida = leer('src/views/Pesadas/PesadasRapida.vue');
  const chips = rapida.indexOf('v-for="columna in columnas"');
  const mas = rapida.indexOf('class="pesadas-rapida-chip-agregar"');
  assert.ok(chips > 0 && mas > chips, 'el + va después de las medidas');
  assert.match(rapida, /@click="agregarMedida">\+<\/button>/);
  assert.match(rapida, /agregarMedida\(\) \{[\s\S]*?columnas\.\$\{id\}\.precio`\]: 10/);
});

test('pesar rápido: con la báscula conectada, elegir despicadora no abre el teclado de kilos', () => {
  const rapida = leer('src/views/Pesadas/PesadasRapida.vue');
  assert.match(rapida, /pasarAKilos\(\) \{\s*if \(this\.bascula\.conectada\) \{[\s\S]*?blur\(\);\s*return;/);
  // Enter en el nombre, elegir de la lista y dar de alta pasan por ahí.
  assert.equal((rapida.match(/this\.pasarAKilos\(\)/g) || []).length, 3);
  const store = leer('src/stores/bascula.js');
  assert.ok(!/notify\([^)]*diagnostico/.test(store), 'el aviso de conexión no trae el diagnóstico');
});
