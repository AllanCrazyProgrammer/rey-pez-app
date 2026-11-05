const crypto = require('crypto');

// Include every lazy chunk so screens never visited online can also open offline.
class OfflinePlugin {
  apply(compiler) {
    const { Compilation, sources } = compiler.webpack;
    compiler.hooks.thisCompilation.tap('OfflinePlugin', compilation => {
      // REPORT es la última etapa: ya están todos los archivos (incluidos index.html y public/).
      compilation.hooks.processAssets.tap({ name: 'OfflinePlugin', stage: Compilation.PROCESS_ASSETS_STAGE_REPORT }, () => {
      const assets = Object.keys(compilation.assets).filter(name => !/\.map$/.test(name) && name !== 'service-worker.js');
      const version = crypto.createHash('sha256');
      // A cache policy change must create a separate shell, even with identical assets.
      version.update('network-refresh-v2');
      assets.forEach(name => version.update(compilation.assets[name].source()));
      const source = `const CACHE = 'reypez-shell-${version.digest('hex').slice(0, 16)}';
const ASSETS = ${JSON.stringify(assets.map(name => '/' + name))};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    // Bound concurrent downloads for mobile connections.
    for (let i = 0; i < ASSETS.length; i += 12) {
      // Never populate a new release with a still-fresh HTTP copy of index.html.
      await cache.addAll(ASSETS.slice(i, i + 12).map(url => new Request(url, { cache: 'reload' })));
    }
  }));
});
// Only an explicit action in the sole open tab can replace the running shell.
self.addEventListener('message', event => {
  if (event.data?.type !== 'ACTIVATE_WEB_UPDATE') return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    if (clients.length > 1) {
      event.ports[0]?.postMessage({ error: 'Cierra las otras pestañas de ReyPez y vuelve a pulsar Actualizar web. Tus datos guardados se conservarán.' });
      return;
    }
    event.ports[0]?.postMessage({ ok: true });
    await self.skipWaiting();
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('reypez-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    // Una navegación no acepta respuestas redirigidas (p. ej. si el hosting redirige /index.html
    // a /): se entrega una copia limpia. Sin copia en caché, se va a la red.
    event.respondWith(caches.open(CACHE).then(async cache => {
      const shell = await cache.match('/index.html');
      if (!shell) return fetch(event.request);
      if (!shell.redirected) return shell;
      return new Response(await shell.blob(), { status: 200, statusText: 'OK', headers: shell.headers });
    }));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
  }
});`;
      // minimized: Terser no lo reescribe (se conserva legible, igual que antes).
      compilation.emitAsset('service-worker.js', new sources.RawSource(source), { minimized: true });
      });
    });
  }
}
module.exports = OfflinePlugin;
