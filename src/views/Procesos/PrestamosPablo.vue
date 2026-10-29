<template>
  <div class="pablo-container">
    <BackButton to="/procesos/prestamos" />
    <span class="eyebrow">PRÉSTAMOS · PABLO</span>
    <h1>Dinero guardado de Pablo</h1>
    <p class="desc">Solo registro: aquí no se mueve dinero.</p>

    <p v-if="error" class="error" role="alert">{{ error }} <button @click="cargar">Reintentar</button></p>

    <div class="saldo-card">
      <span class="saldo-label">Saldo que le guardo a Pablo</span>
      <strong class="saldo-valor" :class="{ negativo: resumen.saldo < 0 }">{{ cargando ? '…' : '$' + formatNumber(resumen.saldo) }}</strong>
      <div class="saldo-detalle">
        <span>Depósitos: ${{ formatNumber(resumen.depositos) }}</span>
        <span>Retiros: ${{ formatNumber(resumen.retiros) }}</span>
      </div>
    </div>

    <form class="form-card" @submit.prevent="guardar">
      <h2>Nuevo movimiento</h2>
      <div class="tipo-toggle">
        <button type="button" :class="{ activo: nuevo.tipo === 'deposito' }" @click="nuevo.tipo = 'deposito'">Depósito</button>
        <button type="button" :class="{ activo: nuevo.tipo === 'retiro' }" @click="nuevo.tipo = 'retiro'">Retiro</button>
      </div>
      <label>Fecha <input type="date" v-model="nuevo.fecha" required></label>
      <label>Monto <input type="number" min="0.01" step="0.01" v-model="nuevo.monto" required placeholder="0.00"></label>
      <label>Nota (opcional) <input type="text" maxlength="200" v-model="nuevo.nota" placeholder="Ej. le regresé para gasolina"></label>
      <p v-if="errorForm" class="error">{{ errorForm }}</p>
      <button type="submit" class="guardar" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar ' + (nuevo.tipo === 'deposito' ? 'depósito' : 'retiro') }}</button>
    </form>

    <h2>Historial</h2>
    <p v-if="!cargando && !historial.length" class="vacio">Sin movimientos todavía.</p>
    <ul class="historial">
      <li v-for="m in historial" :key="m.id" :class="m.tipo">
        <div class="mov-main">
          <span class="mov-tipo">{{ m.tipo === 'deposito' ? 'Depósito' : 'Retiro' }}</span>
          <span class="mov-monto">{{ m.tipo === 'deposito' ? '+' : '−' }}${{ formatNumber(m.monto) }}</span>
        </div>
        <div class="mov-sub">
          <span>{{ formatearFecha(m.fecha) }}</span>
          <span>Saldo: ${{ formatNumber(m.saldoDespues) }}</span>
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
import { resumenPablo, historialPablo, validarMovimientoPablo } from '@/utils/prestamosPablo';
import { cargarMovimientosPablo, agregarMovimientoPablo, eliminarMovimientoPablo } from '@/services/prestamosPabloService';

const hoy = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

export default {
  name: 'PrestamosPablo',
  components: { BackButton },
  data() {
    return { movimientos: [], cargando: true, error: '', errorForm: '', guardando: false, borrando: null,
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
      const r = validarMovimientoPablo(this.nuevo);
      if (!r.ok) { this.errorForm = r.errores.join('. '); return; }
      this.errorForm = ''; this.guardando = true;
      try {
        await agregarMovimientoPablo(r.movimiento);
        this.nuevo = { tipo: this.nuevo.tipo, fecha: hoy(), monto: '', nota: '' };
        await this.cargar();
      } catch (e) { console.error(e); this.errorForm = 'No se pudo guardar: ' + e.message; }
      finally { this.guardando = false; }
    },
    async borrar(m) {
      const texto = `¿Borrar ${m.tipo === 'deposito' ? 'depósito' : 'retiro'} de $${formatNumber(m.monto)} del ${this.formatearFecha(m.fecha)}?`;
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
.tipo-toggle button { padding: 10px; border: 1px solid #c9d8d2; background: #fff; border-radius: 8px; font-weight: 600; }
.tipo-toggle button.activo { background: #216652; color: #fff; border-color: #216652; }
.guardar { padding: 12px; background: #216652; color: #fff; border: 0; border-radius: 8px; font-weight: 700; font-size: 16px; }
.historial { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.historial li { background: #fff; border: 1px solid #dce7e2; border-left: 4px solid #2f8470; border-radius: 10px; padding: 12px; position: relative; }
.historial li.retiro { border-left-color: #c0773a; }
.mov-main { display: flex; justify-content: space-between; font-weight: 700; color: #254c44; padding-right: 0; }
.retiro .mov-monto { color: #a85d22; }
.deposito .mov-monto { color: #216652; }
.mov-sub { display: flex; justify-content: space-between; color: #687a75; font-size: 13px; margin-top: 4px; }
.mov-nota { margin: 6px 0 0; color: #4b5f59; font-size: 14px; }
.borrar { margin-top: 8px; background: none; border: 1px solid #e0b4ae; color: #b03a2e; border-radius: 6px; padding: 4px 10px; font-size: 13px; }
.vacio { color: #687a75; }
</style>
