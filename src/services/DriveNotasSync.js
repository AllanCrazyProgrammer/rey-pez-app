import { uploadPdf } from '../../electron/driveUpload';
const DB_NAME = 'ReyPezDriveNotasDB';
const STORE = 'notasPendientes';
const WEB_CLIENT_ID = process.env.VUE_APP_GOOGLE_DRIVE_WEB_CLIENT_ID || '512757841511-a0r0kosltjrihl9vl0bgn7hqvuanhk7h.apps.googleusercontent.com';
const PICKER_API_KEY = process.env.VUE_APP_GOOGLE_PICKER_API_KEY || '';
const GOOGLE_PROJECT_NUMBER = process.env.VUE_APP_GOOGLE_CLOUD_PROJECT_NUMBER || '512757841511';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const FOLDER_KEY = 'reypez.googleDrive.web.folder';
const isDesktop = () => Boolean(window.desktop?.drive);
const isWebConfigured = () => !isDesktop() && Boolean(WEB_CLIENT_ID && PICKER_API_KEY);
const dbRequest = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

function transaction(action, mode, operation) {
  return dbRequest().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = operation(tx.objectStore(STORE));
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || new Error(`No se pudo ${action} la cola de Drive.`)); };
  }));
}

export const estadoDrive = { pending: 0, syncing: false, connected: false, folderName: '', error: '', needsAuth: false, folderId: '', uploaded: 0, lastUploadedName: '' };
let started = false;
let access = null;
let tokenClient = null;
let gisPromise;
let pickerPromise;

export function driveNotasDisponible() { return isDesktop() || Boolean(WEB_CLIENT_ID); }
export function drivePickerConfigurado() { return isDesktop() || isWebConfigured(); }
async function readQueue() { return transaction('leer', 'readonly', store => store.getAll()); }
async function updatePendingCount() {
  try { estadoDrive.pending = (await readQueue()).length; }
  catch (error) { estadoDrive.error = error.message; }
}
function savedFolder() {
  try { return JSON.parse(localStorage.getItem(FOLDER_KEY) || 'null'); }
  catch (_) { return null; }
}

export async function refreshDriveStatus() {
  if (isDesktop()) {
    try {
      const status = await window.desktop.drive.status();
      estadoDrive.connected = status.connected;
      estadoDrive.folderName = status.folderName || '';
      estadoDrive.folderId = status.folderId || '';
      estadoDrive.needsAuth = Boolean(status.needsAuth);
    } catch (error) { estadoDrive.error = error.message; }
  } else if (isWebConfigured()) {
    const folder = savedFolder();
    estadoDrive.connected = Boolean(folder?.id);
    estadoDrive.folderName = folder?.name || '';
    estadoDrive.folderId = folder?.id || '';
    estadoDrive.needsAuth = Boolean(folder?.id && (!access || access.expiresAt < Date.now() + 30000));
  }
  await updatePendingCount();
}

