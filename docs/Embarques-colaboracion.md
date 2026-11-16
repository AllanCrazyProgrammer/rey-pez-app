# Colaboración en embarques

Abre el mismo embarque en dos ventanas con esta versión. Pueden usar la misma cuenta. La barra muestra las otras sesiones, su color, el campo activo y si están escribiendo. El campo también se resalta cuando está visible en tu pantalla. Cerrar una ventana retira únicamente esa sesión; volver a conectar la registra de nuevo.

Se incluyen fecha, responsable, campos de productos, kilos, taras, reportes, crudos y los cuadros de precio, hilos, nota y nombres alternativos. Los cuadros conservan su botón Guardar: anunciar que alguien escribe no significa que su borrador ya esté guardado. La presencia señala actividad, sin bloquear campos ni otorgar permisos.

Las ediciones de captura se agrupan durante 400–500 ms antes de enviarlas. Seguir escribiendo no reinicia ese plazo. El tiempo real depende de la red. La barra distingue pendientes, envío, errores y falta de conexión; “Sin cambios pendientes” describe esta copia, no certifica la conectividad de los demás.

Los productos, filas y crudos conservan su identidad para fusionar cambios independientes y para deshacer/rehacer acciones locales. Si dos personas cambian exactamente el mismo campo desde la misma base, la escritura confirmada prevalece y el editor informa del conflicto; no concatena los valores ni mezcla texto carácter por carácter. El historial sigue siendo local a la sesión. Esta implementación se inspira en la experiencia colaborativa de documentos; no utiliza código interno de Google Docs ni implementa su editor de texto.

## Cómo se sincroniza

Todo el embarque vive en un solo documento (`embarques/{id}`) con un contador `rev`. El editor guarda la **base**: los campos del editor tal como estaban en el servidor la última vez que los adoptó.

Una sola función pura, `fusionarDocEditor` (`src/utils/embarqueFusion.js`), decide qué queda cuando dos pantallas editaron a la vez: gana lo local en lo que esta pantalla cambió desde su base, salvo que el servidor haya cambiado ese mismo campo a otro valor. Se usa en tres lugares:

1. **Al subir** (`escribirEdicionFusionada`, `src/services/embarqueEscritura.js`): la transacción lee el documento, fusiona (base, local, servidor) y escribe el resultado ahí mismo. Si otro editor confirma entre la lectura y la escritura, se reintenta enseguida con lo que haya en pantalla en ese momento (hasta 8 intentos; después, un reintento breve sin mostrar error).
2. **Al recibir** un snapshot o confirmar una subida (`aplicarDocRemoto`): fusiona (base, pantalla, servidor) y aplica el resultado **en sitio** (`src/utils/embarqueParche.js`): cada producto, fila y crudo conserva su objeto en memoria. Un cuadro de precio, hilos, nota o nombre alternativo abierto sigue apuntando al renglón vivo; si otra persona eliminó ese renglón, al guardar se avisa en vez de guardar al vacío.
3. **En la cola offline** (`EmbarquesSync.drain`): los pendientes de un editor ya cerrado que guardaron su base suben fusionados aunque el servidor haya avanzado. Solo quedan como “conflicto” los registros sin base o con campos pendientes de Rendimientos.

Reglas de recepción:

- Un snapshot se aplica de inmediato aunque haya cambios locales sin subir; quien teclea sin parar sigue viendo a los demás.
- Mientras una subida viaja, lo que llega se guarda y se aplica al terminar, ya con la base correcta. No se descarta.
- Se ignora el snapshot cuya revisión ya se adoptó: el eco propio y el atrasado (el canal de escucha puede entregar la revisión N después de confirmar la N+1). Un documento sin `rev` siempre se aplica.
- Abrir o recibir un embarque nunca lo deja con cambios pendientes ni provoca una escritura.
- La ventana que **crea** el embarque (desde «Nuevo embarque») se suscribe en cuanto su primera subida se confirma (`suscribirEmbarque`). Antes solo se suscribían las ventanas que abrían un embarque ya existente: quien lo creaba no veía lo que los demás guardaban hasta recargar la página.

