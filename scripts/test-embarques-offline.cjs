// Production shell + real IndexedDB + isolated cloud double. Never writes to Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const qaService = read('src/services/EmbarquesOfflineService.js');
const qaSnapshot = read('src/utils/embarqueOfflineSnapshot.js').replace(/import .*;\n/, 'const normalizarFechaISO = value => String(value).slice(0, 10);\n');
const qaSync = read('src/services/EmbarquesSync.js')
  .replace(/import Vue .*;\n/, 'const Vue = { observable: value => value };\n')
  .replace(/import \{ ([^}]+) \} from 'firebase\/firestore';/, 'const { $1 } = window.cloud;')
  .replace(/import \{ db \}.*;/, 'const db = {};')
  .replace("'./EmbarquesOfflineService'", "'./service.js'")
  .replace("'@/utils/embarqueOfflineSnapshot'", "'./snapshot.js'")
  .replace(/import \{ useAuthStore \}.*;/, "const useAuthStore = () => ({isAuthenticated:true,userId:'qa',user:{username:'qa'}});");
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const sources = { '/qa/service.js': qaService, '/qa/snapshot.js': qaSnapshot, '/qa/sync.js': qaSync, '/qa/blank': '<html></html>' };
  const candidate = path.join(root, 'dist', url);
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'dist/index.html');
  res.setHeader('Content-Type', url.endsWith('.js') ? 'application/javascript' : url.endsWith('.css') ? 'text/css' : url.endsWith('.webmanifest') ? 'application/manifest+json' : url.endsWith('.png') ? 'image/png' : 'text/html');
  res.end(sources[url] || fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const context = await browser.newContext();
    // Isolate all real external services, including presence.
    await context.route(/https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('dialog', dialog => dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss());
    page.on('pageerror', error => console.error('BROWSER', error.message));
    page.on('console', message => { if (message.type() === 'error' && /chunk|module|navigation/i.test(message.text())) console.error(message.text()); });
    await page.goto(base + '/qa/blank');
    const results = await page.evaluate(async () => {
      const { default: offline, EmbarquesOfflineService } = await import('/qa/service.js');
      const check = (value, label) => { if (!value) throw new Error(label); };
      const rows = new Map();
      let fail = false, duringWrite = null;
      let archivePages = [];
      window.cloud = {
        collection: (_db, name) => ({name}), doc: (_db, name, id) => ({name, id: id || 'backup'}),
        documentId: () => 'id', orderBy: () => null, limit: () => null, query: () => null, startAfter: () => null,
        getDocsFromServer: async () => archivePages.shift() || ({docs: [],size:0}), serverTimestamp: () => 'server-time',
        runTransaction: async (_db, fn) => {
          if (fail) throw new Error('network lost');
          const writes = [];
          await fn({
            get: async ref => ({ exists: () => rows.has(ref.id), data: () => rows.get(ref.id) }),
            set: (ref, data) => writes.push(() => rows.set(ref.id, {...rows.get(ref.id),...data})),
            update: (ref, data) => writes.push(() => rows.set(ref.id, {...rows.get(ref.id),...data})),
            delete: ref => writes.push(() => rows.delete(ref.id))
          });
          if (duringWrite) { const callback = duringWrite; duringWrite = null; await callback(); }
          writes.forEach(fn => fn());
        }
      };
      const { default: sync } = await import('/qa/sync.js');
      const sample = {id:'qa-existing',fecha:'2026-09-20',cargaCon:'Porro',docData:{fecha:'2026-09-20',cargaCon:'Porro',clientes:[],rev:1},baseRev:1};
      rows.set(sample.id, sample.docData);
      await offline.save(sample, {pendingSync:true});
      await offline.save({...sample,cargaCon:'OLD'}, {preservePending:true});
      check((await offline.getById(sample.id)).cargaCon === 'Porro', 'download overwrote pending edit');
      fail = true;
      await sync.sync();
      check((await offline.getById(sample.id)).pendingSync, 'failed upload lost pending data');
      fail = false;
      duringWrite = () => offline.save({...sample,cargaCon:'Caminante',docData:{...sample.docData,cargaCon:'Caminante'}},{pendingSync:true});
      await sync.sync();
      check((await offline.getById(sample.id)).pendingSync, 'late acknowledgement erased newer edit');
      await sync.sync();
      check((await offline.getById(sample.id)).syncState === 'conflict', 'remote conflict not retained');
      const fresh = {id:'qa-new',fecha:'2026-09-25',docData:{fecha:'2026-09-25',clientes:[],cargaCon:'Porro'}};
      await offline.save(fresh,{pendingSync:true});
      await sync.sync();
      check(rows.has(fresh.id), 'new offline shipment not uploaded');
      check(!(await offline.getById(fresh.id)).pendingSync, 'confirmed shipment still pending');
      await offline.markDeleted(fresh.id);
      await offline.save(fresh, {preservePending:true});
      check((await offline.getById(fresh.id)).deleted, 'download resurrected a pending deletion');
      await sync.sync();
      check(!rows.has(fresh.id) && rows.has('backup'), 'delete must create backup and delete cloud record');
      const unavailable = new EmbarquesOfflineService(); unavailable.useMemoryFallback = true;
      let rejected = false;
      try { await unavailable.save(fresh); } catch (_) { rejected = true; }
      check(rejected, 'memory-only write falsely reported durable success');
      await offline.hardDelete(sample.id); await offline.hardDelete(fresh.id);
      archivePages = [100, 100, 1].map((count, page) => ({ size: count, docs: Array.from({length:count}, (_, i) => ({
        id: `archive-${page}-${i}`, data: () => ({clientes:[], ...(page === 2 ? {} : {fecha:'2020-01-01'})})
      })) }));
      await sync.prepare();
      const archive = await offline.getAll();
      check(archive.length === 201, 'archive download truncated at 100');
      check(archive.some(r => r.id === 'archive-2-0'), 'legacy shipment without date omitted');
      let listEvents = 0;
      const onListUpdate = () => { listEvents++; };
      window.addEventListener('embarques-local-updated', onListUpdate);
      await sync.refresh();
      await sync.refresh();
      check(listEvents === 0, 'unchanged refresh rebuilt list');
      const unchanged = await offline.getById('archive-0-0');
      await offline.saveBatch([unchanged], {preservePending:true});
      check((await offline.getById(unchanged.id)).localVersion === unchanged.localVersion, 'identical download rewrote disk');
      await offline.save({...unchanged, cargaCon:'LOCAL'}, {pendingSync:true});
      await offline.saveBatch([{...unchanged, cargaCon:'REMOTE'}], {preservePending:true});
      check((await offline.getById(unchanged.id)).cargaCon === 'LOCAL', 'batch overwrote pending edit');
      await sync.refresh();
      check(listEvents === 1, 'changed record did not refresh list');
      window.removeEventListener('embarques-local-updated', onListUpdate);
      const originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(value) {
        if (value.id === 'batch-failure') throw new Error('simulated disk failure');
        return originalPut.call(this, value);
      };
      let batchFailed = false;
      try { await offline.saveBatch([{...unchanged,id:'batch-first'},{...unchanged,id:'batch-failure'}]); }
      catch (_) { batchFailed = true; }
      finally { IDBObjectStore.prototype.put = originalPut; }
      check(batchFailed && !(await offline.getById('batch-first')), 'failed batch did not roll back');

      for (const row of archive) await offline.hardDelete(row.id);
      // Historical record never opened in the editor before going offline.
      const { snapshotEmbarque } = await import('/qa/snapshot.js');
      await offline.save(snapshotEmbarque('qa-history', {fecha:'2026-09-20',cargaCon:'Porro',rev:4,clientes:[{id:'1',nombre:'Joselito',productos:[{id:'product-1',clienteId:'1',nombreCliente:'Joselito',medida:'51/60',kilos:[10],taras:[1],tipo:'Limpio'}],crudos:[]}]}));
      return 'queue: pending protection, failed upload, racing edit, conflict, create/ack, backed-up deletion, storage failure; archive: 201 records and legacy dates';
    });
    console.log('PASS ' + results);
    await page.goto(base + '/login');
    await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('service worker timeout')), 25000))]));
    console.log('PASS production shell installed');
    await context.setOffline(true);
    await page.evaluate(() => localStorage.setItem('user', JSON.stringify({username:'allan',userId:'offline-qa'})));
    await page.goto(base + '/embarques/qa-history');

    await page.locator('#cargaCon').waitFor();
    assert.equal(await page.locator('#cargaCon').inputValue(), 'Porro');
    await page.locator('#cargaCon').selectOption('Caminante');
    await page.locator('.kilo-input').first().fill('25');
    await page.locator('.kilo-input').first().blur();
    await page.waitForFunction(() => new Promise(resolve => {
      const open = indexedDB.open('ReyPezOfflineDB'); open.onsuccess = () => {
        const db = open.result; const req = db.transaction('embarques').objectStore('embarques').get('qa-history');
        req.onsuccess = () => { resolve(req.result?.pendingSync && req.result?.cargaCon === 'Caminante'); db.close(); };
      };
    }));
    await page.reload();
    await page.locator('#cargaCon').waitFor();
    assert.equal(await page.locator('#cargaCon').inputValue(), 'Caminante');
    assert.equal(await page.locator('.kilo-input').first().inputValue(), '25');
    console.log('PASS offline direct URL, edit historical shipment, reload with durable changes');
    await page.goto(base + '/nuevo-embarque');
    await page.locator('#cargaCon').waitFor();
    assert.equal(await page.locator('#cargaCon').inputValue(), '');
    await page.locator('#cargaCon').selectOption('Porro');
    await page.waitForFunction(() => new Promise(resolve => {
      const open = indexedDB.open('ReyPezOfflineDB'); open.onsuccess = () => {
        const db = open.result; const req = db.transaction('embarques').objectStore('embarques').getAll();
        req.onsuccess = () => { resolve(req.result.some(r => r.id !== 'qa-history' && r.pendingSync && r.cargaCon === 'Porro')); db.close(); };
      };
    }));
    console.log('PASS create a distinct new shipment without internet');
    await page.goto(base + '/embarques');
    await page.locator('.lista-embarques').waitFor();
    await page.screenshot({path:'/tmp/reypez-offline-qa.png',fullPage:true});
    console.log('PASS offline historical list; screenshot /tmp/reypez-offline-qa.png');
    await context.close();
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
