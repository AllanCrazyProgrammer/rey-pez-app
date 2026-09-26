const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// A separate profile supports isolated QA without touching real shipments.
const profile = app.commandLine.getSwitchValue('user-data-dir');
if (profile) {
  fs.mkdirSync(path.resolve(profile), { recursive: true });
  app.setPath('userData', path.resolve(profile));
  app.setPath('sessionData', path.resolve(profile));
}
const devUrl = !app.isPackaged && process.env.ELECTRON_DEV_URL;
const localIndex = path.join(__dirname, '..', 'desktop-dist', 'index.html');
let mainWindow;
let quitting = false;

function isExternal(url) {
  try { return ['https:', 'http:'].includes(new URL(url).protocol); }
  catch (_) { return false; }
}

ipcMain.handle('desktop:save-pdf', async (event, { bytes, filename, notePeriod } = {}) => {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== event.sender.mainFrame) {
    throw new Error('Solicitud de PDF no autorizada.');
  }
  if (!(bytes instanceof Uint8Array) || bytes.length > 100 * 1024 * 1024) {
    throw new Error('Archivo PDF inválido.');
  }
  const buffer = Buffer.from(bytes);
  if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error('Archivo PDF inválido.');
  const safeName = path.basename(String(filename || 'documento.pdf')).replace(/[^a-zA-Z0-9._-]/g, '-');
  let filePath;
  if (notePeriod) {
    const { year, month, day } = notePeriod;
    if (!Number.isInteger(year) || year < 1900 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12 ||
        !Number.isInteger(day) || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) {
      throw new Error('Fecha del embarque inválida.');
    }
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const folder = path.join(app.getPath('documents'), 'embarques', String(year), months[month - 1], String(day));
    await fs.promises.mkdir(folder, { recursive: true });
    const stem = safeName.replace(/\.pdf$/i, '');
    filePath = path.join(folder, `${stem}.pdf`);
    try {
      await fs.promises.writeFile(filePath, buffer, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'question', title: 'Reemplazar nota',
        message: `Ya existe ${stem}.pdf. ¿Quieres reemplazarla?`,
        detail: 'Si la reemplazas, se guardará la nueva nota en lugar de la anterior.',
        buttons: ['Cancelar', 'Reemplazar'], defaultId: 0, cancelId: 0, noLink: true
      });
      if (response !== 1) return { canceled: true };
      await fs.promises.writeFile(filePath, buffer);
    }
  } else {
    const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar PDF para imprimir',
    defaultPath: path.join(app.getPath('downloads'), safeName),
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
  });
    if (result.canceled || !result.filePath) return { canceled: true };
    filePath = result.filePath;
    await fs.promises.writeFile(filePath, buffer);
  }
  const openError = await shell.openPath(filePath);
  if (openError) {
    await dialog.showMessageBox(mainWindow, {
      type: 'warning', message: 'El PDF se guardó, pero no se pudo abrir automáticamente.',
      detail: `Ábrelo desde ${filePath} para imprimirlo.\n${openError}`
    });
  }
  return { canceled: false, filePath };
});

function createMainWindow() {
  const win = new BrowserWindow({
    title: 'ReyPez · Embarques', width: 1280, height: 850, minWidth: 1024, minHeight: 640,
    show: false, backgroundColor: '#123e50',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), contextIsolation: true,
      nodeIntegration: false, sandbox: true
    }
  });
  mainWindow = win;
  let readyToSave = false;
  let closeApproved = false;
  let closeRequest = null;
  let closeTimer;
  const rendererReady = event => {
    if (event.sender === win.webContents) readyToSave = true;
  };
  const saved = (event, result) => {
    if (event.sender !== win.webContents || !closeRequest || result.requestId !== closeRequest) return;
    clearTimeout(closeTimer);
    closeRequest = null;
    if (result.error) {
      quitting = false;
      dialog.showMessageBox(win, { type: 'error', title: 'No se pudo guardar', message: 'La aplicación seguirá abierta para proteger tus cambios.', detail: result.error });
      return;
    }
    closeApproved = true;
    win.close();
  };
  ipcMain.on('desktop:renderer-ready', rendererReady);
  ipcMain.on('desktop:close-ready', saved);
  win.on('close', event => {
    if (closeApproved || !readyToSave) return;
    event.preventDefault();
    if (closeRequest) return;
    closeRequest = String(Date.now());
    win.webContents.send('desktop:prepare-close', closeRequest);
    closeTimer = setTimeout(() => {
      closeRequest = null;
      quitting = false;
      dialog.showMessageBox(win, { type: 'warning', message: 'No se pudo confirmar el guardado local. La ventana seguirá abierta; intenta cerrar de nuevo.' });
    }, 15000);
  });
  win.webContents.on('will-prevent-unload', event => {
    // Only after the editor confirmed its IndexedDB transaction completed.
    if (closeApproved) event.preventDefault();
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      console.error('[desktop] load failed', code, description, url);
      dialog.showErrorBox('No se pudo abrir ReyPez', 'Faltan archivos de la aplicación. Reinstala ReyPez; los datos locales se conservan.');
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) shell.openExternal(url);
    // Local PDF previews can open in a sandboxed window.
    return { action: url.startsWith('blob:') ? 'allow' : 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const permitted = devUrl ? url.startsWith(devUrl + '/') : url.split('#')[0] === pathToFileURL(localIndex).href;
    if (!permitted) {
      event.preventDefault();
      if (isExternal(url)) shell.openExternal(url);
    }
  });
  win.on('closed', () => {
    clearTimeout(closeTimer);
    ipcMain.removeListener('desktop:renderer-ready', rendererReady);
    ipcMain.removeListener('desktop:close-ready', saved);
    mainWindow = null;
    if (quitting) app.quit();
  });
  if (devUrl) win.loadURL(devUrl + '/#/embarques');
  else win.loadFile(localIndex, { hash: '/embarques' });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.on('before-quit', () => { quitting = true; });
  app.whenReady().then(() => {
    createMainWindow();
    app.on('activate', () => { if (!mainWindow) createMainWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
