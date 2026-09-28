const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { IDBFactory } = require('fake-indexeddb');
const { uploadPdf } = require('../electron/driveUpload');
const { initGoogleDrive } = require('../electron/googleDrive');
const pdf = Buffer.from('%PDF-1.4\nQA shipping note\n%%EOF');
const clientId = 'qa.apps.googleusercontent.com';
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers });

test('uploads PDF bytes to the upload endpoint and verifies the stored file; supports replacement', async () => {
  for (const fileId of [null, 'existing']) {
    const calls = [];
    const result = await uploadPdf(async (url, options = {}) => {
      calls.push({ url, options });
      if (calls.length === 1) {
        assert.equal(new URL(url).pathname, '/upload/drive/v3/files' + (fileId ? '/existing' : ''));
        assert.equal(options.method, fileId ? 'PATCH' : 'POST');
        assert.equal(JSON.parse(options.body).mimeType, 'application/pdf');
        return json({}, 200, { location: 'https://www.googleapis.com/upload/session/qa' });
      }
      if (calls.length === 2) {
        assert.equal(options.method, 'PUT');
        assert.deepEqual(Buffer.from(options.body), pdf);
        return json({ id: 'stored' });
      }
      assert.match(url, /\/drive\/v3\/files\/stored\?/);
      return json({ id: 'stored', mimeType: 'application/pdf', size: String(pdf.length) });
    }, { fileId, parentId: 'folder', name: 'Joselito-2-sept-26.pdf', noteId: 'note-1', bytes: pdf });
    assert.equal(result.id, 'stored');
    assert.equal(calls.length, 3);
  }
});

test('metadata-only or incomplete uploads are never acknowledged', async () => {
  await assert.rejects(uploadPdf(async () => json({ id: 'empty' }), { name: 'qa.pdf', bytes: pdf }), /no inició/);
  let n = 0;
  await assert.rejects(uploadPdf(async () => {
    if (++n === 1) return json({}, 200, { location: 'https://www.googleapis.com/upload/session/qa' });
    if (n === 2) return json({ id: 'empty' });
    return json({ id: 'empty', mimeType: 'application/pdf', size: '0' });
  }, { name: 'qa.pdf', bytes: pdf }), /incompleto/);
});

