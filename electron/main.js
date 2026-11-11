const { app, BrowserWindow, shell, ipcMain, dialog, safeStorage, session, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { initGoogleDrive } = require('./googleDrive');
const { renderHtmlPdf } = require('./printHtml');
const { identificarPeticionesDeAuth } = require('./authReferer');
const { crearActualizador, urlDeActualizaciones } = require('./actualizaciones');

// A separate profile supports isolated QA without touching real shipments.
const profile = app.commandLine.getSwitchValue('user-data-dir');
if (profile) {
  fs.mkdirSync(path.resolve(profile), { recursive: true });
  app.setPath('userData', path.resolve(profile));
  app.setPath('sessionData', path.resolve(profile));
}
const devUrl = !app.isPackaged && process.env.ELECTRON_DEV_URL;
const carpetaIncluida = path.join(__dirname, '..', 'desktop-dist');
let mainWindow;
let quitting = false;
let actualizador = null;
// Paquete de pantallas cargado ahora (el del instalador o uno descargado; ver actualizaciones.js).
let paqueteCargado = { carpeta: carpetaIncluida, version: 'instalador', numero: 0, descargado: false };
let aplicarActualizacion = null;
const ESPERA_ARRANQUE_MS = 60000;
const REVISAR_CADA_MS = 30 * 60 * 1000;
const indexDe = paquete => path.join(paquete.carpeta, 'index.html');
initGoogleDrive({ app, shell, dialog, ipcMain, safeStorage, getMainWindow: () => mainWindow });

function isExternal(url) {
  try { return ['https:', 'http:'].includes(new URL(url).protocol); }
  catch (_) { return false; }
}

async function savePdf(event, { bytes, filename, notePeriod, open = true } = {}) {
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
    await fs.promises.writeFile(filePath, buffer);
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
  const openError = open ? await shell.openPath(filePath) : '';
  if (openError) {
    await dialog.showMessageBox(mainWindow, {
      type: 'warning', message: 'El PDF se guardó, pero no se pudo abrir automáticamente.',
      detail: `Ábrelo desde ${filePath} para imprimirlo.\n${openError}`
    });
  }
  return { canceled: false, filePath };
}
ipcMain.handle('desktop:save-pdf', savePdf);
ipcMain.handle('desktop:print-html', async (event, { html, filename, landscape = false } = {}) => {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== event.sender.mainFrame) {
    throw new Error('Solicitud de impresión no autorizada.');
  }
  const bytes = await renderHtmlPdf(BrowserWindow, html, { landscape, tempPath: app.getPath('temp') });
  return savePdf(event, { bytes: new Uint8Array(bytes), filename });
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
  let recargarTrasGuardar = false;
  let recargando = false;
  let vigilancia = null;
  const cargarPaquete = paquete => {
    paqueteCargado = paquete;
    readyToSave = false;
    clearTimeout(vigilancia);
    // Un paquete descargado que no avisa que arrancó (renderer-ready) se descarta y vuelve el del instalador.
    if (paquete.descargado) vigilancia = setTimeout(() => regresarAlInstalador('no arrancó a tiempo'), ESPERA_ARRANQUE_MS);
    if (devUrl) return win.loadURL(devUrl + '/#/embarques');
    return win.loadFile(indexDe(paquete), { hash: '/embarques' }).catch(() => {});
  };
  const regresarAlInstalador = motivo => {
    if (!paqueteCargado.descargado || win.isDestroyed()) return;
    console.error(`[desktop] el paquete ${paqueteCargado.version} ${motivo}`);
    actualizador.marcarFallida(paqueteCargado.version);
    cargarPaquete(actualizador.paqueteParaCargar());
  };
  const recargarConVersionNueva = () => {
    recargarTrasGuardar = false;
    if (!actualizador.activarLista()) return;
    recargando = true;
    Promise.resolve(cargarPaquete(actualizador.paqueteParaCargar())).finally(() => { recargando = false; });
  };
  aplicarActualizacion = () => {
    if (win.isDestroyed()) return;
    // Mismo guardado que al cerrar la ventana; al confirmarse, se recarga en vez de cerrar.
    if (!readyToSave) return recargarConVersionNueva();
    recargarTrasGuardar = true;
    win.close();
  };
  const rendererReady = event => {
    if (event.sender !== win.webContents) return;
    readyToSave = true;
    clearTimeout(vigilancia);
  };
  const saved = (event, result) => {
    if (event.sender !== win.webContents || !closeRequest || result.requestId !== closeRequest) return;
    clearTimeout(closeTimer);
    closeRequest = null;
    if (result.error) {
      quitting = false;
      recargarTrasGuardar = false;
      dialog.showMessageBox(win, { type: 'error', title: 'No se pudo guardar', message: 'La aplicación seguirá abierta para proteger tus cambios.', detail: result.error });
      return;
    }
    if (recargarTrasGuardar && !quitting) return recargarConVersionNueva();
    recargarTrasGuardar = false;
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
      recargarTrasGuardar = false;
      dialog.showMessageBox(win, { type: 'warning', message: 'No se pudo confirmar el guardado local. La ventana seguirá abierta; intenta cerrar de nuevo.' });
    }, 15000);
  });
  win.webContents.on('will-prevent-unload', event => {
    // Only after the editor confirmed its IndexedDB transaction completed.
    if (closeApproved || recargando) event.preventDefault();
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      console.error('[desktop] load failed', code, description, url);
      if (paqueteCargado.descargado) return regresarAlInstalador(`no cargó (${description})`);
      dialog.showErrorBox('No se pudo abrir ReyPez', 'Faltan archivos de la aplicación. Reinstala ReyPez; los datos locales se conservan.');
    }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) shell.openExternal(url);
    // Local PDF previews can open in a sandboxed window.
    return { action: url.startsWith('blob:') ? 'allow' : 'deny' };
  });
  win.webContents.on('render-process-gone', () => regresarAlInstalador('se cerró inesperadamente'));
  win.webContents.on('will-navigate', (event, url) => {
    const permitted = devUrl ? url.startsWith(devUrl + '/') : url.split('#')[0] === pathToFileURL(indexDe(paqueteCargado)).href;
    if (!permitted) {
      event.preventDefault();
      if (isExternal(url)) shell.openExternal(url);
    }
  });
  win.on('closed', () => {
    clearTimeout(closeTimer);
    clearTimeout(vigilancia);
    aplicarActualizacion = null;
    ipcMain.removeListener('desktop:renderer-ready', rendererReady);
    ipcMain.removeListener('desktop:close-ready', saved);
    mainWindow = null;
    if (quitting) app.quit();
  });
  cargarPaquete(actualizador.paqueteParaCargar());
}

