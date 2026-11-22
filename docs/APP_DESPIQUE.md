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
`granel.<columnaId>.<filaId> = { taras, kilos, orden, hora }`, `granelCrudo.<columnaId>` (kilos en
crudo, solo se capturan al abrir la pesada a granel desde la hoja). Rendimiento = crudo ÷ neto a
granel con dos decimales, p. ej. "En crudo 34 kg (1.20)" en los cards de la hoja. En la pesada a
granel, Enter en los kilos suelta el campo (cierra el teclado del celular) y guarda.

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

Desde la **0.3.25** se actualiza sola, sin reinstalar, con su **propio** paquete
(`actualizaciones/despique/ultima.json` + zip en Firebase Hosting; nunca recibe el de la app
completa). Lo publica la GitHub Action de la web junto con los demás
(`node scripts/build-android.cjs --despique --solo-web`).

- Solo revisa **con wifi** (o si el sistema no dice el tipo de red): al abrir, cada 30 min, al
  volver a la app, al recuperar internet y al pasar a wifi (`src/despique/actualizacion.js`,
  `hayWifi` en `src/mobile/actualizacionAndroid.js`).
- La versión descargada se aplica sola al abrir la app (primeros 20 s) o al mandarla a segundo
  plano; nunca con la app en uso. Los cambios de pesadas ya están guardados en el teléfono.
- Las APK 0.3.24 y anteriores no traen este código: hay que instalar la 0.3.25 a mano una vez.
- Un cambio nativo (plugins, permisos, `android-despique/`) sí necesita APK nueva y subir
  `reypez.minimoInstalador.despique` en `package.json`.
- Pruebas: `node --test scripts/test-actualizaciones.cjs` (pruebas "despique: …").

## Sin internet

- La sesión sigue al abrir sin internet (Firebase guarda al usuario en el teléfono); solo el
  primer inicio de sesión necesita internet.
- Las pantallas abren con la caché de Firestore. Lo capturado se guarda primero en el teléfono
  (`PesadasOutbox`, `localStorage`) y en la cola persistente de Firestore, y se sube solo al
  reconectar (aunque se cierre la app en medio).
- **Crear día** sin internet: como no hay transacciones sin red, se anota el día con un merge de
  la fecha (no borra nada del servidor) y aparece de inmediato (`crearDiaPesadas`,
  `src/services/pesadas.service.js`).
- Probado contra los emuladores congelando Firestore (`kill -STOP`): crear día, capturar,
  reabrir la app y, al descongelar, todo subió y quedó "Guardado".

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
