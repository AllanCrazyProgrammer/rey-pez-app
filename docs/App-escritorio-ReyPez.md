# ReyPez de escritorio: abrir sin internet

Esta aplicación contiene todas las pantallas y herramientas dentro de la instalación. Abre desde su icono aunque no haya internet, aunque la web esté caída y aunque nunca se haya abierto la web en ese equipo. No necesita Node, una terminal, Chrome ni un servidor local instalado.

## Mac (Apple Silicon: M1, M2, M3, M4 y posteriores)

- Aplicación local: `~/Applications/ReyPez.app`.
- Acceso directo: `~/Desktop/ReyPez.app` (Escritorio).
- Instalador para trasladar a otra Mac: `release/offline-0.3.1/ReyPez-0.3.1-mac-arm64.dmg`.
- Abrir el DMG y arrastrar ReyPez a Aplicaciones. Luego abrir desde Aplicaciones o Spotlight. El instalador no necesita internet.

## Windows de 64 bits (Intel/AMD)

- Copiar `release/offline-0.3.1/ReyPez-0.3.1-win-x64.exe` a la PC, por USB o por el medio que prefieras.
- Ejecutarlo y seguir el asistente. Incluye la aplicación completa: no es un instalador que descargue la aplicación durante la instalación.
- Abrir **ReyPez** desde el escritorio o el menú Inicio.
- El instalador se generó desde Mac; la ejecución en Windows debe verificarse en una PC.

Son compilaciones de uso local sin certificado de distribución ni notarización. Al transferirlas, macOS o Windows pueden mostrar un aviso de editor no verificado. No se han desactivado protecciones del sistema para instalarlas.

## Embarques e internet

1. Iniciar sesión con el usuario habitual. El acceso local funciona sin conexión.
2. **Se pueden crear embarques nuevos incluso si es la primera apertura y no hay internet.**
3. Para tener los embarques anteriores de la nube, abrir la aplicación una vez con conexión, entrar a Embarques y esperar **Historial descargado en esta sesión**. La información que nunca llegó al equipo no puede obtenerse sin conexión.
4. A partir de ahí se pueden abrir y editar los embarques descargados sin conexión.
5. Con la aplicación abierta, los cambios pendientes se envían automáticamente al volver internet. Los conflictos entre equipos se conservan para revisión.
6. Se puede cerrar la ventana: primero confirma el guardado local. Si falla el disco o el guardado, mantiene abierta la ventana e informa el problema.

La aplicación de escritorio tiene sus propios datos locales; no comparte automáticamente los pendientes del navegador ni los de otra computadora. Si se corta internet mientras trabajas en la web, utiliza el respaldo descrito abajo para trasladar los pendientes sin conexión.

Los datos permanecen en la carpeta de usuario de Electron, fuera de la aplicación instalada. Reinstalar o actualizar la aplicación no debe borrar esa carpeta. No eliminar los datos locales si hay embarques pendientes de subir.

El trabajo sin conexión cubre la captura principal de embarques. Otros módulos que consultan o escriben directamente en Firebase todavía pueden necesitar internet. La aplicación completa abre sin internet, pero eso no convierte automáticamente todas sus operaciones en operaciones locales.

## Compilación y pruebas

- `npm run electron:mac`: compila y genera el DMG para Mac Apple Silicon.
- `npm run electron:win`: compila y genera el instalador NSIS para Windows x64.
- `npm run electron:assets`: compila únicamente las pantallas en `desktop-dist`.
- `npm run electron:local`: ejecuta las pantallas compiladas desde los archivos locales, sin servidor de desarrollo.
- `npm run electron:dev`: desarrollo con servidor explícito.
- `npm run test:desktop-offline`: abre la aplicación Mac empaquetada en un perfil temporal; bloquea toda conexión externa y verifica primera apertura, inicio de sesión, creación, cierre nativo, reinicio, edición y otro reinicio. No escribe datos de prueba a Firebase.

