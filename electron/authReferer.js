// La app de escritorio carga sus pantallas desde archivos locales (file://), así que sus peticiones
// no llevan un dominio web. La llave de API de Firebase solo acepta los dominios de la web
// (restricción de sitios web en Google Cloud), y Firebase Auth rechazaba el inicio de sesión con
// "Requests from referer <empty> are blocked". Aquí se identifica la app con el dominio oficial de
// la web, solo para los servicios de inicio de sesión de Firebase Auth.
const REFERER_APP = 'https://reypezapp-1ced2.web.app/';
const URLS_AUTH = [
  'https://identitytoolkit.googleapis.com/*',
  'https://securetoken.googleapis.com/*'
];

function identificarPeticionesDeAuth(session) {
  session.webRequest.onBeforeSendHeaders({ urls: URLS_AUTH }, (details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders, Referer: REFERER_APP } });
  });
}

module.exports = { identificarPeticionesDeAuth, REFERER_APP, URLS_AUTH };
