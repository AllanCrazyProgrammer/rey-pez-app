<template>
  <main class="pesadas-page pesadas-day-page">
    <header class="pesadas-heading">
      <div><router-link class="pesadas-back" to="/pesadas">← Historial de pesadas</router-link><h1>Pesadas <span v-if="fechaValida">{{ fechaTexto }}</span></h1><p>Agrega un nombre y presiona Enter para continuar con la siguiente persona.</p></div>
      <div class="pesadas-day-controls"><label>Fecha <input :value="fecha" type="date" min="1900-01-01" aria-label="Cambiar fecha de pesadas" @change="cambiarFecha"></label><span class="pesadas-status" role="status" aria-live="polite">{{ estadoTexto }}</span></div>
    </header>
    <section v-if="!fechaValida" class="pesadas-card"><p class="pesadas-alert">La fecha no es válida. Vuelve al historial y selecciona un día.</p></section>
    <section v-else-if="cargando" class="pesadas-card"><p class="pesadas-empty">Abriendo la hoja del día…</p><p v-if="errorCarga" class="pesadas-alert" role="alert">{{ errorCarga }}</p><button v-if="errorCarga" class="pesadas-button" @click="reintentar">Reintentar</button></section>
    <section v-else-if="datosGuardados.eliminado" class="pesadas-card">
      <p class="pesadas-alert" role="alert">Esta jornada fue eliminada.</p>
      <button class="pesadas-button primary" :disabled="restaurando" @click="restaurarDia">{{ restaurando ? 'Creando…' : 'Crear esta jornada de nuevo' }}</button>
      <router-link class="pesadas-button" to="/pesadas">Volver al historial</router-link>
    </section>
    <template v-else>
      <section class="pesadas-card pesadas-summary-cards" aria-label="Totales del día">
        <div><small>Despicadoras</small><strong>{{ resumen.banos }}</strong></div><div><small>Kilos del día</small><strong>{{ numero(resumen.kilos) }} <span>kg</span></strong></div><div><small>Pago a despicadoras</small><strong>${{ numero(resumen.pagos) }}</strong></div><div><small>Pago promedio</small><strong>${{ numero(resumen.pagoPromedio) }}</strong></div><div class="pesadas-best-card"><small>Mejor despicadora</small><strong>{{ resumen.mejor ? resumen.mejor.nombre : '—' }}</strong><span v-if="resumen.mejor">{{ numero(resumen.mejor.kilos) }} kg · ${{ numero(resumen.mejor.pago) }}</span></div>
      </section>
      <section class="pesadas-card pesadas-sheet-card">
        <div class="pesadas-toolbar">
          <button class="pesadas-button primary" @click="agregarPersona()">+ Despicadora</button><button class="pesadas-button" :disabled="!puedeImprimir" @click="abrirResumen">Resumen / imprimir</button><button v-if="estado.error || errorCarga" class="pesadas-button" @click="reintentar">Reintentar guardado</button>
          <button class="pesadas-button pesadas-cuentas-button" :disabled="!puedeImprimir" @click="abrirCuentas"><span class="cuentas-bracket" aria-hidden="true">[</span><span class="cuentas-symbol" aria-hidden="true">$</span> Sacar cuentas <span class="cuentas-bracket" aria-hidden="true">]</span></button>
          <span class="pesadas-hint">Kg y precios: máximo 1 decimal</span>
        </div>
        <p v-if="errorCarga || estado.error" class="pesadas-alert" role="alert">{{ errorCarga || estado.error }}</p>
        <p v-if="estado.storageError" class="pesadas-alert" role="alert">El respaldo local no está disponible. Mantén esta hoja abierta hasta confirmar el guardado.</p>
        <p v-if="erroresLista.length" class="pesadas-alert" role="alert">{{ erroresLista[0] }} Los campos marcados no se han guardado.</p>
        <p v-if="pagosNegativos" class="pesadas-alert">Hay pagos menores a cero después de descontar baños. Completa las pesadas o corrige las personas antes de imprimir.</p>
        <p v-if="filasSinNombre" class="pesadas-alert">Hay kilos en una fila sin nombre. Escribe el nombre o elimina esa fila antes de imprimir.</p>
        <PesadasTabla ref="tabla" :columnas="columnas" :personas="personas" :pesos="datos.pesos || {}" :totales="totales" :borradores="borradores" :errores="errores" @editar="editar" @confirmar="confirmar" @enter-nombre="enterNombre" @enter-medida="enterMedida" @enter-precio="enterPrecio" @enter-peso="enterPeso" @flecha="flechaCelda" @eliminar-persona="eliminarPersona" @eliminar-columna="eliminarColumna" @agregar-columna="agregarColumna" />
        <footer class="pesadas-sheet-footer"><strong>{{ resumen.banos }} despicadoras</strong><strong>Total a pagar: ${{ numero(resumen.pagos) }}</strong><strong>A pagar promedio: ${{ numero(resumen.pagoPromedio) }}</strong><strong>Mejor: {{ resumen.mejor ? resumen.mejor.nombre : '—' }}<span v-if="resumen.mejor"> · {{ numero(resumen.mejor.kilos) }} kg · ${{ numero(resumen.mejor.pago) }}</span></strong></footer>
      </section>
    </template>
    <b-modal v-model="cuentasAbiertas" title="Billetes y monedas para pagar" size="lg" hide-footer @shown="calcularCuentas" @hidden="cuentasDatos = ''">
      <p>{{ fechaTexto }} · Pagos finales de las despicadoras, después del descuento de baños.</p>
      <p v-if="estado.pending || servidorPendiente" class="pesadas-alert">Incluye cambios pendientes de sincronizar.</p>
      <Cuentas v-if="cuentasAbiertas" ref="cuentas" :datos="cuentasDatos" :fecha="fecha" admitir-decimales />
    </b-modal>
    <PesadasResumen v-if="preview" :fecha="fecha" :datos="preview" :pendiente="estado.pending || servidorPendiente" @cerrar="preview = null" />
  </main>
