# Módulo de Gestión de Barcos - ACTUALIZADO

Este módulo permite administrar las deudas y gastos de los barcos "El Galileo" y "María Guadalupe".

## ✅ Funcionalidades Implementadas

### 1. **Cálculo Correcto de Costos**
- **Fórmula**: Cantidad × Precio Unitario = Total
- Campos en el formulario:
  - Descripción del producto/servicio
  - Cantidad (numérica, requerida)
  - Precio Unitario (requerido)
  - Total (calculado automáticamente)
- Recálculo automático al editar en la tabla

### 2. **Gestión Completa de Deudas**
- ✅ Crear nueva deuda con múltiples items
- ✅ Guardar correctamente en Firebase con nueva estructura
- ✅ Ver lista de deudas por barco
- ✅ Filtros avanzados (estado, proveedor, fechas)
- ✅ Edición en línea de items con recálculo automático

### 3. **Sistema de Abonos Completo**
- ✅ **Abonos específicos**: Asociados a deudas particulares
- ✅ **Abonos generales**: No asociados a deuda específica
- ✅ **Historial completo**: Ver todos los abonos con filtros
- ✅ Actualización automática de saldos pendientes

### 4. **Accesos Rápidos**
- ✅ Botón "Deuda Rápida" en el menú de barcos
- ✅ Botón "Abono General" en la lista de deudas
- ✅ Botón "Historial Completo" para ver todos los abonos

## Componentes

### 1. **BarcosMenu.vue**
- Selector de barco (El Galileo / María Guadalupe)
- Botones de acceso:
  - Lista de Deudas
  - Nueva Deuda
  - **Deuda Rápida** (nuevo)
  - **Gestión de Tripulantes** ⭐ **NUEVO**
  - Configurar Proveedores
- Modal de gestión de proveedores con tipos de servicio

### 2. **NuevaDeudaBarco.vue** 
- ✅ **Formulario mejorado** con cálculo cantidad × precio
- Selección de proveedor con colores
- Agregado de múltiples items con cálculo automático
- Abonos iniciales opcionales
- Validación completa antes de guardar

### 3. **ListaDeudasBarcos.vue**
- ✅ **Vista mejorada** de items con formato "cantidad × precio"
- Resumen de totales (deudas, abonado, pendiente)
- **Filtros avanzados**: estado, proveedor, fechas
- **Funciones de abono**:
  - Abono específico a deuda
  - **Abono general** (nuevo)
  - **Historial completo** (nuevo)
- Gestión de estados de deuda

## Base de Datos (Firebase)

### Colecciones Actualizadas:

1. **proveedoresBarcos**
   - nombre: string
   - telefono: string (opcional)
   - **tipo: string** (tipo de servicio - nuevo)
   - color: string
   - createdAt: timestamp

2. **deudasBarcos** 
   - barco: string ('galileo' o 'maria-guadalupe')
   - nombreBarco: string
   - proveedorId: string
   - nombreProveedor: string
   - fecha: string
   - **items: array actualizado**:
     - descripcion: string
     - **cantidad: number** (nuevo)
     - **precioUnitario: number** (nuevo)
     - **total: number** (nuevo)
   - totalDeuda: number
   - totalAbonado: number
   - saldoPendiente: number
   - estado: string
   - createdAt/updatedAt: timestamp

3. **abonosBarcos**
   - deudaId: string (null para abonos generales)
   - barco: string
   - nombreBarco: string
   - proveedorId: string
   - nombreProveedor: string
   - monto: number
   - descripcion: string
   - fecha: string
   - **tipo: string** ('general' o 'deuda' - nuevo)
   - createdAt: timestamp

4. **tripulantesBarcos** ⭐ **NUEVA COLECCIÓN**
   - nombre: string (requerido)
   - puesto: string (requerido - Capitán, Motorista, Marinero, Cocinero, Pescador, Otro)
   - estado: string ('activo' o 'inactivo') - por defecto 'activo'
   - barco: string ('galileo' o 'maria-guadalupe')
   - nombreBarco: string
   - totalPagado: number (calculado automáticamente)
   - totalPrestado: number (calculado automáticamente)
   - balance: number (calculado automáticamente)
   - createdAt/updatedAt: timestamp

5. **pagosTripulantes** ⭐ **NUEVA COLECCIÓN**
   - tripulanteId: string
   - tripulanteNombre: string
   - barco: string
   - nombreBarco: string
   - tipo: string ('prestamo' o 'pago') - 'prestamo' es el principal
   - monto: number
   - fecha: string
   - concepto: string (texto libre)
   - createdAt/updatedAt: timestamp

## Flujo de Uso

### Crear Nueva Deuda:
1. Seleccionar barco en el menú
2. Clic en "Nueva Deuda" o "Deuda Rápida"
3. Seleccionar proveedor
4. Agregar items con cantidad y precio unitario
5. Opcionalmente agregar abonos iniciales
6. Guardar (cálculos automáticos)

### Gestionar Abonos:
1. **Abono específico**: Desde lista de deudas → botón "Realizar Abono"
2. **Abono general**: Desde lista de deudas → botón "Abono General"
3. **Ver historial**: Botón "Historial Completo" con filtros

### Gestionar Tripulantes: ⭐ **NUEVO**
1. **Agregar tripulante**: Desde menú → "Gestión de Tripulantes" → "Nuevo Tripulante" (solo nombre y puesto)
2. **Registrar préstamos**: Desde lista de tripulantes → botón "🏦" → formulario de préstamos/abonos
3. **Ver historial**: Dentro del modal de préstamos, historial completo con filtros
4. **Editar información**: Botón "✏️" para modificar nombre y puesto del tripulante
5. **Cambiar estado**: Botón de activar/desactivar tripulante

