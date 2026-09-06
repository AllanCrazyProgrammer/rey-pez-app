# Pesadas de despicadoras

Acceso desde el menú de computadora y móvil: `/pesadas` (historial) y
`/pesadas/YYYY-MM-DD` (hoja diaria). Se usa la autenticación existente de la app.

## Captura y cálculo

- Cada fecha inicia con una fila y tres columnas. Enter en un nombre avanza o agrega
  la siguiente fila; Enter en kilos avanza a la siguiente persona sin crear filas.
- El recuadro con `+` al final de las columnas agrega otra columna directamente desde la tabla.
- Medida libre por columna; precio inicial $10/kg. Nombres independientes de préstamos.
- Kilos y precios admiten un decimal, punto o coma, sin redondear entradas inválidas.
  Máximo técnico por entrada: 1,000,000. Celdas vacías de kilos equivalen a cero.
- Se suman los productos usando enteros y se redondea el acumulado por persona a
  un decimal, con mitades hacia arriba. Después se descuenta $1 para baños.
- Cada fila con nombre cuenta para baños. Filas sin nombre no aparecen en el PDF.
  Pagos negativos, datos inválidos o kilos sin nombre impiden imprimir.
- La pantalla muestra total a pagar, pago promedio y la mejor despicadora
  (mayor pago final; en empate, mayor cantidad de kilos).
- PDF carta vertical: fecha repetida, pagos netos y Baños al final. La descarga,
  la vista previa y la impresión utilizan la misma definición.

## Datos y sincronización

Colección Firestore `pesadasDiarias`, documento por fecha en `America/Mexico_City`.
Campos: `fecha`, `creadoEn` (ISO), `actualizadoEn` (server timestamp), mapas
`personas`, `columnas` y `pesos[personaId][columnaId]`. Personas y columnas tienen
IDs estables y `orden`; se eliminan con `eliminado: true` para evitar que una
edición concurrente de una celda resucite una fila o columna eliminada.

Se guardan únicamente rutas de campos mediante `setDoc` con `mergeFields`.
La última escritura confirmada de una misma celda prevalece. Los totales se derivan.
Las ediciones locales se conservan como operaciones individuales bajo claves
`reypez.pesadas.pending.<fecha>:<id>`. Confirmar un lote retira solo sus operaciones,
sin eliminar ediciones posteriores ni las de otra pestaña. Se sincroniza después
de 650 ms de pausa, al confirmar una celda y al recuperar conexión.

Una fecha sin copia local requiere conexión para comprobar si existe antes de
ofrecer una hoja nueva. Los días con copia y los cambios pendientes se recuperan
localmente. Los errores de respaldo local y las entradas inválidas activan la
advertencia de salida. No hay migraciones ni cambios a préstamos o inventario.

## Comprobaciones

- `node scripts/test-pesadas.cjs`: cálculo, precisión, fechas, PDF, cola durable y Enter.
- `node scripts/test-pesadas-ui.cjs`: navegador con Playwright; compila las pantallas
  reales contra un adaptador de prueba aislado, sin escribir en Firebase.
  Requiere Playwright y Chromium; opcionalmente configurar `NODE_PATH` y
  `PESADAS_CHROME_PATH` para usar instalaciones existentes. Genera capturas y PDF
  de prueba en la carpeta temporal que imprime al iniciar.
- `npm run build:web`: compilación de producción.