async function desktopHarness(tokenError = false) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'reypez-drive-qa-'));
  const handlers = {};
  const sender = { mainFrame: {} };
  const event = { sender, senderFrame: sender.mainFrame };
  const originalFetch = global.fetch;
  let browserResult;
  let browserRequest;
  let uploaded;
  let refreshes = 0;
  let existingFile = null;
  global.fetch = async (url, options = {}) => {
    if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
    if (url === 'https://oauth2.googleapis.com/token') {
      assert.equal(options.body.get('client_id'), clientId);
      assert.equal(options.body.get('client_secret'), 'qa-desktop-client-secret');
      if (options.body.get('grant_type') === 'authorization_code') assert.ok(options.body.get('code_verifier'));
      else { assert.equal(options.body.get('refresh_token'), 'qa-refresh'); refreshes++; }
      return tokenError ? json({ error: 'invalid_grant', error_description: 'QA rejected code' }, 400) : json({ access_token: 'qa-access', refresh_token: 'qa-refresh', expires_in: 3600 });
    }
    if (String(url).includes('/files/root?')) return json({ id: 'root', name: 'Embarques', mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: true } });
    if (String(url).includes('/upload/drive/v3/files')) return json({}, 200, { location: 'https://www.googleapis.com/upload/session/qa' });
    if (url === 'https://www.googleapis.com/upload/session/qa') { uploaded = Buffer.from(options.body); return json({ id: 'pdf-id' }); }
    if (String(url).includes('/files/pdf-id?')) return json({ id: 'pdf-id', mimeType: 'application/pdf', size: String(uploaded.length) });
    if (options.method === 'POST') return json({ id: 'child-folder' });
    const q = new URL(url).searchParams.get('q') || '';
    if (existingFile && q.includes('name =') && !q.includes('mimeType')) return json({ files: [{ id: existingFile, name: 'Joselito-2-sept-26.pdf' }] });
    return json({ files: [] });
  };
  initGoogleDrive({
    app: { getPath: () => profile },
    getClientSecret: () => 'qa-desktop-client-secret',
    shell: { openExternal: async raw => {
      const url = new URL(raw);
      const callback = new URL(url.searchParams.get('redirect_uri'));
      callback.search = new URLSearchParams({ state: url.searchParams.get('state'), code: 'qa-code', picked_file_ids: 'root' });
      browserRequest = originalFetch(callback).then(async res => { browserResult = { status: res.status, text: await res.text() }; });
    } },
    dialog: { showMessageBox: async () => ({ response: 1 }) },
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; } },
    safeStorage: { isEncryptionAvailable: () => true, encryptString: s => Buffer.from(s), decryptString: b => b.toString() },
    getMainWindow: () => ({ webContents: sender })
  });
  try {
    if (tokenError) {
      await assert.rejects(handlers['drive:connect'](event, clientId), /QA rejected/);
      await browserRequest;
      assert.equal(browserResult.status, 400);
      assert.doesNotMatch(browserResult.text, /<h1>Drive conectado/);
      assert.equal(handlers['drive:status'](event).connected, false);
    } else {
      await handlers['drive:connect'](event, clientId);
      await browserRequest;
      assert.equal(browserResult.status, 200);
      assert.equal(handlers['drive:status'](event).connected, true);
      const result = await handlers['drive:upload-note'](event, { name: 'Joselito-2-sept-26.pdf', noteId: 'qa-id', period: { year: 2026, month: 9, day: 2 }, data: pdf });
      assert.equal(result.uploaded, true);
      assert.deepEqual(uploaded, pdf);
      const realNow = Date.now;
      try {
        const future = realNow() + 7200000;
        Date.now = () => future;
        await handlers['drive:upload-note'](event, { name: 'Joselito-2-sept-26.pdf', noteId: 'qa-id', period: { year: 2026, month: 9, day: 2 }, data: pdf });
        assert.equal(refreshes, 1);
      } finally { Date.now = realNow; }
      await assert.rejects(handlers['drive:upload-note']({ sender: {} }, {}), /no autorizada/);
      const input = { name: 'Joselito-2-sept-26.pdf', noteId: 'prepared-id', period: { year: 2026, month: 9, day: 2 }, data: new Uint8Array(pdf) };
      const fresh = await handlers['drive:prepare-note'](event, input);
      assert.equal(fresh.existing, null);
      input.data.fill(0); // The privileged process keeps its own immutable bytes.
      assert.equal((await handlers['drive:upload-prepared'](event, { ticket: fresh.ticket })).uploaded, true);
      assert.deepEqual(uploaded, pdf);
      await assert.rejects(handlers['drive:upload-prepared'](event, { ticket: fresh.ticket }), /venció/);
      input.data = new Uint8Array(pdf);
      existingFile = 'pdf-id';
      const conflict = await handlers['drive:prepare-note'](event, input);
      assert.equal(conflict.existing.sameNote, false);
      assert.equal((await handlers['drive:upload-prepared'](event, { ticket: conflict.ticket })).canceled, true);
      const accepted = await handlers['drive:prepare-note'](event, input);
      assert.equal((await handlers['drive:upload-prepared'](event, { ticket: accepted.ticket, replaceApproved: true })).uploaded, true);
      const raced = await handlers['drive:prepare-note'](event, input);
      existingFile = 'different-file';
      await assert.rejects(handlers['drive:upload-prepared'](event, { ticket: raced.ticket, replaceApproved: true }), /cambió/);
      const discarded = await handlers['drive:prepare-note'](event, input);
      await handlers['drive:discard-prepared'](event, discarded.ticket);
      await assert.rejects(handlers['drive:upload-prepared'](event, { ticket: discarded.ticket, replaceApproved: true }), /venció/);
      await assert.rejects(handlers['drive:prepare-note']({ sender: {} }, input), /no autorizada/);

    }
  } finally { global.fetch = originalFetch; fs.rmSync(profile, { recursive: true, force: true }); }
}

test('desktop IPC: OAuth callback, folder, PDF upload and confirmation', () => desktopHarness());
test('desktop OAuth callback does not claim success if token exchange fails', () => desktopHarness(true));

