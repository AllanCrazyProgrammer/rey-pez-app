// Packaged Rendimientos PDF preview, with isolated data and no network access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'reypez-rendimientos-preview-'));
const executablePath = process.env.REYPEZ_DESKTOP_EXECUTABLE || path.join(root, `release/offline-${require('../package.json').version}/mac-arm64/ReyPez.app/Contents/MacOS/ReyPez`);

(async () => {
  const desktop = await electron.launch({ executablePath, args: [
    `--user-data-dir=${profile}`, '--proxy-server=http://127.0.0.1:9', '--host-resolver-rules=MAP * ~NOTFOUND'
  ] });
  try {
    await desktop.context().setOffline(true);
    await desktop.evaluate(({ ipcMain, session }) => {
      session.defaultSession.enableNetworkEmulation({ offline: true });
      global.previewSaveCalls = 0;
      ipcMain.removeHandler('desktop:save-pdf');
      ipcMain.handle('desktop:save-pdf', () => {
        global.previewSaveCalls++;
        return { canceled: true };
      });
    });
    const page = await desktop.firstWindow();
    page.setDefaultTimeout(30000);
    page.on('dialog', dialog => dialog.dismiss());
    await page.locator('#username').waitFor();
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('ReyPezOfflineDB', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('embarques', { keyPath: 'id' });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('embarques', 'readwrite');
          const productos = [{ id: 'qa-product', clienteId: '1', medida: '51/60', tipo: 's/c', kilos: [100], taras: [1] }];
          const clientes = [{ id: '1', nombre: 'Joselito', productos, crudos: [] }];
          const docData = { fecha: '2026-10-22', cargaCon: 'QA', rev: 1, clientes, kilosCrudos: { '51/60': 150 } };
          tx.objectStore('embarques').put({ id: 'qa-preview', fecha: docData.fecha, clientes, productos,
            clienteCrudos: { '1': [] }, docData, baseRev: 1, pendingSync: false, syncState: 'synced' });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      });
    });
    await page.locator('#username').fill('allan');
    const auth = fs.readFileSync(path.join(root, 'src/stores/auth.js'), 'utf8');
    await page.locator('#password').fill(auth.match(/username: 'allan', password: '([^']+)'/)[1]);
    await page.locator('button[type=submit]').click();
    await page.waitForURL(/#\/embarques$/);
    await page.evaluate(() => { location.hash = '/embarques/qa-preview/rendimientos'; });
    await page.getByRole('heading', { name: 'Rendimientos por medida' }).waitFor();
    await page.locator('.btn-pdf').click();
    await page.locator('dialog.pdf-preview[open]').waitFor();
    const bytes = await page.locator('.pdf-preview iframe').evaluate(async iframe =>
      Array.from(new Uint8Array(await (await fetch(iframe.src)).arrayBuffer())));
    assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
    assert.equal(await desktop.evaluate(() => global.previewSaveCalls), 0, 'Opening preview must never save');
    fs.writeFileSync(path.join(profile, 'rendimientos.pdf'), Buffer.from(bytes));
    // Give Chromium's PDF plugin time to paint before capturing visual QA.
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(profile, 'preview.png') });
    await page.getByRole('button', { name: 'Abrir para imprimir' }).click();
    await page.waitForFunction(() => !document.querySelector('.pdf-preview button').disabled);
    assert.equal(await desktop.evaluate(() => global.previewSaveCalls), 1, 'Only explicit print action can request native delivery');
    await page.locator('.pdf-preview').getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.locator('dialog.pdf-preview[open]').waitFor({ state: 'hidden' });
    console.log('PASS Rendimientos previews real PDF without saving; printing requires explicit action. Artifacts:', profile);
  } finally {
    await desktop.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
