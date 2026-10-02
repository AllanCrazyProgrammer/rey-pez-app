<template>
  <section class="movimientos-inventario">
    <div class="rp-page-heading"><p class="rp-eyebrow">HISTORIAL</p><h1>Movimientos de {{ tipo }}</h1><p>Entradas y salidas, organizadas por día.</p></div>
    <SectionTabs :tipo="tipo" />
    <p v-if="$route.query.guardado" class="rp-success" role="status"><MobileIcon name="check" />Cambios guardados</p>
    <p v-if="borrado" class="rp-success" role="status"><MobileIcon name="check" />Día borrado. Sus movimientos se retiraron del inventario.</p>
    <p v-if="errorBorrado" class="rp-message rp-error" role="alert">{{ errorBorrado }}</p>
    <div v-if="!cargando && !error" class="rp-history-actions">
      <router-link :to="destinoCaptura" class="rp-button rp-button-primary rp-full"><MobileIcon name="plus" />{{ fecha ? 'Registrar en esta fecha' : 'Registrar movimiento de hoy' }}</router-link>
      <button v-if="esLimpio" type="button" class="rp-button rp-button-secondary rp-full" @click="registrarManana"><MobileIcon name="calendar" />Registrar para mañana</button>
    </div>
    <div class="rp-history-filter"><label>Ver una fecha<input type="date" v-model="fecha" /></label><button v-if="fecha" class="rp-icon-button" @click="fecha = ''" aria-label="Limpiar fecha"><MobileIcon name="close" /></button></div>
    <div class="rp-list-heading"><span>{{ filtrados.length }} registros</span><span>Más recientes primero</span></div>
    <p v-if="cargando" class="rp-message" role="status">Cargando movimientos…</p>
    <div v-else-if="error" class="rp-message rp-error" role="alert"><p>{{ error }}</p><button class="rp-button rp-button-secondary" @click="suscribir">Reintentar</button></div>
    <div v-else-if="!filtrados.length" class="rp-empty"><MobileIcon name="moves" /><h2>Sin movimientos{{ fecha ? ' para esta fecha' : '' }}</h2><p>Puedes registrar una entrada o una salida con el botón de arriba.</p></div>
    <ul v-else class="mobile-registros rp-history-list">
      <li v-for="registro in visibles" :key="registro.id">
        <router-link :to="base + '/' + registro.id" class="rp-card rp-history-card">
          <div class="rp-history-date"><MobileIcon name="clock" /><time :datetime="registro.fechaISO || undefined">{{ mostrarFecha(registro.fechaISO) }}</time><MobileIcon name="arrow" /></div>
          <p v-if="esLimpio && fechasDuplicadas.has(registro.fechaISO)" class="rp-duplicate-day">Fecha duplicada: revisa estos registros.</p>
          <div class="rp-history-totals"><div><span><MobileIcon name="in" />Entradas</span><strong>{{ formatNumber(registro.totalEntradas || 0, 1) }} <small>kg</small></strong></div><div><span><MobileIcon name="out" />Salidas</span><strong>{{ formatNumber(registro.totalSalidas || 0, 1) }} <small>kg</small></strong></div></div>
          <span class="rp-history-foot">{{ (registro.entradas || []).length + (registro.salidas || []).length }} movimientos <span>Ver y editar</span></span>
        </router-link>
        <button v-if="esLimpio" type="button" class="rp-delete-day" :disabled="Boolean(borrando)" :aria-label="'Borrar día ' + mostrarFecha(registro.fechaISO)" @click="borrarDia(registro)"><MobileIcon name="trash" />{{ borrando === registro.id ? 'Borrando…' : 'Borrar día' }}</button>
      </li>
    </ul>
    <button v-if="filtrados.length > limite" class="rp-button rp-button-secondary rp-full" @click="limite += 20">Ver más movimientos</button>
  </section>