function queueHarness(uploadNote) {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/DriveNotasSync.js'), 'utf8')
    .replace(/import \{ uploadPdf \}[^\n]+\n/, 'const uploadPdf = injectedUploadPdf;\n')
    .replace(/export /g, '') + '\nthis.api = { estadoDrive, encolarNotaDrive, sincronizarNotasDrive, refreshDriveStatus, responderReemplazoDrive, agruparRespaldoDrive, conservarReemplazosDrive };';
  const context = vm.createContext({
    injectedUploadPdf: uploadPdf, process: { env: {} }, indexedDB: new IDBFactory(),
    Uint8Array, TextDecoder, URL, URLSearchParams, AbortSignal, setTimeout,
    localStorage: { getItem: () => null }, navigator: { onLine: false },
    window: { crypto, desktop: { drive: { status: async () => ({ connected: true, folderName: 'Embarques' }), uploadNote } } }
  });
  vm.runInContext(source, context);
  return context;
}
const note = { id: 'shipment-client', name: 'Joselito-2-sept-26.pdf', period: { year: 2026, month: 9, day: 2 }, data: new Uint8Array(pdf) };

test('queue keeps failed/unconfirmed PDFs and removes them only after verified retry', async () => {
  let result = 'offline';
  const ctx = queueHarness(async () => { if (result === 'offline') throw new Error('Network unavailable'); return result; });
  await ctx.api.encolarNotaDrive(note);
  ctx.navigator.onLine = true;
  await ctx.api.sincronizarNotasDrive();
  assert.equal(ctx.api.estadoDrive.pending, 1);
  assert.match(ctx.api.estadoDrive.error, /Network/);
  result = {};
  await ctx.api.sincronizarNotasDrive();
  assert.equal(ctx.api.estadoDrive.pending, 1);
  result = { uploaded: true, fileId: 'confirmed' };
  await ctx.api.sincronizarNotasDrive();
  assert.equal(ctx.api.estadoDrive.pending, 0);
  assert.equal(ctx.api.estadoDrive.uploaded, 1);
});

