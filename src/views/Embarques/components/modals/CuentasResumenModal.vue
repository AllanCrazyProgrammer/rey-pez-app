<template>
  <div
    v-if="mostrar"
    class="cuentas-resumen-overlay"
    role="presentation"
    @click.self="cerrar"
  >
    <section
      class="cuentas-resumen-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cuentas-resumen-titulo"
    >
      <header class="cuentas-resumen-header">
        <div class="titulo-icono">
          <i class="fas fa-file-invoice-dollar"></i>
        </div>
        <div>
          <p class="titulo-etiqueta">Antes de generar el resumen</p>
          <h2 id="cuentas-resumen-titulo">Faltan cuentas del embarque</h2>
        </div>
        <button
          type="button"
          class="btn-cerrar"
          aria-label="Cerrar"
          :disabled="cargando"
          @click="cerrar"
        >
          &times;
        </button>
      </header>

      <div class="cuentas-resumen-body">
        <p class="mensaje-principal">
          No se encontraron las siguientes cuentas para
          <strong>{{ fecha || 'la fecha del embarque' }}</strong>:
        </p>

        <div class="cuentas-lista">
          <div
            v-for="cuenta in cuentas"
            :key="cuenta.id"
            class="cuenta-faltante"
          >
            <span class="cuenta-icono"><i class="fas fa-exclamation"></i></span>
            <div>
              <strong>Cuenta de {{ cuenta.nombre }}</strong>
              <small>Se creará con la información actual del embarque.</small>
            </div>
          </div>
        </div>

        <p class="aclaracion">
          ¿Deseas crear {{ cuentas.length === 1 ? 'esta cuenta' : 'estas cuentas' }} antes de descargar el resumen?
        </p>

        <div v-if="error" class="mensaje-error" role="alert">
          <i class="fas fa-exclamation-triangle"></i>
          <span>{{ error }}</span>
        </div>
      </div>

      <footer class="cuentas-resumen-footer">
        <button type="button" class="btn-modal btn-cancelar" :disabled="cargando" @click="cerrar">
          Cancelar
        </button>
        <button type="button" class="btn-modal btn-solo-resumen" :disabled="cargando" @click="$emit('omitir')">
          Solo generar resumen
        </button>
        <button type="button" class="btn-modal btn-crear" :disabled="cargando" @click="$emit('confirmar')">
          <span v-if="cargando" class="loader-modal"></span>
          <i v-else class="fas fa-check-circle"></i>
          {{ cargando ? 'Creando cuentas...' : 'Crear cuentas y resumen' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script>
export default {
  name: 'CuentasResumenModal',
  props: {
    mostrar: {
      type: Boolean,
      default: false
    },
    cuentas: {
      type: Array,
      default: () => []
    },
    fecha: {
      type: String,
      default: ''
    },
    cargando: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    }
  },
  emits: ['cerrar', 'omitir', 'confirmar'],
  methods: {
    cerrar() {
      if (!this.cargando) {
        this.$emit('cerrar');
      }
    }
  }
};
</script>

<style scoped>
.cuentas-resumen-overlay {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(2, 8, 20, 0.78);
  backdrop-filter: blur(6px);
}

.cuentas-resumen-modal {
  width: min(560px, 100%);
  overflow: hidden;
  color: #eaf2ff;
  background: linear-gradient(145deg, #111f35, #0a1425);
  border: 1px solid rgba(105, 160, 220, 0.28);
  border-radius: 20px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
}

.cuentas-resumen-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 22px 24px;
  border-bottom: 1px solid rgba(129, 166, 211, 0.16);
}

.titulo-icono {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  color: #062036;
  font-size: 21px;
  background: linear-gradient(135deg, #55e0ff, #53f0a8);
  border-radius: 14px;
}

.titulo-etiqueta {
  margin: 0 0 3px;
  color: #86a3c8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cuentas-resumen-header h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.btn-cerrar {
  align-self: start;
  padding: 0;
  color: #91a8c5;
  font-size: 30px;
  line-height: 30px;
  background: transparent;
  border: 0;
}

.btn-cerrar:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.cuentas-resumen-body {
  padding: 22px 24px 10px;
}

.mensaje-principal,
.aclaracion {
  margin: 0;
  color: #c5d4e8;
  line-height: 1.55;
}

.cuentas-lista {
  display: grid;
  gap: 10px;
  margin: 18px 0;
}

.cuenta-faltante {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(120, 164, 215, 0.2);
  border-radius: 13px;
}

.cuenta-icono {
  display: grid;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  place-items: center;
  color: #172031;
  background: #ffc45b;
  border-radius: 50%;
}

.cuenta-faltante strong,
.cuenta-faltante small {
  display: block;
}

.cuenta-faltante small {
  margin-top: 3px;
  color: #91a8c5;
}

.mensaje-error {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 16px;
  padding: 12px 14px;
  color: #ffd9de;
  background: rgba(207, 54, 76, 0.16);
  border: 1px solid rgba(255, 103, 126, 0.38);
  border-radius: 11px;
  line-height: 1.4;
}

.cuentas-resumen-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 24px 24px;
}

.btn-modal {
  min-height: 43px;
  padding: 10px 15px;
  color: #dfeafa;
  font-weight: 750;
  border: 1px solid rgba(132, 169, 213, 0.28);
  border-radius: 11px;
}

.btn-modal:disabled {
  cursor: wait;
  opacity: 0.6;
}

.btn-cancelar {
  background: transparent;
}

.btn-solo-resumen {
  background: #1b2d47;
}

.btn-crear {
  color: #061d2c;
  background: linear-gradient(135deg, #55dfff, #51eaa7);
  border-color: transparent;
}

.loader-modal {
  display: inline-block;
  width: 15px;
  height: 15px;
  margin-right: 7px;
  vertical-align: -2px;
  border: 2px solid rgba(6, 29, 44, 0.25);
  border-top-color: #061d2c;
  border-radius: 50%;
  animation: girar 0.75s linear infinite;
}

@keyframes girar {
  to { transform: rotate(360deg); }
}

@media (max-width: 620px) {
  .cuentas-resumen-overlay {
    align-items: flex-end;
    padding: 10px;
  }

  .cuentas-resumen-modal {
    max-height: calc(100vh - 20px);
    overflow-y: auto;
    border-radius: 18px;
  }

  .cuentas-resumen-header,
  .cuentas-resumen-body,
  .cuentas-resumen-footer {
    padding-right: 17px;
    padding-left: 17px;
  }

  .cuentas-resumen-footer {
    display: grid;
  }

  .btn-crear {
    grid-row: 1;
  }
}
</style>
