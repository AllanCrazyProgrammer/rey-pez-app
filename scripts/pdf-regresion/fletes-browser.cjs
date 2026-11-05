// PDF real de Cuenta de Fletes (html2pdf.js + html2canvas + jsPDF) en el bundle de producción.
// uso: node fletes-browser.cjs <puerto> <salida.pdf>
const { chromium } = require('playwright');
(async () => {
  const [port, out] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--no-sandbox', '--font-render-hinting=none'] });
  const ctx = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block', locale: 'es-MX', timezoneId: 'America/Mexico_City', viewport: { width: 1200, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('user', JSON.stringify({ username: 'qa', userId: 'qa' })));
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.clock.install({ time: new Date('2026-11-05T12:00:00-06:00') });
  await page.goto(`http://localhost:${port}/cuenta-fletes`, { waitUntil: 'domcontentloaded' });
  await page.clock.runFor(4000);
  const find = "(function find(vm){ return vm.$options.methods && vm.$options.methods.generarTablaAbonosPDF ? vm : vm.$children.map(find).find(Boolean); })(document.querySelector('#app').__vue__)";
  await page.waitForFunction(f => !!eval(f), find, { timeout: 30000 });
  await page.clock.setFixedTime(new Date('2026-11-05T12:00:00-06:00'));
  const descarga = page.waitForEvent('download', { timeout: 60000 });
  await page.evaluate(f => {
    const vm = eval(f);
    const filas = Array.from({ length: 40 }, (_, i) => '<tr><td>' + String(1 + (i % 28)).padStart(2, '0') + '/10/2026</td><td>' + (i % 9) + '</td><td>' + (i % 4) + '</td><td>' + ((i * 3) % 7) + '</td><td>' + (i % 3) + '</td><td>' + (10 + i) + '</td><td>' + (i % 5) + '</td><td>$' + (1500 + i * 37.5).toFixed(2) + '</td></tr>').join('');
    vm.generarFilasFletesPDF = () => filas + '<tr class="fila-total"><td colspan="7"><strong>Total</strong></td><td><strong>$90,000.00</strong></td></tr>';
    vm.generarTablaAbonosPDF = () => '<h3>Abonos</h3><table class="tabla-pdf"><tbody><tr class="fila-abono"><td>01/10/2026</td><td>$5,000.00</td></tr></tbody></table>';
    vm.generarPDF();
  }, find);
  page.clock.runFor(20000).catch(() => {});
  const d = await descarga; await d.saveAs(out);
  console.log('PDF guardado', out, errores.length ? 'errores: ' + errores.join(' | ') : 'sin errores de página');
  await browser.close();
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
