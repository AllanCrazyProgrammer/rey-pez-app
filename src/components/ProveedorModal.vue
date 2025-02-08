<template>
  <div class="modal-overlay" v-if="mostrar" @click.self="cerrarModal">
    <div class="modal-content">
      <h3>Proveedor</h3>
      <input 
        type="text" 
        v-model="proveedorLocal"
        class="input-proveedor"
        placeholder="Nombre del proveedor"
        @keyup.enter="guardarProveedor"
      >
      <div class="modal-buttons">
        <button @click="guardarProveedor" class="btn-guardar">Guardar</button>
        <button @click="cerrarModal" class="btn-cancelar">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProveedorModal',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    proveedor: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      proveedorLocal: this.proveedor
    }
  },
  watch: {
    mostrar(nuevo) {
      if (nuevo) {
        this.proveedorLocal = this.proveedor
      }
    }
  },
  methods: {
    cerrarModal() {
      this.$emit('cerrar')
    },
    guardarProveedor() {
      this.$emit('guardar', this.proveedorLocal)
      this.cerrarModal()
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 250px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  text-align: center;
}

.input-proveedor {
  width: calc(100% - 20px);
  padding: 8px;
  margin: 5px 0 15px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.btn-guardar,
.btn-cancelar {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  min-width: 80px;
}

.btn-guardar {
  background-color: #3498db;
  color: white;
}

.btn-cancelar {
  background-color: #95a5a6;
  color: white;
}

.btn-guardar:hover {
  background-color: #2980b9;
}

.btn-cancelar:hover {
  background-color: #7f8c8d;
}
</style> 