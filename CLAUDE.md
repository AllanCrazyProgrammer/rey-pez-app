# Rey Pez — Notas para Claude

App de gestión (Vue 2.7 + Vue CLI 5 / webpack 5) con Firebase (Firestore + Realtime DB).
Se despliega en Heroku como sitio estático (buildpack nginx: `Procfile` + `static.json`).
El push a `master` dispara el despliegue.

## Comandos

- `npm install` — instala dependencias.
- `npm start` — dev server en http://localhost:8080 (hot reload).
- `npm run build:web` — build de producción a `dist/`.
- `npm run lint` — ESLint directo con eslint-plugin-vue 7 (0 errores; la deuda
  conocida sale como advertencias).
- Pruebas: `node --test tests/*.test.cjs` y los `scripts/test-*.cjs` (cada uno se
  corre con `node` o `node --test`). Los scripts de diagnóstico contra la base
  real (solo lectura, requieren `admin-key.json`) están en `scripts/admin/`.
- Documentos históricos de cambios: `docs/historial/`.

## Verificación antes de subir

- `node --test tests/*.test.cjs` y los `scripts/test-*.cjs` relevantes.
- `node scripts/recorrer-rutas.cjs dist` (tras `npm run build:web`): abre las 82 rutas
  del build de producción y reporta errores de JavaScript.
- Cambios en librerías de PDF: `scripts/pdf-regresion/` (comparación pixel por pixel).
- Cambios en el SDK de Firebase: `scripts/verificar-migracion-cache-firestore.mjs`.
- Seguridad y respaldos de Firebase: `docs/SEGURIDAD_Y_RESPALDOS.md`.

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
  Playwright al iniciar cada sesión, así las capturas son rápidas. Corre en
  **modo asíncrono** (en segundo plano), por lo que al inicio de una sesión la
  instalación puede no haber terminado aún; si `node_modules` o Playwright no
  están listos, espera o vuelve a correr `npm install` antes de capturar.

## Actualizaciones dentro de la app

Escritorio y Android descargan las pantallas nuevas al publicarse la web (sin reinstalar):
`docs/ACTUALIZACIONES_EN_APP.md`. Un cambio en `electron/` o en lo nativo de Android necesita
instalador/APK nuevo **y** subir `reypez.minimoInstalador` en `package.json`.
Pruebas: `node --test scripts/test-actualizaciones.cjs`.

## Módulo de Barcos

Entrada de producto por descarga: `src/views/Barcos/EntradaProductoBarco.vue`
(ruta `/barcos/entrada-producto?barco=galileo|maria-guadalupe`). El neto se
calcula como `kilos - taras * 3`. Colección Firestore: `entradasProductoBarcos`.

## Saldos de cuentas (Cuentas México)

Componente `src/components/Cuentas/SaldosCuentas.vue`, lógica pura en
`src/utils/saldosCuentas.js` (pruebas: `node scripts/test-saldos-cuentas.cjs`).
Documento `saldosCuentas/porCuenta` con un mapa `cuentas.{id}`; cada edición
escribe solo su cuenta (`setDoc` con `merge`) más un renglón en
`saldosCuentasHistorial`. Montos en pesos enteros. El documento viejo
`saldosCuentas/actual` (arreglo) solo se lee una vez para migrar.
