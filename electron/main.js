const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const isDev = !app.isPackaged;
let mainWindow;

function isExternal(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_err) {
    return false;
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:8080';
  const prodIndex = path.join(__dirname, '..', 'dist', 'index.html');

  if (isDev) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(prodIndex);
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.on('did-fail-load', (_event, code, desc, _url, _isMainFrame) => {
    console.error(`[electron] did-fail-load code=${code} desc=${desc} url=${isDev ? devUrl : prodUrl}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log(`[electron] did-finish-load url=${mainWindow.webContents.getURL()}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (isExternal(targetUrl)) {
      event.preventDefault();
      shell.openExternal(targetUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

