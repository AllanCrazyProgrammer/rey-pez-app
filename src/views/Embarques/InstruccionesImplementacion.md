# Instrucciones para Implementar las Optimizaciones

## Paso 1: Asegúrate de tener el componente BotonCrearCuenta

Verifica que el archivo `src/components/Embarques/BotonCrearCuenta.vue` exista y tenga el siguiente contenido:

```vue
<template>
  <button 
    type="button" 
    @click.stop="crearCuenta" 
    class="btn btn-success btn-sm" 
    :title="'Crear Cuenta para ' + tipoCliente"
    :disabled="isCreatingAccount"
  >
    <span v-if="isCreatingAccount" class="loader-inline"></span>
    <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
  </button>
</template>

<script>
export default {
  name: 'BotonCrearCuenta',
  props: {
    tipoCliente: {
      type: String,
      required: true
    },
    clienteId: {
      type: [String, Number],
      required: true
    },
    embarqueCliente: {
      type: Object,
      required: true
    },
    productos: {
      type: Array,
      required: true
    },
    crudos: {
      type: Array,
      default: () => []
    },
    isCreatingAccount: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    crearCuenta() {
      this.$emit('crear-cuenta', {
        tipoCliente: this.tipoCliente,
        clienteId: this.clienteId,
        embarqueCliente: this.embarqueCliente,
        productos: this.productos,
        crudos: this.crudos
      });
    }
  }
}
</script>

<style scoped>
.btn {
  margin-right: 5px;
}
</style>
```

## Paso 2: Modifica el archivo NuevoEmbarque.vue

### 2.1. Importa el componente BotonCrearCuenta

Añade la siguiente línea de importación junto con las demás importaciones:

```javascript
import BotonCrearCuenta from '@/components/Embarques/BotonCrearCuenta.vue';
```

### 2.2. Registra el componente

En la sección de componentes, añade BotonCrearCuenta:

```javascript
components: {
  Rendimientos,
  BotonCrearCuenta
},
```

### 2.3. Añade los métodos auxiliares

En la sección de métodos, añade los siguientes métodos:

```javascript
// Método unificado para manejar la creación de cuentas
manejarCreacionCuenta(datos) {
  const { tipoCliente, embarqueCliente, productos, crudos } = datos;
  
  if (tipoCliente === 'Joselito') {
    this.crearCuentaJoselito(embarqueCliente, productos, crudos);
  } else if (tipoCliente === 'Catarro') {
    this.crearCuentaCatarro(embarqueCliente, productos, crudos);
  }
},

// Métodos para verificar el tipo de cliente
esClienteJoselito(clienteId) {
  return this.obtenerNombreCliente(clienteId) === 'Joselito';
},

esClienteCatarro(clienteId) {
  return this.obtenerNombreCliente(clienteId) === 'Catarro';
},
```

### 2.4. Reemplaza los botones duplicados

Busca los botones de crear cuenta para Joselito y Catarro (alrededor de las líneas 180-200) y reemplázalos con el siguiente código:

```html
<!-- Botón para crear cuenta optimizado -->
<BotonCrearCuenta
  v-if="esClienteJoselito(clienteId) || esClienteCatarro(clienteId)"
  :tipoCliente="obtenerNombreCliente(clienteId)"
  :clienteId="clienteId"
  :embarqueCliente="obtenerEmbarqueCliente(clienteId)"
  :productos="productosPorCliente[clienteId]"
  :crudos="clienteCrudos[clienteId] || []"
  :isCreatingAccount="isCreatingAccount"
  @crear-cuenta="manejarCreacionCuenta"
/>
```

## Paso 3: Prueba la implementación

1. Asegúrate de que no hay errores de compilación.
2. Verifica que los botones de crear cuenta funcionan correctamente para Joselito y Catarro.
3. Comprueba que la funcionalidad es idéntica a la versión anterior.

## Beneficios de esta optimización

1. **Reducción de código duplicado**: Eliminamos la duplicación de los botones de crear cuenta.
2. **Mayor mantenibilidad**: Los cambios en la apariencia o comportamiento de los botones se hacen en un solo lugar.
3. **Código más modular**: La funcionalidad de crear cuenta está encapsulada en un componente reutilizable.
4. **Mejor organización**: El código es más limpio y fácil de entender.

Esta optimización es un ejemplo de cómo aplicar el principio DRY (Don't Repeat Yourself) en el código Vue. 