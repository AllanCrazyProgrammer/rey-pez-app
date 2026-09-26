const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function initGoogleDrive({ app, shell, dialog, ipcMain, safeStorage, getMainWindow }) {
  const tokenPath = path.join(app.getPath('userData'), 'google-drive-auth.dat');
  let auth = null;

  function assertSender(event) {
    const win = getMainWindow();
    if (!win || event.sender !== win.webContents || event.senderFrame !== event.sender.mainFrame) {
      throw new Error('Solicitud de Google Drive no autorizada.');
    }
    return win;
  }

  function loadAuth() {
    if (auth) return auth;
    if (!fs.existsSync(tokenPath) || !safeStorage.isEncryptionAvailable()) return null;
    try {
      auth = JSON.parse(safeStorage.decryptString(fs.readFileSync(tokenPath)));
      return auth;
    } catch (_) {
      return null;
    }
  }

  function saveAuth(value) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('El almacén seguro de este equipo no está disponible.');
    }
    fs.writeFileSync(tokenPath, safeStorage.encryptString(JSON.stringify(value)), { mode: 0o600 });
    auth = value;
  }

  function clearAuth() {
    auth = null;
    try { fs.unlinkSync(tokenPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }

  async function postToken(body) {
    const response = await fetch(TOKEN_URL, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body), signal: AbortSignal.timeout(30000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error_description || data.error || 'Google no pudo autorizar la conexión.');
    return data;
  }

  async function accessToken() {
    const saved = loadAuth();
    if (!saved?.refreshToken) throw new Error('Conecta Google Drive para subir las notas.');
    if (saved.accessToken && saved.expiresAt > Date.now() + 60000) return saved.accessToken;
    const data = await postToken({
      client_id: saved.clientId,
      refresh_token: saved.refreshToken,
      grant_type: 'refresh_token'
    });
    saved.accessToken = data.access_token;
    saved.expiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
    saveAuth(saved);
    return saved.accessToken;
  }

  async function driveRequest(url, options = {}, allowRetry = true) {
    const token = await accessToken();
    const response = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), authorization: `Bearer ${token}` },
      signal: options.signal || AbortSignal.timeout(45000)
    });
    if (response.status === 401 && allowRetry) {
      const saved = loadAuth();
      if (saved) { saved.expiresAt = 0; saveAuth(saved); }
      return driveRequest(url, options, false);
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Google Drive respondió ${response.status}.`);
    }
    return response;
  }

  async function connect(clientId) {
    const normalizedClientId = String(clientId || '').trim();
    if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(normalizedClientId)) {
      throw new Error('Pega el ID de cliente OAuth de tipo Aplicación de escritorio.');
    }
    if (!safeStorage.isEncryptionAvailable()) throw new Error('El almacén seguro de este equipo no está disponible.');

    const verifier = crypto.randomBytes(48).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const state = crypto.randomBytes(24).toString('hex');
    const server = http.createServer();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

    try {
      const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authorizationUrl.search = new URLSearchParams({
        client_id: normalizedClientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: DRIVE_SCOPE,
        access_type: 'offline',
        prompt: 'consent',
        trigger_onepick: 'true',
        allow_folder_selection: 'true',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256'
      }).toString();

      const callback = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Se agotó el tiempo para conectar Google Drive.')), 5 * 60 * 1000);
        server.on('request', (req, res) => {
          const url = new URL(req.url, redirectUri);
          if (url.pathname !== '/oauth2callback') { res.writeHead(404).end(); return; }
          if (url.searchParams.get('state') !== state) {
            res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }).end('No se pudo validar esta autorización. Cierra esta ventana.');
            clearTimeout(timer); reject(new Error('La respuesta de Google no coincide con esta solicitud.')); return;
          }
          if (url.searchParams.has('error')) {
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end('<p>Puedes regresar a ReyPez.</p>');
            clearTimeout(timer); reject(new Error('Se canceló la conexión con Google Drive.')); return;
          }
          const code = url.searchParams.get('code');
          const folderId = (url.searchParams.get('picked_file_ids') || '').split(',')[0];
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end('<!doctype html><meta charset="utf-8"><title>ReyPez</title><p>Google Drive quedó conectado. Ya puedes cerrar esta pestaña y regresar a ReyPez.</p>');
          clearTimeout(timer);
          if (!code || !folderId) reject(new Error('Selecciona la carpeta compartida de Embarques en Google Drive.'));
          else resolve({ code, folderId });
        });
      });

      await shell.openExternal(authorizationUrl.toString());
      const { code, folderId } = await callback;
      const tokenData = await postToken({
        client_id: normalizedClientId,
        code,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      });
      const token = tokenData.access_token;
      const fileResponse = await fetch(`${DRIVE_API}/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`, {
        headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000)
      });
      const folder = await fileResponse.json().catch(() => ({}));
      if (!fileResponse.ok) throw new Error(folder.error?.message || 'No se pudo abrir la carpeta seleccionada. Compártela con permiso de editor.');
      if (folder.mimeType !== 'application/vnd.google-apps.folder' || folder.capabilities?.canAddChildren === false) {
        throw new Error('Elige una carpeta compartida donde tu cuenta pueda agregar archivos.');
      }
      const previousAuth = loadAuth();
      saveAuth({
        clientId: normalizedClientId,
        refreshToken: tokenData.refresh_token || (previousAuth?.clientId === normalizedClientId ? previousAuth.refreshToken : null),
        accessToken: token,
        expiresAt: Date.now() + (Number(tokenData.expires_in) || 3600) * 1000,
        folderId: folder.id,
        folderName: folder.name
      });
      if (!loadAuth().refreshToken) {
        clearAuth();
        throw new Error('Google no entregó una autorización persistente. Intenta conectar de nuevo.');
      }
      return { connected: true, folderName: folder.name };
    } finally {
      server.close();
    }
  }

  async function findChildFolder(parentId, name) {
    const params = new URLSearchParams({
      q: `'${parentId.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' in parents and name = '${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id,name)', pageSize: '100', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true'
    });
    const response = await driveRequest(`${DRIVE_API}/files?${params}`);
    const data = await response.json();
    return data.files?.[0] || null;
  }

  async function ensureFolder(parentId, name) {
    const found = await findChildFolder(parentId, name);
    if (found) return found.id;
    const response = await driveRequest(`${DRIVE_API}/files?supportsAllDrives=true&fields=id,name`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
    });
    return (await response.json()).id;
  }

  async function findNote(parentId, name, noteId) {
    const escapedParent = parentId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const escapedNote = noteId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const appParams = new URLSearchParams({
      q: `'${escapedParent}' in parents and appProperties has { key='reyPezNoteId' and value='${escapedNote}' } and trashed = false`,
      fields: 'files(id,name)', pageSize: '10', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true'
    });
    let response = await driveRequest(`${DRIVE_API}/files?${appParams}`);
    let data = await response.json();
    if (data.files?.length) return { ...data.files[0], sameNote: true };

    const nameParams = new URLSearchParams({
      q: `'${escapedParent}' in parents and name = '${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' and trashed = false`,
      fields: 'files(id,name)', pageSize: '10', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true'
    });
    response = await driveRequest(`${DRIVE_API}/files?${nameParams}`);
    data = await response.json();
    return data.files?.[0] || null;
  }

  async function uploadMedia({ fileId, parentId, name, noteId, bytes }) {
    const endpoint = fileId
      ? `${DRIVE_API}/files/${encodeURIComponent(fileId)}?uploadType=resumable&supportsAllDrives=true`
      : `${DRIVE_API}/files?uploadType=resumable&supportsAllDrives=true`;
    const start = await driveRequest(endpoint, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': 'application/pdf',
        'x-upload-content-length': String(bytes.byteLength)
      },
      body: JSON.stringify({ name, ...(fileId ? {} : { parents: [parentId] }), appProperties: { reyPezNoteId: noteId } })
    });
    const uploadUrl = start.headers.get('location');
    if (!uploadUrl) throw new Error('Google Drive no inició la carga del PDF.');
    const complete = await driveRequest(uploadUrl, {
      method: 'PUT', headers: { 'content-type': 'application/pdf', 'content-length': String(bytes.byteLength) }, body: Buffer.from(bytes)
    });
    return complete.json();
  }

  async function uploadNote(event, input = {}) {
    const win = assertSender(event);
    const saved = loadAuth();
    if (!saved?.folderId) throw new Error('Conecta Google Drive y selecciona la carpeta compartida.');
    const { name, noteId, period, data } = input;
    if (!/^[a-zA-Z0-9._-]+\.pdf$/i.test(name || '') || !/^[a-zA-Z0-9._:-]{1,200}$/.test(noteId || '') ||
        !Number.isInteger(period?.year) || !Number.isInteger(period?.month) || !Number.isInteger(period?.day) ||
        !(data instanceof Uint8Array) || data.byteLength < 5 || data.byteLength > 25 * 1024 * 1024 || Buffer.from(data).subarray(0, 5).toString() !== '%PDF-') {
      throw new Error('La nota pendiente no tiene datos válidos.');
    }
    let parentId = saved.folderId;
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    for (const segment of [String(period.year), monthNames[period.month - 1], String(period.day)]) {
      if (!segment || segment === 'undefined') throw new Error('La fecha de la nota no es válida.');
      parentId = await ensureFolder(parentId, segment);
    }
    const existing = await findNote(parentId, name, noteId);
    let fileId = existing?.id || null;
    if (existing && !existing.sameNote) {
      const { response } = await dialog.showMessageBox(win, {
        type: 'question', title: 'Reemplazar nota en Google Drive',
        message: `Ya existe ${name} en la carpeta compartida. ¿Quieres reemplazarla?`,
        buttons: ['Cancelar', 'Reemplazar'], defaultId: 0, cancelId: 0, noLink: true
      });
      if (response !== 1) return { canceled: true };
    }
    const result = await uploadMedia({ fileId, parentId, name, noteId, bytes: data });
    return { uploaded: true, fileId: result.id, folderName: saved.folderName };
  }

  ipcMain.handle('drive:status', event => {
    assertSender(event);
    const saved = loadAuth();
    return { connected: Boolean(saved?.refreshToken && saved?.folderId), folderName: saved?.folderName || '' };
  });
  ipcMain.handle('drive:connect', async (event, clientId) => { assertSender(event); return connect(clientId); });
  ipcMain.handle('drive:disconnect', event => { assertSender(event); clearAuth(); return { connected: false }; });
  ipcMain.handle('drive:upload-note', (event, input) => uploadNote(event, input));
}

module.exports = { initGoogleDrive };