</template>
<script>
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatNumber } from '@/utils/formatters';
import { fechaRegistro, fechaSiguiente, mostrarFecha } from './fechas';
import MobileIcon from './MobileIcon.vue';
import SectionTabs from './SectionTabs.vue';
import { borrarConRespaldo } from '@/services/PapeleraService';
export default {
  components: { MobileIcon, SectionTabs }, props: { tipo: { type: String, required: true } },
  data: () => ({ registros: [], fecha: '', limite: 20, cargando: true, error: '', borrando: '', borrado: false, errorBorrado: '' }),
  computed: {
    esLimpio() { return this.tipo === 'limpios'; },
    base() { return this.esLimpio ? '/sacadas' : '/existencias-crudos'; },
    fechaCaptura() { return this.fecha || fechaRegistro(new Date()); },
    destinoCaptura() { return this.destinoParaFecha(this.fechaCaptura, this.$route.query.capturar || 'salida'); },
    filtrados() { return this.registros.filter(r => !this.fecha || r.fechaISO === this.fecha); },
    visibles() { return this.filtrados.slice(0, this.limite); },
    fechasDuplicadas() { const conteos = new Map(); this.registros.forEach(r => { if (r.fechaISO) conteos.set(r.fechaISO, (conteos.get(r.fechaISO) || 0) + 1); }); return new Set([...conteos].filter(([, cantidad]) => cantidad > 1).map(([fecha]) => fecha)); }
  },
  watch: { tipo() { this.fecha = ''; this.limite = 20; this.borrado = false; this.errorBorrado = ''; this.suscribir(); }, fecha() { this.limite = 20; } },
  methods: {
    mostrarFecha, formatNumber,
    destinoParaFecha(fecha, tipo = 'salida') { const registro = this.registros.find(r => r.fechaISO === fecha); return { path: registro ? this.base + '/' + registro.id : this.base + '/new', query: { fecha, tipo } }; },
    registrarManana() {
      // Calcular al pulsar, aunque la app haya quedado abierta desde ayer.
      this.$router.push(this.destinoParaFecha(fechaSiguiente(new Date())));
    },
    async borrarDia(registro) {
      if (!this.esLimpio || this.borrando) return;
      const entradas = (registro.entradas || []).length;
      const salidas = (registro.salidas || []).length;
      if (!window.confirm(`¿Borrar el registro del ${mostrarFecha(registro.fechaISO)}?\n\nContiene ${entradas} entrada(s) y ${salidas} salida(s). Se retirarán todos sus movimientos del inventario y se conservará una copia en la papelera.`)) return;
      this.borrando = registro.id; this.borrado = false; this.errorBorrado = '';
      try {
        await borrarConRespaldo('sacadas', registro.id, null, 'Borrado manual de día de limpios desde Android');
        this.borrado = true;
        if (this.$route.query.guardado) this.$router.replace({ path: this.$route.path, query: { ...this.$route.query, guardado: undefined } });
      } catch (_) {
        this.errorBorrado = 'No se pudo borrar el día. Revisa tu conexión e intenta nuevamente; no se confirmó ningún borrado.';
      } finally { this.borrando = ''; }
    },
    suscribir() {
      if (this._unsubscribe) this._unsubscribe();
      this.cargando = true; this.error = '';
      this._unsubscribe = onSnapshot(collection(db, this.esLimpio ? 'sacadas' : 'existenciasCrudos'), snapshot => {
        this.registros = snapshot.docs.map(doc => { const data = doc.data(); return { ...data, id: doc.id, fechaISO: fechaRegistro(data.fecha) }; }).sort((a, b) => (b.fechaISO || '').localeCompare(a.fechaISO || ''));
        this.cargando = false;
        if (this.$route.query.capturar) this.$router.replace(this.destinoCaptura);
      }, () => { this.error = 'No se pudieron cargar los movimientos. Revisa tu conexión e intenta nuevamente.'; this.cargando = false; });
    }
  },
  created() { this.suscribir(); }, beforeDestroy() { if (this._unsubscribe) this._unsubscribe(); }
};
</script>
