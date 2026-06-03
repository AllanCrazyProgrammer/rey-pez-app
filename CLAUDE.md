# Rey Pez — Notas para Claude

App de gestión (Vue 2 + Vue CLI 4.5) con Firebase (Firestore + Realtime DB).
Se despliega en Heroku como sitio estático (buildpack nginx: `Procfile` + `static.json`).
El push a `master` dispara el despliegue.

## Comandos

- `npm install` — instala dependencias.
- `npm start` — dev server en http://localhost:8080 (hot reload).
- `npm run build:web` — build de producción a `dist/`.
- `npm run lint` — ESLint (vue-cli-service lint).
- No hay framework de pruebas configurado (los archivos `test-*.js` de la raíz
  son scripts sueltos, no una suite).

## Vista previa con capturas ("muéstrame cómo se ve")

Cuando el usuario pida ver un cambio (p. ej. "muéstrame cómo se ve"), genera
capturas de la app y envíaselas con `SendUserFile`. Flujo:

1. Asegúrate de que el dev server esté corriendo:
   `npm start` (en segundo plano; espera a que compile, ~30-60s).
2. Toma la captura con el script reutilizable:
   `node scripts/preview.js "<ruta>" "/tmp/preview.png"`
   - Ej.: `node scripts/preview.js "/barcos/entrada-producto?barco=galileo" /tmp/x.png`
3. Para flujos que requieren interacción o datos (clicks, llenar formularios),
   escribe un script Playwright ad-hoc basado en `scripts/preview.js`
   (mismo `executablePath` / args).

Notas importantes del entorno:
- **Firebase no conecta** desde el contenedor (la red bloquea el backend).
  Por eso las vistas que cargan datos remotos salen vacías; usa vistas con
  estado local (editores/formularios) y llena datos de ejemplo para que se vea
  representativo.
- El navegador headless es el Chromium preinstalado del entorno
  (`/opt/pw-browsers/chromium-*/chrome-linux/chrome`), expuesto como
  `$PREVIEW_CHROME` por el hook de inicio. Playwright **no** puede descargar
  navegadores aquí.
- El hook `.claude/hooks/session-start.sh` deja instaladas las dependencias y
  Playwright al iniciar cada sesión, así las capturas son rápidas.

## Módulo de Barcos

Entrada de producto por descarga: `src/views/Barcos/EntradaProductoBarco.vue`
(ruta `/barcos/entrada-producto?barco=galileo|maria-guadalupe`). El neto se
calcula como `kilos - taras * 3`. Colección Firestore: `entradasProductoBarcos`.
