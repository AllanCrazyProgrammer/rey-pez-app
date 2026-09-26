// Isolated desktop scroll measurement. Blocks all external services and uses synthetic products.
const { _electron: electron } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'reypez-scroll-'));
  const executablePath = process.env.REYPEZ_DESKTOP_EXECUTABLE || path.resolve(`release/offline-${require('../package.json').version}/mac-arm64/ReyPez.app/Contents/MacOS/ReyPez`);
  const app = await electron.launch({ executablePath, args: [`--user-data-dir=${profile}`, '--proxy-server=http://127.0.0.1:9'] });
  try {
    await app.evaluate(({ session }) => {
      session.defaultSession.enableNetworkEmulation({ offline: true });
      session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'wss://*/*'] }, (_, cb) => cb({ cancel: true }));
    });
    const page = await app.firstWindow();
    page.setDefaultTimeout(20000);
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await page.locator('#username').fill('allan');
    await page.locator('#password').fill('noseno');
    await page.locator('button[type=submit]').click();
    await page.waitForURL(/#\/embarques$/);
    await page.evaluate(() => { location.hash = '/nuevo-embarque'; });
    await page.locator('#cargaCon').waitFor();
    await page.waitForFunction(() => { const vm = document.querySelector('.nuevo-embarque-container')?.__vue__; return vm && !vm._inicializandoEmbarque; });
    await page.evaluate(async () => {
      const editor = document.querySelector('.nuevo-embarque-container').__vue__;
      editor._inicializandoEmbarque = true;
      editor.guardadoAutomaticoActivo = false;
      editor.clienteActivo = null;
      const base = JSON.parse(JSON.stringify(editor.embarque.productos[0]));
      if (!base) throw new Error('No product template');
      editor.embarque.productos = Array.from({ length: 100 }, (_, i) => ({ ...base, id: 'scroll-qa-' + i, medida: '16/20', kilos: [10, 20, 30], taras: [1, 1, 1] }));
      await editor.$nextTick();
    });
    const metrics = await page.evaluate(async () => {
      const candidates = [document.scrollingElement, ...document.querySelectorAll('*')].filter(x => x && x.scrollHeight > x.clientHeight + 1000);
      const scroller = candidates.find(x => ['auto', 'scroll'].includes(getComputedStyle(x).overflowY)) || document.scrollingElement;
      scroller.style.setProperty('scroll-behavior', 'auto', 'important');
      const frames = [];
      let last = performance.now();
      for (let i = 0; i < 180; i++) {
        await new Promise(requestAnimationFrame);
        const now = performance.now();
        if (i > 10) frames.push(now - last);
        last = now;
        scroller.scrollTop = i * 45;
      }
      frames.sort((a,b) => a-b);
      return {
        products: document.querySelectorAll('.producto').length,
        scrollY: scroller.scrollTop,
        scrollContainer: scroller.className || scroller.tagName,
        visibleProducts: [...document.querySelectorAll('.producto')].filter(x=>x.getClientRects().length).length,
        p50: frames[Math.floor(frames.length * .5)], p95: frames[Math.floor(frames.length * .95)],
        framesOver33ms: frames.filter(x => x > 33.4).length,
        blurredLayers: [...document.querySelectorAll('.nuevo-embarque-container *')].filter(x => getComputedStyle(x).backdropFilter !== 'none').length
      };
    });
    console.log(JSON.stringify(metrics));
    assert.ok(metrics.products >= 100);
    await page.screenshot({ path: '/tmp/reypez-scroll-check.png' });
    assert.ok(metrics.scrollY > 1000, 'fixture must scroll');
    if (!process.env.REYPEZ_SCROLL_BASELINE) assert.equal(metrics.blurredLayers, 0);
  } finally { await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