La compilación web sigue usando `dist` y navegación normal. La de escritorio usa `desktop-dist` y rutas con `#`, que permiten recargar desde archivos locales. El arranque de producción usa `BrowserWindow.loadFile`; solo el desarrollo con `ELECTRON_DEV_URL` usa un servidor. El instalador incluye los scripts de PDF y dibujo que antes dependían de un CDN.

## Pasar pendientes de la web a la aplicación sin internet

1. En la web, dentro de Embarques, pulsa **Exportar pendientes**. Si estás editando, primero se guarda la captura actual. Busca el archivo `ReyPez-pendientes-….json` en Descargas.
2. Abre ReyPez de escritorio y vuelve a la lista de Embarques. Pulsa **Importar respaldo** y selecciona el archivo. Para otra computadora puedes copiarlo por USB.
3. Revisa el resumen y confirma la importación. El resultado indica cuántos se importaron, cuáles ya estaban importados y cuáles se conservaron sin reemplazar por tener cambios pendientes o más recientes.
4. Abre los embarques importados y continúa trabajando en la aplicación de escritorio. Con internet y la aplicación abierta, se subirán por la cola habitual.

Importar el mismo contenido dos veces no duplica el embarque ni deshace ediciones posteriores. Una falla de escritura cancela toda la importación. El archivo también puede contener eliminaciones pendientes, que se indican antes de confirmar.

Exportar no borra ni confirma los pendientes del navegador. Después de verificar la importación, continúa en la aplicación de escritorio y evita editar el mismo embarque en ambos lugares. Cuando ambos se conecten podrían aparecer conflictos de revisión; conserva el respaldo y revisa el resultado. Este traslado no descarga cambios que nunca estuvieron en el equipo.

Los botones de la web requieren publicar esta versión mediante el despliegue habitual. Una web anterior que ya esté desconectada no puede recibir esta actualización hasta recuperar conexión.

Prueba de transferencia: `npm run test:embarques-transfer`. Para incluir el recorrido hasta la app empaquetada, definir `REYPEZ_DESKTOP_EXECUTABLE` con la ruta de su ejecutable. Usa perfiles temporales y bloquea las conexiones externas.

Las opciones de conexión, descarga del historial y transferencia están en **Respaldos**, dentro del menú. En el editor se abren con el icono de nube junto a **Menú**. El panel permanece oculto hasta abrirlo; se cierra con **✕** o **Esc**.

La versión 0.3.1 abre los embarques directamente, carga las pantallas bajo demanda y descarga el historial por lotes, evitando reescribir registros sin cambios y reconstruir la lista al estar inactiva.

Medición reproducible: `node scripts/benchmark-desktop.cjs` abre un perfil temporal, bloquea la red y genera 600 embarques sintéticos con 20 productos cada uno. `REYPEZ_DESKTOP_EXECUTABLE` permite comparar ejecutables. Las cifras dependen del equipo y su carga; no mide tiempos de la nube. Las fuentes tipográficas también se incluyen localmente.

En escritorio, los fondos y señales decorativas permanecen estáticos y la lista no recalcula efectos 3D al desplazarse. Las animaciones de carga siguen disponibles. Se eliminó la precarga automática de todos los módulos al arrancar; el historial y los archivos para trabajo sin conexión mantienen su descarga habitual.

Comparación de referencia en esta Mac (600 embarques sintéticos; red bloqueada): apertura desde la lista, 7.887 ms en 0.3.0 y 217 ms en 0.3.1; lista tras recargar, 308 ms y 260 ms. La muestra de CPU acumulada del renderizador y GPU durante dos segundos de reposo fue 78 % y 14 %, respectivamente. Son ejecuciones individuales, no garantías ni medidas de la base de producción. El arranque completo varió entre ejecuciones, por lo que no se atribuye una mejora porcentual de arranque.
