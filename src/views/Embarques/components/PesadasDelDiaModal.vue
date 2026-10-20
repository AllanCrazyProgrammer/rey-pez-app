<template>
  <div
    v-if="abierto"
    class="pesadas-dia-overlay"
    @click.self="cerrar"
    @keydown.esc.stop.prevent="cerrar"
  >
    <section
      class="pesadas-dia-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pesadas-dia-titulo"
      aria-describedby="pesadas-dia-descripcion"
    >
      <header class="pesadas-dia-header">
        <div>
          <p class="pesadas-dia-eyebrow">Solo lectura</p>
          <h2 id="pesadas-dia-titulo">Pesadas por medida</h2>
          <p v-if="fechaTexto" class="pesadas-dia-fecha">{{ fechaTexto }}</p>
        </div>
        <button ref="cerrar" type="button" class="pesadas-dia-cerrar" aria-label="Cerrar pesadas" @click="cerrar">
          Cerrar
        </button>
      </header>

      <div id="pesadas-dia-descripcion" class="pesadas-dia-cuerpo">
        <p v-if="cargando" class="pesadas-dia-estado" role="status">Buscando las pesadas de este día…</p>
        <p v-else-if="error" class="pesadas-dia-alerta" role="alert">{{ error }}</p>
        <p v-else-if="!tienePesadas" class="pesadas-dia-estado">{{ mensajeVacio || 'No hay pesadas registradas para este día.' }}</p>
        <template v-else>
          <p class="pesadas-dia-ayuda">
            Kilos del día agrupados por medida.
            <span v-if="!tieneTaras">Esta jornada no tiene taras capturadas.</span>
          </p>
          <ul class="pesadas-dia-lista">
            <li v-for="grupo in grupos" :key="grupo.medida" class="pesadas-dia-fila">
              <h3>{{ grupo.medida }}</h3>
              <div class="pesadas-dia-metricas">
                <div>
                  <small>Kilos</small>
                  <strong>{{ numero(grupo.kilos) }} kg</strong>
                </div>
                <div>
                  <small>Taras</small>
                  <strong>{{ textoTaras(grupo.taras) }}</strong>
                </div>
              </div>
            </li>
          </ul>
          <div class="pesadas-dia-total" aria-label="Total del día">
            <span>Total del día</span>
            <strong>{{ numero(totalKilos) }} kg</strong>
            <strong>{{ textoTaras(totalTaras) }}</strong>
          </div>
        </template>
      </div>

      <footer v-if="fecha" class="pesadas-dia-footer">
        <router-link class="pesadas-dia-enlace" :to="`/pesadas/${fecha}`">
          Abrir la hoja completa de este día
        </router-link>
      </footer>
    </section>
  </div>
</template>

<script>
import { formatoPesada } from '@/utils/pesadas';

export default {
  name: 'PesadasDelDiaModal',
  props: {
    abierto: { type: Boolean, default: false },
    cargando: { type: Boolean, default: false },
    error: { type: String, default: '' },
    fecha: { type: String, default: '' },
    fechaTexto: { type: String, default: '' },
    grupos: { type: Array, default: () => [] },
    totalKilos: { type: Number, default: 0 },
    totalTaras: { type: Number, default: 0 },
    tieneTaras: { type: Boolean, default: false },
    tienePesadas: { type: Boolean, default: false },
    mensajeVacio: { type: String, default: '' }
  },
  watch: {
    abierto: {
      immediate: true,
      handler(abierto) {
        if (abierto) {
          this._overflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
          this._tecla = event => {
            if (event.key === 'Escape') {
              event.preventDefault();
              this.cerrar();
            }
          };
          window.addEventListener('keydown', this._tecla);
          this.$nextTick(() => {
            if (this.$refs.cerrar) this.$refs.cerrar.focus();
          });
          return;
        }
        this.liberar();
      }
    }
  },
  beforeDestroy() {
    this.liberar();
  },
  methods: {
    numero: formatoPesada,
    textoTaras(valor) {
      if (!this.tieneTaras) return '—';
      return String(formatoPesada(valor));
    },
    cerrar() {
      this.$emit('cerrar');
    },
    liberar() {
      if (this._tecla) {
        window.removeEventListener('keydown', this._tecla);
        this._tecla = null;
      }
      if (this._overflow != null) {
        document.body.style.overflow = this._overflow;
        this._overflow = null;
      }
    }
  }
};
</script>

