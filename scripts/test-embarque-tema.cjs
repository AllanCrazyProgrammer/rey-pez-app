// Tema del editor de embarques: el módulo real y el componente Vue real.
// Falla si desaparecen la persistencia, la restauración o el pintado validado.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { loadSource } = require('./helpers/embarques-source.cjs');

try { require('canvas'); } catch (_) {
  try {
    const id = require.resolve('canvas');
    require.cache[id] = { id, filename: id, loaded: true, exports: {} };
  } catch (_) { /* canvas es opcional */ }
}
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const tema = loadSource('src/views/Embarques/temaEmbarque.js');
const {
  CLAVE_TEMA_EMBARQUE,
  COLORES_ORIGINALES,
  CONTRASTE_ACENTO,
  CONTRASTE_ETIQUETAS,
  FONDO_CABINA,
  PROPIEDADES_TEMA,
  aplicarTema,
  colorTextoSobre,
  colorUtilizable,
  contraste,
  guardarTema,
  leerTema,
  normalizarHex,
  quitarTema,
  restaurarTema,
  sanearTema,
} = tema;

function memoria(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
  };
}

test('solo acepta hex y lo aplica como variables, nunca el texto crudo', () => {
  assert.equal(normalizarHex('#AbC'), '#aabbcc');
  assert.equal(normalizarHex('  #38D9FF '), '#38d9ff');
  for (const malo of [null, 12, 'red', 'rgb(56,217,255)', '#38d9ff;color:red', '#38d9ff}</style>', 'javascript:alert(1)', '#gggggg']) {
    assert.equal(normalizarHex(malo), null, String(malo));
    assert.equal(colorUtilizable(malo), null, String(malo));
  }
  assert.ok(contraste(COLORES_ORIGINALES.acento, FONDO_CABINA) >= CONTRASTE_ACENTO);
  assert.ok(contraste('#71839f', FONDO_CABINA) < CONTRASTE_ETIQUETAS);
  assert.equal(colorUtilizable('#71839f', 'etiquetas'), '#71839f');
  assert.equal(colorUtilizable('#5c6b82', 'acento'), '#5c6b82');
  assert.equal(colorUtilizable('#5c6b82', 'etiquetas'), null);
  assert.equal(colorUtilizable('#4e6078', 'acento'), null);
  assert.equal(colorUtilizable('#ffb000', 'acento'), '#ffb000');
  assert.equal(colorUtilizable('#ffb000', 'etiquetas'), '#ffb000');
  assert.equal(colorUtilizable('#102033'), null);
  assert.equal(colorTextoSobre('#38d9ff'), '#06101c');
  assert.equal(colorTextoSobre('#1e293b'), '#f8fbff');

  const store = memoria();
  const guardado = guardarTema({
    acento: '#ffb000;background:url(https://evil.test)',
    etiquetas: '<script>alert(1)</script>',
    extra: 'ignorar',
  }, store);
  assert.deepEqual(guardado, { ...COLORES_ORIGINALES });
  assert.equal(store.getItem(CLAVE_TEMA_EMBARQUE), null);

  store.setItem(CLAVE_TEMA_EMBARQUE, JSON.stringify({
    acento: '#38d9ff;}</style><img src=x onerror=alert(1)>',
    etiquetas: '#ffffff',
  }));
  const leido = leerTema(store);
  assert.equal(leido.acento, COLORES_ORIGINALES.acento);
  assert.equal(leido.etiquetas, '#ffffff');
  assert.doesNotMatch(JSON.stringify(leido), /onerror|style|script|url/i);

  const dom = new JSDOM('<div id="cabina"></div>');
  const cabina = dom.window.document.getElementById('cabina');
  aplicarTema(cabina, leido);
  assert.equal(cabina.style.getPropertyValue('--embarque-acento'), '');
  assert.equal(cabina.style.getPropertyValue('--cian'), '');
  assert.equal(cabina.style.getPropertyValue('--embarque-etiquetas'), '#ffffff');
  assert.doesNotMatch(cabina.getAttribute('style') || '', /onerror|script|url|style>/i);

  guardarTema({ acento: '#ffb000', etiquetas: '#d6e4ff' }, store);
  assert.deepEqual(leerTema(store), { acento: '#ffb000', etiquetas: '#d6e4ff' });
  aplicarTema(cabina, leerTema(store));
  assert.equal(cabina.style.getPropertyValue('--embarque-acento'), '#ffb000');
  assert.equal(cabina.style.getPropertyValue('--cian'), '#ffb000');
  assert.equal(cabina.style.getPropertyValue('--embarque-etiquetas'), '#d6e4ff');
  assert.equal(cabina.style.getPropertyValue('--embarque-acento-texto'), colorTextoSobre('#ffb000'));
  assert.equal(cabina.style.getPropertyValue('--embarque-icono-fondo'), '#ffb000');

  assert.deepEqual(restaurarTema(store), { ...COLORES_ORIGINALES });
  assert.equal(store.getItem(CLAVE_TEMA_EMBARQUE), null);
  quitarTema(cabina);
  PROPIEDADES_TEMA.forEach((nombre) => assert.equal(cabina.style.getPropertyValue(nombre), '', nombre));
  assert.deepEqual(sanearTema('no-es-objeto'), { ...COLORES_ORIGINALES });
  dom.window.close();
});

