<template>
  <div class="movimientos-medida">
    <dialog
      ref="overlay"
      class="stock-overlay"
      aria-labelledby="movimientos-titulo"
      @cancel.prevent="cerrar"
      @click="cerrarSiFondo($event)"
    >
      <section ref="dialogo" class="stock-dialogo" tabindex="-1">
        <header>
          <h2 id="movimientos-titulo">Entradas y salidas — {{ titulo }}</h2>
          <button type="button" aria-label="Cerrar movimientos" @click="cerrar">×</button>
        </header>
        <div class="stock-body">
          <div class="movimientos-periodo" role="group" aria-label="Periodo">
            <button
              v-for="opcion in opcionesPeriodo"
              :key="opcion.valor"
              type="button"
              :class="{ activo: periodo === opcion.valor }"
              @click="periodo = opcion.valor"
            >{{ opcion.etiqueta }}</button>
          </div>
          <div class="movimientos-totales">
            <span>Entradas: <strong class="entrada">+{{ formatNumber(totales.entradas) }} kg</strong></span>
            <span>Salidas: <strong class="salida">−{{ formatNumber(totales.salidas) }} kg</strong></span>
            <span>Neto: <strong>{{ formatNumber(totales.neto) }} kg</strong></span>
          </div>
          <p v-if="!movimientos.length" class="movimientos-vacio">
            Sin movimientos en este periodo.
          </p>
          <table v-else class="movimientos-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Medida</th>
                <th>Proveedor</th>
                <th class="kilos-cell">Kilos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(mov, index) in movimientos" :key="`${mov.fechaISO}-${mov.tipo}-${index}`">
                <td>{{ mov.fecha }}</td>
                <td>
                  <span :class="mov.tipo === 'entrada' ? 'etiqueta-entrada' : 'etiqueta-salida'">
                    {{ mov.tipo === 'entrada' ? 'Entrada' : 'Salida' }}
                  </span>
                </td>
                <td>{{ mov.medida }}</td>
                <td>{{ mov.proveedor }}</td>
                <td class="kilos-cell" :class="mov.tipo">
                  {{ mov.tipo === 'entrada' ? '+' : '−' }}{{ formatNumber(mov.kilos) }}
                </td>
              </tr>
            </tbody>
          </table>
          <p class="movimientos-nota">Solo lectura: aquí no se registra ni se modifica ningún movimiento.</p>
        </div>
      </section>
    </dialog>
  </div>
</template>

<script>
import { formatearFecha, formatNumber } from '@/utils/formatters';

