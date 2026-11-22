// Copia los paquetes de escritorio, Android y despique a dist/actualizaciones/ para que Firebase
// Hosting los sirva. Correr después de `npm run build:web`, `node scripts/build-desktop.cjs
// --assets-only`, `node scripts/build-android.cjs --solo-web` y
// `node scripts/build-android.cjs --despique --solo-web` (todos del mismo commit).
const path = require('node:path');
const { publicar, CARPETAS } = require('./lib/paqueteActualizacion.cjs');
const resumen = publicar({ despique: path.resolve(__dirname, '..', CARPETAS.despique) });
console.log(`Actualizaciones publicadas en dist/actualizaciones: escritorio ${resumen.escritorio}, android ${resumen.android}, despique ${resumen.despique}`);
