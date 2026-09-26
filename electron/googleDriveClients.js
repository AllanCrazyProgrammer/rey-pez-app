const fs = require('node:fs');
const path = require('node:path');

function readDesktopClients() {
  const filename = path.join(__dirname, 'google-drive-clients.local.json');
  if (!fs.existsSync(filename)) return {};
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function getDesktopClientSecret(clientId) {
  const client = Object.values(readDesktopClients()).find(value => value.clientId === clientId);
  if (!client?.clientSecret) {
    throw new Error('Esta instalación no tiene la configuración OAuth completa. Instala la actualización de ReyPez con las credenciales de escritorio configuradas; tus notas pendientes se conservan.');
  }
  return client.clientSecret;
}

module.exports = { readDesktopClients, getDesktopClientSecret };
