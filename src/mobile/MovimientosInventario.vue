<template>
  <section class="movimientos-inventario">
    <div class="rp-page-heading"><p class="rp-eyebrow">HISTORIAL</p><h1>Movimientos de {{ tipo }}</h1><p>Entradas y salidas, organizadas por día.</p></div>
    <SectionTabs :tipo="tipo" />
    <p v-if="$route.query.guardado" class="rp-success" role="status"><MobileIcon name="check" />Cambios guardados</p>
    <router-link v-if="!cargando && !error" :to="destinoCaptura" class="rp-button rp-button-primary rp-full"><MobileIcon name="plus" />{{ fecha ? 'Registrar en esta fecha' : 'Registrar movimiento de hoy' }}</router-link>
    <div class="rp-history-filter"><label>Ver una fecha<input type="date" v-model="fecha" /></label><button v-if="fecha" class="rp-icon-button" @click="fecha = ''" aria-label="Limpiar fecha"><MobileIcon name="close" /></button></div>
    <div class="rp-list-heading"><span>{{ filtrados.length }} registros</span><span>Más recientes primero</span></div>
    <p v-if="cargando" class="rp-message" role="status">Cargando movimientos…</p>
    <div v-else-if="error" class="rp-message rp-error" role="alert"><p>{{ error }}</p><button class="rp-button rp-button-secondary" @click="suscribir">Reintentar</button></div>
    <div v-else-if="!filtrados.length" class="rp-empty"><MobileIcon name="moves" /><h2>Sin movimientos{{ fecha ? ' para esta fecha' : '' }}</h2><p>Puedes registrar una entrada o una salida con el botón de arriba.</p></div>
    <ul v-else class="mobile-registros rp-history-list">
      <li v-for="registro in visibles" :key="registro.id">
        <router-link :to="base + '/' + registro.id" class="rp-card rp-history-card">
          <div class="rp-history-date"><MobileIcon name="clock" /><time :datetime="registro.fechaISO || undefined">{{ mostrarFecha(registro.fechaISO) }}</time><MobileIcon name="arrow" /></div>
          <div class="rp-history-totals"><div><span><MobileIcon name="in" />Entradas</span><strong>{{ formatNumber(registro.totalEntradas || 0, 1) }} <small>kg</small></strong></div><div><span><MobileIcon name="out" />Salidas</span><strong>{{ formatNumber(registro.totalSalidas || 0, 1) }} <small>kg</small></strong></div></div>
          <span class="rp-history-foot">{{ (registro.entradas || []).length + (registro.salidas || []).length }} movimientos <span>Ver y editar</span></span>
        </router-link>
      </li>
    </ul>
    <button v-if="filtrados.length > limite" class="rp-button rp-button-secondary rp-full" @click="limite += 20">Ver más movimientos</button>
  </section>
</template>
<script>
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatNumber } from '@/utils/formatters';
import { fechaRegistro, mostrarFecha } from './fechas';
import MobileIcon from './MobileIcon.vue';
import SectionTabs from './SectionTabs.vue';
export default {
  components: { MobileIcon, SectionTabs }, props: { tipo: { type: String, required: true } },
  data: () => ({ registros: [], fecha: '', limite: 20, cargando: true, error: '' }),
  computed: {
    esLimpio() { return this.tipo === 'limpios'; },
    base() { return this.esLimpio ? '/sacadas' : '/existencias-crudos'; },
    fechaCaptura() { return this.fecha || fechaRegistro(new Date()); },
    destinoCaptura() { const registro = this.registros.find(r => r.fechaISO === this.fechaCaptura); return { path: registro ? this.base + '/' + registro.id : this.base + '/new', query: { fecha: this.fechaCaptura, tipo: this.$route.query.capturar || 'salida' } }; },
    filtrados() { return this.registros.filter(r => !this.fecha || r.fechaISO === this.fecha); },
    visibles() { return this.filtrados.slice(0, this.limite); }
  },
  watch: { tipo() { this.fecha = ''; this.limite = 20; this.suscribir(); }, fecha() { this.limite = 20; } },
  methods: {
    mostrarFecha, formatNumber,
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
