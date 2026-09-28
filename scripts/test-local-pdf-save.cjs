const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

test('local shipment PDFs overwrite the same path without a confirmation; invalid requests remain blocked', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'reypez-save-pdf-'));
  const handlers = {}, opened = [];
  const electron = {
    app: { commandLine: { getSwitchValue: () => '' }, isPackaged: true, getPath: () => folder },
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; } },
    shell: { openPath: async file => { opened.push(file); return ''; } },
    dialog: { showMessageBox: () => { throw new Error('Unexpected confirmation'); } }
  };
  const context = vm.createContext({
    require: name => name === 'electron' ? electron : name === './googleDrive' ? { initGoogleDrive() {} } : require(name),
    __dirname: path.resolve(__dirname, '../electron'), Uint8Array, Buffer, URL, process
  });
  const source = fs.readFileSync(path.join(__dirname, '../electron/main.js'), 'utf8');
  vm.runInContext(source.slice(0, source.indexOf('function createMainWindow()')) +
    '\nmainWindow = { webContents: { mainFrame: {} } }; this.sender = mainWindow.webContents;', context);
  const event = { sender: context.sender, senderFrame: context.sender.mainFrame };
  const save = handlers['desktop:save-pdf'];
  const period = { year: 2026, month: 9, day: 25 };
  try {
    for (const filename of ['Resumen-Embarque-Porro.pdf', 'Resumen-Taras-Porro.pdf', 'Rendimientos-Porro.pdf', 'Joselito.pdf']) {
      const input = { filename, notePeriod: period, bytes: Buffer.from('%PDF-old-version-longer') };
      const first = await save(event, input);
      const updated = Buffer.from('%PDF-new');
      const second = await save(event, { ...input, bytes: updated });
      assert.equal(first.filePath, second.filePath);
      assert.equal(second.canceled, false);
      assert.deepEqual(fs.readFileSync(second.filePath), updated);
    }
    assert.equal(opened.length, 8);
    assert.equal(fs.readdirSync(path.join(folder, 'embarques/2026/septiembre/25')).length, 4);
    await assert.rejects(save({ sender: {} }, {}), /no autorizada/);
    await assert.rejects(save(event, { bytes: Buffer.from('not a PDF'), notePeriod: period }), /inválido/);
    await assert.rejects(save(event, { bytes: Buffer.from('%PDF-'), notePeriod: { year: 2026, month: 2, day: 30 } }), /Fecha/);
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});
