<template>
  <section class="movimientos-panel" aria-labelledby="movimientos-title">
    <div class="chofer-selector-local" role="tablist" aria-label="Seleccionar chofer de fletes">
      <button
        v-for="chofer in choferes"
        :key="chofer"
        type="button"
        class="chofer-btn"
        :class="{ active: choferSeleccionado === chofer }"
        :aria-selected="choferSeleccionado === chofer ? 'true' : 'false'"
        role="tab"
        @click="$emit('seleccionar-chofer', chofer)"
      >
        {{ chofer.toUpperCase() }}
      </button>
    </div>

    <div class="chofer-ascii" :class="choferClase">
      <span class="chofer-status">[CHOFER_ACTIVO]</span>
      <pre>{{ arteChofer }}</pre>
    </div>

    <div class="panel-heading">
      <div>
        <p class="eyebrow">[MOVIMIENTOS]</p>
        <h2 id="movimientos-title">Registro de fletes y abonos</h2>
      </div>
      <p class="hint">{{ items.length }} registros</p>
    </div>

    <div class="desktop-table" role="region" aria-label="Tabla de movimientos" tabindex="0">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Jos L</th>
            <th>Jos C</th>
            <th>Lor L</th>
            <th>Lor C</th>
            <th>Total</th>
            <th>Monto</th>
            <th>Saldo</th>
            <th>Estado</th>
            <th>Accion</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            :class="{ abono: item.tipo === 'abono', pagado: item.pagado }"
          >
            <td>{{ formatearFecha(item.fecha) }}</td>
            <td>{{ etiquetaTipo(item) }}</td>
            <td>{{ item.tipo === 'abono' ? '-' : item.tarasLimpioJoselito }}</td>
            <td>{{ item.tipo === 'abono' ? '-' : item.tarasCrudoJoselito }}</td>
            <td>{{ item.tipo === 'abono' ? '-' : (item.tarasLimpioVeronica || 0) }}</td>
            <td>{{ item.tipo === 'abono' ? '-' : (item.tarasCrudoVeronica || 0) }}</td>
            <td>{{ item.tipo === 'abono' ? '-' : obtenerTotalTaras(item) }}</td>
            <td>{{ formatearMonto(montoMovimiento(item)) }}</td>
            <td>{{ formatearMonto(deudaAcumuladaPorId[item.id] || 0) }}</td>
            <td>
              <span :class="['badge', estadoClase(item)]">{{ etiquetaEstado(item) }}</span>
            </td>
            <td>
              <button
                v-if="item.tipo === 'flete'"
                type="button"
                class="action-btn"
                :class="{ danger: item.pagado }"
                :disabled="procesandoPagoPorId[item.id]"
                :aria-busy="procesandoPagoPorId[item.id] ? 'true' : 'false'"
                @click="$emit('toggle-pago', item)"
              >
                {{ procesandoPagoPorId[item.id] ? 'SYNC...' : (item.pagado ? 'PENDIENTE' : 'PAGADO') }}
              </button>
              <button
                v-else
                type="button"
                class="action-btn danger"
                :disabled="eliminandoAbonoPorId[item.id]"
                :aria-busy="eliminandoAbonoPorId[item.id] ? 'true' : 'false'"
                @click="$emit('eliminar-abono', item)"
              >
                {{ eliminandoAbonoPorId[item.id] ? 'DEL...' : 'ELIMINAR' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mobile-list">
      <article
        v-for="item in items"
        :key="`card-${item.id}`"
        class="movement-card"
        :class="{ abono: item.tipo === 'abono', pagado: item.pagado }"
      >
        <header>
          <div>
            <span class="date">{{ formatearFecha(item.fecha) }}</span>
            <strong>{{ etiquetaTipo(item) }}</strong>
          </div>
          <span :class="['badge', estadoClase(item)]">{{ etiquetaEstado(item) }}</span>
        </header>

        <div class="card-grid">
          <p><span>Monto</span><strong>{{ formatearMonto(montoMovimiento(item)) }}</strong></p>
          <p><span>Saldo</span><strong>{{ formatearMonto(deudaAcumuladaPorId[item.id] || 0) }}</strong></p>
          <p v-if="item.tipo === 'flete'"><span>Total taras</span><strong>{{ obtenerTotalTaras(item) }}</strong></p>
          <p v-if="item.tipo === 'flete'"><span>Joselito</span><strong>{{ item.tarasLimpioJoselito }}/{{ item.tarasCrudoJoselito }}</strong></p>
          <p v-if="item.tipo === 'flete'"><span>Lorena</span><strong>{{ item.tarasLimpioVeronica || 0 }}/{{ item.tarasCrudoVeronica || 0 }}</strong></p>
          <p v-if="item.tipo === 'abono'"><span>Descripcion</span><strong>{{ item.descripcion || 'Abono realizado' }}</strong></p>
        </div>

        <button
          v-if="item.tipo === 'flete'"
          type="button"
          class="action-btn full"
          :class="{ danger: item.pagado }"
          :disabled="procesandoPagoPorId[item.id]"
          :aria-busy="procesandoPagoPorId[item.id] ? 'true' : 'false'"
          @click="$emit('toggle-pago', item)"
        >
          {{ procesandoPagoPorId[item.id] ? 'SINCRONIZANDO...' : (item.pagado ? 'MARCAR_PENDIENTE' : 'MARCAR_PAGADO') }}
        </button>
        <button
          v-else
          type="button"
          class="action-btn danger full"
          :disabled="eliminandoAbonoPorId[item.id]"
          :aria-busy="eliminandoAbonoPorId[item.id] ? 'true' : 'false'"
          @click="$emit('eliminar-abono', item)"
        >
          {{ eliminandoAbonoPorId[item.id] ? 'ELIMINANDO...' : 'ELIMINAR_ABONO' }}
        </button>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'CuentaFletesMovimientos',
  props: {
    items: {
      type: Array,
      required: true
    },
    choferSeleccionado: {
      type: String,
      required: true
    },
    choferes: {
      type: Array,
      default: () => ['Caminante', 'Porro']
    },
    deudaAcumuladaPorId: {
      type: Object,
      required: true
    },
    procesandoPagoPorId: {
      type: Object,
      default: () => ({})
    },
    eliminandoAbonoPorId: {
      type: Object,
      default: () => ({})
    },
    formatearFecha: {
      type: Function,
      required: true
    },
    formatearMonto: {
      type: Function,
      required: true
    },
    calcularMontoDia: {
      type: Function,
      required: true
    },
    obtenerTotalTaras: {
      type: Function,
      required: true
    }
  },
  computed: {
    choferClase() {
      return this.choferSeleccionado.toLowerCase().includes('porro') ? 'porro' : 'caminante';
    },
    arteChofer() {
      if (this.choferClase === 'porro') {
        return [
          ' ____   ___  ____  ____   ___  ',
          '|  _ \\ / _ \\|  _ \\|  _ \\ / _ \\ ',
          '| |_) | | | | |_) | |_) | | | |',
          '|  __/| |_| |  _ <|  _ <| |_| |',
          '|_|    \\___/|_| \\_\\_| \\_\\\\___/ '
        ].join('\n');
      }

      return [
        '  ____    _    __  __ ___ _   _    _    _   _ _____ _____ ',
        ' / ___|  / \\  |  \\/  |_ _| \\ | |  / \\  | \\ | |_   _| ____|',
        '| |     / _ \\ | |\\/| || ||  \\| | / _ \\ |  \\| | | | |  _|  ',
        '| |___ / ___ \\| |  | || || |\\  |/ ___ \\| |\\  | | | | |___ ',
        ' \\____/_/   \\_\\_|  |_|___|_| \\_/_/   \\_\\_| \\_| |_| |_____|'
      ].join('\n');
    }
  },
  methods: {
    etiquetaTipo(item) {
      return item.tipo === 'abono' ? 'ABONO' : 'FLETE';
    },
    etiquetaEstado(item) {
      if (item.tipo === 'abono') return '[ABONO]';
      return item.pagado ? '[PAGADO]' : '[PENDIENTE]';
    },
    estadoClase(item) {
      if (item.tipo === 'abono') return 'info';
      return item.pagado ? 'success' : 'danger';
    },
    montoMovimiento(item) {
      return item.tipo === 'abono'
        ? -(Number(item.monto) || 0)
        : this.calcularMontoDia(item);
    }
  }
}
</script>

<style scoped>
.movimientos-panel {
  padding: clamp(16px, 2.5vw, 28px);
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  margin-bottom: 16px;
}

.chofer-selector-local {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.chofer-btn {
  min-height: 48px;
  border: 1px solid var(--matrix-green);
  background: rgba(0, 0, 0, 0.32);
  color: var(--matrix-green);
  font-family: 'Share Tech Mono', monospace;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.chofer-btn:hover,
.chofer-btn.active {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 14px var(--matrix-green-glow);
}

.chofer-btn.active:nth-child(2) {
  border-color: var(--amber);
  background: var(--amber);
  color: #070707;
  box-shadow: 0 0 14px rgba(255, 176, 0, 0.45);
}

.chofer-ascii {
  margin-bottom: 18px;
  border: 1px solid var(--matrix-green);
  background:
    linear-gradient(135deg, rgba(0, 255, 65, 0.11), rgba(0, 0, 0, 0.36)),
    rgba(0, 0, 0, 0.42);
  box-shadow: 0 0 18px rgba(0, 255, 65, 0.18), inset 0 0 30px rgba(0, 255, 65, 0.05);
  padding: 14px;
  overflow-x: auto;
  scrollbar-width: none;
}

.chofer-ascii::-webkit-scrollbar {
  display: none;
}

.chofer-ascii.porro {
  border-color: var(--amber);
  box-shadow: 0 0 18px rgba(255, 176, 0, 0.2), inset 0 0 30px rgba(255, 176, 0, 0.05);
}

.chofer-status {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--amber);
  font-family: 'Share Tech Mono', monospace;
  letter-spacing: 1px;
}

.chofer-ascii pre {
  margin: 0;
  color: var(--matrix-green);
  font-family: 'Share Tech Mono', monospace;
  font-size: clamp(0.68rem, 1.5vw, 1rem);
  line-height: 1.05;
  text-shadow: 0 0 12px var(--matrix-green-glow);
}

.chofer-ascii.porro pre {
  color: var(--amber);
  text-shadow: 0 0 12px rgba(255, 176, 0, 0.45);
}

.eyebrow,
h2,
.hint {
  margin: 0;
}

.eyebrow,
.hint {
  color: var(--amber);
  font-family: 'Share Tech Mono', monospace;
}

h2 {
  font-size: clamp(1.8rem, 3vw, 3rem);
  text-shadow: 0 0 12px var(--matrix-green-glow);
}

.desktop-table {
  overflow-x: auto;
  border: 1px solid var(--terminal-border);
  scrollbar-width: none;
}

.desktop-table::-webkit-scrollbar {
  display: none;
}

table {
  width: 100%;
  min-width: 1060px;
  border-collapse: collapse;
  background: rgba(0, 0, 0, 0.34);
}

th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(0, 255, 65, 0.16);
  text-align: left;
  font-family: 'Share Tech Mono', monospace;
}

th {
  position: sticky;
  top: 0;
  background: rgba(0, 0, 0, 0.86);
  color: var(--amber);
  z-index: 1;
}

tr:hover {
  background: rgba(0, 255, 65, 0.07);
}

tr.abono {
  background: rgba(75, 211, 255, 0.07);
}

.badge {
  display: inline-flex;
  border: 1px solid currentColor;
  padding: 4px 8px;
  white-space: nowrap;
}

.badge.success { color: var(--matrix-green); }
.badge.danger { color: #ff8da2; }
.badge.info { color: var(--info); }

.action-btn {
  border: 1px solid var(--matrix-green);
  background: transparent;
  color: var(--matrix-green);
  min-height: 38px;
  padding: 8px 10px;
  font-family: 'Share Tech Mono', monospace;
  cursor: pointer;
}

.action-btn:hover:not(:disabled) {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 12px var(--matrix-green-glow);
}

.action-btn.danger {
  border-color: var(--danger);
  color: #ff8da2;
}

.action-btn.danger:hover:not(:disabled) {
  background: var(--danger);
  color: #070707;
  box-shadow: 0 0 12px rgba(255, 77, 109, 0.45);
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.mobile-list {
  display: none;
}

.movement-card {
  border: 1px solid var(--terminal-border);
  background: var(--terminal-panel);
  padding: 16px;
  box-shadow: inset 0 0 30px rgba(0, 255, 65, 0.04);
}

.movement-card + .movement-card {
  margin-top: 12px;
}

.movement-card header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 255, 65, 0.16);
}

.date,
.card-grid span {
  display: block;
  color: #9ef8b5;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.84rem;
}

.movement-card strong {
  color: var(--matrix-green);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0;
}

.card-grid p {
  margin: 0;
  border: 1px solid rgba(0, 255, 65, 0.16);
  padding: 10px;
}

.full {
  width: 100%;
}

@media (max-width: 860px) {
  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: block;
  }

  .panel-heading {
    display: block;
  }

  .chofer-selector-local {
    grid-template-columns: 1fr;
  }

  .chofer-ascii pre {
    font-size: 0.62rem;
  }
}

@media (max-width: 520px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
</style>