function loadScript(src, test, promiseRef) {
  if (test()) return Promise.resolve();
  if (promiseRef.value) return promiseRef.value;
  promiseRef.value = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    const script = existing || document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { promiseRef.value = null; reject(new Error('No se pudo cargar la conexión segura de Google.')); };
    if (!existing) document.head.appendChild(script);
  });
  return promiseRef.value;
}
async function loadGIS() {
  await loadScript('https://accounts.google.com/gsi/client', () => Boolean(window.google?.accounts?.oauth2), { get value() { return gisPromise; }, set value(v) { gisPromise = v; } });
  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: WEB_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: () => {},
      error_callback: error => { estadoDrive.error = error?.message || 'Google canceló la autorización.'; }
    });
  }
}
function requestToken(prompt = '') {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGIS();
      tokenClient.callback = response => {
        if (response.error) { reject(new Error(response.error_description || 'No se pudo autorizar Google Drive.')); return; }
        access = { token: response.access_token, expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000 };
        estadoDrive.needsAuth = false;
        resolve(access.token);
      };
      tokenClient.error_callback = error => reject(new Error(error?.message || 'Google canceló la autorización.'));
      tokenClient.requestAccessToken({ prompt });
    } catch (error) { reject(error); }
  });
}
async function loadPicker() {
  if (!PICKER_API_KEY) throw new Error('Falta configurar la clave restringida de Google Picker para la web.');
  if (window.google?.picker?.PickerBuilder) return;
  if (!pickerPromise) pickerPromise = loadScript('https://apis.google.com/js/api.js', () => Boolean(window.gapi), { get value() { return pickerPromise; }, set value(v) { pickerPromise = v; } }).then(() => new Promise((resolve, reject) => {
    window.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('No se pudo cargar el selector de carpetas de Google.')) });
  }));
  await pickerPromise;
}
function chooseFolder(token) {
  return loadPicker().then(() => new Promise((resolve, reject) => {
    const folders = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true).setSelectFolderEnabled(true);
    const picker = new window.google.picker.PickerBuilder()
      .setDeveloperKey(PICKER_API_KEY)
      .setAppId(GOOGLE_PROJECT_NUMBER)
      .setOAuthToken(token)
      .setTitle('Selecciona la carpeta compartida “Embarques”')
      .addView(folders)
      .setCallback(data => {
        if (data.action === window.google.picker.Action.PICKED) resolve(data.docs[0]);
        else if (data.action === window.google.picker.Action.CANCEL) reject(new Error('No se seleccionó una carpeta de Drive.'));
      }).build();
    picker.setVisible(true);
  }));
}
async function driveRequest(url, options = {}) {
  if (!access || access.expiresAt < Date.now() + 30000) throw new Error('Autoriza Google Drive para continuar con la subida.');
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(45000), headers: { ...(options.headers || {}), authorization: `Bearer ${access.token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) { access = null; estadoDrive.needsAuth = true; }
    throw new Error(body.error?.message || `Google Drive respondió ${response.status}.`);
  }
  return response;
}
function escapeQuery(value) { return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
async function findChildFolder(parentId, name) {
  const q = `'${escapeQuery(parentId)}' in parents and name = '${escapeQuery(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const params = new URLSearchParams({ q, fields: 'files(id,name)', pageSize: '100', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
  const response = await driveRequest(`${DRIVE_API}/files?${params}`);
  return (await response.json()).files?.[0] || null;
}
async function ensureFolder(parentId, name) {
  const found = await findChildFolder(parentId, name);
  if (found) return found.id;
  const response = await driveRequest(`${DRIVE_API}/files?supportsAllDrives=true&fields=id`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
  });
  return (await response.json()).id;
}
async function findExisting(parentId, name, noteId) {
  const base = `'${escapeQuery(parentId)}' in parents and trashed = false`;
  const byId = new URLSearchParams({ q: `${base} and appProperties has { key='reyPezNoteId' and value='${escapeQuery(noteId)}' }`, fields: 'files(id,name)', pageSize: '10', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
  let response = await driveRequest(`${DRIVE_API}/files?${byId}`);
  let files = (await response.json()).files || [];
  if (files.length) return { ...files[0], sameNote: true };
  const byName = new URLSearchParams({ q: `${base} and name = '${escapeQuery(name)}'`, fields: 'files(id,name)', pageSize: '10', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' });
  response = await driveRequest(`${DRIVE_API}/files?${byName}`);
  files = (await response.json()).files || [];
  return files[0] || null;
}
async function uploadWebNote(note) {
  if (!/\.pdf$/i.test(note.name || '') || !(note.data instanceof Uint8Array) || note.data.byteLength < 5 || note.data.byteLength > 25 * 1024 * 1024) throw new Error('La nota pendiente no tiene un PDF válido.');
  const folder = savedFolder();
  if (!folder?.id) throw new Error('Conecta Google Drive y selecciona la carpeta compartida.');
  if (new TextDecoder().decode(note.data.slice(0, 5)) !== '%PDF-') throw new Error('La nota pendiente no parece ser un PDF válido.');
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  let parentId = folder.id;
  for (const name of [String(note.period.year), months[note.period.month - 1], String(note.period.day)]) {
    if (!name || name === 'undefined') throw new Error('La fecha de la nota no es válida.');
    parentId = await ensureFolder(parentId, name);
  }
  const existing = await findExisting(parentId, note.name, note.uploadId);
  let fileId = null;
  if (existing && !existing.sameNote) {
    if (!window.confirm(`Ya existe ${note.name} en Google Drive. ¿Quieres reemplazarla?`)) return { canceled: true };
    fileId = existing.id;
  } else if (existing?.id) fileId = existing.id;
  const result = await uploadPdf(driveRequest, { fileId, parentId, name: note.name, noteId: note.uploadId, bytes: note.data });
  return { uploaded: true, fileId: result.id };
}

export async function sincronizarNotasDrive({ interactive = false } = {}) {
  if (estadoDrive.syncing || !navigator.onLine || (!isDesktop() && !isWebConfigured())) return;
  estadoDrive.syncing = true;
  estadoDrive.error = '';
  try {
    await refreshDriveStatus();
    if (!estadoDrive.connected) {
      if (interactive) estadoDrive.error = 'Conecta Google Drive y elige la carpeta para subir las notas pendientes.';
      return;
    }
    if (isDesktop() && estadoDrive.needsAuth) { estadoDrive.error = 'La autorización de Google venció. Pulsa Reconectar para continuar.'; return; }
    if (isDesktop()) {
      let canceled = false;
      while (!canceled) {
        const queue = await readQueue();
        if (!queue.length) break;
        for (const note of queue) {
          try {
            const result = await window.desktop.drive.uploadNote({ name: note.name, noteId: note.uploadId, period: note.period, data: note.data });
            if (result?.canceled) { estadoDrive.error = 'Se canceló la carga de la nota existente.'; canceled = true; break; }
            if (!result?.uploaded || !result.fileId) throw new Error('Drive no confirmó la subida. La nota sigue pendiente.');
            await acknowledgeNote(note);
            estadoDrive.uploaded += 1;
            estadoDrive.lastUploadedName = note.name;
            await updatePendingCount();
          } catch (error) { estadoDrive.error = error.message || 'No se pudo subir una nota a Google Drive.'; canceled = true; break; }
        }
      }
    } else {
      if (!access || access.expiresAt < Date.now() + 30000) {
        estadoDrive.needsAuth = true;
        if (!interactive) return;
        await requestToken('');
      }
      for (const note of await readQueue()) {
        try {
          const result = await uploadWebNote(note);
          if (result?.canceled) { estadoDrive.error = 'Se canceló la carga de la nota existente.'; break; }
          if (!result?.uploaded || !result.fileId) throw new Error('Drive no confirmó la subida. La nota sigue pendiente.');
          await acknowledgeNote(note);
          estadoDrive.uploaded += 1;
          estadoDrive.lastUploadedName = note.name;
        } catch (error) { estadoDrive.error = error.message || 'No se pudo subir una nota a Google Drive.'; break; }
      }
    }
  } catch (error) { estadoDrive.error = error.message || 'No se pudieron revisar las notas pendientes.'; }
  finally {
    await refreshDriveStatus();
    estadoDrive.syncing = false;
    if (estadoDrive.connected && !estadoDrive.needsAuth && estadoDrive.pending && !estadoDrive.error && navigator.onLine) setTimeout(sincronizarNotasDrive, 0);
  }
}


// An upload acknowledgement must not delete a newer PDF generated during upload.
async function acknowledgeNote(note) {
  const db = await dbRequest();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const read = store.get(note.id);
    read.onsuccess = () => { if (read.result?.uploadId === note.uploadId) store.delete(note.id); };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || new Error('No se pudo confirmar la cola de Drive.')); };
  });
}