<style scoped>
.pesadas-dia-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 8px;
  background: rgba(2, 6, 16, 0.72);
}

.pesadas-dia-dialog {
  display: flex;
  flex-direction: column;
  width: min(520px, 100%);
  max-height: calc(100dvh - 16px);
  overflow: hidden;
  color: #e8f1ff;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 18px;
  background: linear-gradient(165deg, #142033 0%, #0b1322 100%);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.pesadas-dia-header,
.pesadas-dia-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 12px;
}

.pesadas-dia-header {
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.pesadas-dia-footer {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.pesadas-dia-eyebrow {
  margin: 0 0 2px;
  color: #7dd3fc;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pesadas-dia-header h2 {
  margin: 0;
  color: #f8fbff;
  font-size: 1.2rem;
  line-height: 1.15;
}

.pesadas-dia-fecha {
  margin: 4px 0 0;
  color: #b7c6dc;
  font-size: 0.92rem;
}

.pesadas-dia-cerrar,
.pesadas-dia-enlace {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 10px;
  font-weight: 800;
  text-decoration: none;
}

.pesadas-dia-cerrar {
  flex: 0 0 auto;
  padding: 0 14px;
  color: #e8f1ff;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.65);
  cursor: pointer;
}

.pesadas-dia-cuerpo {
  overflow: auto;
  padding: 12px 14px 16px;
}

.pesadas-dia-estado,
.pesadas-dia-ayuda {
  margin: 0;
  color: #d5e2f2;
  font-size: 0.95rem;
  line-height: 1.4;
}

.pesadas-dia-alerta {
  margin: 0;
  padding: 12px;
  color: #ffd7c2;
  border: 1px solid rgba(251, 146, 60, 0.45);
  border-radius: 12px;
  background: rgba(124, 45, 18, 0.35);
}

.pesadas-dia-lista {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
}

.pesadas-dia-fila {
  padding: 12px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.pesadas-dia-fila h3 {
  margin: 0 0 8px;
  color: #f8fbff;
  font-size: 1.02rem;
  overflow-wrap: anywhere;
}

.pesadas-dia-metricas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pesadas-dia-metricas div,
.pesadas-dia-total {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(8, 15, 29, 0.72);
}

.pesadas-dia-metricas small {
  display: block;
  margin-bottom: 2px;
  color: #93a4bd;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pesadas-dia-metricas strong,
.pesadas-dia-total strong {
  font-variant-numeric: tabular-nums;
  font-size: 1.05rem;
}

.pesadas-dia-total {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.8fr);
  gap: 8px;
  align-items: center;
  margin-top: 12px;
  color: #e0f7ff;
  border: 1px solid rgba(56, 217, 255, 0.28);
}

.pesadas-dia-total span {
  color: #b7c6dc;
  font-size: 0.82rem;
  font-weight: 800;
}

.pesadas-dia-enlace {
  width: 100%;
  padding: 0 12px;
  color: #06101c;
  background: linear-gradient(135deg, #b8f4ff, #38d9ff);
}

.pesadas-dia-cerrar:focus-visible,
.pesadas-dia-enlace:focus-visible {
  outline: 3px solid #38d9ff;
  outline-offset: 2px;
}

@media (min-width: 640px) {
  .pesadas-dia-overlay {
    align-items: center;
    padding: 24px;
  }
}
</style>
