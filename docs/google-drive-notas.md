# Respaldo de notas de embarques en Google Drive

ReyPez conserva cada nota localmente y agrega una copia a una cola IndexedDB. Al recuperar conexión, la aplicación sube las notas pendientes a la carpeta compartida seleccionada en Drive y conserva las que fallen para reintentar. Las carpetas remotas siguen `Embarques/año/mes/día/Cliente-fecha.pdf`.

## Preparación de Google Cloud

1. En el proyecto `reypezapp-1ced2`, habilita **Google Drive API** y **Google Picker API**.
2. Configura la pantalla de consentimiento OAuth y agrega como usuarios de prueba las cuentas del equipo si el proyecto sigue en pruebas.
3. Crea los clientes OAuth de escritorio de macOS y Windows, y un cliente OAuth de tipo **Aplicación web**. Este último debe aceptar `https://immense-river-48759.herokuapp.com` y `http://localhost:8080` como orígenes autorizados.
4. Crea una clave de API para Picker restringida a **Sitios web** (`https://immense-river-48759.herokuapp.com/*`, `http://localhost:8080/*` y `https://docs.google.com/*`) y restringida a **Google Picker API**. Configura esa clave como `VUE_APP_GOOGLE_PICKER_API_KEY` al compilar la web. No uses una clave sin restricciones.
5. Comparte la carpeta raíz del negocio con todas las cuentas de Google del equipo y dales permiso para agregar archivos.

La conexión usa el permiso limitado `drive.file`. En cada equipo, cada persona inicia sesión con Google y selecciona la misma carpeta compartida con el selector de Drive. Google autoriza así a ReyPez a trabajar con esa carpeta sin pedir acceso general a todo el Drive. Agrega cada cuenta del equipo como usuario de prueba mientras la pantalla OAuth siga en modo de prueba.

## En ReyPez

Abre el panel de historial sin conexión y despliega **Notas en Google Drive**. En escritorio, el ID OAuth correspondiente al equipo ya está configurado; solo se cambia desde Configuración avanzada. En web, el ID de cliente y la clave de Picker vienen de la configuración de compilación. Elige **Conectar y elegir carpeta compartida**, autoriza ReyPez y selecciona la carpeta raíz `Embarques`. Haz lo mismo en cada equipo con una cuenta a la que se haya compartido esa carpeta.

Cuando se crea el resumen, ReyPez genera una nota PDF por cliente y la conserva en una cola local hasta que se pueda subir. En el navegador, la cola está en IndexedDB y la carpeta elegida en localStorage; el token OAuth vive solo en memoria por seguridad. Por ello, después de recargar o cerrar la web es necesario presionar **Autorizar y subir pendientes** para reanudar la carga. En las apps instaladas, la autorización persistente queda en el almacén seguro del sistema operativo. Una nota con el mismo nombre que un archivo ya existente en Drive pide confirmación antes de reemplazarlo. La cola conserva lo pendiente hasta completar la carga.

## Confirmación y diagnóstico

Una nota solo sale de la cola después de subir sus bytes por `/upload/drive/v3/files` y consultar el archivo en Drive para verificar que es PDF y que su tamaño coincide. Una respuesta de metadatos sin contenido nunca se considera una subida completada. Los reintentos conservan el identificador de carga para recuperar una subida interrumpida, y una confirmación anterior no elimina una nota regenerada mientras estaba subiendo.

El panel indica expresamente cuándo falta conectar la cuenta, cuántos PDF permanecen únicamente en este equipo y cuál fue la última nota verificada. La página de regreso desde Google confirma la conexión solo después de intercambiar el código y validar la carpeta. El enlace Abrir carpeta en Drive permite revisar el resultado. Una autorización vencida conserva la cola y pide reconectar.

Verificación automatizada: `npm run test:drive-notas` cubre el contrato de carga de archivos, reemplazos, archivos incompletos, autorización de escritorio y errores de intercambio, reintentos, ediciones concurrentes y conexión/subida desde web. Las pruebas usan servicios simulados y no escriben en Drive real.

## Credenciales de escritorio para empaquetar

Los clientes OAuth de tipo Escritorio requieren enviar `client_secret` tanto en el intercambio inicial como al renovar el token. El dato se obtiene del JSON descargado al crear el secreto en Google Cloud. Guarda la configuración en `electron/google-drive-clients.local.json` (ignorado por Git), con claves `darwin` y `win32`, cada una con `clientId` y `clientSecret`. El empaquetado comprueba que existe la configuración de la plataforma; no genera instaladores incompletos. Este archivo va únicamente en el proceso principal del instalador nativo y no se importa en el frontend ni en la web. Como explica Google, una app instalada no puede mantener confidencial un secreto distribuido: la protección de la autorización del usuario proviene del flujo PKCE, de su consentimiento y del almacenamiento cifrado de sus tokens. No confundir esta configuración de cliente de escritorio con el secreto del cliente web, que nunca debe distribuirse.
# Resumen del embarque

Al crear el resumen final se guarda también su PDF en la cola persistente de Drive,
junto con las notas por cliente. Usa el nombre `Resumen-Embarque-Porro-25-sept-26.pdf`
(el responsable de carga se omite si está vacío). La fecha procede del embarque,
tanto para el encabezado como para el nombre y las carpetas de año/mes/día.

En escritorio, el mismo PDF se guarda en `Documentos/embarques/2026/septiembre/25/`
y se abre para imprimir. Si el archivo local ya existe, se pregunta si debe reemplazarse.
En web se descarga con ese nombre; el navegador administra el destino de descarga.
La copia en Drive utiliza la carpeta compartida configurada y la misma estructura de fecha.

## Actualizaciones y conexión desde la web

La web muestra la sección de Drive desplegada en Conexión y respaldos. Durante
la autorización se cierra temporalmente ese diálogo para permitir interacción
con el selector de carpetas de Google; vuelve a abrirse al terminar.

Cuando hay una versión descargada esperando, aparece **Actualizar web**. Antes
de activarla se guarda el editor actual. Si hay otras pestañas del mismo sitio,
se pide cerrarlas para evitar interrumpir otro embarque. No se borran IndexedDB
ni las colas de embarques o PDF.

Una web anterior sin ese aviso puede seguir mostrando el código antiguo aunque
se recargue. Guarda el trabajo, cierra las pestañas de ese sitio y vuelve a abrirlo.
No borres los datos del navegador para actualizar.

Si Picker muestra `The API developer key is invalid`, comprueba que el valor de
`VUE_APP_GOOGLE_PICKER_API_KEY` coincide exactamente con la clave existente
**ReyPez Picker Web** en Google Cloud, tanto en `.env.local` como en Heroku. La
clave se incorpora durante la compilación: cambiar la variable requiere volver
a compilar/publicar. Mantén las restricciones de sitios y de Google Picker API.
