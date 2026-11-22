# App de despique (Android, celular y tablet)

APK aparte para el colaborador que pesa las despicadas. Es una variante de compilación de este
mismo código: usa las mismas pantallas de Pesadas que la app completa, pero **solo** esas.

## Qué trae

| Pantalla | Ruta | Notas |
|---|---|---|
| Inicio de sesión | `/login` | Cuenta de Firebase Auth (ver abajo). |
| Días de pesadas | `/pesadas` | Crear día, ⚡ Pesar rápido, Kilos por medida. **Sin** "Eliminar día" ni "Despicadoras". |
| Pesar rápido | `/pesadas/:fecha/rapida` | La función principal. Puede dar de alta despicadoras nuevas desde aquí. Un traste "Otro" queda guardado como botón del día. |
| Pesada a granel | `/pesadas/:fecha/granel` | Sigue a "Terminé de pesar" solo con la medida que se estaba pesando (`?medida=`), con botón Saltar. Taras + kilos con tara; 2 kg por tara por default; el neto se calcula mientras se escribe. |
| Hoja del día | `/pesadas/:fecha` | Hoja con la tabla de kilos. **Sin** "+ Despicadora", "Resumen / imprimir", "Sacar cuentas", los cuadros de pago ni la alerta de pagos negativos. |

En Pesar rápido y Pesada a granel la barra de arriba no hace nada (sin "Salir" ni ir al
inicio), para no salirse por error.

Hoja del día (estos cambios aplican también a la app completa, salvo donde dice "despique"):
- El botón **Pesada a granel** abre una ventana con un card por medida (kilos netos); al tocar
  uno se ve el desglose con la hora (12 h), taras y kilos, y un botón para editar. La hora de
  cada renglón se guarda al escribir sus kilos (`hora`, ms).
- **Deshacer / Rehacer** de todo lo cambiado en la hoja en este dispositivo
  (`src/utils/historialCambios.js`, `tests/historial-cambios.test.cjs`).
- **Eliminar fila**: clic derecho o dejar presionado el nombre → menú → confirmación en el
  mismo menú (no `window.confirm`). Ya no hay ×; el nombre es más angosto.
- Scroll (`src/utils/scrollContenido.js`): al llegar arriba o abajo de la tabla, el mismo gesto
  sigue moviendo la página. En despique, además, la tabla mide la pantalla menos la barra y el
  pie, al bajar se acomoda pegada debajo de la barra, y solo quedan fijas las filas Columna y
  Medida (Precio / kg se va con el scroll).

Lógica pura de granel: `src/utils/pesadasGranel.js` (`tests/pesadas-granel.test.cjs`).
Datos en el día (`pesadasDiarias/<fecha>`): `trastesDia.t6 = 0.6`, `granelKgPorTara`,
`granel.<columnaId>.<filaId> = { taras, kilos, orden, hora }`.

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
npm run despique:local            # prueba en tu Mac con datos de ejemplo, SIN la base real
                                  # (emuladores de Firebase; usuario prueba / prueba123;
                                  # http://localhost:8095; necesita Java 21+)
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
