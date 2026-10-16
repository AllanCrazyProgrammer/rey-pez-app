<template>
  <section class="panel">
    <header class="panel-encabezado">
      <div>
        <p class="kicker">Cuarto seleccionado</p>
        <h3 id="panel-cuarto-titulo">{{ cuarto.nombre }}</h3>
        <p class="resumen">{{ textoConteo }}</p>
      </div>
      <button type="button" class="btn-nueva" @click="$emit('nueva')">
        <i class="fas fa-plus" aria-hidden="true"></i> Nueva bitácora
      </button>
    </header>

    <div class="bloque">
      <h4>Registros de mantenimiento</h4>
      <p v-if="cargando" class="estado" role="status">Cargando bitácoras…</p>
      <p v-else-if="errorCarga" class="estado" role="alert">No se pudieron cargar los registros de este cuarto.</p>
      <p v-else-if="!registros.length" class="estado">
        Este cuarto todavía no tiene bitácoras. Registra la primera revisión.
      </p>
      <ul v-else class="lista-registros">
        <li
          v-for="(bitacora, indice) in registros"
          :key="bitacora.id"
          class="registro"
          :style="{ '--i': indice > 8 ? 8 : indice }"
        >
          <div class="registro-cuerpo">
            <div class="registro-titulo">
              <strong>{{ formatearFecha(bitacora.fecha) }}</strong>
              <EstadoMantenimiento :estado="bitacora.estado" />
            </div>
            <p>{{ textoRegistro(bitacora) }}</p>
            <p v-if="bitacora.tecnico">Técnico: {{ bitacora.tecnico }}</p>
          </div>
          <div class="acciones">
            <button
              type="button"
              class="btn-detalle"
              :aria-label="'Ver detalle de ' + cuarto.nombre + ', ' + formatearFecha(bitacora.fecha)"
              @click="$emit('ver', bitacora)"
            >
              Ver detalle
            </button>
            <button
              type="button"
              class="btn-accion"
              :aria-label="'Editar bitácora de ' + cuarto.nombre + ', ' + formatearFecha(bitacora.fecha)"
              @click="$emit('editar', bitacora)"
            >
              <i class="fas fa-pen" aria-hidden="true"></i> Editar
            </button>
            <button
              type="button"
              class="btn-accion eliminar"
              :aria-label="'Eliminar bitácora de ' + cuarto.nombre + ', ' + formatearFecha(bitacora.fecha)"
              @click="$emit('eliminar', bitacora)"
            >
              <i class="far fa-trash-alt" aria-hidden="true"></i> Eliminar
            </button>
          </div>
        </li>
      </ul>
    </div>

    <EquiposCuarto
      :equipos="equipos"
      :listo="equiposListos"
      :cargando="cargandoEquipos"
      :error="errorEquipos"
      :guardando="guardandoEquipos"
      :error-guardado="errorGuardadoEquipos"
      :aviso="avisoEquipos"
      @guardar="$emit('guardar-equipos', $event)"
      @reintentar="$emit('reintentar-equipos')"
    />
  </section>
</template>

<script>
import { formatearFecha } from '@/utils/formatters';
import EstadoMantenimiento from '@/components/bitacoras/EstadoMantenimiento.vue';
import EquiposCuarto from '@/components/bitacoras/EquiposCuarto.vue';

export default {
  name: 'PanelCuarto',
  components: { EstadoMantenimiento, EquiposCuarto },
  props: {
    cuarto: { type: Object, required: true },
    registros: { type: Array, default: () => [] },
    cargando: { type: Boolean, default: false },
    errorCarga: { type: String, default: '' },
    equipos: { type: Array, default: () => [] },
    equiposListos: { type: Boolean, default: false },
    cargandoEquipos: { type: Boolean, default: false },
    errorEquipos: { type: String, default: '' },
    guardandoEquipos: { type: Boolean, default: false },
    errorGuardadoEquipos: { type: String, default: '' },
    avisoEquipos: { type: String, default: '' },
  },
  computed: {
    textoConteo() {
      if (this.cargando) return 'Buscando registros…';
      if (this.errorCarga) return 'Los registros no están disponibles';
      const total = this.registros.length;
      if (!total) return 'Sin registros de mantenimiento';
      return total === 1 ? '1 registro de mantenimiento' : `${total} registros de mantenimiento`;
    },
  },
  methods: {
    formatearFecha,
    tieneTemperatura(valor) {
      return valor !== null && valor !== undefined && String(valor).trim() !== '';
    },
    textoRegistro(bitacora) {
      const temperatura = this.tieneTemperatura(bitacora.temperatura)
        ? `${bitacora.temperatura} °C`
        : 'Sin temperatura';
      return [temperatura, bitacora.tipoMantenimiento].filter(Boolean).join(' · ');
    },
  },
};
</script>

<style scoped>
.panel {
  --ink: #173b36;
  --muted: #61766e;
  --line: #dce6df;
  --accent: #17664e;
  padding: 16px;
  border: 1px solid #c5ddd0;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(23, 62, 48, 0.08);
}
.panel-encabezado,
.registro,
.acciones {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}
.kicker {
  margin: 0 0 4px;
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}
.panel-encabezado h3,
.bloque h4 {
  margin: 0;
  color: var(--ink);
}
.panel-encabezado h3 {
  font-size: 22px;
  letter-spacing: -0.4px;
}
.resumen,
.estado,
.registro p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}
.btn-nueva,
.btn-detalle,
.btn-accion {
  min-height: 44px;
  border-radius: 10px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.btn-nueva {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  padding: 10px 14px;
  background: var(--accent);
  color: #fff;
}
.bloque {
  margin-top: 18px;
}
.bloque h4 {
  margin-bottom: 12px;
  font-size: 16px;
}
.estado {
  padding: 16px;
  border: 1px dashed #c9dbd1;
  border-radius: 12px;
  background: #fbfefc;
}
.lista-registros {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.registro {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fbfefc;
  animation: aparecer-registro 0.42s ease backwards;
  animation-delay: calc(var(--i, 0) * 48ms);
}
.registro-titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.registro-titulo strong {
  color: var(--ink);
  font-size: 15px;
}
.acciones {
  flex-direction: row;
  flex-wrap: wrap;
}
.btn-detalle,
.btn-accion {
  flex: 1 1 120px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--accent);
  padding: 8px 10px;
}
.btn-accion.eliminar {
  color: #ac4747;
  border-color: #f0d0d0;
}
.btn-nueva:focus-visible,
.btn-detalle:focus-visible,
.btn-accion:focus-visible {
  outline: 3px solid #378c73;
  outline-offset: 2px;
}
.btn-nueva:hover,
.btn-detalle:hover,
.btn-accion:hover {
  filter: brightness(0.98);
}
@keyframes aparecer-registro {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
@media (min-width: 720px) {
  .panel {
    padding: 20px;
  }
  .panel-encabezado {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .btn-nueva {
    flex-shrink: 0;
  }
  .registro {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .acciones {
    flex: 0 0 auto;
    justify-content: flex-end;
  }
  .btn-detalle,
  .btn-accion {
    flex: 0 0 auto;
  }
}
@media (prefers-reduced-motion: reduce) {
  .registro {
    animation: none;
  }
}
</style>
