// Pantallas y router reales con Firestore aislado. Nunca escribe en Firebase.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'inventarios-android-'));
console.log('QA Android: ' + output);

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', context: root, entry: path.join(__dirname, 'fixtures/inventarios-app.js'),
    output: { path: output, filename: 'app.js', publicPath: '/' },
    resolve: { extensions: ['.js', '.vue'], alias: {
      '@/firebase$': path.join(__dirname, 'fixtures/inventarios-firebase.js'),
      '../firebase$': path.join(__dirname, 'fixtures/inventarios-firebase.js'),
      'firebase/firestore$': path.join(__dirname, 'fixtures/inventarios-firestore.js'),
      '@': path.join(root, 'src'), 'vue$': 'vue/dist/vue.runtime.esm.js'
    } },
    module: { rules: [
      { test: /\.mjs$/, type: 'javascript/auto' },
      { test: /\.vue$/, loader: 'vue-loader' },
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader', options: { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-optional-chaining', '@babel/plugin-transform-nullish-coalescing-operator'] } },
      { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] },
      { test: /\.(png|svg|woff2?|ttf)$/, loader: 'file-loader' }
    ] }, plugins: [new VueLoaderPlugin()], devtool: false
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString('errors-only'))) : resolve()));
  fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script src="/app.js"></script></html>');
  const server = http.createServer((req, res) => {
    const requested = path.join(output, decodeURIComponent(req.url.split('?')[0]));
    const file = fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(output, 'index.html');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.png') ? 'image/png' : 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.INVENTARIOS_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = []; const dialogs = []; let aceptarSalida = true;
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      if (dialog.type() === 'confirm' && !aceptarSalida) await dialog.dismiss(); else await dialog.accept();
    });
    await page.goto(base + '/#/existencias');
    await page.getByRole('heading', { name: 'Iniciar Sesión' }).waitFor();
    assert.match(page.url(), /#\/login$/);
    await page.getByLabel('Usuario:', { exact: true }).fill('allan');
    // Usar el acceso existente sin publicar la contraseña en el resultado.
    const authSource = fs.readFileSync(path.join(root, 'src/stores/auth.js'), 'utf8');
    const password = authSource.match(/username: 'allan', password: '([^']+)'/)[1];
    await page.getByLabel('Contraseña:', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
    await page.getByRole('heading', { name: /Todo tu inventario/ }).waitFor();
    assert.equal(await page.locator('.inventarios-acceso').count(), 4);
    await page.screenshot({ path: path.join(output, 'inicio.png'), fullPage: true });

    await page.locator('.inventarios-acceso').nth(1).click();
    await page.locator('.rp-history-date time').first().waitFor();
    const fechas = await page.locator('.rp-history-date time').allTextContents();
    assert.equal(new Set(fechas).size, 2, 'Cada día debe mostrar su propia fecha de Firebase');
    const fechaAnterior = await page.locator('.rp-history-date time').last().getAttribute('datetime');
    await page.getByLabel('Ver una fecha', { exact: true }).fill(fechaAnterior);
    assert.equal(await page.locator('.mobile-registros a').count(), 1);
    await page.getByRole('button', { name: 'Limpiar fecha', exact: true }).click();
    const fechasEspeciales = await page.evaluate(() => [
      window.__mostrarFechaPrueba({ seconds: 1705320000 }),
      window.__mostrarFechaPrueba({ _seconds: 1705406400 }),
      window.__mostrarFechaPrueba(null), window.__mostrarFechaPrueba('invalida'),
      window.__mostrarFechaPrueba({ seconds: Date.parse('2024-01-16T03:00:00Z') / 1000 })
    ]);
    assert.match(fechasEspeciales[0], /15.*enero.*2024/);
    assert.match(fechasEspeciales[1], /16.*enero.*2024/);
    assert.deepEqual(fechasEspeciales.slice(2, 4), ['Sin fecha', 'Sin fecha']);
    assert.match(fechasEspeciales[4], /15.*enero.*2024/, 'La fecha debe conservar el día del negocio en México');
    await page.screenshot({ path: path.join(output, 'historial.png'), fullPage: true });
    await page.locator('.mobile-registros a').first().click();
    await page.locator('.rp-editor form').waitFor();
    assert.equal(await page.locator('.auditoria-section').count(), 0);
    assert.equal(await page.getByRole('tab', { name: /Salida/ }).getAttribute('aria-selected'), 'true', 'Abrir un día de limpios muestra Salidas');
    assert.equal(await page.locator('.rp-movement-items li').count(), 0);
    await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
    await page.getByRole('heading', { name: 'Sin salidas este día', exact: true }).waitFor();
    assert.equal(await page.locator('.rp-summary-row').count(), 0);
    await page.getByRole('tab', { name: /Entrada/ }).click();
    assert.equal(await page.locator('.rp-movement-items li').count(), 1);
    const entrada = page.getByRole('form', { name: 'Capturar entrada' });
    await entrada.getByLabel('Proveedor', { exact: true }).selectOption({ label: 'Proveedor prueba' });
    await entrada.getByLabel('Medida', { exact: true }).selectOption({ label: '51/60' });
    await entrada.getByLabel(/Cajas/).fill('2');
    assert.equal(await entrada.getByLabel('Kilos', { exact: true }).inputValue(), '40');
    await entrada.getByRole('button', { name: 'Agregar entrada', exact: true }).click();
    aceptarSalida = false;
    await page.getByRole('link', { name: 'Inicio', exact: true }).click();
    assert.match(page.url(), /sacadas\/limpio1$/);
    assert.match(dialogs.at(-1), /sin guardar/);
    aceptarSalida = true;
    await page.screenshot({ path: path.join(output, 'limpios.png'), fullPage: true });
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('heading', { name: 'Movimientos de limpios' }).waitFor();
    assert.match(await page.locator('.mobile-registros').innerText(), /140\.0 kg/);
    await page.locator('.mobile-registros a').first().click();
    await page.getByRole('tab', { name: /Salida/ }).click();
    const salida = page.getByRole('form', { name: 'Capturar salida' });
    await salida.getByLabel('Proveedor', { exact: true }).selectOption({ label: 'Proveedor prueba' });
    await salida.getByLabel('Medida', { exact: true }).locator('option').filter({ hasText: '51/60' }).first().waitFor({ state: 'attached' });
    await salida.getByLabel('Medida', { exact: true }).selectOption({ index: 1 });
    await salida.getByLabel('Kilos', { exact: true }).fill('20');
    await salida.getByRole('button', { name: 'Agregar salida', exact: true }).click();
    await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
    assert.match(await page.locator('.rp-day-summary .rp-stock-hero').innerText(), /20\.0.*kg/s);
    assert.match(await page.locator('.rp-summary-row').innerText(), /51\/60.*20\.0.*1\.00 cajas/s);
    assert.match(await page.locator('.rp-summary-note').innerText(), /sin guardar/);
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('heading', { name: 'Movimientos de limpios' }).waitFor();
    assert.match(await page.locator('.mobile-registros').innerText(), /20\.0 kg/);
    await page.getByRole('link', { name: 'Limpios', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.rp-stock-hero')?.textContent.includes('120.0'));
    assert.equal(await page.locator('a[href*="asesor-experto"]').count(), 0);
    await page.getByLabel('Buscar en inventario', { exact: true }).fill('inexistente');
    await page.getByRole('heading', { name: 'Sin coincidencias', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    assert.equal(await page.locator('.rp-measure').count(), 1);
    assert.equal(await page.locator('.rp-maquila-section').count(), 0, 'No mostrar maquilas si no hay existencias de ese origen');
    assert.equal(await page.locator('.rp-measure[open]').count(), 0, 'El inventario comienza con totales por medida');
    await page.locator('.rp-measure summary').click();
    await page.locator('.rp-stock-item').first().waitFor();
    await page.screenshot({ path: path.join(output, 'inventario-limpios.png'), fullPage: true });
    // Dos fechas, distintas marcas, maquila, cuartos y precios para la misma
    // medida. La agrupación muestra únicamente los saldos FIFO disponibles.
    await page.evaluate(() => {
      const data = window.__inventariosPrueba.data;
      window.__salidasAntesDelDesglose = data.sacadas.limpio1.salidas;
      data.proveedores.maquilaCatalogo = { nombre: 'Taller registro', tipo: 'maquila' };
      data.sacadas.desgloseAnterior = { fecha: data.sacadas.limpioAnterior.fecha, entradas: [
        { tipo: 'proveedor', proveedor: 'Marca A', medida: '41/50 1ra', kilos: 60, precio: 100, cuartoFrio: 'Cuarto 1' },
        { tipo: 'proveedor', proveedor: 'Marca B', medida: '41.50 Nacional', kilos: 30, precio: 120, cuartoFrio: 'Cuarto 2' },
        { tipo: 'maquila', proveedor: 'Maquila prueba', medida: '41/50 2da', kilos: 10, cuartoFrio: 'Cuarto 1' },
        { proveedor: ' Ozuna ', medida: '41/50', kilos: 6, cuartoFrio: 'Cuarto 1' },
        { tipo: 'proveedor', proveedor: 'Joselito', medida: '41/50', kilos: 4, cuartoFrio: 'Cuarto 1' },
        { proveedor: 'Taller registro', medida: '41/50', kilos: 8, cuartoFrio: 'Cuarto 1' }
      ], salidas: [] };
      data.sacadas.desgloseNuevo = { fecha: data.sacadas.limpio1.fecha, entradas: [
        { tipo: 'proveedor', proveedor: 'Marca A', medida: '41/50 1ra', kilos: 40, precio: 110, cuartoFrio: 'Cuarto 3' }
      ], salidas: [] };
      data.sacadas.limpio1.salidas = [...data.sacadas.limpio1.salidas,
        { tipo: 'proveedor', proveedor: 'Marca A', medida: '41/50 1ra', kilos: 10, precio: 100, cuartoFrio: 'Cuarto 1' },
        { tipo: 'proveedor', proveedor: 'Marca B', medida: '41.50 Nacional', kilos: 5, precio: 120, cuartoFrio: 'Cuarto 2' },
        { tipo: 'maquila', proveedor: 'Maquila prueba', medida: '41/50 2da', kilos: 5, cuartoFrio: 'Cuarto 1' },
        { proveedor: ' Ozuna ', medida: '41/50', kilos: 2, cuartoFrio: 'Cuarto 1' },
        { tipo: 'proveedor', proveedor: 'Joselito', medida: '41/50', kilos: 1, cuartoFrio: 'Cuarto 1' },
        { proveedor: 'Taller registro', medida: '41/50', kilos: 4, cuartoFrio: 'Cuarto 1' }
      ];
    });
    await page.getByRole('button', { name: 'Actualizar inventario', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.rp-stock-hero')?.textContent.includes('251.0'));
    const stockProveedores = page.getByRole('region', { name: 'Inventario de proveedores', exact: true });
    const stockTaller = page.getByRole('region', { name: 'Inventario de Taller registro', exact: true });
    await stockTaller.waitFor();
    assert.equal(await page.locator('.rp-measure').count(), 6);
    assert.equal(await stockProveedores.locator('.rp-measure').count(), 2);
    assert.match(await stockProveedores.locator('.rp-origin-total').innerText(), /235\.0 kg/);
    const medida4150 = stockProveedores.locator('.rp-measure').filter({ has: page.locator('summary .rp-measure-main > strong', { hasText: /^41\/50$/ }) });
    assert.match(await medida4150.locator('summary').innerText(), /2 marcas.*3 entradas.*115\.0.*5\.75 cajas/s);
    assert.match(await page.getByRole('region', { name: 'Inventario de Ozuna', exact: true }).innerText(), /4\.0 kg/);
    assert.match(await page.getByRole('region', { name: 'Inventario de Joselito', exact: true }).innerText(), /3\.0 kg/);
    assert.match(await stockTaller.innerText(), /4\.0 kg/);
    assert.equal(await page.locator('.rp-maquila-section').count(), 4);
    assert.doesNotMatch(await stockProveedores.innerText(), /Ozuna|Joselito|Taller registro|Maquila prueba/);
    await page.screenshot({ path: path.join(output, 'medidas-totales.png'), fullPage: true });
    await medida4150.locator('summary').click();
    assert.equal(await medida4150.locator('.rp-stock-lot').count(), 3);
    const marcaA = medida4150.getByRole('region', { name: 'Entradas de Marca A', exact: true });
    assert.match(await marcaA.locator('.rp-brand-heading').innerText(), /90\.0 kg.*4\.50 cajas/s);
    assert.equal(await marcaA.locator('.rp-stock-lot').count(), 2, 'Las entradas con distintos precios y fechas permanecen separadas');
    assert.equal(new Set(await marcaA.locator('.rp-meta').filter({ hasText: 'Entrada' }).allTextContents()).size, 2);
    assert.match(await marcaA.innerText(), /50\.0.*40\.0/s, 'El desglose conserva los saldos de cada entrada');
    assert.match(await medida4150.getByRole('region', { name: 'Entradas de Marca B', exact: true }).innerText(), /41\.50 Nacional.*25\.0/s);
    await page.screenshot({ path: path.join(output, 'medidas-desglose.png'), fullPage: true });
    await page.setViewportSize({ width: 360, height: 800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.getByLabel('Buscar en inventario', { exact: true }).fill('Marca A');
    assert.equal(await page.locator('.rp-measure').count(), 1);
    assert.match(await page.locator('.rp-measure summary').innerText(), /90\.0.*4\.50 cajas/s);
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    await page.locator('.rp-filters summary').click();
    await page.getByLabel('Filtrar por cuarto frío', { exact: true }).selectOption('Cuarto 2');
    assert.equal(await page.locator('.rp-measure').count(), 1);
    assert.match(await page.locator('.rp-measure summary').innerText(), /25\.0.*1\.25 cajas/s);
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    await page.getByRole('link', { name: 'Movimientos', exact: true }).click();
    await page.locator('a[href="#/sacadas/limpio1"]').click();
    await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
    assert.equal(await page.locator('.rp-summary-row').count(), 6);
    assert.match(await page.locator('.rp-day-summary .rp-stock-hero').innerText(), /47\.0.*2\.35 cajas.*2 medidas/s);
    const resumenProveedores = page.getByRole('region', { name: 'Salidas de proveedores', exact: true });
    assert.match(await resumenProveedores.locator('.rp-origin-total').innerText(), /35\.0 kg.*1\.75 cajas/s);
    assert.match(await resumenProveedores.locator('.rp-summary-row').first().innerText(), /41\/50.*2 salidas.*15\.0.*0\.75 cajas/s);
    assert.match(await resumenProveedores.locator('.rp-summary-origins').first().innerText(), /Proveedor:.*Marca A.*10\.0 kg.*Proveedor:.*Marca B.*5\.0 kg/s);
    assert.doesNotMatch(await resumenProveedores.innerText(), /Ozuna|Joselito|Taller registro|Maquila prueba/);
    assert.match(await page.getByRole('region', { name: 'Salidas de Ozuna', exact: true }).innerText(), /2\.0 kg/);
    assert.match(await page.getByRole('region', { name: 'Salidas de Joselito', exact: true }).innerText(), /1\.0 kg/);
    assert.match(await page.getByRole('region', { name: 'Salidas de Taller registro', exact: true }).innerText(), /4\.0 kg/);
    assert.equal(await page.locator('.rp-summary-note').count(), 0, 'Abrir el resumen no crea cambios pendientes');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ path: path.join(output, 'resumen-salidas.png'), fullPage: true });
    await page.getByRole('tab', { name: /Salida/ }).click();
    assert.match(await page.getByRole('region', { name: 'Movimientos de proveedores', exact: true }).innerText(), /Proveedor: Marca A/);
    assert.match(await page.getByRole('region', { name: 'Movimientos de Ozuna', exact: true }).innerText(), /Maquila:.*Ozuna/);
    await page.getByLabel('Origen', { exact: true }).selectOption('maquila');
    await page.getByLabel('Maquila', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Proveedor', { exact: true }).count(), 0);
    await page.getByLabel('Origen', { exact: true }).selectOption('proveedor');
    await page.getByRole('button', { name: 'Eliminar salida de 41/50 2da', exact: true }).click();
    await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
    assert.match(await page.locator('.rp-day-summary .rp-stock-hero').innerText(), /42\.0.*2\.10 cajas/s);
    assert.match(await resumenProveedores.locator('.rp-summary-row').first().innerText(), /15\.0.*0\.75 cajas/s);
    assert.equal(await page.getByRole('region', { name: 'Salidas de Maquila prueba', exact: true }).count(), 0, 'Quitar una maquila conserva los índices originales del registro');
    await page.getByRole('link', { name: 'Movimientos de limpios', exact: true }).click();
    await page.locator('a[href="#/sacadas/limpioAnterior"]').click();
    await page.getByRole('tab', { name: 'Resumen', exact: true }).click();
    await page.getByRole('heading', { name: 'Sin salidas este día', exact: true }).waitFor();
    assert.equal(await page.locator('.rp-summary-row').count(), 0, 'El resumen sólo considera el día abierto');
    await page.evaluate(() => {
      const data = window.__inventariosPrueba.data;
      delete data.sacadas.desgloseAnterior; delete data.sacadas.desgloseNuevo;
      delete data.proveedores.maquilaCatalogo;
      data.sacadas.limpio1.salidas = window.__salidasAntesDelDesglose;
    });
    await page.getByRole('link', { name: 'Limpios', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.rp-stock-hero')?.textContent.includes('120.0'));
    await page.setViewportSize({ width: 390, height: 844 });
    // El acceso desde inventario abre la captura de hoy y reutiliza el mismo
    // registro al volver, sin crear una segunda hoja para esa fecha.
    await page.getByRole('link', { name: 'Entrada', exact: true }).click();
    await page.getByRole('form', { name: 'Capturar entrada' }).waitFor();
    assert.match(page.url(), /sacadas\/new/);
    const hoy = page.getByRole('form', { name: 'Capturar entrada' });
    await hoy.getByLabel('Proveedor', { exact: true }).selectOption('Proveedor prueba');
    await hoy.getByLabel('Medida', { exact: true }).selectOption('51/60');
    await hoy.getByLabel('Kilos', { exact: true }).fill('15');
    await hoy.getByRole('button', { name: 'Agregar entrada', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('heading', { name: 'Movimientos de limpios' }).waitFor();
    const registroHoy = await page.locator('.mobile-registros a').first().getAttribute('href');
    assert.equal(await page.getByRole('link', { name: 'Registrar movimiento de hoy', exact: true }).getAttribute('href'), registroHoy + '?fecha=' + (await page.locator('.rp-history-date time').first().getAttribute('datetime')) + '&tipo=salida');
    await page.getByRole('link', { name: 'Registrar movimiento de hoy', exact: true }).click();
    await page.getByRole('form', { name: 'Capturar salida' }).waitFor();
    assert.equal(await page.getByRole('tab', { name: /Salida/ }).getAttribute('aria-selected'), 'true');

    await page.getByRole('link', { name: 'Inicio', exact: true }).click();
    await page.locator('.inventarios-acceso').nth(3).click();
    await page.locator('.mobile-registros a').first().click();
    await page.locator('.rp-editor form').waitFor();
    assert.equal(await page.getByRole('tab', { name: /Salida/ }).getAttribute('aria-selected'), 'true', 'Abrir un día de crudos muestra Salidas');
    assert.equal(await page.getByLabel(/Cajas/).count(), 0);
    assert.equal(await page.getByRole('tab', { name: 'Resumen', exact: true }).count(), 0);
    assert.equal(await page.locator('.comparacion-embarque').count(), 0);
    await page.getByRole('tab', { name: /Entrada/ }).click();
    const raw = page.getByRole('form', { name: 'Capturar entrada' });
    await raw.getByLabel('Proveedor', { exact: true }).selectOption('Proveedor crudo');
    await raw.getByLabel('Producto', { exact: true }).selectOption('Crudo mediano');
    await raw.getByLabel('Kilos', { exact: true }).fill('25');
    await raw.getByRole('button', { name: 'Agregar entrada', exact: true }).click();
    await page.evaluate(() => { window.__inventariosPrueba.fallar = 'existenciasCrudos'; });
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.rp-save-button').disabled);
    assert.match(page.url(), /existencias-crudos\/crudo1$/);
    assert.match(dialogs.at(-1), /Fallo de prueba/);
    await page.evaluate(() => { window.__inventariosPrueba.fallar = null; });
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('heading', { name: 'Movimientos de crudos' }).waitFor();
    assert.match(await page.locator('.mobile-registros').innerText(), /105\.0 kg/);
    await page.locator('.mobile-registros a').first().click();
    await page.getByRole('tab', { name: /Salida/ }).click();
    const rawSalida = page.getByRole('form', { name: 'Capturar salida' });
    await rawSalida.getByLabel('Proveedor', { exact: true }).selectOption('Proveedor crudo');
    await rawSalida.getByLabel('Producto', { exact: true }).selectOption({ index: 1 });
    await rawSalida.getByLabel('Kilos', { exact: true }).fill('5');
    await rawSalida.getByRole('button', { name: 'Agregar salida', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('heading', { name: 'Movimientos de crudos' }).waitFor();
    await page.getByRole('link', { name: 'Crudos', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.rp-stock-hero')?.textContent.includes('100.0'));
    assert.equal(await page.getByRole('columnheader', { name: 'Taras', exact: true }).count(), 0);
    await page.screenshot({ path: path.join(output, 'crudos.png'), fullPage: true });
    const writes = await page.evaluate(() => window.__inventariosPrueba.escrituras);
    assert.deepEqual(writes.map(w => w.collection), ['sacadas', 'sacadas', 'sacadas', 'existenciasCrudos', 'existenciasCrudos']);
    const reads = await page.evaluate(() => window.__inventariosPrueba.lecturas);
    assert.ok(!reads.includes('embarques'), 'Los inventarios no deben consultar rendimientos');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.evaluate(() => { window.__inventariosPrueba.fallarLecturas = 'sacadas'; });
    await page.getByRole('link', { name: 'Inicio', exact: true }).click();
    await page.locator('.inventarios-acceso').nth(1).click();
    await page.getByRole('alert').waitFor();
    await page.evaluate(() => { window.__inventariosPrueba.fallarLecturas = null; });
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await page.locator('.mobile-registros').waitFor();
    await page.getByRole('button', { name: 'Salir', exact: true }).click();
    await page.getByRole('heading', { name: 'Iniciar Sesión' }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: acceso, inventarios por medida, desglose de marcas/entradas, resumen diario de salidas, kilos/cajas, guardado compartido, cambios pendientes y recuperación de errores.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
