# ReyPez Inventarios para Android

Aplicación Android con pantallas propias para existencias y movimientos de limpios
y crudos. Los editores móviles heredan la lógica de `Sacadas.vue` y
`RegistroCrudos.vue`; los inventarios reutilizan el cálculo de `Existencias.vue`
y `ExistenciasCrudos.vue`. Conserva la configuración de Firebase y el acceso de ReyPez.

- Limpios: captura kilos y cajas de 20 kg, proveedor/maquila, medida y cuarto frío.
- Crudos: captura únicamente kilos, proveedor, producto y cuarto frío.
- Historial por fecha; abre el registro existente para agregar movimientos de hoy.
- Cambios en las colecciones actuales `sacadas` y `existenciasCrudos`;
  no mantiene un inventario paralelo ni modifica el esquema de datos.
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
- Accesos desde inventario al registro de hoy sin crear días duplicados.
- Fechas de Timestamp convertidas al día del negocio en México; una fecha
  ausente o inválida muestra «Sin fecha» y nunca se sustituye por hoy.

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
```

Las pruebas compilan pantallas reales contra un adaptador de Firestore aislado.
Verifican inicio de sesión, captura de kilos/cajas, persistencia en las colecciones
compartidas, existencias, navegación con cambios pendientes y recuperación de
errores. No leen ni escriben en Firebase. Generan capturas en la carpeta temporal
indicada al iniciar; `INVENTARIOS_CHROME_PATH` permite seleccionar Chrome/Chromium.
La prueba de arranque carga los archivos reales de `android-dist` y verifica el
acceso de producción sin conexiones externas. Primero ejecuta `npm run build:android:web`.

La configuración de producción se conecta al Firebase actual. Los guardados
conservan las reglas de la aplicación existente; esta versión no añade resolución
de ediciones simultáneas del mismo registro. Sin conexión, la caché puede mostrar
datos anteriores; no garantiza captura ni confirmación de guardados sin internet.
Debe verificarse la conexión y el flujo de trabajo en un teléfono antes del uso
diario con datos reales.
