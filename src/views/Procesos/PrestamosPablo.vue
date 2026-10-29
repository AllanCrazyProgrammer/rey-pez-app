<template>
  <div class="pablo-container">
    <BackButton to="/procesos/prestamos" />
    <span class="eyebrow">PRÉSTAMOS · PABLO</span>
    <h1>Dinero guardado de Pablo</h1>
    <p class="desc">Solo registro: aquí no se mueve dinero.</p>

    <p v-if="error" class="error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></p>

    <div class="saldo-card deuda-card" :class="{ saldada: resumen.deudaAllan === 0 }">
      <span class="saldo-label">Le debo a Pablo</span>
      <strong class="saldo-valor deuda">{{ cargando ? '…' : '$' + formatNumber(resumen.deudaAllan) }}</strong>
      <template v-if="resumen.tomado > 0">
        <div class="barra" role="progressbar" :aria-valuenow="resumen.avanceAbonos" aria-valuemin="0" aria-valuemax="100"><div :style="{ width: resumen.avanceAbonos + '%' }"></div></div>
        <div class="saldo-detalle">
          <span>Abonado ${{ formatNumber(resumen.abonos) }} de ${{ formatNumber(resumen.tomado) }} ({{ resumen.avanceAbonos }}%)</span>
        </div>
      </template>
      <p v-else class="saldo-detalle">No he tomado dinero de Pablo.</p>
    </div>

    <div class="totales">
      <div class="saldo-card mini">
        <span class="saldo-label">Pablo debe tener</span>
        <strong class="saldo-valor" :class="{ negativo: resumen.saldoPablo < 0 }">{{ cargando ? '…' : '$' + formatNumber(resumen.saldoPablo) }}</strong>
        <div class="saldo-detalle"><span>Dep. ${{ formatNumber(resumen.depositos) }}</span><span>Ret. ${{ formatNumber(resumen.retiros) }}</span></div>
      </div>
      <div class="saldo-card mini">
        <span class="saldo-label">Efectivo real guardado</span>
        <strong class="saldo-valor" :class="{ negativo: resumen.efectivoReal < 0 }">{{ cargando ? '…' : '$' + formatNumber(resumen.efectivoReal) }}</strong>
        <div class="saldo-detalle"><span>Debe tener − lo que le debo</span></div>
      </div>
    </div>

    <form class="form-card" @submit.prevent="guardar">
      <h2>Nuevo movimiento</h2>
      <div class="tipo-toggle">
        <button v-for="t in tipos" :key="t" type="button" :class="{ activo: nuevo.tipo === t }" @click="nuevo.tipo = t">{{ etiquetas[t] }}</button>
      </div>
      <p v-if="nuevo.tipo === 'abono'" class="ayuda">Deuda actual: ${{ formatNumber(resumen.deudaAllan) }}</p>
      <label>Fecha <input type="date" v-model="nuevo.fecha" required></label>
      <label>Monto <input type="number" min="0.01" step="0.01" v-model="nuevo.monto" required placeholder="0.00"></label>
      <label>Nota (opcional) <input type="text" maxlength="200" v-model="nuevo.nota" placeholder="Ej. le regresé para gasolina"></label>
      <p v-if="errorForm" class="error">{{ errorForm }}</p>
      <button type="submit" class="guardar" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar: ' + etiquetas[nuevo.tipo] }}</button>
    </form>

    <h2>Historial</h2>
    <p v-if="!cargando && !historial.length" class="vacio">Sin movimientos todavía.</p>
    <ul class="historial">
      <li v-for="m in historial" :key="m.id" :class="m.tipo">
        <div class="mov-main">
          <span class="mov-tipo">{{ m.etiqueta }}</span>
          <span class="mov-monto">{{ m.signo > 0 ? '+' : '−' }}${{ formatNumber(m.monto) }}</span>
        </div>
        <div class="mov-sub">
          <span>{{ formatearFecha(m.fecha) }}</span>
          <span v-if="m.tipo === 'tomado' || m.tipo === 'abono'">Le debo: ${{ formatNumber(m.deudaDespues) }}</span>
          <span v-else>Debe tener: ${{ formatNumber(m.saldoDespues) }}</span>
        </div>
        <p v-if="m.nota" class="mov-nota">{{ m.nota }}</p>
        <button class="borrar" @click="borrar(m)" :disabled="borrando === m.id">Borrar</button>
      </li>
    </ul>
  </div>
</template>

<script>
import BackButton from '@/components/BackButton.vue';
import { formatNumber } from '@/utils/formatters';
import { resumenPablo, historialPablo, validarMovimientoPablo, TIPOS_PABLO, ETIQUETAS_PABLO } from '@/utils/prestamosPablo';
import { cargarMovimientosPablo, agregarMovimientoPablo, eliminarMovimientoPablo } from '@/services/prestamosPabloService';

const hoy = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

