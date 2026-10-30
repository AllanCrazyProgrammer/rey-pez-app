# Colaboración en embarques

Abre el mismo embarque en dos ventanas con esta versión. Pueden usar la misma cuenta. La barra muestra las otras sesiones, su color, el campo activo y si están escribiendo. El campo también se resalta cuando está visible en tu pantalla. Cerrar una ventana retira únicamente esa sesión; volver a conectar la registra de nuevo.

Se incluyen fecha, responsable, campos de productos, kilos, taras, reportes, crudos y los cuadros de precio, hilos, nota y nombres alternativos. Los cuadros conservan su botón Guardar: anunciar que alguien escribe no significa que su borrador ya esté guardado. La presencia señala actividad, sin bloquear campos ni otorgar permisos.

Las ediciones de captura se agrupan durante 500–650 ms antes de intentar enviarlas. Seguir escribiendo no reinicia ese plazo. El tiempo real depende de la red y de los reintentos por conflictos. La barra distingue pendientes, envío, errores y falta de conexión; “Sin cambios pendientes” describe esta copia, no certifica la conectividad de los demás.

Los productos, filas y crudos conservan su identidad para fusionar cambios independientes y para deshacer/rehacer acciones locales. Si dos personas cambian exactamente el mismo campo desde la misma base, la escritura confirmada prevalece y el editor informa del conflicto; no concatena los valores ni mezcla texto carácter por carácter. El historial sigue siendo local a la sesión. Esta implementación se inspira en la experiencia colaborativa de documentos; no utiliza código interno de Google Docs ni implementa su editor de texto.

## Presencia y reconexión

`EmbarquePresencia` posee una sesión UUID por instancia de la vista. Publica en `presenciaEmbarques/{embarqueId}/sesiones/{sesionId}` y escucha `.info/connected`. Registra `onDisconnect().remove()` antes de publicar y renueva el registro tras cada reconexión. Al salir retira su nodo antes de cancelar esa limpieza. El foco se limpia al ocultar la ventana y se recupera al volver.

El registro contiene usuario, identidad del campo, indicador de escritura y fecha del servidor; no contiene el valor del input. Las filas se identifican por ID, no por posición. Un latido cada 30 segundos mantiene la presencia, y los registros sin actualización durante 90 segundos dejan de mostrarse. El indicador de escritura se apaga tras 1,5 segundos sin entrada y el receptor descarta indicadores antiguos. Se utiliza el desfase de reloj del servidor para la caducidad.

Los clientes antiguos deben recargarse para participar en esta presencia por sesión. No se han cambiado reglas ni permisos de Firebase. La verificación local no certifica las reglas del despliegue.

Referencia del protocolo: [presencia y desconexiones en Realtime Database](https://firebase.google.com/docs/database/web/offline-capabilities).

## Verificación local

Con Java y Firebase CLI disponibles, iniciar ambos emuladores:

```powershell
npx firebase emulators:start --only firestore,database --project demo-reypez-embarques --config scripts/firebase-embarques-test.json
```

En otra terminal:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8085'
$env:FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9005'
npm run test:embarques-presencia
npm run test:embarques-presencia-rtdb
npm run test:embarques-historial
npm run test:embarques-colaboracion
node scripts/test-embarque-matriz.cjs
npm run build:web
```

Las pruebas RTDB usan dos SDKs y conexiones independientes para comprobar misma cuenta, foco, escritura continua, desconexión, reconexión y cierre. Las pruebas Firestore ejercitan los mixins y watchers reales, la recepción por snapshot, la captura continua y la conservación de cambios ajenos al deshacer. Los casos de inscripción tardía y fallo de limpieza usan transporte simulado. La prueba DOM no necesita canvas. No se usan embarques de producción.

Prueba manual: mantener abiertas ambas ventanas, editar kilos en una y taras o crudos en la otra, revisar los indicadores y usar Deshacer/Rehacer. Después cerrar una ventana y comprobar que desaparece de la barra. Para probar cortes de red sin tocar datos reales, usar las pruebas de emulador anteriores.
