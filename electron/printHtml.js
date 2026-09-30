const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');

// Render locally with Chromium so the report keeps its print CSS and page breaks.
// This window has no preload, scripts, Node access, or external network requests.
async function renderHtmlPdf(BrowserWindow, html, { landscape = false, tempPath } = {}) {
  if (typeof html !== 'string' || !html.trim() || Buffer.byteLength(html) > 10 * 1024 * 1024) {
    throw new Error('El contenido del reporte no es válido.');
  }
  const folder = await fs.mkdtemp(path.join(tempPath, 'reypez-print-'));
  let win;
  try {
    const file = path.join(folder, 'reporte.html');
    const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:">';
    await fs.writeFile(file, policy + html, 'utf8');
    win = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true, nodeIntegration: false, sandbox: true,
        javascript: false, partition: `reypez-print-${randomUUID()}`
      }
    });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', event => event.preventDefault());
    const fileUrl = pathToFileURL(file).href;
    win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      callback({ cancel: details.url !== fileUrl && !details.url.startsWith('data:') });
    });
    await win.loadFile(file);
    return await win.webContents.printToPDF({
      printBackground: true, preferCSSPageSize: true, pageSize: landscape ? 'A4' : 'Letter', landscape
    });
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
    await fs.rm(folder, { recursive: true, force: true });
  }
}

module.exports = { renderHtmlPdf };