test('an in-flight upload never deletes a newer PDF for the same client', async () => {
  let release;
  let start;
  const began = new Promise(resolve => { start = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const seen = [];
  const ctx = queueHarness(async item => {
    seen.push(item.data.length);
    if (seen.length === 1) { start(); await gate; }
    return { uploaded: true, fileId: 'confirmed' };
  });
  await ctx.api.encolarNotaDrive(note);
  ctx.navigator.onLine = true;
  const uploading = ctx.api.sincronizarNotasDrive();
  await began;
  await ctx.api.encolarNotaDrive({ ...note, data: new Uint8Array(Buffer.concat([pdf, Buffer.from('\nnew revision')])) });
  release();
  await uploading;
  assert.deepEqual(seen, [pdf.length, pdf.length + 13]);
  assert.equal(ctx.api.estadoDrive.pending, 0);
});

test('web: Google authorization, folder selection, failed upload retained and verified retry', async () => {
  const storage = new Map();
  let fail = true;
  let uploads = 0;
  let existing = false;
  let replace = false;
  const confirmations = [];
  const source = fs.readFileSync(path.join(__dirname, '../src/services/DriveNotasSync.js'), 'utf8')
    .replace(/import \{ uploadPdf \}[^\n]+\n/, 'const uploadPdf = injectedUploadPdf;\n')
    .replace(/export /g, '') + '\nthis.api = { estadoDrive, encolarNotaDrive, conectarGoogleDrive, sincronizarNotasDrive, responderReemplazoDrive, agruparRespaldoDrive };';
  class DocsView { setIncludeFolders() { return this; } setSelectFolderEnabled() { return this; } }
  class PickerBuilder {
    setDeveloperKey() { return this; } setAppId() { return this; } setOAuthToken() { return this; }
    setTitle() { return this; } addView() { return this; } setCallback(cb) { this.cb = cb; return this; }
    build() { return this; } setVisible() { this.cb({ action: 'picked', docs: [{ id: 'root' }] }); }
  }
  const ctx = vm.createContext({
    injectedUploadPdf: uploadPdf, process: { env: { VUE_APP_GOOGLE_PICKER_API_KEY: 'qa-key' } }, indexedDB: new IDBFactory(),
    Uint8Array, TextDecoder, URL, URLSearchParams, AbortSignal, setTimeout,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) }, navigator: { onLine: false },
    window: { crypto, confirm: message => { confirmations.push(message); return replace; }, google: {
      accounts: { oauth2: { initTokenClient: options => ({ ...options, requestAccessToken() { this.callback({ access_token: 'qa-token', expires_in: 3600 }); } }) } },
      picker: { DocsView, ViewId: { FOLDERS: 'folders' }, PickerBuilder, Action: { PICKED: 'picked', CANCEL: 'cancel' } }
    } },
    fetch: async (url, options = {}) => {
      if (url.includes('/files/root?')) return json({ id: 'root', name: 'Embarques', mimeType: 'application/vnd.google-apps.folder', capabilities: { canAddChildren: true } });
      if (url.includes('/upload/drive/v3/files')) return json({}, 200, { location: 'https://www.googleapis.com/upload/session/qa' });
      if (url.includes('/upload/session/')) { if (fail) throw new Error('QA network lost'); uploads++; return json({ id: 'stored' }); }
      if (url.includes('/files/stored?')) return json({ id: 'stored', mimeType: 'application/pdf', size: String(pdf.length) });
      if (options.method === 'POST') return json({ id: 'child' });
      const q = new URL(url).searchParams.get('q') || '';
      if (existing && (q.includes(note.name) || q.includes('another.pdf')) && q.includes('name =') && !q.includes('mimeType')) return json({ files: [{ id: 'stored', name: note.name }] });
      return json({ files: [] });
    }
  });
  vm.runInContext(source, ctx);
  await ctx.api.encolarNotaDrive(note);
  ctx.navigator.onLine = true;
  await ctx.api.conectarGoogleDrive();
  assert.equal(ctx.api.estadoDrive.connected, true);
  assert.equal(ctx.api.estadoDrive.pending, 1);
  assert.match(ctx.api.estadoDrive.error, /network lost/);
  fail = false;
  await ctx.api.sincronizarNotasDrive();
  assert.equal(uploads, 1);
  assert.equal(ctx.api.estadoDrive.pending, 0);
  existing = true;
  ctx.navigator.onLine = false;
  await ctx.api.encolarNotaDrive(note);
  await ctx.api.encolarNotaDrive({ ...note, id: 'another', name: 'another.pdf' });
  await ctx.api.encolarNotaDrive({ ...note, id: 'taras', name: 'Resumen-Taras.pdf' });
  ctx.navigator.onLine = true;
  const declined = ctx.api.sincronizarNotasDrive();
  for (let i = 0; !ctx.api.estadoDrive.replacementRequest && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(ctx.api.estadoDrive.replacementRequest.length, 2, 'one dialog lists both conflicts');
  ctx.api.responderReemplazoDrive(false);
  await declined;
  assert.equal(uploads, 2, 'new taras uploads even when replacements are declined');
  assert.equal(ctx.api.estadoDrive.pending, 2);
  await ctx.api.sincronizarNotasDrive();
  assert.equal(ctx.api.estadoDrive.replacementRequest, null, 'focus/online retry never repeats a declined prompt');
  const accepted = ctx.api.sincronizarNotasDrive({ interactive: true });
  for (let i = 0; !ctx.api.estadoDrive.replacementRequest && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(ctx.api.estadoDrive.replacementRequest.length, 2);
  ctx.api.responderReemplazoDrive(true);
  await accepted;
  assert.equal(uploads, 4, 'one acceptance replaces both files');
  assert.equal(ctx.api.estadoDrive.pending, 0);
});

test('desktop batch: one styled confirmation covers all conflicts, declined files do not block new reports', async () => {
  const ctx = queueHarness(() => { throw new Error('Legacy native dialog must not be called'); });
  const sent = [], discarded = [];
  ctx.window.desktop.drive.prepareNote = async input => ({ ticket: input.name, existing: input.name.startsWith('existing') ? { id: input.name, sameNote: false } : null });
  ctx.window.desktop.drive.uploadPrepared = async input => { sent.push(input); return { uploaded: true, fileId: input.ticket }; };
  ctx.window.desktop.drive.discardPrepared = async ticket => discarded.push(ticket);
  for (const name of ['existing-summary.pdf', 'existing-note.pdf', 'Resumen-Taras.pdf', 'Rendimientos.pdf']) await ctx.api.encolarNotaDrive({ ...note, id: name, name });
  ctx.navigator.onLine = true;
  const syncing = ctx.api.sincronizarNotasDrive();
  for (let i = 0; !ctx.api.estadoDrive.replacementRequest && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(ctx.api.estadoDrive.replacementRequest.length, 2);
  ctx.api.responderReemplazoDrive(false);
  await syncing;
  assert.deepEqual(sent.map(item => item.ticket).sort(), ['Rendimientos.pdf', 'Resumen-Taras.pdf']);
  assert.equal(discarded.length, 2);
  await ctx.api.sincronizarNotasDrive();
  assert.equal(ctx.api.estadoDrive.replacementRequest, null);
  assert.equal(ctx.api.estadoDrive.pending, 2);
  const retry = ctx.api.sincronizarNotasDrive({ interactive: true });
  for (let i = 0; !ctx.api.estadoDrive.replacementRequest && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 2));
  ctx.api.responderReemplazoDrive(true);
  await retry;
  assert.equal(sent.length, 4);
  assert.ok(sent.slice(2).every(input => input.replaceApproved));
  assert.equal(ctx.api.estadoDrive.pending, 0);
});

async function storedPdfs(ctx) {
  return new Promise((resolve, reject) => {
    const open = ctx.indexedDB.open('ReyPezDriveNotasDB', 1);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('notasPendientes', 'readonly');
      const read = tx.objectStore('notasPendientes').getAll();
      tx.oncomplete = () => { db.close(); resolve(read.result); };
      tx.onerror = () => reject(tx.error);
    };
    open.onerror = () => reject(open.error);
  });
}

test('keeping existing Drive PDFs retires conflicts, retains bytes and still uploads new reports', async () => {
  const ctx = queueHarness(() => { throw new Error('Legacy upload'); });
  const sent = [];
  ctx.window.desktop.drive.prepareNote = async input => ({
    ticket: input.name, existing: input.name === note.name ? { id: 'old', sameNote: false } : null
  });
  ctx.window.desktop.drive.uploadPrepared = async input => { sent.push(input.ticket); return { uploaded: true, fileId: input.ticket }; };
  ctx.window.desktop.drive.discardPrepared = async () => {};
  await ctx.api.encolarNotaDrive(note);
  await ctx.api.encolarNotaDrive({ ...note, id: 'new', name: 'Taras.pdf' });
  ctx.navigator.onLine = true;
  const syncing = ctx.api.sincronizarNotasDrive();
  for (let i = 0; !ctx.api.estadoDrive.replacementRequest && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.ok(ctx.api.estadoDrive.replacementRequest);
  ctx.api.responderReemplazoDrive('keep');
  await syncing;
  assert.deepEqual(sent, ['Taras.pdf']);
  assert.equal(ctx.api.estadoDrive.pending, 0);
  const stored = await storedPdfs(ctx);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].keptExisting, true);
  assert.deepEqual(stored[0].data, note.data);
  await ctx.api.sincronizarNotasDrive({ interactive: true });
  assert.equal(ctx.api.estadoDrive.replacementRequest, null);
  assert.deepEqual(sent, ['Taras.pdf']);
  ctx.navigator.onLine = false;
  await ctx.api.encolarNotaDrive(note);
  assert.equal(ctx.api.estadoDrive.pending, 1, 'regenerated PDF must be pending again');
});

