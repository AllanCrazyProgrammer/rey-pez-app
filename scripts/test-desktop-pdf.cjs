// Runs real bundled Vue generators and native PDF delivery in an isolated offline profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'reypez-pdf-qa-'));
const fixture = {
  id: 'pdf-qa', fecha: '2026-09-25', cargaCon: 'Porro', pendingSync: false,
  productos: [{ id: 'p1', clienteId: 'qa', medida: '16/20', tipo: 'Limpio', kilos: [20], taras: [1], precio: 150, restarTaras: false, tarasExtra: [], reporteTaras: [], reporteBolsas: [] }],
  clientes: [{ id: 'qa', nombre: 'Cliente de prueba' }],
  clienteCrudos: {}, kilosCrudos: { '16/20': 30 }, medidaOculta: {},
  analizarGanancia: {}, analizarGananciaCrudos: {}, clientesIncluirPrecios: { qa: true }
};
fixture.clientes[0].productos = fixture.productos;
fixture.clientes[0].crudos = [];
let desktop;
(async () => {
  try {
    desktop = await electron.launch({
      executablePath: process.env.REYPEZ_DESKTOP_EXECUTABLE || require('electron'),
      args: [...(process.env.REYPEZ_DESKTOP_EXECUTABLE ? [] : [path.join(root, 'electron/main.js')]),
        `--user-data-dir=${profile}`, '--proxy-server=http://127.0.0.1:9', '--host-resolver-rules=MAP * ~NOTFOUND']
    });
    await desktop.evaluate(({ app, session, dialog, shell }, folder) => {
      session.defaultSession.enableNetworkEmulation({ offline: true });
      session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'wss://*/*'] }, (_, cb) => cb({ cancel: true }));
      app.setPath('documents', folder);
      global.pdfQA = { opened: [], mode: 'save', replace: false, confirmations: 0 };
      dialog.showMessageBox = async () => { global.pdfQA.confirmations++; return { response: global.pdfQA.replace ? 1 : 0 }; };
      // Replace only OS dialogs/opening; real PDF bytes and filesystem writes are exercised.
      dialog.showSaveDialog = async (_, options) => global.pdfQA.mode === 'cancel'
        ? { canceled: true } : { canceled: false, filePath: folder + '/' + (global.pdfQA.mode === 'fail' ? 'missing/file.pdf' : options.defaultPath.split('/').pop()) };
      shell.openPath = async file => { global.pdfQA.opened.push(file); return ''; };
    }, profile);
    await desktop.context().setOffline(true);
    const page = await desktop.firstWindow();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') console.error('renderer:', msg.text()); });
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => { errors.push(d.message()); d.dismiss(); });
    await page.locator('#username').fill('allan');
    await page.locator('#password').fill('noseno');
    await page.locator('button[type=submit]').click();
    await page.locator('.lista-embarques').waitFor();
    await page.evaluate(record => new Promise((resolve, reject) => {
      const req = indexedDB.open('ReyPezOfflineDB');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('embarques', 'readwrite');
        tx.objectStore('embarques').put(record);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    }), fixture);
    const note = (record = fixture) => page.evaluate(async record => {
      const vm = document.querySelector('.lista-embarques').__vue__;
      vm.modalGenerarPdf = { embarques: [record], embarqueId: record.id, clienteId: 'qa', error: '' };
      await vm.generarPdfDesdeModal();
      return vm.modalGenerarPdf.error;
    }, record);
    assert.equal(await note(), '');
    const notePath = path.join(profile, 'embarques', '2026', 'septiembre', '25', 'Cliente-de-prueba-25-sept-26.pdf');
    assert.equal(fs.readFileSync(notePath).subarray(0,5).toString(), '%PDF-');
    assert.ok(fs.statSync(notePath).size > 5000);
    console.log('PASS note generated offline, written to disk and requested opening in system viewer');
    const openedBefore = await desktop.evaluate(() => global.pdfQA.opened.length);
    fs.writeFileSync(notePath, '%PDF-old-note');
    assert.equal(await note(), '');
    assert.ok(fs.statSync(notePath).size > 5000);
    assert.equal(await desktop.evaluate(() => global.pdfQA.opened.length), openedBefore + 1);
    assert.equal(await desktop.evaluate(() => global.pdfQA.confirmations), 0);
    assert.equal(fs.existsSync(notePath.replace('.pdf', '-2.pdf')), false);
    console.log('PASS local replacement updates the same file without prompts or numbered copies');
    assert.equal(await note({ ...fixture, fecha: '2025-02-03' }), '');
    assert.ok(fs.existsSync(path.join(profile, 'embarques', '2025', 'febrero', '3', 'Cliente-de-prueba-3-feb-25.pdf')));
    console.log('PASS folder year/month/day matches the date in the note filename');
    assert.equal(await note({ ...fixture, clientes: [{ ...fixture.clientes[0], nombre: 'Otro Cliente' }] }), '');
    assert.ok(fs.existsSync(path.join(profile, 'embarques', '2026', 'septiembre', '25', 'Otro-Cliente-25-sept-26.pdf')));
    assert.equal(await note({ ...fixture, fecha: '2026-09-26' }), '');
    assert.ok(fs.existsSync(path.join(profile, 'embarques', '2026', 'septiembre', '26', 'Cliente-de-prueba-26-sept-26.pdf')));
    console.log('PASS clients share the same day folder and different days stay separate');
    const blocked = path.join(profile, 'blocked-documents');
    fs.mkdirSync(blocked);
    fs.writeFileSync(path.join(blocked, 'embarques'), 'blocked');
    await desktop.evaluate(({ app }, folder) => app.setPath('documents', folder), blocked);
    assert.match(await note(), /No se pudo generar/);
    console.log('PASS folder failure reaches the visible modal error');
    await desktop.evaluate(({ app }, folder) => app.setPath('documents', folder), profile);
    await page.evaluate(() => { location.hash = '/embarques/pdf-qa'; });
    await page.locator('#cargaCon').waitFor();
    assert.equal(await page.evaluate(() => navigator.onLine), false);
    await page.waitForFunction(() => document.querySelector('.nuevo-embarque-container').__vue__.embarque.fecha === '2026-09-25');
    await page.locator('.header-embarque button').filter({ hasText: 'Resumen Embarque' }).click();
    await page.getByRole('button', { name: 'Generar PDF Resumen', exact: true }).click();
    await page.locator('.subir-resumen[open]').getByRole('button', { name: 'No, solo ver PDF', exact: true }).click();
    await page.locator('.pdf-preview[open] iframe').waitFor();
    assert.equal(await page.locator('.cuentas-resumen-overlay').count(), 0);
    assert.equal(await page.locator('.pdf-alert[open]').count(), 0);
    const previewUrl = await page.locator('.pdf-preview iframe').getAttribute('src');
    const summaryBytes = await page.evaluate(async url => [...new Uint8Array(await (await fetch(url)).arrayBuffer())], previewUrl);
    assert.equal(Buffer.from(summaryBytes).subarray(0, 5).toString(), '%PDF-');
    assert.ok(summaryBytes.length > 5000);
    const summaryPath = path.join(profile, 'Resumen-Embarque-Porro-25-sept-26.pdf');
    assert.equal(fs.existsSync(summaryPath), false, 'preview does not save automatically');
    await page.getByRole('button', { name: 'Abrir para imprimir', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir para imprimir', exact: true }).waitFor();
    assert.deepEqual(fs.readFileSync(summaryPath), Buffer.from(summaryBytes));
    assert.ok((await desktop.evaluate(() => global.pdfQA.opened)).includes(summaryPath));
    const openedCount = await desktop.evaluate(() => global.pdfQA.opened.length);
    await desktop.evaluate(() => { global.pdfQA.mode = 'cancel'; });
    await page.getByRole('button', { name: 'Abrir para imprimir', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir para imprimir', exact: true }).waitFor();
    assert.equal(await desktop.evaluate(() => global.pdfQA.opened.length), openedCount);
    await desktop.evaluate(() => { global.pdfQA.mode = 'fail'; });
    await page.getByRole('button', { name: 'Abrir para imprimir', exact: true }).click();
    await page.locator('.pdf-alert[open]').waitFor();
    await page.locator('.pdf-alert[open]').getByRole('button', { name: 'Cerrar', exact: true }).click();
    await desktop.evaluate(() => { global.pdfQA.mode = 'save'; });
    await page.screenshot({ path: path.join(profile, 'resumen-offline.png') });
    await page.locator('.pdf-preview[open]').getByRole('button', { name: 'Cerrar', exact: true }).click();
    console.log('PASS summary preview, native save/open for printing, cancellation and save errors with all network access blocked');
    await page.evaluate(() => { location.hash = '/embarques/pdf-qa/rendimientos'; });
    await page.locator('.rendimientos-container').waitFor();
    await page.waitForFunction(() => document.querySelector('.rendimientos-container').__vue__.medidasUnicas.length > 0);
    await page.locator('.btn-pdf').click();
    await page.waitForFunction(() => !document.querySelector('.rendimientos-container').__vue__.generandoPDF);
    const rendPath = path.join(profile, 'embarques', '2026', 'septiembre', '25', 'Rendimientos-Porro-25-sept-26.pdf');
    for (let attempt = 0; attempt < 100 && !fs.existsSync(rendPath); attempt++) await new Promise(r => setTimeout(r, 100));
    assert.equal(fs.readFileSync(rendPath).subarray(0,5).toString(), '%PDF-');
    assert.ok(fs.statSync(rendPath).size > 5000);
    const opened = await desktop.evaluate(() => global.pdfQA.opened);
    assert.ok(opened.includes(notePath) && opened.includes(rendPath));
    assert.deepEqual(errors, []);
    console.log('PASS rendimientos generated offline, saved and requested opening in system viewer');
    console.log('PDF fixtures: ' + profile);
  } catch (error) {
    console.error(error);
    if (desktop) {
      const page = desktop.context().pages()[0];
      console.error((await page.locator('body').innerText()).slice(-5000));
      await page.screenshot({ path: path.join(profile, 'failure.png') });
    }
    throw error;
  } finally {
    if (desktop) await desktop.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
