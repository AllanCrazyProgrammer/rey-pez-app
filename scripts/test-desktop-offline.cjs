// Exercises the real packaged desktop app with an isolated profile and all network blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright');
const root = path.resolve(__dirname, '..');
const executablePath = process.env.REYPEZ_DESKTOP_EXECUTABLE || path.join(root, `release/offline-${require('../package.json').version}/mac-arm64/ReyPez.app/Contents/MacOS/ReyPez`);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'reypez-desktop-qa-'));
let desktop;
async function launch() {
  desktop = await electron.launch({ executablePath, args: [
    ...(process.env.REYPEZ_DESKTOP_UNPACKAGED ? [path.join(root, 'electron/main.js')] : []),
    `--user-data-dir=${profile}`, '--proxy-server=http://127.0.0.1:9', '--host-resolver-rules=MAP * ~NOTFOUND'
  ] });
  await desktop.evaluate(({session}) => {
    session.defaultSession.enableNetworkEmulation({offline:true});
    session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','wss://*/*']}, (_details, callback) => callback({cancel:true}));
  });
  await desktop.context().setOffline(true);
  const page = await desktop.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('dialog', dialog => { if (dialog.type() !== 'beforeunload') dialog.dismiss().catch(() => {}); });
  page.on('pageerror', error => console.error('renderer:', error.message));
  await page.waitForFunction(() => Boolean(window.desktop));
  assert.ok(page.url().startsWith('file://'), 'app must load bundled files, not a website');
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  return page;
}
async function records(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('ReyPezOfflineDB');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const request = db.transaction('embarques').objectStore('embarques').getAll();
      request.onsuccess = () => {resolve(request.result); db.close();};
    };
  }));
}
async function closeWindow(page) {
  const closed = page.waitForEvent('close');
  await desktop.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].close());
  await closed;
  await desktop.close();
  desktop = null;
}
(async () => {
  try {
    let page = await launch();
    await page.locator('#username').waitFor();
    console.log('PASS first-ever startup with no internet and no cached web page');
    // Local authentication remains usable without an internet-dependent login service.
    await page.locator('#username').fill('allan');
    await page.locator('#password').fill('noseno');
    await page.locator('button[type=submit]').click();
    await page.waitForURL(/#\/embarques$/);
    await page.evaluate(() => {location.hash='/nuevo-embarque';});
    await page.locator('#cargaCon').waitFor();
    await page.locator('#cargaCon').selectOption('Porro');
    // Close through the native window immediately after editing: IPC must flush the local save.
    await closeWindow(page);
    console.log('PASS native close waits for durable local save without waiting for internet');
    page = await launch();
    await page.locator('.lista-embarques').waitFor();
    const saved = await records(page);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].cargaCon, 'Porro');
    assert.equal(saved[0].pendingSync, true);
    const id = saved[0].id;
    await page.evaluate(id => {location.hash='/embarques/'+id;}, id);
    await page.locator('#cargaCon').waitFor();
    assert.equal(await page.locator('#cargaCon').inputValue(), 'Porro');
    await page.locator('#cargaCon').selectOption('Caminante');
    await closeWindow(page);
    page = await launch();
    await page.locator('.lista-embarques').waitFor();
    const edited = (await records(page)).find(r=>r.id===id);
    assert.equal(edited.cargaCon, 'Caminante');
    assert.equal(edited.pendingSync, true);
    await page.evaluate(id => {location.hash='/embarques/'+id;}, id);
    await page.locator('#cargaCon').waitFor();
    await page.screenshot({path:'/tmp/reypez-desktop-offline.png',fullPage:true});
    console.log('PASS complete app shutdown/relaunch, reopen shipment, edit offline, shutdown/relaunch again');
    console.log('Screenshot: /tmp/reypez-desktop-offline.png');
    await closeWindow(page);
    console.log('All tests used a temporary profile; no production database writes. Profile: '+profile);
  } finally {
    if (desktop) await desktop.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