export default {
  name: 'MovimientosMedida',
  props: {
    titulo: { type: String, required: true },
    medidaBase: { type: String, default: '' },
    variante: { type: String, default: '' },
    proveedorMaquila: { type: String, default: '' },
    sacadas: { type: Array, default: () => [] }
  },
  data: () => ({
    periodo: 90,
    opcionesPeriodo: [
      { valor: 30, etiqueta: '30 días' },
      { valor: 60, etiqueta: '60 días' },
      { valor: 90, etiqueta: '90 días' },
      { valor: 0, etiqueta: 'Todo' }
    ],
    overflowAnterior: ''
  }),
  computed: {
    fechaLimite() {
      if (!this.periodo) return null;
      const limite = new Date();
      limite.setHours(0, 0, 0, 0);
      limite.setDate(limite.getDate() - (this.periodo - 1));
      return limite;
    },
    movimientos() {
      const lista = [];
      (this.sacadas || []).forEach((sacada) => {
        const fecha = this.parseFecha(sacada.fecha);
        if (!fecha || Number.isNaN(fecha.getTime())) return;
        if (this.fechaLimite && fecha < this.fechaLimite) return;
        (sacada.entradas || []).forEach((entrada) => {
          if (this.coincide(entrada.medida, entrada.proveedor)) {
            lista.push(this.movimiento(fecha, 'entrada', entrada));
          }
        });
        (sacada.salidas || []).forEach((salida) => {
          if (this.coincide(salida.medida, salida.proveedor)) {
            lista.push(this.movimiento(fecha, 'salida', salida));
          }
        });
      });
      return lista.sort((a, b) => b.fechaOrden - a.fechaOrden);
    },
    totales() {
      return this.movimientos.reduce((acc, mov) => {
        if (mov.tipo === 'entrada') acc.entradas += mov.kilos;
        else acc.salidas += mov.kilos;
        acc.neto = acc.entradas - acc.salidas;
        return acc;
      }, { entradas: 0, salidas: 0, neto: 0 });
    }
  },
  mounted() {
    this.overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (this.$refs.overlay) this.$refs.overlay.showModal();
  },
  beforeDestroy() {
    if (this.$refs.overlay && this.$refs.overlay.open) this.$refs.overlay.close();
    document.body.style.overflow = this.overflowAnterior || '';
  },
  methods: {
    formatNumber,
    formatearFecha,
    parseFecha(fecha) {
      if (!fecha) return null;
      if (fecha instanceof Date) return fecha;
      if (typeof fecha.toDate === 'function') return fecha.toDate();
      const d = new Date(fecha);
      return Number.isNaN(d.getTime()) ? null : d;
    },
    coincide(medida, proveedor) {
      const texto = String(medida || '').trim();
      if (this.variante) return texto.toLowerCase() === String(this.variante).trim().toLowerCase();
      if (this.proveedorMaquila) return proveedor === this.proveedorMaquila;
      if (this.medidaBase) return texto.split(' ')[0] === this.medidaBase;
      return false;
    },
    movimiento(fecha, tipo, registro) {
      return {
        fecha: formatearFecha(fecha),
        fechaISO: fecha.toISOString().slice(0, 10),
        fechaOrden: fecha.getTime(),
        tipo,
        medida: registro.medida,
        proveedor: registro.proveedor,
        kilos: Number(registro.kilos) || 0
      };
    },
    cerrarSiFondo(event) {
      if (event.target === this.$refs.overlay) this.cerrar();
    },
    cerrar() {
      this.$emit('cerrar');
    }
  }
};
</script>

<style scoped>
.stock-overlay {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  border: 0;
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: #000b;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.stock-overlay:not([open]) {
  display: none;
}
.stock-dialogo {
  width: 100%;
  max-width: 680px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  background: #081b11;
  color: #d7ffe9;
  border: 1px solid #488c60;
  border-radius: 14px;
  box-shadow: 0 20px 70px #0008;
}
.stock-dialogo header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-bottom: 1px solid #397b51;
}
.stock-dialogo h2 {
  color: #a8ffcb;
  margin: 0;
  font-size: 19px;
  font-weight: 700;
}
.stock-dialogo header button {
  background: transparent;
  border: 1px solid #397b51;
  color: #a8ffcb;
  border-radius: 8px;
  font-size: 20px;
  line-height: 1;
  padding: 4px 10px;
  cursor: pointer;
}
.stock-body {
  padding: 20px;
}
.movimientos-periodo {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.movimientos-periodo button {
  background: transparent;
  border: 1px solid #397b51;
  color: #a8ffcb;
  border-radius: 8px;
  padding: 6px 12px;
  font: inherit;
  cursor: pointer;
}
.movimientos-periodo button.activo {
  background: #a8ffcb;
  color: #073519;
  font-weight: 700;
}
.movimientos-totales {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 14px;
  font-size: 15px;
}
.movimientos-totales .entrada {
  color: #00ff66;
}
.movimientos-totales .salida {
  color: #ff8a7a;
}
.movimientos-vacio {
  color: #a8ffcb;
  opacity: 0.8;
}
.movimientos-tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.movimientos-tabla th,
.movimientos-tabla td {
  text-align: left;
  padding: 8px 6px;
  border-bottom: 1px solid #1d4a2e;
}
.movimientos-tabla th {
  color: #a8ffcb;
}
.movimientos-tabla .kilos-cell {
  text-align: right;
  white-space: nowrap;
}
.movimientos-tabla .kilos-cell.entrada {
  color: #00ff66;
}
.movimientos-tabla .kilos-cell.salida {
  color: #ff8a7a;
}
.etiqueta-entrada,
.etiqueta-salida {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}
.etiqueta-entrada {
  background: rgba(0, 255, 102, 0.15);
  color: #00ff66;
}
.etiqueta-salida {
  background: rgba(255, 138, 122, 0.15);
  color: #ff8a7a;
}
.movimientos-nota {
  margin-top: 14px;
  font-size: 13px;
  opacity: 0.75;
}
</style>
