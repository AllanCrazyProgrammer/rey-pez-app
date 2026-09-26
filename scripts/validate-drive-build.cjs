const { readDesktopClients } = require('../electron/googleDriveClients');

exports.default = async context => {
  const platform = context.electronPlatformName;
  if (!['darwin', 'win32'].includes(platform)) return;
  const client = readDesktopClients()[platform];
  if (!client?.clientId || !client?.clientSecret) {
    throw new Error(`Falta el cliente OAuth completo de ${platform}. Configura electron/google-drive-clients.local.json antes de generar un instalador.`);
  }
};
