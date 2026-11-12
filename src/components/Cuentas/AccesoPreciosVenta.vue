<template>
  <div class="acceso-precios">
    <button
      v-if="!montado"
      type="button"
      class="precio-historial-btn"
      :disabled="cargando"
      @click="abrir"
    >
      <i class="nav-icon" aria-hidden="true">💰</i>
      <span>Precios de Venta</span>
    </button>
    <PreciosHistorialModal
      v-if="pedido"
      v-show="montado"
      ref="modal"
      cargar-al-abrir
      @hook:mounted="alMontar"
    />
  </div>
</template>

<script>
export default {
  name: 'AccesoPreciosVenta',
  components: {
    PreciosHistorialModal: () => import('@/components/Precios/PreciosHistorialModal.vue')
  },
  data() {
    return {
      pedido: false,
      cargando: false,
      montado: false
    }
  },
  mounted() {
    // El menú rápido de la APK enlaza aquí con ?precios=1 para abrir el modal directo.
    if (this.$route && this.$route.query && this.$route.query.precios) {
      this.abrir()
    }
  },
  methods: {
    abrir() {
      if (this.montado && this.$refs.modal) {
        this.$refs.modal.abrirModal()
        return
      }
      this.cargando = true
      this.pedido = true
    },
    alMontar() {
      this.montado = true
      this.cargando = false
      this.$refs.modal.abrirModal()
    }
  }
}
</script>

<style scoped>
.acceso-precios {
  display: flex;
  justify-content: center;
  width: 100%;
}

.precio-historial-btn {
  --terminal-bg: #0a0a0a;
  --amber: #ffb000;
  --amber-glow: #ffb00080;
  background: rgba(0, 20, 0, 0.9);
  color: var(--amber);
  border: 2px solid var(--amber);
  padding: 12px 22px;
  border-radius: 0;
  cursor: pointer;
  font-size: 1.1rem;
  transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 2px;
  box-shadow: 0 0 15px var(--amber-glow);
}

.precio-historial-btn:hover:not(:disabled) {
  background: var(--amber);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px var(--amber-glow);
  transform: translateY(-2px);
}

.precio-historial-btn:focus {
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: 2px;
}

.precio-historial-btn:disabled {
  cursor: progress;
}

@media (max-width: 420px) {
  .precio-historial-btn {
    width: 100%;
    padding: 12px 14px;
    font-size: 1rem;
    letter-spacing: 1px;
  }
}
</style>
