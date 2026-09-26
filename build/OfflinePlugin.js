const crypto = require('crypto');

// Include every lazy chunk so screens never visited online can also open offline.
class OfflinePlugin {
  apply(compiler) {
    compiler.hooks.emit.tap('OfflinePlugin', compilation => {
      const assets = Object.keys(compilation.assets).filter(name => !/\.map$/.test(name));
      const version = crypto.createHash('sha256');
      assets.forEach(name => version.update(compilation.assets[name].source()));
      const source = `const CACHE = 'reypez-shell-${version.digest('hex').slice(0, 16)}';
const ASSETS = ${JSON.stringify(assets.map(name => '/' + name))};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    // Bound concurrent downloads for mobile connections.
    for (let i = 0; i < ASSETS.length; i += 12) await cache.addAll(ASSETS.slice(i, i + 12));
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
    event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
  }
});`;
      compilation.assets['service-worker.js'] = { source: () => source, size: () => Buffer.byteLength(source) };
    });
  }
}
module.exports = OfflinePlugin;
