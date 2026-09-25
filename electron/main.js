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