El respaldo en `respaldos_emergencia` (`razonRespaldo: cambios_locales_antes_de_combinar`) se escribe solo cuando de verdad se descartó un valor local, como mucho uno cada 20 s por editor. Cruzarse al guardar celdas distintas no es un conflicto y no deja respaldo.

Las filas cuyas identidades no coinciden con sus valores (documentos escritos por una versión vieja) se reparan de forma determinista en lugar de lanzar un error.

## Presencia y reconexión

`EmbarquePresencia` posee una sesión UUID por instancia de la vista. Publica en `presenciaEmbarques/{embarqueId}/sesiones/{sesionId}` y escucha `.info/connected`. Registra `onDisconnect().remove()` antes de publicar y renueva el registro tras cada reconexión. Al salir retira su nodo antes de cancelar esa limpieza. El foco se limpia al ocultar la ventana y se recupera al volver.

El registro contiene usuario, identidad del campo, indicador de escritura y fecha del servidor; no contiene el valor del input. Las filas se identifican por ID, no por posición. Un latido cada 30 segundos mantiene la presencia, y los registros sin actualización durante 90 segundos dejan de mostrarse. El indicador de escritura se apaga tras 1,5 segundos sin entrada y el receptor descarta indicadores antiguos. Se utiliza el desfase de reloj del servidor para la caducidad.

Los clientes antiguos deben recargarse para participar en esta presencia por sesión. No se han cambiado reglas ni permisos de Firebase. La verificación local no certifica las reglas del despliegue.

Referencia del protocolo: [presencia y desconexiones en Realtime Database](https://firebase.google.com/docs/database/web/offline-capabilities).

## Verificación local

Requiere Java 21 o superior (el Firebase CLI ya no acepta versiones anteriores) y Node 20. Iniciar ambos emuladores:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH" npx firebase emulators:start --only firestore,database --project demo-reypez-embarques --config scripts/firebase-embarques-test.json
```

En otra terminal:

```bash
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9005
npm run test:embarques-fusion          # motor puro, no necesita emulador
npm run test:embarques-colaboracion    # mixins reales + regresiones del motor
npm run test:embarques-presencia
npm run test:embarques-presencia-rtdb
npm run test:embarques-historial
node scripts/test-embarque-revision.cjs
node scripts/test-embarque-matriz.cjs
npm run build:web
```

`scripts/test-embarques-colaboracion-motor.cjs` tiene una prueba por cada fallo que tenía el motor anterior (datos de cuadros perdidos, casillas revertidas, snapshots descartados o atrasados, pendientes atorados en la cola).

### Simulación de varios editores

`scripts/sim-embarques-colaboracion.cjs` abre el mismo embarque en varios editores “sueltos” (listeners y temporizadores reales, latencia de red inyectada) que teclean, agregan y borran filas, productos y crudos al mismo tiempo. Al terminar comprueba que ninguna edición se perdió, que todas las pantallas ven lo mismo que el servidor, y mide cuánto tarda un cambio en llegar a las demás.

```bash
npm run sim:embarques-colaboracion -- --editores=3 --segundos=20 --latencia=150 --semillas=1,2,3 --escenario=mixto
```

Escenarios: `celdas` (solo teclear), `mixto` (teclear, filas, productos y crudos) y `conflicto` (todos escriben la misma celda; solo se exige convergencia). Sale con código distinto de cero si hay pérdidas o divergencias.

Las pruebas RTDB usan dos SDKs y conexiones independientes para comprobar misma cuenta, foco, escritura continua, desconexión, reconexión y cierre. Las pruebas Firestore ejercitan los mixins y watchers reales, la recepción por snapshot, la captura continua y la conservación de cambios ajenos al deshacer. Los casos de inscripción tardía y fallo de limpieza usan transporte simulado. La prueba DOM no necesita canvas. Ninguna de estas pruebas usa embarques de producción.

Prueba manual: mantener abiertas ambas ventanas, editar kilos en una y taras o crudos en la otra, revisar los indicadores y usar Deshacer/Rehacer. Abrir un cuadro de precio en una ventana, capturar en la otra y guardar el precio: deben quedar ambos. Después cerrar una ventana y comprobar que desaparece de la barra. Para probar cortes de red sin tocar datos reales, usar las pruebas de emulador anteriores.
