// Synthetic offline benchmark; separate profile and network blocked before launch.
const { _electron: electron } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert/strict');
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'reypez-speed-'));
  const started = performance.now();
  const app = await electron.launch({executablePath: process.env.REYPEZ_DESKTOP_EXECUTABLE || '/Users/allanreyes/Applications/ReyPez.app/Contents/MacOS/ReyPez', args: [...(process.env.REYPEZ_DESKTOP_UNPACKAGED ? [path.resolve('electron/main.js')] : []), `--user-data-dir=${profile}`, '--proxy-server=http://127.0.0.1:9', '--host-resolver-rules=MAP * ~NOTFOUND']});
  try {
    await app.context().setOffline(true);
    const page = await app.firstWindow();
    page.setDefaultTimeout(30000);
    page.on('dialog', d => { if (d.type() !== 'beforeunload') d.dismiss().catch(()=>{}); });
    await page.locator('#username').waitFor();
    const startupMs = Math.round(performance.now() - started);
    await page.evaluate(async () => {
      localStorage.setItem('user', JSON.stringify({username:'allan',userId:'speed-test'}));
      await new Promise((resolve,reject) => {
        const request=indexedDB.open('ReyPezOfflineDB',1);
        request.onupgradeneeded=()=>request.result.createObjectStore('embarques',{keyPath:'id'});
        request.onerror=()=>reject(request.error);
        request.onsuccess=()=>{
          const db=request.result;
          const tx=db.transaction('embarques','readwrite');
          for(let i=0;i<600;i++) {
            const productos=Array.from({length:20},(_,j)=>({id:`p-${i}-${j}`,clienteId:'1',nombreCliente:'Joselito',medida:'51/60',kilos:[10,20,30],taras:[1,1,1],tipo:'Limpio'}));
            const clientes=[{id:'1',nombre:'Joselito',productos,crudos:[]}];
            const docData={fecha:'2026-09-25',cargaCon:'Porro',rev:1,clientes};
            tx.objectStore('embarques').put({id:`speed-${String(i).padStart(4,'0')}`,fecha:docData.fecha,cargaCon:'Porro',docData,clientes,productos,clienteCrudos:{'1':[]},baseRev:1,pendingSync:false,localVersion:String(i),syncState:'synced'});
          }
          tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
        };
      });
    });
    await page.locator('#username').fill('allan');
    await page.locator('#password').fill('noseno');
    await page.locator('button[type=submit]').click();
    await page.waitForURL(/#\/embarques$/);
    const listStarted=performance.now();
    await page.reload();
    await page.locator('.embarque-card').first().waitFor();
    const listMs=Math.round(performance.now()-listStarted);
    const cpuBefore=await app.evaluate(({app}) => app.getAppMetrics().filter(p=>['Tab','GPU'].includes(p.type)).reduce((sum,p)=>sum+p.cpu.cumulativeCPUUsage,0));
    const sampleStarted=performance.now();
    await page.waitForTimeout(2000);
    const cpuAfter=await app.evaluate(({app}) => app.getAppMetrics().filter(p=>['Tab','GPU'].includes(p.type)).reduce((sum,p)=>sum+p.cpu.cumulativeCPUUsage,0));
    const idleCpuPercent=Math.round(100000*(cpuAfter-cpuBefore)/(performance.now()-sampleStarted));
    const editStarted=performance.now();
    await page.getByTitle('Editar embarque',{exact:true}).first().click();
    await page.locator('#cargaCon').waitFor();
    await page.waitForFunction(()=>document.querySelector('#cargaCon')?.value==='Porro');
    const editMs=Math.round(performance.now()-editStarted);
    assert.equal(await page.locator('#cargaCon').inputValue(),'Porro');
    console.log(JSON.stringify({shipments:600,productsPerShipment:20,startupMs,listMs,editMs,idleCpuPercent}));
  } finally { await app.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