function esVentanaPrincipal(event) {
  return mainWindow && event.sender === mainWindow.webContents && event.senderFrame === event.sender.mainFrame;
}
ipcMain.handle('desktop:actualizacion-estado', event => {
  if (!esVentanaPrincipal(event) || !actualizador) return null;
  return actualizador.estadoPublico(paqueteCargado);
});
ipcMain.handle('desktop:actualizacion-aplicar', event => {
  if (!esVentanaPrincipal(event) || !aplicarActualizacion) return false;
  aplicarActualizacion();
  return true;
});

async function revisarActualizaciones() {
  try {
    const estado = await actualizador.buscar(paqueteCargado);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('desktop:actualizacion-estado', estado);
    // Auto-actualización: si hay una versión nueva lista, aplicarla sola
    // (usa el mismo guardado seguro que el botón "Actualizar").
    if (estado && estado.lista && aplicarActualizacion) {
      aplicarActualizacion();
    }
  } catch (error) {
    console.warn('[desktop] no se pudo revisar actualizaciones:', error.message);
  }
}

// Cuando la app recupera internet, revisar de inmediato (sin esperar los 30 min).
ipcMain.on('desktop:en-linea', () => {
  if (actualizador) revisarActualizaciones();
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.on('before-quit', () => { quitting = true; });
  app.whenReady().then(() => {
    identificarPeticionesDeAuth(session.defaultSession);
    actualizador = crearActualizador({
      carpetaDatos: app.getPath('userData'), carpetaIncluida, versionInstalador: app.getVersion(),
      urlBase: urlDeActualizaciones(), fetch: (url, opciones) => net.fetch(url, opciones),
      log: mensaje => console.log('[desktop] actualizaciones:', mensaje)
    });
    createMainWindow();
    // En desarrollo (electron:dev) las pantallas vienen del servidor local; no se descarga nada.
    if (!devUrl) {
      setTimeout(revisarActualizaciones, 15000);
      setInterval(revisarActualizaciones, REVISAR_CADA_MS);
    }
    app.on('activate', () => { if (!mainWindow) createMainWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