test('clear deferred replacements offline preserves new pending PDFs and survives status refresh', async () => {
  const ctx = queueHarness(() => {});
  ctx.window.desktop.drive.prepareNote = async () => ({ ticket: 'old', existing: { id: 'old', sameNote: false } });
  ctx.window.desktop.drive.discardPrepared = async () => {};
  await ctx.api.encolarNotaDrive(note);
  ctx.navigator.onLine = true;
  const syncing = ctx.api.sincronizarNotasDrive();
  for (let i = 0; !ctx.api.estadoDrive.replacementRequest && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 2));
  ctx.api.responderReemplazoDrive(false);
  await syncing;
  ctx.navigator.onLine = false;
  await ctx.api.encolarNotaDrive({ ...note, id: 'new', name: 'Rendimientos.pdf' });
  assert.equal(await ctx.api.conservarReemplazosDrive(), 1);
  await ctx.api.refreshDriveStatus();
  assert.equal(ctx.api.estadoDrive.pending, 1);
  assert.equal(ctx.api.estadoDrive.pendingFiles[0].name, 'Rendimientos.pdf');
  const stored = await storedPdfs(ctx);
  assert.equal(stored.length, 2);
  assert.deepEqual(stored.find(item => item.id === note.id).data, note.data);
  assert.equal(stored.find(item => item.id === 'new').keptExisting, false);
  assert.equal(await ctx.api.conservarReemplazosDrive(), 0);
});
