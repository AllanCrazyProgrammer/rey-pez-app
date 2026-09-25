# Embarques sin internet

También hay una [aplicación de escritorio para Mac y Windows](App-escritorio-ReyPez.md) que abre desde archivos instalados y no requiere publicar ni cargar la web.

## Preparar cada equipo

1. Publicar esta versión de la web usando el proceso habitual (`npm run build:web`). Servir `dist` por HTTPS, incluyendo `service-worker.js`, el manifiesto, los iconos y la carpeta `vendor`. El servidor debe devolver `index.html` para las rutas de Vue. No aplicar una caché permanente a `service-worker.js` ni a `index.html`.
2. Con internet, iniciar sesión y entrar a Embarques. La aplicación descarga todos los embarques por páginas de 100, incluidos los anteriores al límite de 100 de la lista original.
3. Esperar los mensajes **Aplicación disponible sin internet** e **Historial descargado en esta sesión**. El número de disponibles indica cuántos registros están en este equipo. Si falla la descarga, pulsar **Descargar / actualizar historial** al recuperar conexión.
4. Opcional: usar la opción **Instalar aplicación** de Chrome/Edge o **Agregar a inicio** en el dispositivo. No hace falta instalar Electron para este flujo.

La primera descarga necesita internet. Los datos se guardan por navegador, perfil y dominio; otro equipo debe prepararse por separado. No utilizar navegación privada ni borrar los datos del sitio mientras haya cambios pendientes.

## Trabajo diario

- Se puede abrir la dirección de Embarques sin internet, consultar el historial descargado, abrir un embarque, modificar sus productos y crudos o crear uno nuevo.
- Las ediciones se guardan en IndexedDB antes de subirlas. Un fallo del almacenamiento produce una alerta y bloquea la navegación que no pueda guardar; no se reporta un guardado durable usando solo memoria.
- Al volver la conexión, el editor sube el embarque abierto. Una cola global envía los demás pendientes sin esperar a salir del editor; también se reintenta cada 15 segundos mientras la aplicación está abierta. Cerrar la aplicación conserva los cambios, pero para subirlos debe volver a abrirse con conexión.
- Si otro equipo cambió la revisión de un embarque pendiente, la cola lo conserva y muestra un enlace para abrirlo. El editor combina los cambios usando las bases guardadas de productos y crudos. Antes de combinar crea un respaldo de la versión local en `respaldos_emergencia`. La fusión existente prioriza cambios locales cuando ambos editaron el mismo campo; revisar el resultado si hubo trabajo simultáneo.
- El número de camión se calcula con el historial local. Dos dispositivos desconectados pueden asignar el mismo número; sus embarques siguen siendo distintos porque tienen identificadores únicos.

El alcance es la captura y edición principal de embarques. Consultas de pedidos nuevos, operaciones de cuentas, fletes, rendimientos y otras pantallas que escriben directamente a Firebase no se convierten automáticamente en funciones sin conexión. Sus datos nuevos requieren conexión.

## Transferir pendientes sin conexión

Usa **Exportar pendientes** y luego **Importar respaldo** en la lista del otro equipo o en la app de escritorio. Consulta el [procedimiento y protección de cambios](App-escritorio-ReyPez.md#pasar-pendientes-de-la-web-a-la-aplicación-sin-internet). La exportación conserva los pendientes originales; continúa trabajando en un solo lugar después del traslado.

## Diseño y mantenimiento

- `build/OfflinePlugin.js` precarga todo el resultado de la compilación, incluidas pantallas y componentes diferidos. Una versión nueva espera a que se cierren las pestañas de la anterior; no recarga el editor durante una captura.
- `EmbarquesOfflineService` usa transacciones locales para proteger pendientes de las descargas y compara la versión local al confirmar una subida. Una respuesta tardía no confirma ni borra una edición más reciente.
- `EmbarquesSync` descarga el historial, envía la cola con transacciones remotas, conserva campos de fletes/rendimientos y respalda las eliminaciones antes de confirmarlas.
- La caché persistente de Firestore conserva catálogos; los embarques se conservan además explícitamente en IndexedDB. No se confía únicamente en `navigator.onLine` para declarar una subida exitosa.
- Las copias locales de Fabric y PDFMake sustituyen los scripts CDN que bloqueaban el arranque sin internet. Las fuentes web externas tienen fallbacks del sistema.

Referencias: [Persistencia de Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline), [service workers y caché](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Verificación reproducible

```
npm run build:web
npm run test:embarques-offline
```

La prueba usa Chrome instalado en macOS por defecto; `CHROME_PATH` permite indicar otro ejecutable. Usa un perfil aislado, IndexedDB real y la compilación de producción. Bloquea servicios externos; no escribe datos de prueba en Firebase. La sincronización se verifica con una nube simulada y transacciones controladas, incluyendo errores, conflictos y una edición que ocurre durante una subida. La apertura y edición sin conexión se verifican sobre las pantallas reales.

La publicación y una prueba con dos dispositivos contra la base real quedan como validación del despliegue; no se modificaron datos de producción para probar.

Las opciones de conexión, descarga del historial y transferencia están en **Respaldos**, dentro del menú. En el editor se abren con el icono de nube junto a **Menú**. El panel permanece oculto hasta abrirlo; se cierra con **✕** o **Esc**.