</template>

<script>
import { nanoid } from 'nanoid';
import { BModal } from 'bootstrap-vue';
import Cuentas from '@/Cuentas.vue';
import { conectarPesadas, crearDiaPesadas } from '@/services/pesadas.service';
import { PesadasOutbox } from '@/services/pesadasOutbox';
import { decimalPesada, elementosPesadas, fechaPesadasValida, formatoFechaPesadas, formatoPesada, resumenPesadas } from '@/utils/pesadas';
import PesadasTabla from './PesadasTabla.vue';
import PesadasResumen from './PesadasResumen.vue';
import './pesadas.css';

export default {
  name: 'PesadasDia',
  components: { PesadasTabla, PesadasResumen, BModal, Cuentas },
  props: { fecha: { type: String, required: true } },
  data: () => ({ datosGuardados: {}, estado: { pending: false, saving: false, error: '', storageError: false },
    cargando: true, errorCarga: '', online: navigator.onLine, desdeCache: true, servidorPendiente: false,
    borradores: {}, errores: {}, preview: null, cuentasAbiertas: false, cuentasDatos: '', restaurando: false, filaInicialId: 'inicial' }),
  computed: {
    fechaValida() { return fechaPesadasValida(this.fecha); },
    fechaTexto() { return this.fechaValida ? formatoFechaPesadas(this.fecha) : ''; },
    datos() {
      const data = { ...this.datosGuardados };
      if (!Object.keys(data.columnas || {}).length) data.columnas = {
        inicial: { medida: '', precio: 10, orden: '0' },
        inicial2: { medida: '', precio: 10, orden: '1' },
        inicial3: { medida: '', precio: 10, orden: '2' }
      };
      if (!elementosPesadas(data.personas).length) data.personas = { ...data.personas, [this.filaInicialId]: { nombre: '', orden: '0' } };
      return data;
    },
    columnas() { return elementosPesadas(this.datos.columnas); },
    personas() { return elementosPesadas(this.datos.personas); },
    resumen() { return resumenPesadas(this.datos); },
    totales() { return Object.fromEntries(this.resumen.personas.map(row => [row.id, row])); },
    erroresLista() { return Object.values(this.errores); },
    pagosNegativos() { return this.resumen.personas.some(row => row.pago < 0); },
    filasSinNombre() { return this.personas.some(row => !row.nombre.trim() && this.columnas.some(col => this.datos.pesos?.[row.id]?.[col.id] > 0)); },
    puedeImprimir() { return !this.datosGuardados.eliminado && this.resumen.banos > 0 && !this.pagosNegativos && !this.filasSinNombre && !this.erroresLista.length; },
    estadoTexto() {
      if (this.errorCarga || this.estado.error) return 'Error de sincronización';
      if (!this.online && (this.estado.pending || this.servidorPendiente)) return 'Sin conexión · cambios pendientes';
      if (this.estado.saving || this.servidorPendiente) return 'Guardando…';
      if (this.estado.pending) return 'Cambios pendientes';
      if (this.desdeCache || !this.online) return 'Sin confirmar conexión';
      return this.datosGuardados.fecha ? 'Guardado' : 'Hoja nueva';
    }
  },
  watch: { fecha() { this.iniciar(); } },
  mounted() {
    this.iniciar();
    window.addEventListener('wheel', this.bloquearRetrocesoHorizontal, { capture: true, passive: false });
    window.addEventListener('online', this.actualizarConexion);
    window.addEventListener('offline', this.actualizarConexion);
    window.addEventListener('storage', this.actualizarStorage);
    window.addEventListener('beforeunload', this.antesDeCerrar);
  },
  beforeRouteLeave(to, from, next) { this.confirmarSalida(next); },
  beforeRouteUpdate(to, from, next) { this.confirmarSalida(next); },
  beforeDestroy() {
    this.desconectar();
    window.removeEventListener('online', this.actualizarConexion);
    window.removeEventListener('offline', this.actualizarConexion);
    window.removeEventListener('storage', this.actualizarStorage);
    window.removeEventListener('beforeunload', this.antesDeCerrar);
    window.removeEventListener('wheel', this.bloquearRetrocesoHorizontal, true);
  },
  methods: {
    numero: formatoPesada,
    bloquearRetrocesoHorizontal(event) {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      const table = event.target && event.target.closest && event.target.closest('.pesadas-grid-scroll');
      if (!table) { event.preventDefault(); return; }
      const atLeft = table.scrollLeft <= 0 && event.deltaX < 0;
      const atRight = table.scrollLeft + table.clientWidth >= table.scrollWidth - 1 && event.deltaX > 0;
      if (atLeft || atRight) event.preventDefault();
    },
    async restaurarDia() {
      if (this.restaurando) return;
      this.restaurando = true;
      try { await crearDiaPesadas(this.fecha); }
      catch (_error) { this.errorCarga = 'No se pudo crear esta jornada. Revisa la conexión e inténtalo de nuevo.'; }
      finally { this.restaurando = false; }
    },
    desconectar() {
      if (this._unsubscribe) this._unsubscribe();
      if (this._outbox) this._outbox.dispose();
    },
    iniciar() {
      this.desconectar();
      this.datosGuardados = {};
      this.borradores = {};
      this.errores = {};
      this.errorCarga = '';
      this.preview = null;
      this.cuentasAbiertas = false;
      this.filaInicialId = 'inicial';
      this.cargando = true;
      this.desdeCache = true;
      this.servidorPendiente = false;
      if (!this.fechaValida) { this.cargando = false; return; }
      const connection = conectarPesadas(this.fecha, (data, metadata) => {
        if (data.personas?.[this.filaInicialId]?.eliminado) this.filaInicialId = nanoid();
        this._outbox.receive(data);
        this.desdeCache = metadata.fromCache;
        this.servidorPendiente = metadata.hasPendingWrites;
        // An empty cache is not evidence that the server's day is empty. Wait
        // before offering initial defaults that could overwrite an existing day.
        this.cargando = !(metadata.exists || data.fecha || this.estado.pending || !metadata.fromCache);
        this.errorCarga = this.cargando && !this.online
          ? 'No hay una copia de esta fecha en este dispositivo. Conéctate para abrirla por primera vez.' : '';
      }, () => { this.errorCarga = 'No se pudo consultar la hoja. Tus cambios locales se conservan; pulsa Reintentar.'; });
      this._connection = connection;
      this._outbox = new PesadasOutbox({ fecha: this.fecha,
        storage: { get length() { return localStorage.length; }, key: index => localStorage.key(index), getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key) },
        write: connection.write,
        notify: state => {
          if (state.data.personas?.[this.filaInicialId]?.eliminado) this.filaInicialId = nanoid();
          this.datosGuardados = state.data;
          this.estado = state;
        }
      });
      this._outbox.emit();
      this._unsubscribe = connection.subscribe();
      this._outbox.schedule();
    },
    cambiarFecha(event) {
      if (fechaPesadasValida(event.target.value) && event.target.value !== this.fecha) {
        this.$router.push(`/pesadas/${event.target.value}`).catch(() => { event.target.value = this.fecha; });
      } else event.target.value = this.fecha;
    },
    guardarCampos(fields) {
      if (this.datosGuardados.eliminado) return;
      const additions = {};
      if (!this.datosGuardados.creadoEn) additions.creadoEn = new Date().toISOString();
      Object.entries(this.datos.columnas || {}).forEach(([id, col]) => {
        if (!this.datosGuardados.columnas?.[id]) Object.entries(col).forEach(([key, value]) => { additions[`columnas.${id}.${key}`] = value; });
      });
      Object.entries(this.datos.personas || {}).forEach(([id, row]) => {
        if (!this.datosGuardados.personas?.[id]) Object.entries(row).forEach(([key, value]) => { additions[`personas.${id}.${key}`] = value; });
      });
      this._outbox.edit({ ...additions, ...fields });
    },
    editar({ path, value, tipo }) {
      this.$set(this.borradores, path, value);
      try {
        const parsed = tipo === 'texto' ? value.trim() : decimalPesada(value, tipo === 'kilos');
        this.$delete(this.errores, path);
        this.guardarCampos({ [path]: parsed });
      } catch (error) { this.$set(this.errores, path, error.message); }
    },
    confirmar(path) {
      if (this.errores[path]) return;
      this.$delete(this.borradores, path);
      this._outbox.flush();
    },
    async enfocar(ref) { await this.$nextTick(); if (this.$refs.tabla) this.$refs.tabla.enfocar(ref); },
    agregarPersona(forceNew = false) {
      const empty = !forceNew && this.personas.find(row => !row.nombre.trim());
      if (empty) { this.enfocar(`nombre-${empty.id}`); return empty.id; }
      const id = nanoid();
      this.guardarCampos({ [`personas.${id}.nombre`]: '', [`personas.${id}.orden`]: `${Date.now()}-${id}` });
      this.enfocar(`nombre-${id}`);
      return id;
    },
    enterNombre(id) {
      const index = this.personas.findIndex(row => row.id === id);
      if (index < 0 || !this.personas[index].nombre.trim()) return;
      this.confirmar(`personas.${id}.nombre`);
      const next = this.personas[index + 1];
      if (next) this.enfocar(`nombre-${next.id}`);
      else this.agregarPersona(true);
    },
    enterMedida(id) {
      this.confirmar(`columnas.${id}.medida`);
      if (this.columnas.some(column => column.id === id)) this.enfocar(`precio-${id}`);
    },
    enterPrecio(id) {
      const path = `columnas.${id}.precio`;
      if (this.errores[path]) return;
      if (!this.columnas.some(column => column.id === id)) return;
      this.confirmar(path);
      const firstNamed = this.personas.find(persona => persona.nombre.trim());
      if (firstNamed) this.enfocar(`peso-${firstNamed.id}-${id}`);
      else if (this.personas[0]) this.enfocar(`nombre-${this.personas[0].id}`);
    },
    enterPeso({ personaId, columnaId }) {
      const path = `pesos.${personaId}.${columnaId}`;
      if (this.errores[path]) return;
      this.confirmar(path);
      const index = this.personas.findIndex(row => row.id === personaId);
      const next = this.personas.slice(index + 1).find(row => row.nombre.trim());
      if (next) this.enfocar(`peso-${next.id}-${columnaId}`);
    },
    flechaCelda({ tipo, personaId, columnaId, direccion }) {
      const columnIndex = this.columnas.findIndex(column => column.id === columnaId);
      const personIndex = this.personas.findIndex(persona => persona.id === personaId);
      const columnAt = index => this.columnas[index];
      const personAt = index => this.personas[index];
      const firstNamed = this.personas.find(persona => persona.nombre.trim());
      const namedBefore = this.personas.slice(0, personIndex).reverse().find(persona => persona.nombre.trim());
      const namedAfter = this.personas.slice(personIndex + 1).find(persona => persona.nombre.trim());
      let ref = null;

      if (tipo === 'medida') {
        if (direccion === 'ArrowLeft' && columnAt(columnIndex - 1)) ref = `medida-${columnAt(columnIndex - 1).id}`;
        if (direccion === 'ArrowRight' && columnAt(columnIndex + 1)) ref = `medida-${columnAt(columnIndex + 1).id}`;
        if (direccion === 'ArrowDown') ref = `precio-${columnaId}`;
      } else if (tipo === 'precio') {
        if (direccion === 'ArrowLeft' && columnAt(columnIndex - 1)) ref = `precio-${columnAt(columnIndex - 1).id}`;
        if (direccion === 'ArrowRight' && columnAt(columnIndex + 1)) ref = `precio-${columnAt(columnIndex + 1).id}`;
        if (direccion === 'ArrowUp') ref = `medida-${columnaId}`;
        if (direccion === 'ArrowDown') ref = firstNamed ? `peso-${firstNamed.id}-${columnaId}` : (personAt(0) ? `nombre-${personAt(0).id}` : null);
      } else if (tipo === 'nombre') {
        if (direccion === 'ArrowUp' && personAt(personIndex - 1)) ref = `nombre-${personAt(personIndex - 1).id}`;
        if (direccion === 'ArrowDown' && personAt(personIndex + 1)) ref = `nombre-${personAt(personIndex + 1).id}`;
        if (direccion === 'ArrowRight' && this.personas[personIndex]?.nombre.trim() && columnAt(0)) ref = `peso-${personaId}-${columnAt(0).id}`;
      } else if (tipo === 'peso') {
        if (direccion === 'ArrowLeft') ref = columnAt(columnIndex - 1) ? `peso-${personaId}-${columnAt(columnIndex - 1).id}` : `nombre-${personaId}`;
        if (direccion === 'ArrowRight' && columnAt(columnIndex + 1)) ref = `peso-${personaId}-${columnAt(columnIndex + 1).id}`;
        if (direccion === 'ArrowUp') ref = namedBefore ? `peso-${namedBefore.id}-${columnaId}` : `precio-${columnaId}`;
        if (direccion === 'ArrowDown' && namedAfter) ref = `peso-${namedAfter.id}-${columnaId}`;
      }
      if (ref) this.enfocar(ref);
    },
    agregarColumna() {
      const id = nanoid();
      this.guardarCampos({ [`columnas.${id}.medida`]: '', [`columnas.${id}.precio`]: 10, [`columnas.${id}.orden`]: `${Date.now()}-${id}` });
    },
    limpiarBorradores(matches) {
      Object.keys(this.borradores).filter(matches).forEach(path => { this.$delete(this.borradores, path); this.$delete(this.errores, path); });
    },
    eliminarPersona(row) {
      const hasData = row.nombre.trim() || this.columnas.some(col => this.datos.pesos?.[row.id]?.[col.id] != null);
      if (hasData && !window.confirm(`¿Eliminar la fila de ${row.nombre || 'esta despicadora'} y sus pesadas de este día?`)) return;
      this.filaInicialId = nanoid();
      this.limpiarBorradores(path => path.startsWith(`personas.${row.id}.`) || path.startsWith(`pesos.${row.id}.`));
      this.guardarCampos({ [`personas.${row.id}.eliminado`]: true });
      this._outbox.flush();
    },
    eliminarColumna(col) {
      const hasData = col.medida || col.precio !== 10 || this.personas.some(row => this.datos.pesos?.[row.id]?.[col.id] != null);
      if (hasData && !window.confirm('¿Eliminar esta columna y sus pesadas de este día? Los pagos se recalcularán.')) return;
      this.limpiarBorradores(path => path.startsWith(`columnas.${col.id}.`) || (path.startsWith('pesos.') && path.endsWith(`.${col.id}`)));
      this.guardarCampos({ [`columnas.${col.id}.eliminado`]: true });
      this._outbox.flush();
    },
    calcularCuentas() {
      if (this.$refs.cuentas) this.$refs.cuentas.procesarDatos({ data: this.cuentasDatos.split('\n'), isTwo: false });
    },
    abrirCuentas() {
      if (!this.puedeImprimir) return;
      this._outbox.flush();
      this.cuentasDatos = this.resumen.personas.map(persona => String(persona.pago)).join('\n');
      this.cuentasAbiertas = true;
    },
    abrirResumen() { if (this.puedeImprimir) { this._outbox.flush(); this.preview = JSON.parse(JSON.stringify(this.datos)); } },
    actualizarConexion() { this.online = navigator.onLine; if (this.online && this._outbox) this._outbox.flush(); },
    actualizarStorage(event) { if (this._outbox && (event.key?.startsWith(this._outbox.key + ':') || event.key === null)) this._outbox.syncStorage(); },
    reintentar() {
      if (this.errorCarga && this._connection) {
        if (this._unsubscribe) this._unsubscribe();
        this._unsubscribe = this._connection.subscribe();
      }
      if (this._outbox) this._outbox.flush();
    },
    hayRiesgoSalida() { return this.erroresLista.length || (this.estado.storageError && (this.estado.pending || this.estado.saving)); },
    confirmarSalida(next) {
      if (this.hayRiesgoSalida() && !window.confirm('Hay valores inválidos o cambios sin respaldo local que se perderán al salir. ¿Salir de esta hoja?')) { next(false); return; }
      if (this._outbox) this._outbox.flush();
      next();
    },
    antesDeCerrar(event) {
      if (this._outbox) this._outbox.flush();
      if (this.hayRiesgoSalida()) { event.preventDefault(); event.returnValue = ''; }
    }
  }
};
</script>
