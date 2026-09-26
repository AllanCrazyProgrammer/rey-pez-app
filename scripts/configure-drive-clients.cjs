// Import Google's downloaded Desktop OAuth JSON without printing credentials.
const fs = require('node:fs');
const path = require('node:path');
const { readDesktopClients } = require('../electron/googleDriveClients');
const flags = { '--mac': 'darwin', '--win': 'win32' };
const expected = {
  darwin: '512757841511-dei6iqrdunuo49ok9cmse6fapoodslm8.apps.googleusercontent.com',
  win32: '512757841511-cftpbu6iasorjao0f3krm9le8tfk5i31.apps.googleusercontent.com'
};
const clients = readDesktopClients();
const args = process.argv.slice(2);
if (!args.length || args.length % 2) throw new Error('Uso: node scripts/configure-drive-clients.cjs --mac archivo.json --win archivo.json');
for (let i = 0; i < args.length; i += 2) {
  const platform = flags[args[i]];
  if (!platform) throw new Error('Selecciona --mac o --win.');
  const config = JSON.parse(fs.readFileSync(path.resolve(args[i + 1]), 'utf8')).installed;
  if (!config?.client_secret || config.client_id !== expected[platform]) {
    throw new Error(`El archivo no es el cliente de escritorio ReyPez correspondiente a ${platform}.`);
  }
  clients[platform] = { clientId: config.client_id, clientSecret: config.client_secret };
}
const filename = path.resolve(__dirname, '../electron/google-drive-clients.local.json');
fs.writeFileSync(filename, JSON.stringify(clients, null, 2) + '\n', { mode: 0o600 });
fs.chmodSync(filename, 0o600);
console.log('Configuración de escritorio guardada. No se mostraron credenciales.');
