<template>
  <div class="overlay-abonos-catarro" @click.self="cerrar">
    <div class="dialogo-abonos-catarro" role="dialog" aria-modal="true" aria-labelledby="titulo-abonos-catarro">
      <header class="encabezado-abonos">
        <h2 id="titulo-abonos-catarro">Abonos de Catarro</h2>
        <button ref="cerrar" type="button" class="cerrar-abonos" aria-label="Cerrar" @click="cerrar">×</button>
      </header>

      <div class="resumen-abonos" role="status">
        <div>
          <span>Total abonado</span>
          <strong>${{ formatNumber(total) }}</strong>
        </div>
        <div>
          <span>Abonos</span>
          <strong>{{ visibles.length }}</strong>
        </div>
      </div>

      <form class="filtros-abonos" @submit.prevent>
        <label>
          Mes de la cuenta
          <select v-model="mes" aria-label="Filtrar por mes de la cuenta">
            <option value="">Todos</option>
            <option v-for="opcion in meses" :key="opcion.valor" :value="opcion.valor">{{ opcion.etiqueta }}</option>
          </select>
        </label>
        <label>
          Desde
          <input v-model="desde" type="date" aria-label="Fecha inicial de la cuenta">
        </label>
        <label>
          Hasta
          <input v-model="hasta" type="date" aria-label="Fecha final de la cuenta">
        </label>
        <button type="button" class="limpiar-filtro" @click="limpiarFiltros">Quitar filtro</button>
      </form>

      <div class="lista-abonos">
        <p v-if="!visibles.length" class="vacio-abonos">No hay abonos en este periodo.</p>
        <ul v-else>
          <li v-for="abono in visibles" :key="abono.id">
            <div class="fila-abono">
              <span class="fecha-cuenta">{{ textoFecha(abono.fechaCuenta) }}</span>
              <span class="monto-abono">${{ formatNumber(abono.monto) }}</span>
            </div>
            <p class="descripcion-abono">{{ abono.descripcion }}</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { formatNumber, formatearFecha } from '@/utils/formatters';
import {
  filtrarAbonosCatarro,
  listarAbonosCuentasCatarro,
  totalAbonosCatarro,
} from '@/utils/fechaAbonoCatarro';

export default {
  name: 'ModalAbonosCatarro',
  props: {
    cuentas: { type: Array, default: () => [] },
  },
  data() {
    return { mes: '', desde: '', hasta: '' };
  },
  computed: {
    todos() { return listarAbonosCuentasCatarro(this.cuentas); },
    visibles() {
      return filtrarAbonosCatarro(this.todos, { mes: this.mes, desde: this.desde, hasta: this.hasta });
    },
    total() { return totalAbonosCatarro(this.visibles); },
    meses() {
      const vistos = new Set(this.todos.map(abono => (abono.fechaReferencia || '').slice(0, 7)).filter(Boolean));
      return [...vistos].sort((a, b) => b.localeCompare(a)).map(valor => ({ valor, etiqueta: this.etiquetaMes(valor) }));
    },
  },
  mounted() {
    this.overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.alTecla);
    this.$nextTick(() => { if (this.$refs.cerrar) this.$refs.cerrar.focus(); });
  },
  beforeDestroy() {
    document.body.style.overflow = this.overflowAnterior || '';
    document.removeEventListener('keydown', this.alTecla);
  },
  methods: {
    formatNumber,
    textoFecha(fecha) { return fecha ? formatearFecha(fecha) : 'Sin fecha'; },
    etiquetaMes(mes) {
      const [anio, numero] = mes.split('-');
      const nombre = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: 'UTC' })
        .format(new Date(Date.UTC(Number(anio), Number(numero) - 1, 1)));
      return `${nombre} ${anio}`;
    },
    limpiarFiltros() { this.mes = ''; this.desde = ''; this.hasta = ''; },
    cerrar() { this.$emit('cerrar'); },
    alTecla(evento) { if (evento.key === 'Escape') this.cerrar(); },
  },
};
</script>

<style scoped>
.overlay-abonos-catarro {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 8px;
  background: rgba(15, 23, 42, 0.55);
  box-sizing: border-box;
}
.dialogo-abonos-catarro {
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  max-height: min(92vh, 920px);
  overflow: hidden;
  background: #fff;
  color: #243047;
  border-radius: 14px 14px 10px 10px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
}
.encabezado-abonos {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 10px;
}
.encabezado-abonos h2 {
  margin: 0;
  color: #8e1424;
  font-size: 20px;
  line-height: 1.2;
}
.cerrar-abonos {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border: 1px solid #a41021;
  border-radius: 8px;
  background: #fff;
  color: #a41021;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.cerrar-abonos:hover { background: #a41021; color: #fff; }
.cerrar-abonos:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
.resumen-abonos {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin: 0 14px 12px;
}
.resumen-abonos > div {
  min-width: 0;
  padding: 12px;
  border-radius: 10px;
  background: #fff1f2;
  border: 1px solid #f3c3c8;
}
.resumen-abonos span { display: block; color: #7f1d1d; font-size: 12px; font-weight: 700; }
.resumen-abonos strong {
  display: block;
  margin-top: 4px;
  color: #166534;
  font-size: 22px;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.resumen-abonos > div:last-child strong { color: #243047; text-align: right; }
.filtros-abonos {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr auto;
  gap: 8px;
  align-items: end;
  padding: 0 14px 12px;
}
.filtros-abonos label { display: flex; flex-direction: column; gap: 4px; min-width: 0; font-size: 12px; font-weight: 700; color: #526176; }
.filtros-abonos select,
.filtros-abonos input {
  width: 100%;
  min-width: 0;
  min-height: 40px;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid #a3afbe;
  border-radius: 7px;
  background: #fff;
  color: #243047;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
}
.limpiar-filtro {
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid #a3afbe;
  border-radius: 7px;
  background: #fff;
  color: #243047;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.lista-abonos { overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 14px 16px; }
.lista-abonos ul { list-style: none; margin: 0; padding: 0; }
.lista-abonos li { padding: 12px 0; border-top: 1px solid #e6ebf1; }
.fila-abono { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.fecha-cuenta { color: #526176; font-size: 13px; }
.monto-abono { color: #166534; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.descripcion-abono { margin: 6px 0 0; color: #243047; font-size: 15px; line-height: 1.35; overflow-wrap: anywhere; white-space: pre-wrap; }
.vacio-abonos { margin: 8px 0 12px; color: #64748b; }
@media (min-width: 700px) {
  .overlay-abonos-catarro { align-items: center; padding: 24px; }
  .dialogo-abonos-catarro { border-radius: 14px; }
}
@media (max-width: 480px) {
  .overlay-abonos-catarro { padding: 0; align-items: flex-end; }
  .dialogo-abonos-catarro { width: 100%; max-height: calc(100vh - 150px); border-radius: 16px 16px 0 0; }
  .filtros-abonos { grid-template-columns: 1fr 1fr; }
  .filtros-abonos label:first-child,
  .limpiar-filtro { grid-column: 1 / -1; }
  .resumen-abonos strong { font-size: 20px; }
}
</style>
