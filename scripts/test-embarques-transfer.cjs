// Real IndexedDB and separate browser profiles; all external services blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, _electron: electron } = require('playwright');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = {
  '/qa/blank': '<html></html>',
  '/qa/service.js': read('src/services/EmbarquesOfflineService.js'),
  '/qa/snapshot.js': read('src/utils/embarqueOfflineSnapshot.js').replace(/import .*;\n/, 'const normalizarFechaISO = value => String(value).slice(0,10);\n'),
  '/qa/transfer.js': read('src/services/EmbarquesTransferService.js').replace("'./EmbarquesOfflineService'", "'./service.js'").replace("'@/utils/embarqueOfflineSnapshot'", "'./snapshot.js'")
};
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const candidate = path.join(root, 'dist', url);
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root, 'dist/index.html');
  res.setHeader('Content-Type', url.endsWith('.js') ? 'application/javascript' : url.endsWith('.css') ? 'text/css' : url.endsWith('.png') ? 'image/png' : 'text/html');
  res.end(source[url] || fs.readFileSync(file));
});
let browser, desktop;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const context = await browser.newContext();
  await context.route(/https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('dialog', d => d.type() === 'beforeunload' ? d.accept() : d.dismiss());
  await page.goto(base+'/qa/blank');
  await page.evaluate(async () => {
    const {default: offline} = await import('/qa/service.js');
    const {parseBackup, importBackup, exportPending} = await import('/qa/transfer.js');
    const check = (condition, message) => {if (!condition) throw new Error(message);};
    const shipment = (id, cargaCon='Porro', rev=1) => ({id, pendingSync:true, baseRev:rev, docData:{fecha:'2026-09-25',cargaCon,rev,clientes:[]}});
    const pack = records => JSON.stringify({format:'reypez-embarques-pendientes',version:1,records});
    for (const bad of ['{bad', pack([shipment('../wrong')]), pack([shipment('dup'), shipment('dup')]), '{"format":"reypez-embarques-pendientes","version":1,"records":[],"__proto__":{"admin":true}}']) {
      let rejected=false;try{parseBackup(bad);}catch(_){rejected=true;}check(rejected,'invalid backup accepted');
    }
    await offline.save(shipment('pending','LOCAL'),{pendingSync:true});
    await offline.save(shipment('newer','NEW',5),{pendingSync:false});
    await offline.save({...shipment('deleted'),deleted:true,deletedByUser:true},{pendingSync:true});
    const text=pack([shipment('pending','WEB'),shipment('newer','OLD',1),shipment('deleted','RESTORED'),shipment('new')]);
    const result=await importBackup(text);
    check(result.imported.length===1 && result.skipped.length===3,'conflict policy failed');
    check((await offline.getById('pending')).docData.cargaCon==='LOCAL','overwrote local pending changes');
    check((await offline.getById('newer')).docData.cargaCon==='NEW','overwrote newer revision');
    check((await offline.getById('deleted')).deleted,'resurrected deletion');
    check((await importBackup(text)).duplicates.length===1,'duplicate import not recognized');
    const imported=await offline.getById('new');
    await offline.acknowledge(imported,{...imported,docData:{...imported.docData,rev:2},baseRev:2});
    await offline.save({...await offline.getById('new'),docData:{...imported.docData,cargaCon:'edited'}},{pendingSync:true});
    check((await importBackup(pack([shipment('new')]))).duplicates.length===1,'receipt lost after acknowledgement/edit');
    const original=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value){if(value.id==='rollback-b')throw new Error('simulated quota');return original.apply(this,arguments);};
    let failed=false;
    try{await importBackup(pack([shipment('rollback-a'),shipment('rollback-b')]));}catch(_){failed=true;}
    finally{IDBObjectStore.prototype.put=original;}
    check(failed && !(await offline.getById('rollback-a')),'failed import left partial writes');
    check((await importBackup(pack([shipment('open')]),'open')).skipped.length===1,'open editor overwritten');
    const exported=await exportPending();
    check(parseBackup(exported.text).records.some(r=>r.deleted),'pending deletion lost on export');
    check((await offline.getById('pending')).pendingSync,'export cleared source pending flag');
    for (const row of await offline.getAllRecords()) await offline.hardDelete(row.id);
    // Seed the actual web editor with one downloaded historical shipment.
    const {snapshotEmbarque}=await import('/qa/snapshot.js');
    await offline.save(snapshotEmbarque('web-to-desktop',{fecha:'2026-09-25',cargaCon:'Porro',rev:3,clientes:[{id:'1',nombre:'Joselito',productos:[{id:'p1',clienteId:'1',nombreCliente:'Joselito',medida:'51/60',kilos:[10],taras:[1],tipo:'Limpio'}],crudos:[]}]}));
  });
  console.log('PASS malformed files, pending/newer/deleted protection, idempotence across sync/edit, atomic rollback, active editor, source retention');
  await page.goto(base+'/login');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.evaluate(()=>localStorage.setItem('user',JSON.stringify({username:'allan',userId:'transfer-test'})));
  await page.goto(base+'/embarques/web-to-desktop');
  await page.locator('#cargaCon').selectOption('Caminante');
  await page.locator('.kilo-input').first().fill('37');
  assert.equal(await page.locator('.offline-status').isVisible(),false);
  await page.getByRole('button',{name:'Conexión y respaldos',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').isVisible(),false);
  await page.getByRole('button',{name:'Conexión y respaldos',exact:true}).click();
  const downloadPromise=page.waitForEvent('download').catch(error=>({error}));
  await page.getByRole('button',{name:'Exportar pendientes',exact:true}).click();
  const download=await downloadPromise;
  if(download.error){console.log(await page.locator('.offline-status').innerText());throw download.error;}
  const savedFile=path.join(os.tmpdir(),'reypez-transfer-qa.json');
  await download.saveAs(savedFile);
  const backup=JSON.parse(fs.readFileSync(savedFile,'utf8'));
  assert.equal(backup.records[0].docData.clientes[0].productos[0].kilos[0],37);
  assert.equal(backup.records[0].docData.cargaCon,'Caminante');
  console.log('PASS web offline export includes the last input edit');
  // Optional packaged desktop round-trip, using the actual exported file.
  const executable=process.env.REYPEZ_DESKTOP_EXECUTABLE;
  if (executable) {
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),'reypez-transfer-desktop-'));
    desktop=await electron.launch({executablePath:executable,args:[`--user-data-dir=${profile}`,'--proxy-server=http://127.0.0.1:9','--host-resolver-rules=MAP * ~NOTFOUND']});
    await desktop.context().setOffline(true);
    const win=await desktop.firstWindow();win.setDefaultTimeout(15000);
    win.on('dialog',()=>{});
    await win.locator('#username').fill('allan');await win.locator('#password').fill('noseno');await win.locator('button[type=submit]').click();
    await win.getByRole('button',{name:'Conexión y respaldos',exact:true}).click();
    await win.locator('input[type=file]').setInputFiles(savedFile);
    await win.getByRole('button',{name:'Confirmar importación',exact:true}).click();
    await win.getByRole('status').filter({hasText:'1 importados;'}).waitFor();
    await win.locator('input[type=file]').setInputFiles(savedFile);
    await win.getByRole('button',{name:'Confirmar importación',exact:true}).click();
    await win.getByRole('status').filter({hasText:'0 importados; 1 ya estaban'}).waitFor();
    await win.evaluate(()=>{location.hash='/embarques/web-to-desktop';});
    await win.locator('#cargaCon').waitFor();
    assert.equal(await win.locator('#cargaCon').inputValue(),'Caminante');
    assert.equal(await win.locator('.kilo-input').first().inputValue(),'37');
    await win.screenshot({path:'/tmp/reypez-transfer-desktop.png',fullPage:true});
    console.log('PASS real web download -> offline desktop import -> duplicate import -> open exact kilos/responsible');
    await desktop.close();desktop=null;
  }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(desktop)await desktop.close();if(browser)await browser.close();server.close();});
