<template>
  <div class="modales-container">
    <!-- Modal Nuevo Cliente -->
    <ModalNuevoCliente
      v-if="mostrarNuevoCliente"
      @cerrar="onCerrarNuevoCliente"
      @guardar="onGuardarNuevoCliente"
    />
    
    <!-- Modal Precio -->
    <ModalPrecio
      v-if="productoSeleccionado"
      :producto="productoSeleccionado"
      @cerrar="onCerrarModalPrecio"
      @guardar="onGuardarPrecio"
    />
    
    <!-- Modal Historial -->
    <ModalHistorial
      v-if="mostrarHistorial"
      :historial="historialPrecios"
      :producto="productoSeleccionado"
      @cerrar="onCerrarModalHistorial"
    />
  </div>
</template>

<script>
import ModalNuevoCliente from './ModalNuevoCliente.vue';
import ModalPrecio from './ModalPrecio.vue';
import ModalHistorial from './ModalHistorial.vue';

/**
 * @component ClienteModals
 * @description Componente que agrupa todos los modales relacionados con clientes
 * Incluye modales para crear nuevo cliente, editar precios y ver historial
 */
export default {
  name: 'ClienteModals',
  components: {
    ModalNuevoCliente,
    ModalPrecio,
    ModalHistorial
  },
  props: {
    /**
     * Controla la visibilidad del modal de nuevo cliente
     * @type {Boolean}
     */
    mostrarNuevoCliente: {
      type: Boolean,
      default: false
    },
    /**
     * Producto seleccionado para editar precio o ver historial
     * @type {Object}
     */
    productoSeleccionado: {
      type: Object,
      default: null
    },
    /**
     * Controla la visibilidad del modal de historial
     * @type {Boolean}
     */
    mostrarHistorial: {
      type: Boolean,
      default: false
    },
    /**
     * Datos del historial de precios para mostrar
     * @type {Array}
     */
    historialPrecios: {
      type: Array,
      default: () => []
    },
    /**
     * Función para cerrar el modal de nuevo cliente
     * @type {Function}
     * @required
     */
    onCerrarNuevoCliente: {
      type: Function,
      required: true
    },
    /**
     * Función para guardar un nuevo cliente
     * @type {Function}
     * @required
     */
    onGuardarNuevoCliente: {
      type: Function,
      required: true
    },
    /**
     * Función para cerrar el modal de precio
     * @type {Function}
     * @required
     */
    onCerrarModalPrecio: {
      type: Function,
      required: true
    },
    /**
     * Función para guardar un precio
     * @type {Function}
     * @required
     */
    onGuardarPrecio: {
      type: Function,
      required: true
    },
    /**
     * Función para cerrar el modal de historial
     * @type {Function}
     * @required
     */
    onCerrarModalHistorial: {
      type: Function,
      required: true
    }
  }
};
</script> 