export async function encolarNotaDrive(note) {
  await transaction('guardar', 'readwrite', store => store.put({ ...note, uploadId: window.crypto.randomUUID() }));
  await updatePendingCount();
  void sincronizarNotasDrive();
}

export async function conectarGoogleDrive(clientId, { changeFolder = false } = {}) {
  estadoDrive.error = '';
  if (isDesktop()) {
    const result = await window.desktop.drive.connect(clientId);
    estadoDrive.connected = result.connected;
    estadoDrive.folderName = result.folderName || '';
    await refreshDriveStatus();
    await sincronizarNotasDrive();
    return;
  }
  if (!isWebConfigured()) throw new Error('Falta configurar el cliente OAuth y la clave segura del selector de carpetas para la web.');
  const existingFolder = savedFolder();
  const token = await requestToken(existingFolder?.id ? '' : 'consent');
  if (existingFolder?.id && !changeFolder) {
    estadoDrive.connected = true;
    estadoDrive.folderName = existingFolder.name || '';
    await sincronizarNotasDrive();
    return;
  }
  const picked = await chooseFolder(token);
  if (!picked?.id) throw new Error('Selecciona una carpeta compartida de Google Drive.');
  const folder = await driveRequest(`${DRIVE_API}/files/${encodeURIComponent(picked.id)}?fields=id,name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`);
  const info = await folder.json();
  if (info.mimeType !== 'application/vnd.google-apps.folder' || info.capabilities?.canAddChildren === false) throw new Error('Elige una carpeta compartida donde tu cuenta pueda agregar archivos.');
  localStorage.setItem(FOLDER_KEY, JSON.stringify({ id: info.id, name: info.name }));
  estadoDrive.connected = true;
  estadoDrive.folderName = info.name;
  estadoDrive.folderId = info.id;
  estadoDrive.needsAuth = false;
  await sincronizarNotasDrive();
}

export async function desconectarGoogleDrive() {
  if (isDesktop()) await window.desktop.drive.disconnect();
  else {
    if (access?.token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(access.token, () => {});
    access = null;
    localStorage.removeItem(FOLDER_KEY);
  }
  estadoDrive.connected = false;
  estadoDrive.folderName = '';
  estadoDrive.folderId = '';
  estadoDrive.error = '';
  estadoDrive.needsAuth = false;
}

export function iniciarSincronizacionDrive() {
  if (started) return;
  if (!isDesktop() && !isWebConfigured()) { void updatePendingCount(); return; }
  started = true;
  refreshDriveStatus().then(() => sincronizarNotasDrive());
  window.addEventListener('online', () => sincronizarNotasDrive());
  window.addEventListener('focus', () => sincronizarNotasDrive());
}
