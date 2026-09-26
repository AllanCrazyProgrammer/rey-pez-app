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

Abre el panel de historial sin conexión y despliega **Notas en Google Drive**. En escritorio, pega el ID OAuth correspondiente al equipo. En web, el ID de cliente y la clave de Picker vienen de la configuración de compilación. Elige **Conectar y elegir carpeta compartida**, autoriza ReyPez y selecciona la carpeta raíz `Embarques`. Haz lo mismo en cada equipo con una cuenta a la que se haya compartido esa carpeta.

Cuando se crea el resumen, ReyPez genera una nota PDF por cliente y la conserva en una cola local hasta que se pueda subir. En el navegador, la cola está en IndexedDB y la carpeta elegida en localStorage; el token OAuth vive solo en memoria por seguridad. Por ello, después de recargar o cerrar la web es necesario presionar **Autorizar y subir pendientes** para reanudar la carga. En las apps instaladas, la autorización persistente queda en el almacén seguro del sistema operativo. Una nota con el mismo nombre que un archivo ya existente en Drive pide confirmación antes de reemplazarlo. La cola conserva lo pendiente hasta completar la carga.
