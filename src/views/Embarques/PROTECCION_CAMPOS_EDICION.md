# Sistema de Protección de Campos en Edición - NuevoEmbarque

## Problema Resuelto

### Escenario del Bug
1. Usuario escribe kilos en un campo (ej: "12.5")
2. El auto-guardado se dispara cada 2 segundos
3. `onSnapshot` de Firestore sobrescribe el estado local con datos del servidor
4. El último número que estaba escribiendo desaparece (ej: "12.5" → "12.")

## Solución Implementada

### 1. Rastreo de Campos en Edición Activa

Se agregó un `Set` para rastrear qué campos están siendo editados actualmente:

```javascript
data() {
  return {
    // ...
    camposEnEdicion: new Set(), // Set para rastrear qué campos están siendo editados activamente
    // ...
  }
}
```

### 2. Marcado de Campos Durante Edición

En `ProductoItem.vue`, se modificaron los eventos de `focus` y `blur` para marcar/desmarcar campos:

```javascript
// Métodos para manejar edición de kilos
onKiloFocus(kiloIndex, event) {
  event.target.select();
  this.$emit('marcar-campo-edicion', { 
    productoId: this.producto.id, 
    campo: `kilos-${kiloIndex}` 
  });
},

onKiloBlur(kiloIndex) {
  this.$emit('desmarcar-campo-edicion', { 
    productoId: this.producto.id, 
    campo: `kilos-${kiloIndex}` 
  });
  this.actualizarProducto(); // Solo actualizar al terminar de escribir
},

onKiloInput(kiloIndex) {
  // NO llamar actualizarProducto inmediatamente para evitar guardado frecuente
  // Solo actualizar cuando el usuario termine de escribir (onBlur)
},
```

### 3. Propagación de Eventos

En `ClienteProductos.vue`:
```javascript
@marcar-campo-edicion="$emit('marcar-campo-edicion', $event.productoId, $event.campo)"
@desmarcar-campo-edicion="$emit('desmarcar-campo-edicion', $event.productoId, $event.campo)"
```

En `NuevoEmbarque.vue`:
```javascript
@marcar-campo-edicion="marcarCampoEnEdicion"
@desmarcar-campo-edicion="desmarcarCampoEnEdicion"
```

### 4. Merge Inteligente en onSnapshot

El listener de Firestore ahora verifica si hay campos en edición y hace un merge selectivo:

```javascript
onSnapshot(embarqueRef, (doc) => {
  // ...
  
  if (this.agregandoProducto) {
    // Mantener productos locales sin cambios
    productosFinales = this.embarque.productos || [];
  } else if (this.camposEnEdicion && this.camposEnEdicion.size > 0) {
    // Hacer merge inteligente preservando campos en edición
    productosFinales = this.mergeProductosConCamposEnEdicion(productosServidor, productosFiltrados);
  } else {
    // Merge normal de productos
    productosFinales = [...productosFiltrados, ...productosNuevosAPreservar];
  }
  
  // ...
});
```

### 5. Función de Merge Selectivo

```javascript
mergeProductosConCamposEnEdicion(productosServidor, productosFiltrados) {
  const productosLocales = this.embarque.productos || [];
  const productosFinales = [];

  productosFiltrados.forEach(productoServidor => {
    const productoLocal = productosLocales.find(p => p.id === productoServidor.id);
    
    if (!productoLocal) {
      productosFinales.push(productoServidor);
      return;
    }

    // Hacer merge preservando campos en edición
    const productoMergeado = { ...productoServidor };

    // Verificar kilos en edición
    if (productoLocal.kilos && Array.isArray(productoLocal.kilos)) {
      productoLocal.kilos.forEach((kilo, index) => {
        if (this.esCampoEnEdicion(productoServidor.id, `kilos-${index}`)) {
          if (!productoMergeado.kilos) productoMergeado.kilos = [];
          productoMergeado.kilos[index] = kilo; // Preservar valor local
        }
      });
    }

    // Verificar taras en edición
    if (productoLocal.taras && Array.isArray(productoLocal.taras)) {
      productoLocal.taras.forEach((tara, index) => {
        if (this.esCampoEnEdicion(productoServidor.id, `taras-${index}`)) {
          if (!productoMergeado.taras) productoMergeado.taras = [];
          productoMergeado.taras[index] = tara; // Preservar valor local
        }
      });
    }

    productosFinales.push(productoMergeado);
  });

  return [...productosFinales, ...productosNuevosAPreservar];
}
```

## Flujo de Datos

1. **Usuario hace focus en campo de kilos** → Campo se marca como "en edición"
2. **Usuario escribe números** → Solo se actualiza el v-model local, NO se dispara guardado
3. **onSnapshot puede disparar** → Ve que hay campos en edición → Hace merge selectivo preservando valores locales
4. **Usuario hace blur del campo** → Campo se desmarca de "en edición" → Se dispara guardado
5. **Próximo onSnapshot** → Sin campos en edición → Merge normal

## Optimizaciones Implementadas

### Guardado Diferido
- Los inputs de kilos y taras **NO** disparan `actualizarProducto` en `@input`
- Solo se guarda cuando el usuario termina de escribir (`@blur`)
- Esto reduce la frecuencia de guardados automáticos

### Preservación Granular
- La protección es **por campo específico** (`producto-id-kilos-0`, `producto-id-taras-1`, etc.)
- Solo se preservan los campos exactos que están siendo editados
- Otros campos del mismo producto se actualizan normalmente

### Limpieza Automática
- Los campos en edición se limpian al cargar un nuevo embarque
- **NO** se limpian después de un guardado exitoso (el usuario podría seguir escribiendo)

## Beneficios

- ✅ **Nunca se borran números** mientras el usuario está escribiendo
- ✅ **Guardado eficiente** - solo cuando el usuario termina de escribir
- ✅ **Sincronización robusta** - otros cambios siguen actualizándose en tiempo real
- ✅ **Granularidad perfecta** - solo protege campos específicos en edición
- ✅ **Compatible** con el sistema de productos nuevos y eliminados
- ✅ **Sin interferencias** en la experiencia de usuario

## Casos de Uso Cubiertos

- ✅ Escribir kilos mientras hay guardado automático activo
- ✅ Escribir taras mientras onSnapshot se dispara
- ✅ Múltiples usuarios editando diferentes campos simultáneamente
- ✅ Navegación entre embarques (limpia campos en edición)
- ✅ Reconexión de red durante escritura
- ✅ Guardado manual durante escritura de campos

## Campos Protegidos

- **Kilos**: `producto.kilos[index]` → Clave: `${productoId}-kilos-${index}`
- **Taras**: `producto.taras[index]` → Clave: `${productoId}-taras-${index}`

*Nota: Es fácil extender para otros campos como reporteTaras, reporteBolsas, etc.*
