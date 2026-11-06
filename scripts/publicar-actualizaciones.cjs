// Copia los paquetes de escritorio y Android a dist/actualizaciones/ para que Firebase Hosting los
// sirva. Correr después de `npm run build:web`, `node scripts/build-desktop.cjs --assets-only` y
// `node scripts/build-android.cjs --solo-web` (los tres del mismo commit).
const { publicar } = require('./lib/paqueteActualizacion.cjs');
const resumen = publicar();
console.log(`Actualizaciones publicadas en dist/actualizaciones: escritorio ${resumen.escritorio}, android ${resumen.android}`);
