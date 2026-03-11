# Refactorización del Componente Rendimientos

Este directorio contiene la versión refactorizada y optimizada del componente `Rendimientos.vue`, que originalmente tenía 2835 líneas de código y múltiples responsabilidades.

## Estructura Refactorizada

```
src/views/Embarques/Rendimientos/
├── Rendimientos.vue              # Componente principal (simplificado)
├── components/                   # Componentes reutilizables
│   ├── RendimientoCard.vue       # Tarjeta individual de rendimiento
│   ├── CrudoGananciaCard.vue     # Tarjeta de ganancia de crudos
│   ├── NotaModal.vue             # Modal para agregar notas
│   └── ConfiguracionModal.vue    # Modal de configuración de pesos
├── composables/                  # Lógica reutilizable
│   ├── useRendimientosData.js    # Manejo de datos de rendimientos
│   └── useGanancias.js           # Cálculos de ganancias
├── services/                     # Servicios de datos
│   └── rendimientosService.js    # Operaciones de Firebase
├── utils/                        # Funciones de utilidad
│   ├── formatters.js             # Funciones de formateo
│   └── calculations.js           # Funciones de cálculo
└── README.md                     # Este archivo
```

## Beneficios de la Refactorización

### 1. **Separación de Responsabilidades**
- **Componentes**: Cada componente tiene una responsabilidad específica
- **Composables**: Lógica de negocio separada y reutilizable
- **Servicios**: Operaciones de datos centralizadas
- **Utilidades**: Funciones puras y reutilizables

### 2. **Mantenibilidad Mejorada**
- Código más legible y fácil de entender
- Archivos más pequeños y enfocados
- Menor acoplamiento entre componentes
- Facilita las pruebas unitarias

### 3. **Reutilización de Código**
- Composables pueden usarse en otros componentes
- Utilidades disponibles para toda la aplicación
- Servicios centralizados para operaciones de datos

### 4. **Escalabilidad**
- Fácil agregar nuevas funcionalidades
- Estructura clara para nuevos desarrolladores
- Componentes modulares y extensibles

## Composables Principales

### `useRendimientosData()`
Maneja todos los datos relacionados con rendimientos:
- Estado reactivo de embarques, medidas y configuraciones
- Carga y guardado automático de datos
- Cálculos de totales embarcados y rendimientos

### `useGanancias()`
Gestiona los cálculos de ganancias:
- Carga de precios de venta
- Cálculos de ganancias principales y de crudos
- Mapeo de clientes y precios

## Componentes

### `RendimientoCard.vue`
Componente individual para mostrar:
- Información de una medida específica
- Controles de configuración (ocultar, analizar ganancia, maquila)
- Resultados de rendimiento y ganancias

### `CrudoGananciaCard.vue`
Componente para ganancias de crudos:
- Análisis por talla de crudo
- Detalles por cliente cuando hay múltiples precios
- Indicadores de fuentes de precios

### Modales
- **`NotaModal.vue`**: Agregar/editar notas de rendimientos
- **`ConfiguracionModal.vue`**: Configurar pesos de taras

## Servicios

### `RendimientosService`
Centraliza todas las operaciones de Firebase:
- Cargar datos de embarques
- Cargar precios de venta
- Guardar cambios y configuraciones
- Operaciones CRUD específicas del dominio

## Utilidades

### `formatters.js`
Funciones de formateo:
- `formatearPrecio()`: Formateo de precios con separador de miles
- `formatearNumero()`: Formateo de números enteros
- `formatearFecha()`: Formateo de fechas

### `calculations.js`
Funciones de cálculo:
- Cálculos de totales (bolsas, taras, kilos)
- Cálculos de costos finales
- Verificaciones de tipos de medidas
- Cálculos específicos de crudos

## Migración y Compatibilidad

- **Funcionalidad preservada**: Todas las funciones originales se mantienen
- **API compatible**: El componente principal expone la misma interfaz
- **Mejoras de rendimiento**: Composables optimizados con `computed` y `watch`
- **Mejor UX**: Separación clara de responsabilidades mejora la experiencia

## Archivo Original

El archivo original `Rendimientos.vue` (2835 líneas) se conservó como `Rendimientos_original.vue` para referencia y comparación.

## Uso

El componente refactorizado se usa exactamente igual que el original:

```vue
<template>
  <Rendimientos />
</template>
```

La diferencia está en la organización interna del código, que ahora es más mantenible, escalable y fácil de entender.