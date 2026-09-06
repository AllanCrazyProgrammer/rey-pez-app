<template>
  <main class="pesadas-page">
    <header class="pesadas-heading">
      <div><p class="pesadas-eyebrow">REGISTRO DIARIO</p><h1>Pesadas</h1><p>Las pesadas y los pagos de cada jornada, en su propia hoja.</p></div>
      <router-link class="pesadas-button primary" :to="`/pesadas/${hoy}`">Pesadas de hoy <span aria-hidden="true">→</span></router-link>
    </header>
    <section class="pesadas-card">
      <form class="pesadas-toolbar" @submit.prevent="abrirFecha">
        <label>Consultar o crear un día <input v-model="fecha" type="date" min="1900-01-01" required aria-label="Fecha de pesadas"></label>
        <button class="pesadas-button primary" type="submit">Abrir día</button>
      </form>
      <p v-if="error" class="pesadas-alert" role="alert">{{ error }}</p>
      <p v-if="cargando" class="pesadas-empty">Cargando jornadas…</p>
      <template v-else>
        <p v-if="desdeCache" class="pesadas-hint">Mostrando los días disponibles en este dispositivo mientras se verifica la conexión.</p>
        <div class="pesadas-list-heading"><h2>Historial de jornadas</h2><span>{{ jornadas.length }} días</span></div>
        <p v-if="!jornadas.length" class="pesadas-empty">Todavía no hay pesadas registradas. Abre un día para comenzar.</p>
        <ul v-else class="pesadas-history">
          <li v-for="dia in visibles" :key="dia.fecha">
            <router-link :to="`/pesadas/${dia.fecha}`">
              <div><strong>{{ fechaTexto(dia.fecha) }}</strong><small v-if="dia.pendiente">Pendiente de sincronizar</small></div>
              <div class="pesadas-history-metrics"><span>{{ dia.resumen.banos }} personas</span><span>{{ numero(dia.resumen.kilos) }} kg</span><strong>${{ numero(dia.resumen.pagos) }} <small>pago a despicadoras</small></strong></div>
              <span aria-hidden="true">→</span>
            </router-link>
          </li>
        </ul>
        <button v-if="visibles.length < jornadas.length" class="pesadas-button" @click="limite += 20">Mostrar más días</button>
      </template>
    </section>
  </main>
</template>

<script>
import { observarHistorialPesadas } from '@/services/pesadas.service';
import { PESADAS_PENDING_PREFIX, leerOperacionesPesadas, camposOperacionesPesadas } from '@/services/pesadasOutbox';
import { aplicarCamposPesadas, fechaPesadasHoy, fechaPesadasValida, formatoFechaPesadas, formatoPesada, resumenPesadas } from '@/utils/pesadas';
import './pesadas.css';

export default {
  name: 'PesadasHistorial',
  data: () => ({ hoy: fechaPesadasHoy(), fecha: fechaPesadasHoy(), registros: [], locales: {}, cargando: true, desdeCache: false, error: '', limite: 20 }),
  computed: {
    jornadas() {
      const days = Object.fromEntries(this.registros.map(day => [day.fecha, day]));
      Object.entries(this.locales).forEach(([fecha, fields]) => {
        days[fecha] = { ...aplicarCamposPesadas(days[fecha], fields), fecha, pendiente: true };
      });
      return Object.values(days).filter(day => fechaPesadasValida(day.fecha))
        .map(day => ({ ...day, resumen: resumenPesadas(day) })).sort((a, b) => b.fecha.localeCompare(a.fecha));
    },
    visibles() { return this.jornadas.slice(0, this.limite); }
  },
  mounted() {
    this.leerLocales();
    window.addEventListener('storage', this.leerLocales);
    this._unsubscribe = observarHistorialPesadas((days, fromCache) => {
      this.registros = days;
      this.desdeCache = fromCache;
      this.cargando = false;
      this.error = '';
      this.leerLocales();
    }, () => { this.error = 'No se pudo cargar el historial. Vuelve a intentarlo recargando la página.'; this.cargando = false; });
  },
  beforeDestroy() {
    if (this._unsubscribe) this._unsubscribe();
    window.removeEventListener('storage', this.leerLocales);
  },
  methods: {
    numero: formatoPesada,
    fechaTexto: formatoFechaPesadas,
    abrirFecha() {
      if (!fechaPesadasValida(this.fecha)) { this.error = 'Selecciona una fecha válida.'; return; }
      this.$router.push(`/pesadas/${this.fecha}`);
    },
    leerLocales() {
      const locales = {};
      try {
        const operations = leerOperacionesPesadas(localStorage);
        const dates = new Set(Object.keys(operations).map(key => key.slice(PESADAS_PENDING_PREFIX.length).split(':')[0]));
        dates.forEach(fecha => {
          if (!fechaPesadasValida(fecha)) return;
          locales[fecha] = camposOperacionesPesadas(Object.fromEntries(Object.entries(operations).filter(([key]) => key.startsWith(`${PESADAS_PENDING_PREFIX}${fecha}:`))));
        });
      } catch (_error) { /* Firestore history remains usable if local storage is unavailable. */ }
      this.locales = locales;
    }
  }
};
</script>
