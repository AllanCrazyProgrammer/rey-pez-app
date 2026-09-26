const { contextBridge, ipcRenderer } = require('electron');
let savedForClose = false;

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  savePdf: (bytes, filename, notePeriod) => ipcRenderer.invoke('desktop:save-pdf', { bytes, filename, notePeriod }),
  drive: {
    status: () => ipcRenderer.invoke('drive:status'),
    connect: clientId => ipcRenderer.invoke('drive:connect', clientId),
    disconnect: () => ipcRenderer.invoke('drive:disconnect'),
    uploadNote: note => ipcRenderer.invoke('drive:upload-note', note)
  },
  isClosing: () => savedForClose,
  onPrepareClose(handler) {
    const listener = async (_event, requestId) => {
      try {
        await handler();
        savedForClose = true;
        ipcRenderer.send('desktop:close-ready', { requestId });
      } catch (error) {
        ipcRenderer.send('desktop:close-ready', { requestId, error: String(error.message || error) });
      }
    };
    ipcRenderer.on('desktop:prepare-close', listener);
    ipcRenderer.send('desktop:renderer-ready');
    return () => ipcRenderer.removeListener('desktop:prepare-close', listener);
  }
});
