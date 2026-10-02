# ReyPez Inventarios para Android

Aplicación Android con pantallas propias para existencias y movimientos de limpios
y crudos. Los editores móviles heredan la lógica de `Sacadas.vue` y
`RegistroCrudos.vue`; los inventarios reutilizan el cálculo de `Existencias.vue`
y `ExistenciasCrudos.vue`. Conserva la configuración de Firebase y el acceso de ReyPez.

- Limpios: captura kilos y cajas de 20 kg, proveedor/maquila, medida y cuarto frío.
- Crudos: captura únicamente kilos, proveedor, producto y cuarto frío.
- Historial por fecha; abre el registro existente para agregar movimientos de hoy.
- Cambios en las colecciones actuales `sacadas` y `existenciasCrudos`;
  no mantiene un inventario paralelo ni cambia los campos de los registros.
- Sin pantallas de rendimientos, merma o comparación con embarques.
- Advertencia al salir del editor con movimientos sin guardar.
- Tarjetas de existencias, búsqueda por proveedor/medida y filtros por cuarto.
- Limpios agrupados por medida con total disponible en kg/cajas; al abrir una
  medida se ven las marcas/proveedores y cada entrada, fecha, cuarto y saldo.
- Ozuna, Joselito y los orígenes marcados como maquila (en registros o catálogo)
  tienen apartados individuales, separados de las medidas de proveedores.
- Pestaña Resumen en cada día de limpios con salidas totales por medida,
  detallando proveedores y sus subtotales; las maquilas aparecen por separado,
  en kg y cajas. Incluye cambios locales sin guardar.
- Captura con pestañas Entrada/Salida, precio opcional y guardado fijo.
- Abrir un día muestra Salidas por defecto; el acceso Entrada desde inventario
  abre directamente la captura de entradas.
- Salidas del día con la última captura primero dentro de cada apartado;
  el apartado que contiene la captura más reciente se muestra al inicio.
- Accesos desde inventario al registro de hoy sin crear días duplicados.
- Borrar un día de limpios desde el historial, confirmando la fecha y las
  cantidades de entradas/salidas. La copia a `papelera`, el borrado del registro
  y la liberación de su fecha son una sola transacción; una copia fallida impide
  el borrado. Los días duplicados anteriores se señalan para revisión manual.
- Guardado compartido de limpios con índice `sacadasDias/<YYYY-MM-DD>` que apunta
  al ID del registro. Impide crear la misma fecha simultáneamente, cambiar un
  día a una fecha ocupada o guardar desde un editor cuyo día fue borrado.
  Consulta registros anteriores al servidor y mantiene sus IDs y contenido.
- En movimientos de limpios, «Registrar para mañana» abre Salidas con la fecha
  del día siguiente en México. Reutiliza el registro de esa fecha si ya existe
  y muestra la fecha futura en el editor; se guarda al terminar la captura.
- Fechas de Timestamp convertidas al día del negocio en México; una fecha
  ausente o inválida muestra «Sin fecha» y nunca se sustituye por hoy.
- Apariencia oscura con marcos naranja, verde neón y acentos amarillos;
  tipografías Orbitron y Share Tech Mono incluidas en el APK, sin descargas.
- Pulsos electrónicos breves al tocar botones, pestañas, accesos y desgloses.
  Se generan localmente; el icono de altavoz permite silenciarlos y recuerda
  la preferencia al volver a abrir la app. No suenan al escribir o desplazar.

## Compilar

Requiere Node.js, Java 17 y Android SDK con plataforma 34. `npm install` instala
las dependencias. Configura `ANDROID_HOME` si el SDK no está en una ubicación
habitual. Desde la raíz del proyecto:

```sh
npm run android:apk
```

El comando compila la entrada móvil en `android-dist`, sincroniza únicamente
Android y genera un APK de prueba firmado con la clave de depuración local en
`release/android/ReyPez-Inventarios-<versión>.apk`. Puedes copiarlo al teléfono
e instalarlo habilitando la instalación desde esa aplicación de archivos.
No es una publicación en Google Play ni un paquete con firma de distribución.

```sh
npm run build:android:web
npm run android:sync
npm run android:open
```

`capacitor.config.js` usa `android-dist` cuando `VUE_APP_TARGET=android` y la
configuración JSON existente para los demás destinos. La web y el escritorio
conservan sus entradas y menús completos. Android usa rutas hash para abrir
las pantallas desde los archivos incluidos en el APK.

## Verificación

```sh
npm run test:android:inventarios
npm run test:android:arranque
npm run test:sacadas:dias
```

Las pruebas compilan pantallas reales contra un adaptador de Firestore aislado.
Verifican inicio de sesión, captura de kilos/cajas, persistencia en las colecciones
compartidas, existencias, navegación con cambios pendientes y recuperación de
errores. No leen ni escriben en Firebase. Generan capturas en la carpeta temporal
indicada al iniciar; `INVENTARIOS_CHROME_PATH` permite seleccionar Chrome/Chromium.
La prueba de arranque carga los archivos reales de `android-dist` y verifica el
acceso de producción sin conexiones externas. Primero ejecuta `npm run build:android:web`.
La prueba de días inicia un emulador Firestore local con el proyecto de prueba
`demo-reypez-inventarios`; verifica concurrencia real y borrado atómico. Requiere
Java y el JAR del emulador en la caché de Firebase, o `FIRESTORE_EMULATOR_JAR`.

La configuración de producción se conecta al Firebase actual. Los guardados
conservan las reglas existentes; los clientes actualizados usan el índice de
fechas en la transacción. Versiones anteriores que escriban directamente sin
ese índice no participan en esta protección. No se combinan ediciones simultáneas
del contenido del mismo registro. Sin conexión, la caché puede mostrar datos
anteriores; el guardado de limpios requiere confirmar la fecha al servidor.
Debe verificarse la conexión y el flujo de trabajo en un teléfono antes del uso
diario con datos reales.
