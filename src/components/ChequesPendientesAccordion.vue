<template>
  <div class="cheques-pendientes">
    <button
      type="button"
      class="cheques-pendientes-header"
      :aria-expanded="abierto ? 'true' : 'false'"
      @click="toggle"
    >
      <div class="cheques-pendientes-title">
        <h4>Cheques pendientes por cobrar</h4>
        <p v-if="cheques.length > maxPreview" class="cheques-pendientes-resumen">
          {{ resumen }}
        </p>
      </div>
      <div class="cheques-pendientes-actions">
        <span class="badge-cheques">{{ cheques.length }}</span>
        <span class="cheques-pendientes-chevron" aria-hidden="true">
          {{ abierto ? '▾' : '▸' }}
        </span>
      </div>
    </button>

    <transition name="fade-slide">
      <div v-show="abierto" class="cheques-pendientes-list">
        <div
          v-for="cheque in cheques"
          :key="cheque.id"
          class="cheque-pendiente"
        >
          <div class="cheque-pendiente-info">
            <div class="cheque-pendiente-fecha">
              {{ formatearFechaCorta(obtenerFechaTransaccion(cheque)) }}
              <span class="cheque-pendiente-cliente">
                · {{ obtenerClienteTexto(cheque.cliente) }}
              </span>
            </div>
            <div class="cheque-pendiente-monto">
              ${{ formatearNumero(cheque.monto) }}
            </div>
          </div>
          <div v-if="cheque.descripcion" class="cheque-pendiente-descripcion">
            {{ cheque.descripcion }}
          </div>
          <label class="cheque-cobrado-toggle">
            <input
              type="checkbox"
              :checked="!!cheque.chequeCobrado"
              @change="$emit('toggle-cobrado', cheque, $event.target.checked)"
            />
            Cobrado
          </label>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'ChequesPendientesAccordion',
  emits: ['toggle-cobrado'],
  props: {
    cheques: {
      type: Array,
      default: () => []
    },
    formatearFechaCorta: {
      type: Function,
      required: true
    },
    obtenerFechaTransaccion: {
      type: Function,
      required: true
    },
    obtenerClienteTexto: {
      type: Function,
      required: true
    },
    formatearNumero: {
      type: Function,
      required: true
    },
    maxPreview: {
      type: Number,
      default: 3
    }
  },
  data() {
    return {
      abierto: false
    };
  },
  computed: {
    resumen() {
      const visibles = this.cheques.slice(0, this.maxPreview);
      const faltantes = Math.max(0, this.cheques.length - visibles.length);
      const detalles = visibles
        .map(
          cheque =>
            `${this.formatearFechaCorta(this.obtenerFechaTransaccion(cheque))} · ${this.obtenerClienteTexto(cheque.cliente)}`
        )
        .join(' · ');
      return faltantes > 0 ? `${detalles} +${faltantes} más` : detalles;
    }
  },
  methods: {
    toggle() {
      this.abierto = !this.abierto;
    }
  }
};
</script>

<style scoped>
.cheques-pendientes {
  background: #fff;
  border: 1px solid #e0d5f0;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cheques-pendientes-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  padding: 0;
  cursor: pointer;
}

.cheques-pendientes-title h4 {
  margin: 0;
  font-size: 1rem;
  color: #2c3e50;
}

.cheques-pendientes-resumen {
  margin: 4px 0 0;
  color: #6c5ce7;
  font-size: 0.9rem;
  line-height: 1.3;
}

.cheques-pendientes-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cheques-pendientes-chevron {
  font-size: 1rem;
  color: #7c3dbb;
}

.badge-cheques {
  background: #9b59b6;
  color: #fff;
  border-radius: 999px;
  padding: 4px 10px;
  font-weight: 700;
  font-size: 0.85rem;
}

.cheques-pendientes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cheque-pendiente {
  border: 1px solid #ede7f6;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: linear-gradient(90deg, #faf7ff, #f5f1ff);
}

.cheque-pendiente-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.cheque-pendiente-fecha {
  font-size: 0.9rem;
  color: #555;
}

.cheque-pendiente-cliente {
  color: #7c3dbb;
  font-weight: 600;
  margin-left: 6px;
}

.cheque-pendiente-monto {
  font-weight: 700;
  color: #7c3dbb;
}

.cheque-pendiente-descripcion {
  color: #555;
  font-size: 0.9rem;
}

.cheque-cobrado-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8em;
  color: #5e2a9a;
  background: rgba(155, 89, 182, 0.08);
  border: 1px solid rgba(155, 89, 182, 0.22);
  padding: 3px 8px;
  border-radius: 999px;
  margin-right: 6px;
  user-select: none;
  width: fit-content;
}

.cheque-cobrado-toggle input {
  width: 14px;
  height: 14px;
  accent-color: #9b59b6;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 768px) {
  .cheques-pendientes {
    padding: 12px;
  }

  .cheques-pendientes-header {
    align-items: center;
  }

  .cheques-pendientes-actions {
    align-self: flex-start;
  }

  .cheque-pendiente-info {
    gap: 6px;
  }
}
</style>

