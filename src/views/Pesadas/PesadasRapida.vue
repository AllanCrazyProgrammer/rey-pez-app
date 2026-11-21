<template>
  <main class="pesadas-page pesadas-rapida-page">
    <header class="pesadas-heading">
      <div>
        <router-link class="pesadas-back" :to="`/pesadas/${fecha}`"><span class="pesadas-back-icon">←</span> Ver hoja del día</router-link>
        <h1>Pesar rápido <span v-if="fechaValida">{{ fechaTexto }}</span></h1>
        <p>Escribe el nombre, pesa, quita el traste y registra. Una pesada a la vez.</p>
      </div>
      <div class="pesadas-day-controls">
        <router-link class="pesadas-button" to="/despicadoras">Despicadoras</router-link>
        <span class="pesadas-status" role="status" aria-live="polite">{{ estadoTexto }}</span>
      </div>
    </header>
    <section v-if="!fechaValida" class="pesadas-card"><p class="pesadas-alert">La fecha no es válida. Vuelve al historial y selecciona un día.</p></section>
    <section v-else-if="cargando" class="pesadas-card"><p class="pesadas-empty">Abriendo la hoja del día…</p><p v-if="errorCarga" class="pesadas-alert" role="alert">{{ errorCarga }}</p><button v-if="errorCarga" class="pesadas-button" @click="reintentar">Reintentar</button></section>
    <section v-else-if="datosGuardados.eliminado" class="pesadas-card">
      <p class="pesadas-alert" role="alert">Esta jornada fue eliminada.</p>
      <router-link class="pesadas-button" to="/pesadas">Volver al historial</router-link>
    </section>
    <template v-else>
      <section class="pesadas-card pesadas-summary-cards" aria-label="Totales del día">
        <div><small>Despicadoras</small><strong>{{ resumen.banos }}</strong></div>
        <div><small>Kilos del día</small><strong>{{ numero(resumen.kilos) }} <span>kg</span></strong></div>
        <div><small>Pago a despicadoras</small><strong>${{ pago(resumen.pagosRedondeados) }}</strong></div>
        <div><small>Pesadas en esta sesión</small><strong>{{ ultimas.length }}</strong></div>
      </section>

      <section class="pesadas-card pesadas-rapida-card" aria-label="Registro rápido de pesada">
        <div class="pesadas-rapida-medidas" role="group" aria-label="Medida de esta pesada">
          <span class="pesadas-rapida-label">Medida</span>
          <div v-for="columna in columnas" :key="columna.id"
            class="pesadas-rapida-chip" :class="{ activo: columna.id === medidaId }">
            <input v-if="editandoColumna && editandoColumna.id === columna.id && editandoColumna.campo === 'medida'"
              ref="editorColumna" v-model="editandoColumna.valor" type="text" autocomplete="off"
              aria-label="Editar medida" @keydown.enter.prevent="confirmarEdicionColumna"
              @keydown.esc="cancelarEdicionColumna" @blur="confirmarEdicionColumna">
            <button v-else type="button" class="pesadas-rapida-chip-mitad"
              :aria-label="`Medida ${columna.medida || 'sin medida'}`" @click="tocarMitad(columna, 'medida')">
              {{ columna.medida || 'Sin medida' }}
            </button>
            <input v-if="editandoColumna && editandoColumna.id === columna.id && editandoColumna.campo === 'precio'"
              ref="editorColumna" v-model="editandoColumna.valor" type="text" inputmode="decimal" autocomplete="off"
              aria-label="Editar precio por kilo" @keydown.enter.prevent="confirmarEdicionColumna"
              @keydown.esc="cancelarEdicionColumna" @blur="confirmarEdicionColumna">
            <button v-else type="button" class="pesadas-rapida-chip-mitad precio"
              :aria-label="`Precio ${columna.precio} pesos por kilo`" @click="tocarMitad(columna, 'precio')">
              ${{ columna.precio }}/kg
            </button>
          </div>
          <span v-if="!columnas.length" class="pesadas-hint">Primero define las medidas en la hoja del día.</span>
          <span class="pesadas-hint">Toca una medida para pesar con ella. Toca de nuevo la medida o el precio de la seleccionada para editarlos.</span>
        </div>

        <div class="pesadas-rapida-nombre">
          <label class="pesadas-rapida-label" for="pesadas-rapida-nombre">Despicadora</label>
          <input id="pesadas-rapida-nombre" ref="nombre" v-model="nombre" type="text" autocomplete="off"
            placeholder="Empieza a escribir el nombre o el apodo…" aria-autocomplete="list"
            @focus="mostrarSugerencias = true" @blur="cerrarSugerencias" @keydown="teclaNombre">
          <ul v-if="mostrarSugerencias && coincidencias.length" class="pesadas-rapida-sugerencias" role="listbox">
            <li v-for="(item, index) in coincidencias" :key="item.id" role="option" :aria-selected="index === indiceActivo">
              <button type="button" :class="{ activo: index === indiceActivo }" @mousedown.prevent="elegirDespicadora(item)">
                <span><strong>{{ item.nombre }}</strong><small v-if="item.apodo"> · {{ item.apodo }}</small></span>
                <span v-if="item.yaPeso" class="pesadas-rapida-ya">✓ hoy: {{ numero(item.kilosHoy) }} kg</span>
              </button>
            </li>
          </ul>
          <p v-if="mostrarSugerencias && nombre.trim() && !coincidencias.length" class="pesadas-hint">
            No hay nadie registrada con ese nombre.
            <button type="button" class="pesadas-button" @click="darDeAlta">+ Dar de alta a “{{ nombre.trim() }}”</button>
          </p>
        </div>

        <div class="pesadas-rapida-kilos-row">
          <div class="pesadas-rapida-kilos">
            <label class="pesadas-rapida-label" for="pesadas-rapida-kilos">Kilos en la báscula</label>
            <!-- La báscula NVK llenará este input al final (mismo store que embarques). -->
            <input id="pesadas-rapida-kilos" ref="kilos" v-model="kilosTexto" type="text" inputmode="decimal"
              autocomplete="off" placeholder="0.0" @keydown.enter.prevent="registrar">
          </div>
          <div class="pesadas-rapida-traste">
            <span class="pesadas-rapida-label">Traste (se resta)</span>
            <div class="pesadas-rapida-trastes" role="group" aria-label="Peso del traste">
              <button v-for="valor in trastes" :key="valor" type="button"
                class="pesadas-rapida-traste-btn" :class="{ activo: traste === valor && !trasteManualActivo }"
                @click="elegirTraste(valor)">{{ valor.toFixed(1) }}</button>
              <button type="button" class="pesadas-rapida-traste-btn" :class="{ activo: trasteManualActivo }"
                @click="activarTrasteManual">Otro</button>
              <input v-if="trasteManualActivo" v-model="trasteManual" type="text" inputmode="decimal"
                autocomplete="off" placeholder="0.0" aria-label="Traste manual en kilos" @input="guardarTraste">
            </div>
          </div>
        </div>

        <p v-if="vistaPrevia" class="pesadas-rapida-preview" role="status">
          {{ vistaPrevia }}
        </p>
        <p v-if="error" class="pesadas-alert" role="alert">{{ error }}</p>

        <div class="pesadas-rapida-total-row">
          <div class="pesadas-rapida-total">
            <small>{{ etiquetaKilosGrandes }}</small>
            <strong>{{ numero(kilosGrandes) }} <span>kg</span></strong>
          </div>
          <button class="pesadas-button primary pesadas-rapida-registrar" type="button"
            :disabled="!medidaId || registrando" @click="registrar">
            {{ registrando ? 'Registrando…' : 'Registrar pesada' }}
          </button>
          <button class="pesadas-button" type="button" :disabled="!ultimoRegistro" @click="deshacerUltima">
            Deshacer última
          </button>
        </div>

        <div v-if="ultimas.length" class="pesadas-rapida-sesion">
          <h2>Últimas pesadas de esta sesión</h2>
          <ul>
            <li v-for="item in ultimas.slice(0, 5)" :key="item.cuando">
              <strong>{{ item.nombre }}</strong> · {{ numero(item.neto) }} kg netos · {{ item.medida }}
              <small>· llevaba {{ numero(item.anterior) }} kg, ahora {{ numero(item.nuevo) }} kg</small>
            </li>
          </ul>
        </div>
      </section>

      <router-link class="pesadas-button primary pesadas-rapida-terminar" :to="`/pesadas/${fecha}`">
        Terminé de pesar — ver hoja
      </router-link>
    </template>
  </main>
