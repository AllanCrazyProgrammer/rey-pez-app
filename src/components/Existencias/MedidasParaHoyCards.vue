<template>
  <div class="mpc-root">
    <p v-if="showEmpty" class="mpc-empty">{{ emptyMessage }}</p>
    <div v-else class="medidas-hoy-grid">
      <div
        v-for="(grupo, idx) in grupos"
        :key="`mpc-${idx}-${grupo.medidaPedido}`"
        class="medidas-hoy-card"
        :class="{ 'medidas-hoy-card--ozuna': grupo.ozuna }"
      >
        <div class="medidas-hoy-card-head">
          <span class="medidas-hoy-pedido-label">{{ idx + 1 }}) {{ grupo.medidaPedido }}</span>
          <span v-if="grupo.ozuna" class="medidas-hoy-ozuna">Ozuna</span>
        </div>
        <ul class="medidas-hoy-items">
          <li v-for="(item, i) in grupo.items" :key="i">
            <span class="medidas-hoy-item-medida">{{ item.medida }}</span>
            <span class="medidas-hoy-item-qty">
              {{ item.cajas }} {{ item.esKilos ? 'kg' : 'cajas' }}
            </span>
          </li>
        </ul>
        <p
          v-if="totalCajasGrupo(grupo) > 0 || totalKilosDirectosGrupo(grupo) > 0"
          class="medidas-hoy-totales"
        >
          <template v-if="totalCajasGrupo(grupo) > 0">
            <span class="medidas-hoy-totales-label">Total cajas:</span>
            <strong class="medidas-hoy-totales-valor">{{ totalCajasGrupo(grupo) }} cajas</strong>
            <span class="medidas-hoy-totales-sep">·</span>
            <span class="medidas-hoy-totales-label">Total kg:</span>
            <strong class="medidas-hoy-totales-valor">{{ fmtEntero(totalKilosDesdeCajas(grupo)) }} kg</strong>
          </template>
          <template v-if="totalKilosDirectosGrupo(grupo) > 0">
            <span v-if="totalCajasGrupo(grupo) > 0" class="medidas-hoy-totales-sep">·</span>
            <span class="medidas-hoy-totales-label">Kilos directos:</span>
            <strong class="medidas-hoy-totales-valor">{{ fmtEntero(totalKilosDirectosGrupo(grupo)) }} kg</strong>
          </template>
        </p>
        <p v-if="textoLimpios(grupo)" class="medidas-hoy-limpios">
          {{ textoLimpios(grupo) }} limpios
        </p>
      </div>
    </div>
  </div>
</template>

<script>
const KILOS_POR_CAJA = 20;

export default {
  name: 'MedidasParaHoyCards',
  props: {
    /** Grupos ya normalizados (p. ej. `normalizarGruposListaMedidasParaPdf`). */
    grupos: {
      type: Array,
      default: () => []
    },
    emptyMessage: {
      type: String,
      default: ''
    }
  },
  computed: {
    showEmpty() {
      return (!this.grupos || this.grupos.length === 0) && Boolean(this.emptyMessage);
    }
  },
  methods: {
    totalCajasGrupo(grupo) {
      return (grupo.items || [])
        .filter((i) => !i.esKilos)
        .reduce((s, i) => s + (Number(i.cajas) || 0), 0);
    },
    totalKilosDesdeCajas(grupo) {
      return this.totalCajasGrupo(grupo) * KILOS_POR_CAJA;
    },
    totalKilosDirectosGrupo(grupo) {
      return (grupo.items || [])
        .filter((i) => i.esKilos)
        .reduce((s, i) => s + (Number(i.cajas) || 0), 0);
    },
    totalKilosGrupo(grupo) {
      return this.totalKilosDesdeCajas(grupo) + this.totalKilosDirectosGrupo(grupo);
    },
    fmtEntero(n) {
      return Math.round(Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });
    },
    textoLimpios(grupo) {
      const r = Number(grupo?.rendimiento);
      if (!Number.isFinite(r) || r <= 0) return '';
      const kg = this.totalKilosGrupo(grupo);
      if (kg <= 0) return '';
      return Math.round(kg / r).toLocaleString('es-MX', { maximumFractionDigits: 0 });
    }
  }
};
</script>

<style scoped>
.mpc-empty {
  margin: 0 0 8px;
  color: #4b5563;
  font-size: 1rem;
  line-height: 1.45;
}

.medidas-hoy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 12px;
}

.medidas-hoy-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  background: #fff;
}

.medidas-hoy-card--ozuna {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.medidas-hoy-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.medidas-hoy-pedido-label {
  font-weight: 700;
  color: #1d2939;
  font-size: 1.1rem;
  line-height: 1.35;
}

.medidas-hoy-ozuna {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #047857;
  background: #d1fae5;
  padding: 4px 8px;
  border-radius: 999px;
}

.medidas-hoy-items {
  margin: 0;
  padding-left: 1.15rem;
  color: #344054;
  font-size: 1.05rem;
  line-height: 1.5;
}

.medidas-hoy-items li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.medidas-hoy-item-qty {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.medidas-hoy-totales {
  margin: 10px 0 0;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
  font-size: 1rem;
  line-height: 1.5;
  color: #374151;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 6px;
}

.medidas-hoy-card--ozuna .medidas-hoy-totales {
  border-top-color: #a7f3d0;
}

.medidas-hoy-totales-label {
  font-weight: 600;
  color: #4b5563;
}

.medidas-hoy-totales-valor {
  font-weight: 800;
  color: #111827;
}

.medidas-hoy-totales-sep {
  color: #9ca3af;
  user-select: none;
}

.medidas-hoy-limpios {
  margin: 10px 0 0;
  font-weight: 700;
  color: #1f4f9c;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .medidas-hoy-pedido-label {
    font-size: 1.15rem;
  }

  .medidas-hoy-items {
    font-size: 1.08rem;
    padding-left: 1.2rem;
  }

  .medidas-hoy-totales {
    font-size: 1.05rem;
  }

  .medidas-hoy-limpios {
    font-size: 1.12rem;
  }

  .medidas-hoy-card {
    padding: 14px;
  }
}
</style>
