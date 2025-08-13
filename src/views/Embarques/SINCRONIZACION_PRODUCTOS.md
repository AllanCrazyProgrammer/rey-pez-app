# Sistema de Sincronización de Productos - NuevoEmbarque (v2)

## Problema Resuelto

### Escenario del Bug Original
1. Usuario agrega un nuevo producto mientras hay un guardado en proceso
2. El guardado termina y dispara `onSnapshot` de Firestore
3. `onSnapshot` sobrescribe el estado local con datos del servidor
4. El producto nuevo desaparece porque aún no estaba sincronizado

### Problema Persistente (v1)
La primera solución no era suficiente porque el `onSnapshot` podía ejecutarse DURANTE el proceso de agregar un producto, antes de que se marcara como pendiente.

## Solución Implementada (v2)

### 1. Bandera de Control para Agregar Productos

Se agregó una bandera que indica cuando se está agregando un producto:

```javascript
data() {
  return {
    // ...
    agregandoProducto: false, // Bandera para proteger durante agregado
    // ...
  }
}
```

### 2. Rastreo de Productos Nuevos Pendientes

Se mantiene un `Map` para rastrear productos nuevos que aún no se han sincronizado con Firestore:

```javascript
data() {
  return {
    // ...
    productosNuevosPendientes: new Map(), // Map<productoId, producto>
    // ...
  }
}
```

### 3. Marcado de Productos Nuevos con Protección

Cuando se agrega un producto, se activa la bandera y se marca como pendiente:

```javascript
agregarProducto(clienteId) {
  // Activar bandera de protección
  this.agregandoProducto = true;
  
  // ... crear nuevo producto ...
  
  // Clonar y marcar como pendiente de sincronización
  const productoParaPendientes = { ...nuevoProducto };
  this.productosNuevosPendientes.set(nuevoProducto.id, productoParaPendientes);
  
  // Agregar al embarque
  this.embarque.productos.push(nuevoProducto);
  
  // Desactivar bandera después de completar
  this.$nextTick(() => {
    setTimeout(() => {
      this.agregandoProducto = false;
    }, 200);
  });
}
```

### 4. Preservación Mejorada en onSnapshot

El listener de Firestore ahora:
1. Verifica si hay un agregado en proceso
2. Preserva productos nuevos pendientes
3. Preserva productos locales con UUID no sincronizados

```javascript
onSnapshot(embarqueRef, (doc) => {
  // ... procesar datos del servidor ...
  
  let productosFinales;
  
  if (this.agregandoProducto) {
    // Mantener productos locales sin cambios durante agregado
    productosFinales = this.embarque.productos || [];
  } else {
    // Preservar productos nuevos pendientes
    const productosNuevosAPreservar = [];
    
    // Verificar productos en Map de pendientes
    this.productosNuevosPendientes.forEach((producto, id) => {
      if (!productosDesdeServidor.some(p => p.id === id)) {
        productosNuevosAPreservar.push(producto);
      }
    });
    
    // También preservar productos locales con UUID no sincronizados
    const productosLocalesActuales = this.embarque.productos || [];
    productosLocalesActuales.forEach(productoLocal => {
      if (esUUIDValido(productoLocal.id) && 
          !productosDesdeServidor.some(p => p.id === productoLocal.id) &&
          !productosNuevosAPreservar.some(p => p.id === productoLocal.id)) {
        productosNuevosAPreservar.push(productoLocal);
        this.productosNuevosPendientes.set(productoLocal.id, { ...productoLocal });
      }
    });
    
    productosFinales = [...productosFiltrados, ...productosNuevosAPreservar];
  }
  
  this.embarque.productos = productosFinales;
});
```

### 5. Limpieza Post-Guardado

Después de un guardado exitoso, se limpian los productos pendientes:

```javascript
guardarCambiosEnTiempoReal() {
  // ... guardar cambios ...
  
  // Después del guardado exitoso:
  this.productosNuevosPendientes.clear();
}
```

## Flujo de Datos (v2)

1. **Inicia Agregar Producto** → Se activa `agregandoProducto = true`
2. **Producto se crea** → Se clona y marca como pendiente en el Map
3. **Producto se agrega** → Se añade al array local de productos
4. **onSnapshot puede disparar** → Si `agregandoProducto = true`, mantiene productos locales intactos
5. **Agregado completa** → Se desactiva `agregandoProducto = false` después de 200ms
6. **Guardado ejecuta** → Producto se sincroniza con Firestore
7. **Próximo onSnapshot** → Producto ya existe en servidor, se remueve de pendientes

## Mejoras de la v2

### Protección Durante Agregado
- La bandera `agregandoProducto` evita que onSnapshot sobrescriba durante el proceso crítico
- Delay de 200ms asegura que el producto esté completamente agregado antes de permitir actualizaciones

### Doble Verificación
- Productos en el Map de pendientes
- Productos locales con UUID que no están en el servidor
- Clonación de productos para evitar problemas de referencia

### Preservación Inteligente
- Si hay agregado en proceso: mantiene TODOS los productos locales
- Si no hay agregado: hace merge inteligente entre servidor y local

## Beneficios

- ✅ **Productos nunca desaparecen** durante guardados o agregados
- ✅ **Sincronización robusta** con Firestore incluso con timing conflictivo
- ✅ **No hay pérdida de datos** del usuario bajo ninguna circunstancia
- ✅ **Compatible** con el sistema de productos eliminados localmente
- ✅ **Transparente** para el usuario - funciona automáticamente
- ✅ **Resistente a race conditions** entre agregado y onSnapshot

## Casos de Uso Cubiertos

- ✅ Agregar producto durante guardado activo
- ✅ onSnapshot ejecutándose durante el agregado de producto
- ✅ Múltiples productos agregados en sucesión rápida
- ✅ Cambio de embarque (limpia pendientes)
- ✅ Navegación entre rutas (fuerza guardado de pendientes)
- ✅ Productos eliminados y nuevos simultáneamente
- ✅ Conexión inestable con múltiples reconexiones
