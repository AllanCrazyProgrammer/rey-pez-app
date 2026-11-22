# App de despique (Android, celular y tablet)

APK aparte para el colaborador que pesa las despicadas. Es una variante de compilación de este
mismo código: usa las mismas pantallas de Pesadas que la app completa, pero **solo** esas.

## Qué trae

| Pantalla | Ruta | Notas |
|---|---|---|
| Inicio de sesión | `/login` | Cuenta de Firebase Auth (ver abajo). |
| Días de pesadas | `/pesadas` | Crear día, ⚡ Pesar rápido, Kilos por medida. **Sin** "Eliminar día" ni "Despicadoras". |
| Pesar rápido | `/pesadas/:fecha/rapida` | La función principal. Puede dar de alta despicadoras nuevas desde aquí. |
| Hoja del día | `/pesadas/:fecha` | Hoja completa con pagos, resumen/imprimir y Sacar cuentas. |

Cualquier otra ruta regresa a `/pesadas`. Las demás áreas de Rey Pez (embarques, cuentas,
préstamos, catálogo de despicadoras, etc.) **no se compilan** dentro de esta app: no hay forma
de llegar a ellas. `tests/app-despique.test.cjs` lo comprueba sobre el router y sobre el build.

## Cómo está armada

- Entrada propia: `src/despique/main.js`, router `src/despique/router.js` (la lista de pantallas
  permitidas) y marco `src/despique/AppDespique.vue` (barra con nombre de usuario y "Salir").
- Bandera de compilación `VUE_APP_VARIANTE=despique` (`src/config/variante.js`); con ella
  `vue.config.js` usa esa entrada y compila a `despique-dist/`.
- Proyecto nativo propio: `android-despique/` (copia de `android/` con
  `applicationId "com.reypez.despique"` y nombre "Despique"). Se instala **junto** a ReyPez.
  `capacitor.config.js` apunta ahí cuando la variante es despique.
- Un cambio en pantallas de Pesadas llega a las dos apps; para ocultar algo solo en despique,
  usar `ES_DESPIQUE` de `src/config/variante.js` (como en `PesadasHistorial.vue`).

## Comandos

```bash
npm run build:despique:web        # solo la web de despique (despique-dist/)
npm run android:despique:apk      # APK de prueba local (necesita el SDK de Android)
npm run android:despique:open     # abrir android-despique/ en Android Studio
node scripts/servir-dist.cjs despique-dist 8092   # revisar el build en el navegador
node --test tests/app-despique.test.cjs
```

APK firmada: GitHub Actions → **APK Despique (Release)** → Run workflow, o una etiqueta
`despique-v<versión>` (`.github/workflows/android-despique-release.yml`). Usa los mismos secrets
de firma que la APK completa (`docs/ANDROID_FIRMA.md`) y publica `ReyPezDespique-<versión>.apk`
en GitHub Releases.

## Actualizaciones

Esta app **no** usa el canal de actualizaciones dentro de la app (ese canal trae la app completa).
Para que le llegue un cambio hay que compilar e instalar una APK nueva encima (misma llave, no
hace falta desinstalar).

## Cuenta del colaborador

El build usa solo Firebase Auth (`VUE_APP_LOGIN_LOCAL=off` en `.env`). Crear la cuenta:

```bash
node scripts/admin/crear-cuentas.js <usuario>
```

El primer inicio de sesión en la tablet/celular necesita internet; después la sesión queda
guardada. Pendiente heredado de la APK completa: la llave del navegador en Google Cloud →
Credenciales debe aceptar `https://localhost/*` (origen del WebView), ver
`docs/SEGURIDAD_Y_RESPALDOS.md`.

**Ojo con la seguridad:** la app solo muestra Pesadas, pero las reglas de Firebase hoy aceptan a
cualquier usuario con sesión en todas las colecciones. Con su cuenta, alguien podría entrar a la
web completa y ver lo demás. Para cerrarlo de verdad hacen falta reglas por usuario/colección
(paso 7 de `docs/SEGURIDAD_Y_RESPALDOS.md`).
