# Sistema de Gestión de Guardado con Rate Limiting

## Descripción General

El `SaveManager` es un servicio robusto diseñado para manejar las operaciones de guardado en Firestore con control de tasa automático, evitando errores 429 (Too Many Requests).

## Características Principales

### 1. **Rate Limiting Inteligente**
- **Debounce automático**: Agrupa operaciones con un mínimo de 10 segundos entre guardados
- **Control de tasa**: Limita las operaciones para evitar exceder los límites de Firestore
- **Procesamiento por lotes**: Agrupa múltiples operaciones en lotes de hasta 5 operaciones

### 2. **Manejo de Errores Robusto**
- **Backoff exponencial**: Incrementa el tiempo de espera entre reintentos cuando hay errores
- **Detección de cuota agotada**: Detecta errores 429 y pausa las operaciones automáticamente
- **Reintentos automáticos**: Hasta 5 reintentos con incremento progresivo del tiempo de espera

### 3. **Sistema de Prioridades**
- **Alta prioridad**: Para cambios críticos (se procesan incluso con cuota limitada)
- **Normal**: Para cambios estándar
- **Baja prioridad**: Para operaciones que pueden esperar

### 4. **Feedback Visual**
El componente `SaveStatusIndicator` proporciona retroalimentación visual en tiempo real:
- **Indicador de guardado**: Muestra cuando se están guardando cambios
- **Estado de éxito**: Confirma cuando los cambios se han guardado
- **Alertas de error**: Notifica problemas de guardado
- **Indicador de cuota**: Informa cuando se alcanza el límite de operaciones

## Configuración Actual (Optimizada para Guardado Rápido)

```javascript
{
  minDebounceTime: 2000,     // 2 segundos mínimo entre guardados - REDUCIDO para mayor rapidez
  maxDebounceTime: 30000,    // 30 segundos máximo de espera - REDUCIDO
  baseBackoffTime: 3000,     // 3 segundos de backoff inicial - REDUCIDO
  maxBackoffTime: 120000,    // 2 minutos de backoff máximo - REDUCIDO
  maxRetries: 5,             // Máximo 5 reintentos
  batchSize: 5,              // 5 operaciones por lote
  quotaResetTime: 45000      // 45 segundos para reset de cuota - REDUCIDO
}
```

### Guardado Forzado al Cambiar de Ruta

El sistema ahora incluye guardado automático cuando:
- El usuario navega a otra página (como Rendimientos)
- Se cierra la pestaña o ventana del navegador
- Se cambia de ruta dentro de la aplicación

Método disponible: `saveManager.forceProcessAll()` - Procesa todas las operaciones pendientes inmediatamente.

## Uso en NuevoEmbarque.vue

### Inicialización
El SaveManager se inicializa automáticamente en el hook `created()` del componente.

### Programación de Guardados
```javascript
this.saveManager.scheduleSave(
  `embarque-${this.embarqueId}`, // Clave única
  operacionGuardado,              // Función de guardado
  {
    priority: 'normal',           // Prioridad
    merge: true,                  // Fusionar con operaciones pendientes
    immediate: false              // No ejecutar inmediatamente
  }
);
```

## Beneficios

1. **Prevención de Errores 429**: El sistema evita proactivamente exceder los límites de tasa
2. **Mejor Experiencia de Usuario**: Los usuarios ven el estado del guardado en tiempo real
3. **Confiabilidad**: Los reintentos automáticos aseguran que los datos se guarden eventualmente
4. **Optimización de Recursos**: El procesamiento por lotes reduce el número de llamadas a Firestore

## Monitoreo

El sistema registra automáticamente:
- Total de guardados exitosos
- Guardados fallidos
- Errores de cuota
- Último error ocurrido
- Tiempo del último guardado exitoso

## Recomendaciones

1. **No desactivar el SaveManager**: Es esencial para evitar errores 429
2. **Respetar las prioridades**: Usar alta prioridad solo para operaciones críticas
3. **Monitorear los logs**: Revisar la consola para detectar patrones de errores
4. **Ajustar configuración si es necesario**: Los tiempos pueden ajustarse según el uso

## Solución de Problemas

### Si persisten los errores 429:
1. Aumentar `minDebounceTime` a 15-20 segundos
2. Reducir `batchSize` a 3 operaciones
3. Aumentar `quotaResetTime` a 2-3 minutos

### Si los guardados son muy lentos:
1. Verificar que no haya operaciones duplicadas
2. Revisar que se esté usando la prioridad correcta
3. Considerar reducir `minDebounceTime` (con precaución)

## Mantenimiento

El SaveManager es un singleton, por lo que:
- Solo existe una instancia por aplicación
- Se mantiene el estado entre componentes
- No requiere limpieza manual (excepto cancelar operaciones pendientes)

