// Genera el PDF real de la pantalla Taras dentro del navegador (bundle de producción) y lo guarda.
// uso: node taras-browser.cjs <puerto> <salida.pdf>
const { chromium } = require('playwright');
(async () => {
  const [port, out] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block', locale: 'es-MX', timezoneId: 'America/Mexico_City' });
  await ctx.addInitScript(() => localStorage.setItem('user', JSON.stringify({ username: 'qa', userId: 'qa' })));
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.clock.install({ time: new Date('2026-11-05T12:00:00-06:00') });
  await page.goto(`http://localhost:${port}/procesos/taras`, { waitUntil: 'domcontentloaded' });
  await page.clock.runFor(4000);
  await page.waitForFunction(() => { const find = vm => vm.$options.methods?.imprimirPdfMovimientos ? vm : vm.$children.map(find).find(Boolean); return !!find(document.querySelector('#app').__vue__); }, null, { timeout: 30000 });
  await page.clock.setFixedTime(new Date('2026-11-05T12:00:00-06:00'));
  const descarga = page.waitForEvent('download', { timeout: 30000 });
  await page.evaluate(() => {
    const find = vm => vm.$options.methods?.imprimirPdfMovimientos ? vm : vm.$children.map(find).find(Boolean);
    const vm = find(document.querySelector('#app').__vue__);
    vm.proveedores = [{ id: 'p1', nombre: 'Proveedor Demo Ñandú', saldoTarasActual: 37, saldoTapasActual: -4 }];
    vm.proveedorSeleccionadoId = 'p1';
    vm.movimientos = Array.from({ length: 45 }, (_, i) => ({ id: 'm' + i, fecha: `2026-${String(9 + (i % 2)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, taras: (i % 7) - 2, tapas: (i % 5) - 1 }));
    vm.imprimirPdfMovimientos();
  });
  const d = await descarga; await d.saveAs(out);
  console.log('PDF guardado', out, errores.length ? 'errores: ' + errores.join(' | ') : 'sin errores de página');
  await browser.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
