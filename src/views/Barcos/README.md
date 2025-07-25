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

### Características Destacadas:
- ✅ **Cálculos automáticos**: Cantidad × Precio = Total
- ✅ **Persistencia correcta**: Datos guardados con nueva estructura
- ✅ **Compatibilidad**: Maneja datos antiguos y nuevos
- ✅ **Interfaz moderna**: Diseño responsivo y intuitivo
- ✅ **Validaciones completas**: Evita errores de datos
- ✅ **Gestión completa**: Desde creación hasta pago total

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
  - `/barcos/resumen-mensual` ⭐ **NUEVO** - Reportes mensuales
- **Integración**: Completamente integrado en la aplicación principal
- **Botón flotante**: Acceso desde cualquier vista de barcos 