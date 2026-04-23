# 📊 Sistema de Gestión de Precios para Deudas

## 🏗️ Estructura de Componentes

Esta carpeta contiene todos los componentes relacionados con la gestión de precios de productos por proveedor en el sistema de deudas.

### 📁 Organización

```
src/components/Deudas/Precios/
├── PreciosProveedorPanel.vue      # Panel principal con grid de productos
├── HistorialProductoModal.vue     # Modal detallado por producto
├── HistorialPreciosModal_old.vue  # Versión anterior (respaldo)
└── README.md                      # Esta documentación
```

## 🎯 Componentes Principales

### 1. PreciosProveedorPanel.vue
**Propósito**: Panel principal que muestra productos con sus precios más recientes

**Características**:
- ✅ Selector de proveedor
- ✅ Grid de productos con precios actuales
- ✅ Formulario para agregar nuevos productos
- ✅ Vista tipo "cards" inspirada en PrecioModal.vue
- ✅ Estadísticas por producto (total registros)
- ✅ Click en producto abre modal detallado

**Props**:
- `mostrar` (Boolean): Controla la visibilidad del modal
- `proveedores` (Array): Lista de proveedores disponibles

**Eventos**:
- `@cerrar`: Se emite cuando se cierra el modal

### 2. HistorialProductoModal.vue
**Propósito**: Modal detallado para ver y gestionar el historial de un producto específico

**Características**:
- ✅ Información resumida del producto (precio actual, promedio, etc.)
- ✅ Formulario colapsible para agregar nuevos precios
- ✅ Timeline del historial de precios
- ✅ Indicadores de cambios de precio (subida/bajada)
- ✅ Edición y eliminación de precios
- ✅ Diseño inspirado en PrecioModal.vue

**Props**:
- `mostrar` (Boolean): Controla la visibilidad del modal
- `producto` (Object): Datos del producto seleccionado
- `proveedorId` (String): ID del proveedor
- `proveedorNombre` (String): Nombre del proveedor

**Eventos**:
- `@cerrar`: Se emite cuando se cierra el modal
- `@actualizado`: Se emite cuando se actualiza un precio

## 🔄 Flujo de Uso

1. **Acceso**: Desde Lista de Deudas → Botón "Historial de Precios"
2. **Selección**: Usuario selecciona un proveedor
3. **Vista General**: Se muestran todos los productos con precios actuales
4. **Detalle**: Click en cualquier producto abre el modal detallado
5. **Gestión**: Agregar, editar o eliminar precios desde el modal detallado

## 🎨 Diseño e Inspiración

### Basado en PrecioModal.vue:
- ✅ Input focus automático
- ✅ Validación de entrada
- ✅ Enter para confirmar
- ✅ Formato de precio consistente
- ✅ Manejo de errores

### Mejoras Implementadas:
- 🆕 Grid responsive de productos
- 🆕 Vista timeline para historial
- 🆕 Estadísticas por producto
- 🆕 Indicadores visuales de cambios
- 🆕 Mejor organización del código

## 📱 Responsive Design

- **Desktop**: Grid de 3-4 productos por fila
- **Tablet**: Grid de 2 productos por fila
- **Móvil**: Lista vertical de productos

## 🔧 Integración con Firestore

### Colección: `historialPrecios`
```javascript
{
  proveedorId: string,
  proveedorNombre: string,
  producto: string,
  precio: number,
  fecha: string,
  notas: string,
  fechaCreacion: Date
}
```

### Índices Necesarios:
- `proveedorId` (ASC) + `fecha` (DESC)
- `producto` (ASC) + `fecha` (DESC)

## 🚀 Uso en la Aplicación

```vue
<!-- En ListaDeudas.vue -->
<PreciosProveedorPanel 
  :mostrar="showHistorialPreciosModal" 
  :proveedores="proveedores"
  @cerrar="showHistorialPreciosModal = false" 
/>
```

## 🔮 Futuras Mejoras

- [ ] Gráficos de tendencia de precios
- [ ] Exportar historial a Excel
- [ ] Comparar precios entre proveedores
- [ ] Alertas de cambios significativos
- [ ] Búsqueda y filtros avanzados 