### Características Destacadas:
- ✅ **Cálculos automáticos**: Cantidad × Precio = Total (deudas), Saldos automáticos (tripulantes)
- ✅ **Persistencia correcta**: Datos guardados con nueva estructura
- ✅ **Compatibilidad**: Maneja datos antiguos y nuevos
- ✅ **Interfaz moderna**: Diseño responsivo y intuitivo
- ✅ **Validaciones completas**: Evita errores de datos
- ✅ **Gestión completa**: Desde creación hasta pago total
- ✅ **Gestión de tripulación**: Control completo de tripulantes y sus préstamos por barco ⭐ **NUEVO**
- ✅ **Sistema de préstamos**: Registro detallado de préstamos y abonos ⭐ **NUEVO**

### 4. **ResumenMensualBarcos.vue** ⭐ **NUEVO**
- **Navegación temporal**: Botones anterior/siguiente y selector rápido de mes
- **Resumen general**: Métricas consolidadas (total gastado, deudas, saldo pendiente, proveedores activos)
- **Análisis por barco**: Desglose individual con distribución por proveedor
- **Gráficos visuales**: Barras de distribución de gastos por proveedor
- **Exportación**: Opciones para PDF, Excel y compartir
- **Sin datos**: Mensaje amigable cuando no hay actividad en el mes

### 5. **BotonReporteMensual.vue** ⭐ **COMPONENTE FLOTANTE**
- **Acceso rápido**: Botón flotante disponible en todas las vistas de barcos
- **Menú desplegable**: Opciones para reporte mensual, reporte rápido y exportación
- **Modal de configuración**: Para reportes personalizados con filtros de período
- **Responsive**: Se adapta a móviles y tablets
- **Auto-ocultación**: Se oculta al hacer scroll para no interferir

### 6. **GestionTripulantes.vue** ⭐ **NUEVO - GESTIÓN DE TRIPULACIÓN**
- **Administración completa**: Lista y gestión de tripulantes por barco independiente
- **Registro simplificado**: Solo requiere nombre y puesto/función
- **Estados**: Control de tripulantes activos/inactivos
- **Balance financiero**: Seguimiento de préstamos y abonos por tripulante
- **Resumen consolidado**: Métricas generales de la tripulación y préstamos
- **Filtros avanzados**: Por estado del tripulante
- **Interfaz responsiva**: Adaptada para móviles y tablets

### 7. **PagosTripulante.vue** ⭐ **NUEVO - SISTEMA DE PRÉSTAMOS**
- **Enfoque en préstamos**: Sistema principal para registrar préstamos dados a tripulantes
- **Conceptos libres**: Campo de texto libre para que el usuario escriba el concepto específico
  - **Placeholders dinámicos**: Sugerencias según el tipo (préstamo/abono)
  - **Flexibilidad total**: Sin limitaciones de opciones predefinidas
- **Formulario simplificado**: Solo monto, fecha y concepto (sin descripción adicional)
- **Historial completo**: Registro cronológico de todas las transacciones
- **Edición en línea**: Modificar y eliminar transacciones existentes
- **Filtros temporales**: Por mes actual, mes pasado, últimos 3 meses
- **Saldo pendiente**: Cálculo automático de préstamos menos abonos
- **Validaciones**: Control de montos, fechas y conceptos para evitar errores
- **Fechas corregidas**: Solución a problemas de zona horaria para mostrar fechas correctas

## 📊 Sistema de Reportes Mensuales

### Funcionalidades:
- ✅ **Navegación entre meses** con botones intuitivos
- ✅ **Selector rápido** para ir a cualquier mes de los últimos 12 meses
- ✅ **Métricas generales** del mes seleccionado
- ✅ **Desglose por barco** con información detallada
- ✅ **Análisis por proveedor** con totales y gráficos
- ✅ **Botón "Mes Actual"** para acceso rápido
- ✅ **Prevención de navegación futura** (no se puede ir a meses futuros)
- ✅ **Loading states** durante la carga de datos
- ✅ **Mensaje de no datos** cuando no hay actividad

### Acceso al Reporte:
1. **Desde menú principal**: Botón "Reporte Mensual" 📊
2. **Botón flotante**: Disponible en cualquier vista de barcos
3. **Reporte rápido**: Configuración personalizada de períodos

### Datos Mostrados:
- **Resumen General**:
  - Total gastado en el mes
  - Cantidad de deudas registradas
  - Saldo pendiente total
  - Número de proveedores activos

- **Por Barco**:
  - Totales y pendientes individuales
  - Lista de proveedores con montos
  - Gráfico de distribución visual
  - Cantidad de deudas por proveedor

## Navegación
- **Menú principal** → Barcos → Seleccionar barco → Opciones disponibles
- **Rutas**: 
  - `/barcos` - Menú principal
  - `/barcos/deudas/nueva` - Nueva deuda
  - `/barcos/deudas/lista` - Lista de deudas
  - `/barcos/resumen-mensual` ⭐ **ACTUALIZADO** - Reportes mensuales
  - `/barcos/tripulantes` ⭐ **NUEVO** - Gestión de tripulantes
- **Integración**: Completamente integrado en la aplicación principal
- **Botón flotante**: Acceso desde cualquier vista de barcos 