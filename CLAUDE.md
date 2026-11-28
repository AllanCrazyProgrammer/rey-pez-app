# Rey Pez — Notas para Claude

App de gestión (Vue 2.7 + Vue CLI 5 / webpack 5) con Firebase (Firestore + Realtime DB).
Se publica en Firebase Hosting: el push a `master` dispara la GitHub Action
`.github/workflows/firebase-hosting.yml` (también `npm run deploy:web` a mano).
Ya no se usa Heroku (`Procfile` y `static.json` son restos de entonces).

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
- `node scripts/recorrer-rutas.cjs dist` (tras `npm run build:web`): abre las 89 rutas
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
Desde 0.3.20 la APK de Android es la app completa (antes solo Inventarios); la APK firmada
de distribución se publica en GitHub Releases (`.github/workflows/android-release.yml`,
ver `docs/ANDROID_FIRMA.md`). Arranque de la APK: `npm run test:android:arranque`
(tras `npm run build:android:web`).

## App de despique (APK aparte, solo Pesadas)

Variante `VUE_APP_VARIANTE=despique`: entrada `src/despique/`, build en `despique-dist/`,
proyecto nativo `android-despique/` (`com.reypez.despique`). Solo login, días de pesadas, pesar
rápido y hoja del día. Se actualiza sola desde 0.3.25 con su propio paquete (`actualizaciones/despique/`,
solo con wifi) y funciona sin internet.
Detalles: `docs/APP_DESPIQUE.md`. Pruebas: `node --test tests/app-despique.test.cjs`.
Prueba local con datos de ejemplo y sin la base real: `npm run despique:local` (emuladores).

## Módulo de Barcos

Entrada de producto por descarga: `src/views/Barcos/EntradaProductoBarco.vue`
(ruta `/barcos/entrada-producto?barco=galileo|maria-guadalupe`). El neto se
calcula como `kilos - taras * 3`. Colección Firestore: `entradasProductoBarcos`.

## Análisis de ganancia (Rendimientos y Gestión de Costos)

Reglas únicas en `src/utils/gananciasRendimientos.js` (pruebas:
`node --test tests/ganancias-rendimientos.test.cjs`); `Rendimientos.vue` y
`GestionCostos.vue` las usan, no dupliques la lógica.
- Precio de venta por línea del embarque: `producto.precio` (la etiqueta "Venta $X",
  igual a la cuenta del cliente) y, si falta, catálogo `precios` a la fecha del
  embarque con el **específico del cliente siempre antes que el general**. Las
  líneas de maquila de Ozuna no usan `producto.precio` (es la cuota de maquila).
- Costo base: manual del embarque (`costosPorMedidaManuales`) > catálogo
  `historial_costos` (medida + proveedor) > `costosPorMedida`. Gestión de Costos no
  borra un `costosPorMedida` sin catálogo (antes la ganancia quedaba con costo $0).
- Costo extra (`costoExtra`, ej. $18; 0 es válido): por default en TODAS las medidas de
  limpio (no Maquila Ozuna), regla `aplicaCostoExtra`. La casilla "+ $18 costo extra"
  (tarjeta de Rendimientos o Gestión de Costos) guarda `aplicarCostoExtra[medida]` y
  `costoExtraDecidido[medida]`; un false viejo sin decidir en medida sin número no cuenta.
- Cliente "refri" (`esClienteRefri`): se anota en "Precio por cliente" (🧊, "no cuenta") pero
  no suma kilos, ventas ni ganancia del día (se refrigeró, no se vendió). El renglón Total
  del desglose solo suma lo vendido.
- Kilos por cliente sin decimales (`Math.floor` de la suma de sus líneas, como se muestran):
  la ganancia de cada renglón y el total son la suma exacta de lo que se ve.
- Medidas refri ("71/90 refri"): rendimiento = el de la medida base en el embarque del día
  anterior (`rendimientoRefriAnterior`); la tarjeta lo muestra y oculta el rendimiento manual.
  Solo si no hubo base el día anterior (o sin internet) se pide el rendimiento manual.
- Crudos: mismo costo + $3.50/kg; la ganancia por cliente usa su propio precio.
- Maquila Ozuna: precio vacío usa el de las líneas del embarque; esas medidas no
  prenden "Analizar ganancia" por default (se contaría doble).
- Editar precio desde "Precio por cliente" (modal en Rendimientos): solo este embarque
  (líneas `precioOrigen: 'manual'`), precio específico del cliente o nuevo general
  (registro en `precios` con la fecha del embarque). Escribe `clientes` de cada camión
  del día con `escribirCamposEmbarque` (también los "Protegidos": la protección bloquea kilos
  y taras, no precios). Qué líneas cambian:
  `aplicarPrecioEnClientes`.
- Costo desde Rendimientos (etiqueta del costo en la tarjeta o aviso "Faltan costos"):
  "Recordar para los siguientes días" agrega un renglón a `historial_costos` con la fecha
  del embarque (`entradaCatalogoCosto`) y quita el manual de ese embarque; desmarcado
  queda como costo manual solo de ese embarque.
- Proveedor activo (medida sin proveedor en el nombre, ej. "51/60", con varios en el
  catálogo): elección del embarque (`proveedorActivoPorMedida`) > default general
  `configuracion/costosProveedorActivo.porMedida` (última elección en Costos o en el modal
  de costo de Rendimientos) > `ordenarProveedoresDefault` (sin proveedor, luego el más reciente).
- Gestión de Costos copia la foto base (`clonarDatosPlanos`): si comparte los mapas que
  edita, el guardado cree que no hubo cambios y no escribe.
- PDF de Rendimientos, hoja "Análisis de ganancia": `src/utils/pdf/generators/hojaGanancias.js`
  (forma del cuaderno del papá: un recuadro por medida en cuadrícula de 2 columnas, ganancia/kg,
  total y costo final en óvalo, kilos por cliente con "bolsas × .65", precio distinto en óvalo,
  y resumen Limpios/Maquila/Crudos/Total). Usa lo ya calculado por la pantalla (`kilosCrudo`,
  `rendimientoUsado`, `proveedorCosto`, `costoExtraAplicado` en cada ganancia). Pruebas:
  `node --test tests/hoja-ganancias-pdf.test.cjs` (genera el PDF real con pdfmake).
- Prueba con emulador: dev server con
  `VUE_APP_FIRESTORE_EMULATOR=127.0.0.1:<puerto>` y proyecto `demo-reypez`.

## Saldos de cuentas (Cuentas México)

Componente `src/components/Cuentas/SaldosCuentas.vue`, lógica pura en
`src/utils/saldosCuentas.js` (pruebas: `node scripts/test-saldos-cuentas.cjs`).
Documento `saldosCuentas/porCuenta` con un mapa `cuentas.{id}`; cada edición
escribe solo su cuenta (`setDoc` con `merge`) más un renglón en
`saldosCuentasHistorial`. Montos en pesos enteros. El documento viejo
`saldosCuentas/actual` (arreglo) solo se lee una vez para migrar.
