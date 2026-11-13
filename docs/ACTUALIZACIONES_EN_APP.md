# Actualizaciones dentro de la app (escritorio y Android)

Desde la versión **0.3.20**, la app de escritorio (Mac y Windows) y la de Android se actualizan
solas cuando se publica la web: ya no hay que descargar un instalador o un APK por cada cambio.
**Desde esta misma versión, la APK de Android es la app completa** (antes era solo Inventarios):
las instalaciones viejas de Inventarios reciben la app completa por este mismo canal, sin
reinstalar. Una APK nueva solo hace falta cuando cambia algo nativo; esa APK va firmada con
la llave de distribución y NO se instala encima de la vieja de Inventarios (firmada con llave
debug): hay que desinstalar Inventarios primero. Ver `docs/ANDROID_FIRMA.md`.

## Qué ve la persona

1. Con internet, la app revisa si hay versión nueva (al abrir, cada 30 minutos, en Android
   también al volver a la app y **al recuperar internet**, igual que escritorio).
2. Si la hay, la descarga en segundo plano y muestra **"Hay una versión nueva de ReyPez lista…
   Actualizar ahora"**.
3. **Android se actualiza sola desde la versión que trae el auto-aplicador
   (`src/mobile/autoAplicarActualizacion.js`):** la versión descargada se aplica al abrir la
   app (en los primeros segundos, antes de trabajar) o al mandar la app a segundo plano
   (al volver ya trae la versión nueva). Con la app abierta y en uso no se recarga para no
   interrumpir; el aviso sigue ahí por si se quiere aplicar en ese momento con el botón.
   En escritorio, si no se pulsa, la versión nueva entra la próxima vez que se abra la app.
   Al pulsar **Actualizar ahora**:
   - En escritorio, primero se guarda igual que al cerrar la ventana y después se recarga.
   - En Android, se guarda lo abierto y se recarga.
   La primera vez que llega el auto-aplicador a un teléfono, esa versión todavía hay que
   aplicarla con el botón (el código viejo no sabe aplicarla sola); desde ahí, sola.
4. Sin internet, se sigue usando la última versión descargada.

Si una versión descargada no arranca, la app la descarta sola y regresa a la anterior:
- **Escritorio:** si en 60 s no avisa que arrancó, regresa a la última versión que funcionó o a la del
  instalador.
- **Android:** el plugin espera 20 s.

## Cuándo sí hace falta instalador o APK nuevo

Solo cuando cambia la parte nativa:

- **Escritorio:** cualquier archivo de `electron/` (proceso principal, `preload.js`, Drive, PDFs),
  la versión de Electron o los íconos.
- **Android:** plugins de Capacitor, permisos, `android/`, el ícono o el nombre.

En ese caso:
1. Subir la versión en `package.json`.
2. Subir `"reypez.minimoInstalador"` de esa plataforma a la misma versión.
3. Generar y publicar el instalador o APK.

Las apps con un instalador más viejo no descargan esa versión. Muestran "necesita volver a
instalar la app" con el enlace a GitHub Releases.

## Cómo funciona

- **Build:** `scripts/build-desktop.cjs` y `scripts/build-android.cjs` escriben `paquete.json` dentro
  de `desktop-dist/` y `android-dist/`. Ahí va la versión, el número (la fecha del commit, en
  segundos) y el sha256 de cada archivo. La versión es `<package.json>-<número>`, por ejemplo
  `0.3.20-1793923060`. El número es el que ordena las versiones.
- **Publicación:** la GitHub Action (`.github/workflows/firebase-hosting.yml`) compila también los
  dos paquetes y corre `scripts/publicar-actualizaciones.cjs`. Así quedan en Firebase Hosting:
  - `actualizaciones/escritorio/ultima.json` y `actualizaciones/escritorio/<versión>/…`. Se
    descargan archivo por archivo, y solo los que cambiaron.
  - `actualizaciones/android/ultima.json` y `actualizaciones/android/<versión>.zip`.

  En local: `npm run build:actualizaciones`.
- **Escritorio:** `electron/actualizaciones.js` descarga a
  `<datos de la app>/actualizaciones/versiones/<versión>/`. Antes de usar cada archivo verifica su
  sha256 y su tamaño. Rechaza rutas raras. Solo usa la URL oficial: la de prueba
  `REYPEZ_ACTUALIZACIONES_URL` solo se acepta en `127.0.0.1` o `localhost`. Los datos locales
  (IndexedDB, sesión) se conservan porque el origen sigue siendo `file://`.
- **Android:** el plugin `@capgo/capacitor-updater` corre en modo manual y sin estadísticas
  (`capacitor.config.json`). Lo usa `src/mobile/actualizacionAndroid.js`. El plugin verifica el
  sha256 del zip. El APK toma su versión de `package.json` (`android/app/build.gradle`); al
  instalar un APK con otra versión, el plugin descarta lo descargado.

## Pruebas

- `node --test scripts/test-actualizaciones.cjs` cubre:
  - Descarga parcial y archivos alterados.
  - Regreso a la versión anterior.
  - Versión mínima del instalador.
  - El zip de Android y la lógica del plugin con un simulador.
- **Prueba real hecha el 5 nov 2026 en escritorio**, con el instalador de Mac 0.3.20 y un "Hosting"
  local:
  - Detectó la versión nueva, bajó 3 de 247 archivos y recargó al pulsar Actualizar.
  - Al reabrir, usó la descargada.
  - Una versión rota se descartó sola al minuto.
- **Prueba real en Android** (emulador Android 14, APK 0.3.20 apuntando a un "Hosting" local):
  - Descargó el zip y mostró el aviso.
  - Al pulsar Actualizar cargó la versión nueva y la conservó al reabrir.
  - No hubo ningún contacto con servidores de Capgo.

## Requisitos del APK desde 0.3.20

- Android 6.0 o más nuevo (antes 5.1).
- Se compila contra SDK 35; la app sigue apuntando a SDK 34.
- Para iniciar sesión, la llave de API del navegador debe aceptar `https://localhost/*`, que es el
  origen del WebView de Capacitor (ver `docs/SEGURIDAD_Y_RESPALDOS.md`).