export default {
  name: 'PrestamosPablo',
  components: { BackButton },
  data() {
    return { tipos: TIPOS_PABLO, etiquetas: ETIQUETAS_PABLO, movimientos: [], cargando: true, error: '', errorForm: '', guardando: false, borrando: null,
      nuevo: { tipo: 'deposito', fecha: hoy(), monto: '', nota: '' } };
  },
  computed: {
    resumen() { return resumenPablo(this.movimientos); },
    historial() { return historialPablo(this.movimientos); }
  },
  methods: {
    formatNumber,
    formatearFecha(f) {
      const d = new Date(String(f) + 'T00:00:00');
      return isNaN(d) ? String(f) : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    async cargar() {
      this.cargando = true; this.error = '';
      try { this.movimientos = await cargarMovimientosPablo(); }
      catch (e) { console.error(e); this.error = 'No se pudieron cargar los movimientos.'; }
      finally { this.cargando = false; }
    },
    async guardar() {
      const r = validarMovimientoPablo(this.nuevo, this.movimientos);
      if (!r.ok) { this.errorForm = r.errores.join('. '); return; }
      this.errorForm = ''; this.guardando = true;
      try {
        await agregarMovimientoPablo(r.movimiento, this.movimientos);
        this.nuevo = { tipo: this.nuevo.tipo, fecha: hoy(), monto: '', nota: '' };
        await this.cargar();
      } catch (e) { console.error(e); this.errorForm = 'No se pudo guardar: ' + e.message; }
      finally { this.guardando = false; }
    },
    async borrar(m) {
      const texto = `¿Borrar "${ETIQUETAS_PABLO[m.tipo] || m.tipo}" de $${formatNumber(m.monto)} del ${this.formatearFecha(m.fecha)}?`;
      if (!window.confirm(texto)) return;
      this.borrando = m.id;
      try { await eliminarMovimientoPablo(m.id); await this.cargar(); }
      catch (e) { console.error(e); this.error = 'No se pudo borrar el movimiento.'; }
      finally { this.borrando = null; }
    }
  },
  mounted() { this.cargar(); }
};
</script>

<style scoped>
.pablo-container { max-width: 720px; margin: 20px auto; padding: 20px 14px 60px; background: #f8faf8; border-radius: 16px; }
.eyebrow { display: block; margin-top: 20px; font-size: 11px; letter-spacing: .15em; font-weight: 700; color: #397267; }
h1 { color: #183d40; font-size: clamp(24px, 5vw, 34px); margin: 8px 0 4px; }
h2 { color: #254c44; font-size: 18px; margin: 22px 0 10px; }
.desc { color: #687a75; margin: 0 0 16px; }
.error { color: #b03a2e; }
.saldo-card { background: #fff; border: 1px solid #dce7e2; border-top: 4px solid #8e6bb8; border-radius: 12px; padding: 18px; }
.saldo-label { display: block; color: #687a75; font-size: 14px; }
.saldo-valor { display: block; font-size: 34px; color: #216652; margin: 6px 0; }
.saldo-valor.negativo { color: #b03a2e; }
.saldo-detalle { display: flex; gap: 16px; flex-wrap: wrap; color: #4b5f59; font-size: 14px; }
.form-card { background: #fff; border: 1px solid #dce7e2; border-radius: 12px; padding: 16px; margin-top: 18px; display: grid; gap: 10px; }
.form-card h2 { margin: 0; }
.form-card label { display: grid; gap: 4px; font-size: 14px; color: #365a4b; }
.form-card input { padding: 10px; border: 1px solid #c9d8d2; border-radius: 8px; font-size: 16px; }
.tipo-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tipo-toggle button { font-size: 14px; }
.tipo-toggle button { padding: 10px; border: 1px solid #c9d8d2; background: #fff; border-radius: 8px; font-weight: 600; }
.tipo-toggle button.activo { background: #216652; color: #fff; border-color: #216652; }
.guardar { padding: 12px; background: #216652; color: #fff; border: 0; border-radius: 8px; font-weight: 700; font-size: 16px; }
.historial { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.historial li { background: #fff; border: 1px solid #dce7e2; border-left: 4px solid #2f8470; border-radius: 10px; padding: 12px; position: relative; }
.historial li.retiro { border-left-color: #c0773a; }
.historial li.tomado { border-left-color: #b03a2e; background: #fdf6f5; }
.historial li.abono { border-left-color: #8e6bb8; }
.tomado .mov-monto { color: #b03a2e; }
.abono .mov-monto { color: #6b4b94; }
.deuda-card { border-top-color: #b03a2e; background: #fdf6f5; }
.deuda-card .saldo-valor.deuda { color: #b03a2e; font-size: 38px; }
.deuda-card.saldada .saldo-valor.deuda { color: #216652; }
.barra { height: 10px; background: #f0d9d6; border-radius: 6px; overflow: hidden; margin: 6px 0 8px; }
.barra div { height: 100%; background: #8e6bb8; }
.totales { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.saldo-card.mini { padding: 12px; border-top-width: 3px; }
.saldo-card.mini .saldo-valor { font-size: 22px; }
.saldo-card.mini .saldo-detalle { font-size: 12px; gap: 8px; }
.ayuda { margin: 0; font-size: 13px; color: #6b4b94; }
.mov-main { display: flex; justify-content: space-between; font-weight: 700; color: #254c44; padding-right: 0; }
.retiro .mov-monto { color: #a85d22; }
.deposito .mov-monto { color: #216652; }
.mov-sub { display: flex; justify-content: space-between; color: #687a75; font-size: 13px; margin-top: 4px; }
.mov-nota { margin: 6px 0 0; color: #4b5f59; font-size: 14px; }
.borrar { margin-top: 8px; background: none; border: 1px solid #e0b4ae; color: #b03a2e; border-radius: 6px; padding: 4px 10px; font-size: 13px; }
.vacio { color: #687a75; }
</style>
