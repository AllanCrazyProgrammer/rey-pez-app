<template>
  <div class="tabla-wrapper">
    <table class="tabla-taras">
      <thead>
        <tr>
          <th>FECHA</th>
          <th>TARAS</th>
          <th>TAPAS</th>
          <th class="col-acciones">ACCIONES</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="movimientosConSaldo.length === 0">
          <td colspan="4" class="sin-registros">Sin movimientos registrados para este proveedor.</td>
        </tr>
        <tr v-for="movimiento in movimientosConSaldo" :key="movimiento.id">
          <td>{{ formatearFecha(movimiento.fecha) }}</td>
          <td :class="['valor', movimiento.taras < 0 ? 'negativo' : 'positivo']">
            {{ formatearCantidad(movimiento.taras) }}
          </td>
          <td :class="['valor', movimiento.tapas < 0 ? 'negativo' : 'positivo']">
            {{ formatearCantidad(movimiento.tapas) }}
          </td>
          <td class="col-acciones">
            <div class="acciones-celda">
              <button
                type="button"
                class="btn-editar"
                @click="$emit('editar', movimiento)"
                aria-label="Editar movimiento"
                title="Editar movimiento"
              >
                ✎
              </button>
              <button
                type="button"
                class="btn-eliminar"
                @click="$emit('eliminar', movimiento)"
                aria-label="Eliminar movimiento"
                title="Eliminar movimiento"
              >
                ×
              </button>
            </div>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td class="pendiente-label">PENDIENTES</td>
          <td :class="['valor total', saldoTarasActual < 0 ? 'negativo' : 'positivo']">{{ formatearCantidad(saldoTarasActual) }}</td>
          <td :class="['valor total', saldoTapasActual < 0 ? 'negativo' : 'positivo']">{{ formatearCantidad(saldoTapasActual) }}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script>
export default {
  name: 'TarasMovimientosTable',
  props: {
    movimientos: {
      type: Array,
      default: () => []
    },
    saldoTarasActual: {
      type: Number,
      default: 0
    },
    saldoTapasActual: {
      type: Number,
      default: 0
    }
  },
  computed: {
    movimientosConSaldo() {
      return this.movimientos;
    }
  },
  methods: {
    formatearFecha(fecha) {
      if (!fecha) return '';
      const date = new Date(`${fecha}T00:00:00`);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short'
      }).replace('.', '').toLowerCase();
    },
    formatearCantidad(valor) {
      const numero = Number(valor) || 0;
      const prefijo = numero > 0 ? '+' : '';
      return `${prefijo}${numero}`;
    }
  }
};
</script>

<style scoped>
.tabla-wrapper {
  width: 100%;
  overflow-x: auto;
}

.tabla-taras {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
  background: #fff;
}

.tabla-taras th,
.tabla-taras td {
  border: 2px solid #111;
  padding: 10px;
  text-align: center;
}

.col-acciones {
  width: auto;
  min-width: 112px;
  max-width: 140px;
  padding-left: 6px !important;
  padding-right: 6px !important;
}

.acciones-celda {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-editar {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  width: 30px;
  height: 30px;
  padding: 0;
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
}

.btn-editar:hover {
  background: #1d4ed8;
}

.tabla-taras th {
  background: #f3f4f6;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.sin-registros {
  color: #6b7280;
}

.valor {
  font-weight: 700;
}

.positivo {
  color: #111827;
}

.negativo {
  color: #dc2626;
}

.pendiente-label {
  text-align: left;
  font-weight: 800;
}

.total {
  font-size: 1.1rem;
}

.btn-eliminar {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  width: 30px;
  height: 30px;
  padding: 0;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.btn-eliminar:hover {
  background: #dc2626;
}

@media (max-width: 768px) {
  .tabla-taras {
    min-width: 560px;
  }
}
</style>
