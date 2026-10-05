const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const OfflinePlugin = require('../build/OfflinePlugin');
function worker(clientCount) {
  const compilation = { assets: { 'index.html': { source: () => '<html>test</html>' } } };
  new OfflinePlugin().apply({ hooks: { emit: { tap: (_, fn) => fn(compilation) } } });
  const listeners = {};
  const state = { activated: false, replies: [], requests: [] };
  vm.runInNewContext(compilation.assets['service-worker.js'].source(), {
    Request: class { constructor(url, options) { this.url = url; this.cache = options.cache; } },
    caches: { open: async () => ({ addAll: async requests => { state.requests.push(...requests); } }) },
    self: { addEventListener: (event, fn) => { listeners[event] = fn; },
      clients: { matchAll: async () => Array.from({length: clientCount}, () => ({})) },
      skipWaiting: async () => { state.activated = true; } }
  });
  return { state, async install() {
    let done;
    listeners.install({ waitUntil: promise => { done = promise; } });
    await done;
  }, async activate() {
    let done;
    listeners.message({ data: { type: 'ACTIVATE_WEB_UPDATE' }, ports: [{ postMessage: data => state.replies.push(data) }], waitUntil: promise => { done = promise; } });
    await done;
  }};
}
test('web update does not silently replace the running version', () => {
  assert.equal(worker(1).state.activated, false);
});
test('web update activates on explicit request with one tab', async () => {
  const w = worker(1); await w.activate();
  assert.equal(w.state.activated, true); assert.equal(w.state.replies[0].ok, true);
});
test('web update protects another open editor tab', async () => {
  const w = worker(2); await w.activate();
  assert.equal(w.state.activated, false); assert.match(w.state.replies[0].error, /otras pestañas/);
});

test('a new offline shell bypasses the HTTP cache when downloading index.html', async () => {
  const w = worker(1); await w.install();
  assert.equal(w.state.requests[0].url, '/index.html');
  assert.equal(w.state.requests[0].cache, 'reload');
  assert.equal(w.state.activated, false);
});