function compilar(rel) {
  const absoluto = path.join(root, rel);
  let source = fs.readFileSync(absoluto, 'utf8');
  let template = '';
  if (rel.endsWith('.vue')) {
    const parsed = compiler.parseComponent(source);
    if (!parsed.script || !parsed.template) throw new Error(`SFC incompleto: ${rel}`);
    source = parsed.script.content;
    template = parsed.template.content;
  }
  const code = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    filename: absoluto,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  return { code, template };
}

function montarComponente(sembrar) {
  const vista = compilar('src/views/Embarques/components/ConfiguracionTemaEmbarque.vue');
  const modulo = compilar('src/views/Embarques/temaEmbarque.js');
  const pedido = vista.code.match(/require\((['"])(\.\.\/temaEmbarque)\1\)/);
  assert.ok(pedido, 'el componente real tiene que importar temaEmbarque');
  const dom = new JSDOM(
    '<!doctype html><html><body><div class="nuevo-embarque-container"><div id="app"></div></div></body></html>',
    { url: 'https://embarque.local/', runScripts: 'dangerously', pretendToBeVisual: true },
  );
  const window = dom.window;
  if (sembrar) sembrar(window);
  window.eval(fs.readFileSync(path.join(root, 'node_modules/vue/dist/vue.js'), 'utf8'));
  window.eval(`
    const factories = {};
    const cache = {};
    window.temaLlamadas = { guardarTema: 0, leerTema: 0, aplicarTema: 0, restaurarTema: 0, colorUtilizable: 0 };
    function require(name) {
      if (!cache[name]) {
        cache[name] = {};
        factories[name](cache[name], require);
      }
      return cache[name];
    }
    factories[${JSON.stringify(pedido[2])}] = function(exports, require) {
      ${modulo.code}
      ['guardarTema', 'leerTema', 'aplicarTema', 'restaurarTema', 'colorUtilizable'].forEach((nombre) => {
        const real = exports[nombre];
        exports[nombre] = function() {
          window.temaLlamadas[nombre] += 1;
          return real.apply(this, arguments);
        };
      });
    };
    factories.view = function(exports, require) {
      ${vista.code}
      exports.default.template = ${JSON.stringify(vista.template)};
    };
    window.tema = require(${JSON.stringify(pedido[2])});
    const Componente = require('view').default;
    window.app = new Vue(Componente).$mount('#app');
  `);
  return {
    dom,
    window,
    tick: () => new Promise((resolve) => window.Vue.nextTick(resolve)),
  };
}

test('el componente real persiste, restaura y pinta el embarque', async () => {
  const cabecera = fs.readFileSync(path.join(root, 'src/views/Embarques/components/HeaderEmbarque.vue'), 'utf8');
  assert.match(cabecera, /<configuracion-tema-embarque\s*\/>/);
  assert.match(cabecera, /ConfiguracionTemaEmbarque/);

  const { dom, window, tick } = montarComponente();
  const boton = () => [...window.document.querySelectorAll('button')].find((el) => el.getAttribute('aria-label') === 'Configuración de colores del embarque');
  const cabina = () => window.document.querySelector('.nuevo-embarque-container');
  assert.ok(boton(), 'falta el botón de configuración');
  assert.equal(boton().getAttribute('aria-expanded'), 'false');
  assert.equal(window.temaLlamadas.leerTema >= 1, true);
  assert.equal(window.temaLlamadas.aplicarTema >= 1, true);
  assert.equal(cabina().style.getPropertyValue('--embarque-acento'), '');

  boton().click();
  await tick();
  const dialogo = window.document.body.querySelector('[role="dialog"]');
  assert.equal(dialogo.getAttribute('aria-modal'), 'true');
  assert.equal(dialogo.getAttribute('aria-labelledby'), 'tema-embarque-titulo');
  assert.equal(window.document.activeElement, dialogo);
  const etiquetaAcento = window.document.querySelector('label[for="tema-embarque-acento"]');
  const etiquetaTexto = window.document.querySelector('label[for="tema-embarque-etiquetas"]');
  assert.match(etiquetaAcento.textContent, /acento y botones/i);
  assert.match(etiquetaTexto.textContent, /encabezados y etiquetas/i);

  const acento = window.document.getElementById('tema-embarque-acento');
  const etiquetas = window.document.getElementById('tema-embarque-etiquetas');
  acento.value = '#102033';
  acento.dispatchEvent(new window.Event('input'));
  await tick();
  assert.match(window.document.body.textContent, /no se distingue/);
  assert.equal(cabina().style.getPropertyValue('--embarque-acento'), '');
  assert.equal(window.localStorage.getItem('embarque:tema-colores'), null);

  acento.value = '#ffb000';
  acento.dispatchEvent(new window.Event('input'));
  etiquetas.value = '#d6e4ff';
  etiquetas.dispatchEvent(new window.Event('input'));
  await tick();
  assert.equal(window.temaLlamadas.guardarTema >= 1, true);
  assert.equal(window.temaLlamadas.colorUtilizable >= 1, true);
  const leido = JSON.parse(JSON.stringify(window.tema.leerTema()));
  assert.deepEqual(leido, { acento: '#ffb000', etiquetas: '#d6e4ff' });
  assert.equal(cabina().style.getPropertyValue('--embarque-acento'), '#ffb000');
  assert.equal(cabina().style.getPropertyValue('--cian'), '#ffb000');
  assert.equal(cabina().style.getPropertyValue('--embarque-etiquetas'), '#d6e4ff');
  const muestra = window.document.querySelector('.muestra-cabina');
  assert.equal(muestra.style.getPropertyValue('--embarque-acento'), '#ffb000');
  assert.equal(muestra.style.getPropertyValue('--embarque-etiquetas'), '#d6e4ff');
  assert.match(window.document.body.textContent, /#ffb000/);
  assert.doesNotMatch(cabina().getAttribute('style') || '', /url|script|onerror/i);

  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await tick();
  await tick();
  assert.equal(window.document.querySelector('[role="dialog"]'), null);
  assert.equal(window.document.activeElement, boton());
  assert.equal(boton().getAttribute('aria-expanded'), 'false');
  window.app.$destroy();
  dom.window.close();
});

test('al volver a montar el componente real recupera el tema y puede restaurarlo', async () => {
  const primero = montarComponente();
  primero.window.document.querySelector('[aria-label="Configuración de colores del embarque"]').click();
  await primero.tick();
  const input = primero.window.document.getElementById('tema-embarque-acento');
  input.value = '#ffb000';
  input.dispatchEvent(new primero.window.Event('input'));
  await primero.tick();
  const crudo = primero.window.localStorage.getItem('embarque:tema-colores');
  assert.equal(JSON.parse(crudo).acento, '#ffb000');
  primero.window.app.$destroy();
  primero.dom.window.close();

  const segundo = montarComponente((window) => {
    window.localStorage.setItem('embarque:tema-colores', crudo);
  });
  const cabina = segundo.window.document.querySelector('.nuevo-embarque-container');
  assert.equal(cabina.style.getPropertyValue('--embarque-acento'), '#ffb000');
  assert.equal(JSON.parse(JSON.stringify(segundo.window.tema.leerTema())).acento, '#ffb000');
  segundo.window.document.querySelector('[aria-label="Configuración de colores del embarque"]').click();
  await segundo.tick();
  const restaurar = [...segundo.window.document.querySelectorAll('button')].find((el) => el.textContent.includes('Volver a los colores originales'));
  assert.ok(restaurar);
  restaurar.click();
  await segundo.tick();
  assert.equal(segundo.window.temaLlamadas.restaurarTema >= 1, true);
  assert.equal(segundo.window.localStorage.getItem('embarque:tema-colores'), null);
  assert.equal(cabina.style.getPropertyValue('--embarque-acento'), '');
  assert.equal(cabina.style.getPropertyValue('--embarque-etiquetas'), '');
  assert.deepEqual(JSON.parse(JSON.stringify(segundo.window.tema.leerTema())), { ...COLORES_ORIGINALES });
  const muestra = segundo.window.document.querySelector('.muestra-cabina');
  assert.equal(muestra.style.getPropertyValue('--embarque-acento'), '');
  assert.equal(muestra.style.getPropertyValue('--embarque-etiquetas'), '');
  segundo.window.app.$destroy();
  segundo.dom.window.close();
});

test('un localStorage alterado no se inyecta al montar el componente', async () => {
  const veneno = JSON.stringify({
    acento: '#ffb000;}</style><img src=x onerror=alert(1)>',
    etiquetas: 'expression(alert(1))',
  });
  const { dom, window } = montarComponente((win) => {
    win.localStorage.setItem('embarque:tema-colores', veneno);
  });
  const cabina = window.document.querySelector('.nuevo-embarque-container');
  assert.equal(cabina.style.getPropertyValue('--embarque-acento'), '');
  assert.equal(cabina.style.getPropertyValue('--embarque-etiquetas'), '');
  assert.doesNotMatch(cabina.getAttribute('style') || '', /onerror|expression|style>/i);
  assert.deepEqual(JSON.parse(JSON.stringify(window.tema.leerTema())), { ...COLORES_ORIGINALES });
  window.app.$destroy();
  dom.window.close();
});

test('el CSS productivo conserva el color literal de cada elemento', () => {
  const header = fs.readFileSync(path.join(root, 'src/views/Embarques/components/HeaderEmbarque.vue'), 'utf8');
  const sidebar = fs.readFileSync(path.join(root, 'src/components/layout/Sidebar.vue'), 'utf8');
  const embarque = fs.readFileSync(path.join(root, 'src/views/Embarques/NuevoEmbarque.vue'), 'utf8');
  assert.match(header, /color: var\(--embarque-etiquetas, #f8fbff\)/);
  assert.match(header, /color: var\(--embarque-etiquetas, #b8c6db\)/);
  assert.match(header, /color: var\(--embarque-etiquetas, #71839f\)/);
  assert.match(header, /border: 1px solid var\(--embarque-acento, rgba\(148, 163, 184, \.17\)\)/);
  assert.match(header, /border: 1px solid var\(--embarque-acento, rgba\(56,217,255,\.2\)\)/);
  assert.match(header, /var\(--embarque-icono-fondo, linear-gradient\(135deg, #b8f4ff, #38d9ff 55%, #8b5cf6\)\)/);
  assert.match(sidebar, /\.sidebar-header h3 \{\s*color: #e8eef9;/);
  assert.match(sidebar, /linear-gradient\(transparent, #38d9ff, transparent\)/);
  assert.match(sidebar, /linear-gradient\(135deg, #b8f4ff, #38d9ff 55%, #8b5cf6\)/);
  assert.match(sidebar, /color: var\(--embarque-acento, #b8f4ff\)/);
  assert.match(sidebar, /rgba\(56, 217, 255, \.34\)/);
  assert.match(sidebar, /color: var\(--embarque-etiquetas, #8da0bd\)/);
  assert.doesNotMatch(sidebar, /var\(--embarque-etiquetas, #e8eef9\)/);
  assert.match(embarque, /color: var\(--embarque-etiquetas, #94a3b8\)/);
  assert.match(embarque, /var\(--embarque-acento, rgba\(56, 217, 255, 0\.48\)\)/);
  const dom = new JSDOM('<div id="cabina"></div>');
  const cabina = dom.window.document.getElementById('cabina');
  aplicarTema(cabina, { ...COLORES_ORIGINALES });
  PROPIEDADES_TEMA.forEach((nombre) => assert.equal(cabina.style.getPropertyValue(nombre), '', nombre));
  dom.window.close();
});

test('Tab envuelve el cuadro real, Escape devuelve el foco y destruir no deja el portal', async () => {
  const { dom, window, tick } = montarComponente();
  const cabina = window.document.querySelector('.nuevo-embarque-container');
  const siguiente = window.document.createElement('button');
  siguiente.type = 'button';
  siguiente.textContent = 'Siguiente';
  cabina.appendChild(siguiente);
  const boton = window.document.querySelector('[aria-label="Configuración de colores del embarque"]');
  const tecla = (key, shiftKey = false) => window.document.dispatchEvent(new window.KeyboardEvent('keydown', {
    key, shiftKey, bubbles: true, cancelable: true,
  }));
  boton.click();
  await tick();
  assert.equal(cabina.hasAttribute('inert'), true);
  const overlay = window.document.body.querySelector('.tema-overlay');
  assert.equal(overlay.parentNode, window.document.body);
  const panel = window.document.getElementById('tema-embarque-panel');
  const lista = [...panel.querySelectorAll('button, input')];
  assert.equal(window.document.activeElement, panel);
  tecla('Tab');
  assert.equal(window.document.activeElement, lista[0]);
  tecla('Tab', true);
  assert.equal(window.document.activeElement, lista[lista.length - 1]);
  tecla('Tab');
  assert.equal(window.document.activeElement, lista[0]);
  tecla('Escape');
  await tick();
  await tick();
  assert.equal(window.document.querySelector('.tema-overlay'), null);
  assert.equal(window.document.activeElement, boton);
  assert.equal(cabina.hasAttribute('inert'), false);

  boton.click();
  await tick();
  const acento = window.document.getElementById('tema-embarque-acento');
  acento.value = '#ffb000';
  acento.dispatchEvent(new window.Event('input'));
  await tick();
  assert.equal(cabina.style.getPropertyValue('--embarque-acento'), '#ffb000');
  window.app.$destroy();
  await tick();
  await tick();
  assert.equal(window.document.querySelector('.tema-overlay'), null);
  PROPIEDADES_TEMA.forEach((nombre) => assert.equal(cabina.style.getPropertyValue(nombre), '', nombre));
  siguiente.focus();
  await tick();
  assert.equal(window.document.activeElement, siguiente);
  dom.window.close();
});
