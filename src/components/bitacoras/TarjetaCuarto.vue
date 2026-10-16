<template>
  <button
    type="button"
    class="room-card"
    :class="{ selected: seleccionado }"
    :aria-expanded="seleccionado ? 'true' : 'false'"
    aria-controls="panel-cuarto"
    @click="$emit('alternar')"
  >
    <span class="room-topline">
      <span class="room-name">
        <i class="far fa-snowflake" aria-hidden="true"></i>
        {{ cuarto.nombre }}
      </span>
      <i class="fas fa-chevron-down chevron" aria-hidden="true"></i>
    </span>

    <template v-if="!cargando && !errorCarga && cuarto.ultimo">
      <strong v-if="tieneTemperatura" class="room-temperature">
        {{ cuarto.ultimo.temperatura }} <small>°C</small>
      </strong>
      <span v-else class="room-empty">Sin temperatura</span>
      <EstadoMantenimiento :estado="cuarto.ultimo.estado" />
      <span class="room-date">{{ formatearFecha(cuarto.ultimo.fecha) }}</span>
    </template>
    <span v-else class="room-empty">{{ textoVacio }}</span>

    <span class="room-meta">{{ textoMeta }}</span>
    <span class="room-cta">{{ seleccionado ? 'Ocultar registros' : 'Ver registros' }}</span>
  </button>
</template>

<script>
import { formatearFecha } from '@/utils/formatters';
import EstadoMantenimiento from '@/components/bitacoras/EstadoMantenimiento.vue';

export default {
  name: 'TarjetaCuarto',
  components: { EstadoMantenimiento },
  props: {
    cuarto: { type: Object, required: true },
    seleccionado: { type: Boolean, default: false },
    cargando: { type: Boolean, default: false },
    errorCarga: { type: String, default: '' },
    equiposListos: { type: Boolean, default: false },
  },
  computed: {
    tieneTemperatura() {
      const valor = this.cuarto.ultimo && this.cuarto.ultimo.temperatura;
      return valor !== null && valor !== undefined && String(valor).trim() !== '';
    },
    textoVacio() {
      if (this.cargando) return 'Cargando…';
      if (this.errorCarga) return 'No disponible';
      return 'Sin registros';
    },
    textoMeta() {
      if (this.cargando) return 'Cargando registros…';
      if (this.errorCarga) return 'Registros no disponibles';
      const total = Number(this.cuarto.totalRegistros) || 0;
      const registros = total === 1 ? '1 registro' : `${total} registros`;
      if (!this.equiposListos) return registros;
      const equiposTotal = Number(this.cuarto.totalEquipos) || 0;
      const equipos = equiposTotal === 1 ? '1 equipo' : `${equiposTotal} equipos`;
      return `${registros} · ${equipos}`;
    },
  },
  methods: { formatearFecha },
};
</script>

<style scoped>
.room-card {
  --ink: #173b36;
  --muted: #61766e;
  --line: #dce6df;
  --accent: #17664e;
  text-align: left;
  width: 100%;
  min-height: 168px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(23, 59, 54, 0.05);
  font: inherit;
  cursor: pointer;
  animation: aparecer-tarjeta 0.46s ease backwards;
  animation-delay: calc(var(--i, 0) * 60ms);
}
.room-card:hover {
  border-color: #8db3a3;
  background: #f7fbf8;
}
.room-card:active {
  transform: scale(0.985);
}
.room-card:focus-visible {
  outline: 3px solid #378c73;
  outline-offset: 3px;
}
.room-card.selected {
  border-color: var(--accent);
  background: #f3faf6;
  box-shadow: 0 10px 24px rgba(23, 102, 78, 0.12);
}
.room-topline {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.room-name {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}
.room-name i {
  color: #43816d;
}
.chevron {
  color: var(--muted);
  font-size: 12px;
  transition: transform 0.28s ease;
}
.room-card.selected .chevron {
  transform: rotate(180deg);
  color: var(--accent);
}
.room-temperature {
  font-size: 30px;
  line-height: 1;
  letter-spacing: -0.7px;
  font-variant-numeric: tabular-nums;
}
.room-temperature small {
  font-size: 15px;
  font-weight: 500;
  color: var(--muted);
}
.room-date,
.room-empty,
.room-meta,
.room-cta {
  font-size: 12px;
  color: var(--muted);
}
.room-date,
.room-empty {
  margin-top: auto;
}
.room-meta {
  font-weight: 600;
}
.room-cta {
  color: var(--accent);
  font-weight: 700;
}
@keyframes aparecer-tarjeta {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .room-card,
  .chevron {
    animation: none;
    transition: none;
  }
  .room-card:active,
  .room-card.selected .chevron {
    transform: none;
  }
}
</style>