</template>

<script>
import { nanoid } from 'nanoid';
import { conectarPesadas } from '@/services/pesadas.service';
import { PesadasOutbox } from '@/services/pesadasOutbox';
import { guardarDespicadora, observarDespicadoras } from '@/services/despicadoras.service';
import { calcularNetoPesada, CLAVE_TRASTE_LOCAL, normalizarTextoPesada,
  parsearKilosBrutos, parsearPrecioColumna, parsearTraste, sumarPesada, sugerenciasPesada, TRASTES_PREDEFINIDOS } from '@/utils/pesadasRapida';
import { elementosPesadas, fechaPesadasValida, formatoFechaPesadas,
  formatoPagoPesada, formatoPesada, resumenPesadas } from '@/utils/pesadas';
import './pesadas.css';

export default {
  name: 'PesadasRapida',
  props: { fecha: { type: String, required: true } },
  data: () => ({ datosGuardados: {}, estado: { pending: false, saving: false, error: '', storageError: false },
    cargando: true, errorCarga: '', online: navigator.onLine, desdeCache: true, servidorPendiente: false,
    despicadoras: [], nombre: '', seleccionada: null, kilosTexto: '', traste: null, trasteManual: '',
    trasteManualActivo: false, medidaId: '', editandoColumna: null, mostrarSugerencias: false, indiceActivo: -1,
    error: '', registrando: false, ultimas: [], ultimoRegistro: null, filaInicialId: 'inicial' }),
  computed: {
    fechaValida() { return fechaPesadasValida(this.fecha); },
    fechaTexto() { return this.fechaValida ? formatoFechaPesadas(this.fecha) : ''; },
    trastes() { return TRASTES_PREDEFINIDOS; },
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
    kilosHoyMapa() {
      const mapa = new Map();
      this.resumen.personas.forEach(row => mapa.set(normalizarTextoPesada(row.nombre), row.kilos));
      return mapa;
    },
    coincidencias() {
      // Catálogo + las que ya pesaron hoy aunque no estén registradas.
      return sugerenciasPesada(this.despicadoras.filter(item => item.activo !== false), this.resumen.personas, this.nombre, this.kilosHoyMapa).slice(0, 8);
    },
    nombreCanonico() { return this.seleccionada ? this.seleccionada.nombre : this.nombre.trim(); },
    personaActual() {
      const clave = normalizarTextoPesada(this.nombreCanonico);
      if (!clave) return null;
      return this.personas.find(row => normalizarTextoPesada(row.nombre) === clave) || null;
    },
    kilosHoyPersona() {
      if (!this.personaActual) return 0;
      return this.kilosHoyMapa.get(normalizarTextoPesada(this.personaActual.nombre)) || 0;
    },
    trasteEfectivo() {
      if (this.trasteManualActivo) {
        try { return parsearTraste(this.trasteManual) || 0; } catch (_error) { return null; }
      }
      return this.traste || 0;
    },
    bruto() {
      try { return parsearKilosBrutos(this.kilosTexto); } catch (_error) { return null; }
    },
    neto() {
      if (this.bruto == null || this.trasteEfectivo == null) return null;
      return calcularNetoPesada(this.bruto, this.trasteEfectivo);
    },
    medidaActual() { return this.columnas.find(col => col.id === this.medidaId) || null; },
    // Kilos en grande: los que lleva hoy la despicadora seleccionada; si aún no
    // hay nadie seleccionada, el total del día.
    kilosGrandes() { return this.personaActual ? this.kilosHoyPersona : this.resumen.kilos; },
    etiquetaKilosGrandes() { return this.personaActual ? `${this.nombreCanonico} lleva hoy` : 'Kilos del día'; },
    vistaPrevia() {
      if (this.bruto == null || this.neto == null || !this.medidaActual) return '';
      const actual = this.personaActual ? (this.datos.pesos?.[this.personaActual.id]?.[this.medidaId] || 0) : 0;
      const nuevo = sumarPesada(actual, this.neto);
      const quien = this.nombreCanonico ? `${this.nombreCanonico} · ` : '';
      return `${quien}${this.bruto} kg − traste ${this.trasteEfectivo} = ${this.neto} kg netos en ${this.medidaActual.medida || 'Sin medida'} · llevaba ${actual} kg, quedaría en ${nuevo} kg (hoy lleva ${this.kilosHoyPersona} kg en total).`;
    },
    estadoTexto() {
      if (this.errorCarga || this.estado.error) return 'Error de sincronización';
      if (!this.online && (this.estado.pending || this.servidorPendiente)) return 'Sin conexión · cambios pendientes';
      if (this.estado.saving || this.servidorPendiente) return 'Guardando…';
      if (this.estado.pending) return 'Cambios pendientes';
      if (this.desdeCache || !this.online) return 'Sin confirmar conexión';
      return this.datosGuardados.fecha ? 'Guardado' : 'Hoja nueva';
    }
  },
  watch: {
    fecha() { this.iniciar(); },
    columnas(columnas) {
      if (!columnas.some(col => col.id === this.medidaId) && columnas.length) this.medidaId = columnas[0].id;
    },
    nombre(texto) {
      if (this.seleccionada && normalizarTextoPesada(texto) !== normalizarTextoPesada(this.seleccionada.nombre)) this.seleccionada = null;
      this.indiceActivo = -1;
    }
  },
  mounted() {
    this.cargarTraste();
    this.iniciar();
    this._unsubscribeDespicadoras = observarDespicadoras(dias => { this.despicadoras = dias; }, () => { this.error = 'No se pudo cargar el catálogo de despicadoras.'; });
    window.addEventListener('online', this.actualizarConexion);
    window.addEventListener('offline', this.actualizarConexion);
    window.addEventListener('storage', this.actualizarStorage);
    window.addEventListener('beforeunload', this.antesDeCerrar);
  },
  beforeRouteLeave(to, from, next) { if (this._outbox) this._outbox.flush(); next(); },
  beforeDestroy() {
    this.desconectar();
    if (this._unsubscribeDespicadoras) this._unsubscribeDespicadoras();
    window.removeEventListener('online', this.actualizarConexion);
    window.removeEventListener('offline', this.actualizarConexion);
    window.removeEventListener('storage', this.actualizarStorage);
    window.removeEventListener('beforeunload', this.antesDeCerrar);
  },
  methods: {
    numero: formatoPesada,
    pago: formatoPagoPesada,
    cargarTraste() {
      try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_TRASTE_LOCAL) || 'null');
        if (!guardado) return;
        if (guardado.manual) { this.trasteManualActivo = true; this.trasteManual = String(guardado.valor); }
        else if (TRASTES_PREDEFINIDOS.includes(guardado.valor)) this.traste = guardado.valor;
      } catch (_error) { /* Sin traste guardado: se pesa sin restar nada. */ }
    },
    guardarTraste() {
      try {
        localStorage.setItem(CLAVE_TRASTE_LOCAL, JSON.stringify(this.trasteManualActivo
          ? { manual: true, valor: this.trasteManual }
          : { manual: false, valor: this.traste }));
      } catch (_error) { /* El traste solo no se recuerda en este dispositivo. */ }
    },
    // Mitades del chip: el primer toque selecciona la columna; tocar de nuevo
    // la mitad de la columna ya seleccionada abre la edición de ese campo.
    tocarMitad(columna, campo) {
      if (this.medidaId !== columna.id) { this.medidaId = columna.id; return; }
      this.editandoColumna = { id: columna.id, campo,
        valor: campo === 'medida' ? (columna.medida || '') : String(columna.precio ?? 10) };
      this.$nextTick(() => {
        const input = this.$refs.editorColumna;
        const campoInput = Array.isArray(input) ? input[0] : input;
        if (campoInput) { campoInput.focus(); campoInput.select(); }
      });
    },
    confirmarEdicionColumna() {
      const edicion = this.editandoColumna;
      if (!edicion) return;
      this.editandoColumna = null;
      if (edicion.campo === 'medida') {
        this.guardarCampos({ [`columnas.${edicion.id}.medida`]: edicion.valor.trim() });
      } else {
        let precio;
        try { precio = parsearPrecioColumna(edicion.valor); }
        catch (error) { this.error = error.message; this.editandoColumna = edicion; return; }
        this.guardarCampos({ [`columnas.${edicion.id}.precio`]: precio });
      }
      this.error = '';
      this._outbox.flush();
    },
    cancelarEdicionColumna() { this.editandoColumna = null; },
    elegirTraste(valor) {
      this.trasteManualActivo = false;
      this.trasteManual = '';
      this.traste = this.traste === valor ? null : valor;
      this.guardarTraste();
    },
    activarTrasteManual() {
      this.trasteManualActivo = true;
      this.traste = null;
      this.guardarTraste();
      this.$nextTick(() => { const input = this.$el.querySelector('.pesadas-rapida-trastes input'); if (input) input.focus(); });
    },
    desconectar() {
      if (this._unsubscribe) this._unsubscribe();
      if (this._outbox) this._outbox.dispose();
    },
    iniciar() {
      this.desconectar();
      this.datosGuardados = {};
      this.errorCarga = '';
      this.error = '';
      this.cargando = true;
      this.desdeCache = true;
      this.servidorPendiente = false;
      if (!this.fechaValida) { this.cargando = false; return; }
      const connection = conectarPesadas(this.fecha, (data, metadata) => {
        if (data.personas?.[this.filaInicialId]?.eliminado) this.filaInicialId = nanoid();
        this._outbox.receive(data);
        this.desdeCache = metadata.fromCache;
        this.servidorPendiente = metadata.hasPendingWrites;
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
    elegirDespicadora(item) {
      this.seleccionada = item;
      this.nombre = item.nombre;
      this.mostrarSugerencias = false;
      this.indiceActivo = -1;
      if (this.$refs.kilos) this.$refs.kilos.focus();
    },
    cerrarSugerencias() { setTimeout(() => { this.mostrarSugerencias = false; }, 150); },
    teclaNombre(event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!this.coincidencias.length) return;
        this.mostrarSugerencias = true;
        const paso = event.key === 'ArrowDown' ? 1 : -1;
        this.indiceActivo = (this.indiceActivo + paso + this.coincidencias.length) % this.coincidencias.length;
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (this.indiceActivo >= 0 && this.coincidencias[this.indiceActivo]) this.elegirDespicadora(this.coincidencias[this.indiceActivo]);
        else if (this.$refs.kilos) this.$refs.kilos.focus();
      }
    },
    async darDeAlta() {
      const nombre = this.nombre.trim();
      if (!nombre) return;
      this.error = '';
      try {
        const ref = await guardarDespicadora({ nombre, apodo: '' });
        this.seleccionada = { id: ref.id, nombre, apodo: '' };
        if (this.$refs.kilos) this.$refs.kilos.focus();
      } catch (_error) { this.error = 'No se pudo dar de alta. Revisa la conexión e inténtalo de nuevo.'; }
    },
    registrar() {
      if (this.registrando || !this.medidaId) return;
      this.error = '';
      const nombre = this.nombreCanonico;
      if (!nombre) { this.error = 'Escribe el nombre de la despicadora.'; if (this.$refs.nombre) this.$refs.nombre.focus(); return; }
      let bruto;
      try { bruto = parsearKilosBrutos(this.kilosTexto); }
      catch (error) { this.error = error.message; if (this.$refs.kilos) this.$refs.kilos.focus(); return; }
      if (this.trasteEfectivo == null) { this.error = 'Revisa el traste: usa un número con máximo un decimal.'; return; }
      const neto = calcularNetoPesada(bruto, this.trasteEfectivo);
      if (neto == null || neto <= 0) { this.error = 'El neto debe ser mayor a cero: el traste no puede ser igual o mayor que los kilos.'; return; }
      const personaId = this.personaActual ? this.personaActual.id : nanoid();
      const actual = this.personaActual ? (this.datos.pesos?.[personaId]?.[this.medidaId] || 0) : 0;
      const nuevo = sumarPesada(actual, neto);
      const campos = { [`pesos.${personaId}.${this.medidaId}`]: nuevo };
      if (!this.personaActual) {
        campos[`personas.${personaId}.nombre`] = nombre;
        campos[`personas.${personaId}.orden`] = `${Date.now()}-${personaId}`;
      }
      this.registrando = true;
      try {
        this.guardarCampos(campos);
        this._outbox.flush();
        const medida = this.medidaActual ? (this.medidaActual.medida || 'Sin medida') : '';
        const registro = { personaId, medidaId: this.medidaId, anterior: actual, neto, nuevo, nombre, medida, cuando: Date.now() };
        this.ultimoRegistro = registro;
        this.ultimas.unshift(registro);
        this.nombre = '';
        this.seleccionada = null;
        this.kilosTexto = '';
        this.indiceActivo = -1;
        this.mostrarSugerencias = false;
        // No se pasa al siguiente: se oculta el teclado para ver la pantalla.
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      } catch (_error) { this.error = 'No se pudo registrar la pesada. Inténtalo de nuevo.'; }
      finally { this.registrando = false; }
    },
    deshacerUltima() {
      if (!this.ultimoRegistro) return;
      const { personaId, medidaId, anterior } = this.ultimoRegistro;
      this.guardarCampos({ [`pesos.${personaId}.${medidaId}`]: anterior });
      this._outbox.flush();
      this.ultimas.shift();
      this.ultimoRegistro = this.ultimas[0] || null;
    },
    actualizarConexion() { this.online = navigator.onLine; if (this.online && this._outbox) this._outbox.flush(); },
    actualizarStorage(event) { if (this._outbox && (event.key?.startsWith(this._outbox.key + ':') || event.key === null)) this._outbox.syncStorage(); },
    reintentar() {
      if (this.errorCarga && this._connection) {
        if (this._unsubscribe) this._unsubscribe();
        this._unsubscribe = this._connection.subscribe();
      }
      if (this._outbox) this._outbox.flush();
    },
    antesDeCerrar() { if (this._outbox) this._outbox.flush(); }
  }
};
</script>