## Correcciones Recientes

### Error: Cannot read properties of null (reading 'getStatus') - v2
**Problema**: Múltiples instancias del SaveStatusIndicator causaban conflictos cuando los listeners de instancias anteriores seguían activos después de que el componente se destruía.

**Solución Implementada v2**:
1. **Sistema de instancia única**: Solo una instancia del SaveStatusIndicator puede estar activa a la vez
2. **Gestión mejorada de listeners**: Los callbacks ahora usan closures para capturar el contexto correcto
3. **Limpieza robusta**: Los listeners se desuscriben correctamente cuando el componente se destruye
4. **Verificación de instancia activa**: Los callbacks verifican si pertenecen a la instancia activa antes de ejecutarse
5. **Logging condicional**: Sistema de debug con flag `DEBUG_MODE` para reducir el ruido en producción

**Características de la solución**:
- **ID único por componente**: Cada instancia tiene un ID único para tracking
- **Variable global**: `window.__saveStatusIndicatorActive` rastrea la instancia activa
- **Array de unsubscribers**: Almacena funciones para limpiar listeners
- **Callbacks con contexto capturado**: Evita problemas de referencias null
- **Verificaciones múltiples**: Verifica instancia activa, componente montado y SaveManager disponible

**Cambios en SaveStatusIndicator.vue**:
- Sistema de instancia única con ID global
- Callbacks mejorados con verificación de contexto
- Limpieza completa de listeners en `beforeDestroy`
- Logging condicional basado en `DEBUG_MODE`
- Manejo robusto de casos edge cuando múltiples componentes intentan inicializarse

**Para activar el modo debug**:
```javascript
// En SaveStatusIndicator.vue, cambiar:
const DEBUG_MODE = true; // Para ver logs detallados
```

---

*Última actualización: Solución completa para múltiples instancias y gestión de listeners*
# Historial de edición de embarques

Deshacer/Rehacer cubre fecha, carga, camión, altas/bajas de productos, campos
individuales, filas de kilos/taras, taras extra, reportes taras/bolsas y grupos
/items de crudos. El historial es local a la sesión (100 acciones); se reinicia
al recargar o cambiar de embarque. No incluye Rendimientos, Costos ni historial
persistente de versiones. No registra el reordenamiento de filas.

Las pesadas tienen IDs paralelos a las listas numéricas existentes:
`pesadasIds` identifica cada par tara/kilos, `reportesIds` cada par tara/bolsas,
y `tarasExtraIds` cada tara extra. Grupos e items de crudos tienen `id`.
Los documentos anteriores se identifican determinísticamente al cargar; las
altas reciben UUID. Los eventos de agregar/borrar modifican IDs y valores juntos.
Los cálculos y PDFs siguen consumiendo las listas numéricas habituales.

El historial y la fusión usan el mismo árbol por identidad y cambios
condicionales antes/después. Los snapshots remotos no crean acciones locales.
Si otro editor cambió el mismo valor, o completó una fila que se intenta borrar,
se conserva su estado. Deshacer no recrea padres eliminados. La pantalla muestra
un aviso cuando una fusión o reversión omite operaciones en conflicto. Las
transacciones existentes verifican la base del documento y reintentan después
de combinar; no se escriben listas antiguas a ciegas. La lápida de un producto
viaja en la misma transacción que su eliminación/restauración; `null` marca una
restauración. Serializar no crea productos vacíos automáticamente.

Todos los editores del embarque deben usar esta versión. Clientes antiguos no
mantienen las identidades de las filas y no ofrecen esta protección. No es una
migración de toda la base ni modifica reglas de acceso. La cola offline conserva
los conflictos para revisión al reabrir el editor, y el editor recupera la base
anterior al guardado pendiente para combinarla con el servidor.

## Pruebas

- `npm run test:embarques-historial`: operaciones por identidad, valores repetidos,
  crudos, restauraciones, conflictos y watchers reales de Vue.
- Emulador: `firebase emulators:start --only firestore --project demo-reypez-embarques --config scripts/firebase-embarques-test.json` (Java 21; usar una versión de Node compatible con la CLI).
- Con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085`, ejecutar
  `npm run test:embarques-colaboracion` y `node scripts/test-embarque-matriz.cjs`.
  La primera suite rechaza destinos que no sean loopback y usa exclusivamente
  el proyecto ficticio `demo-reypez-embarques`. Prueba dos clientes del SDK,
  transacciones, listener onSnapshot, undo durante una confirmación en vuelo
  y reapertura de una copia pendiente. Su almacenamiento offline es en memoria;
  no valida IndexedDB, las reglas de producción ni navegadores/dispositivos reales.

La aplicación local normal sigue conectada al Firebase configurado en el repo;
la variable del emulador solo afecta estas pruebas aisladas.
