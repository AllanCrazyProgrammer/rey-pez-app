<template>
  <main class="pesadas-page pesadas-rapida-page">
    <section v-if="!fechaValida" class="pesadas-card"><p class="pesadas-alert">La fecha no es válida. Vuelve al historial y selecciona un día.</p></section>
    <section v-else-if="cargando" class="pesadas-card"><p class="pesadas-empty">Abriendo la hoja del día…</p><p v-if="errorCarga" class="pesadas-alert" role="alert">{{ errorCarga }}</p><button v-if="errorCarga" class="pesadas-button" @click="reintentar">Reintentar</button></section>
    <section v-else-if="datosGuardados.eliminado" class="pesadas-card">
      <p class="pesadas-alert" role="alert">Esta jornada fue eliminada.</p>
      <router-link class="pesadas-button" to="/pesadas">Volver al historial</router-link>
    </section>
    <template v-else>
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
              ${{ columna.precio }}
            </button>
          </div>
          <!-- Agregar una medida desde aquí, sin regresar a la hoja del día. -->
          <button type="button" class="pesadas-rapida-chip-agregar" aria-label="Agregar medida" title="Agregar medida"
            :disabled="!datosListos" @click="agregarMedida">+</button>
          <ul v-if="sugerenciasMedida.length" class="pesadas-rapida-sugerencias" role="listbox" aria-label="Medidas sugeridas">
            <li v-for="medida in sugerenciasMedida" :key="medida">
              <button type="button" @mousedown.prevent="elegirSugerenciaMedida(medida)">{{ medida }}</button>
            </li>
          </ul>
          <span v-if="!columnas.length" class="pesadas-hint">Toca + para agregar una medida.</span>
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
            <div class="pesadas-rapida-kilos-campo">
              <input id="pesadas-rapida-kilos" ref="kilos" v-model="kilosTexto" type="text" inputmode="decimal"
                autocomplete="off" placeholder="0.0" @keydown.enter.prevent="enterKilos">
              <!-- Báscula conectada (mismo store que embarques): su peso, redondeado a un decimal, y
                   Registrar para ponerlo en los kilos. Quitar el peso de la báscula no lo borra. -->
              <button v-if="bascula.conectada" type="button" class="pesadas-rapida-bascula"
                :disabled="!puedeRegistrarBascula" :title="puedeRegistrarBascula ? 'Poner este peso en los kilos' : 'Pon algo en la báscula para registrar'"
                @click="registrarPesoBascula">
                <span class="pesadas-rapida-bascula-peso"><i class="fas fa-weight-scale" aria-hidden="true"></i> {{ textoPesoBascula }}</span>
                <span class="pesadas-rapida-bascula-accion"><i class="fas fa-check" aria-hidden="true"></i> Registrar</span>
              </button>
            </div>
          </div>
          <div class="pesadas-rapida-traste">
            <span class="pesadas-rapida-label">Traste (se resta)</span>
            <div class="pesadas-rapida-trastes" role="group" aria-label="Peso del traste">
              <button v-for="valor in trastes" :key="valor" type="button"
                class="pesadas-rapida-traste-btn" :class="{ activo: traste === valor && !trasteManualActivo }"
                @click="elegirTraste(valor)">{{ valor.toFixed(1) }}</button>
              <button type="button" class="pesadas-rapida-traste-btn" :class="{ activo: trasteManualActivo }"
                @click="activarTrasteManual">Otro</button>
              <input v-if="trasteManualActivo" :value="trasteManual" type="text" inputmode="decimal"
                autocomplete="off" placeholder="ej. 0.4" aria-label="Traste manual en kilos" @input="escribirTrasteManual">
            </div>
          </div>
        </div>

        <p v-if="error" class="pesadas-alert" role="alert">{{ error }}</p>

        <div class="pesadas-rapida-total-row">
          <div class="pesadas-rapida-total">
            <small>Neto a registrar</small>
            <strong>{{ numero(netoMostrar) }} <span>kg</span></strong>
            <small class="pesadas-rapida-total-hoy">{{ textoLlevaHoy }}</small>
          </div>
          <button class="pesadas-button primary pesadas-rapida-registrar" type="button"
            :disabled="!medidaId || registrando" @click="registrar">
            {{ registrando ? 'Registrando…' : 'Registrar pesada' }}
          </button>
        </div>
        <button class="pesadas-button pesadas-rapida-deshacer" type="button" :disabled="!ultimoRegistro" @click="deshacerUltima">
          Deshacer última
        </button>

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

      <!-- Después de pesar a cada señora sigue la pesada a granel (se puede saltar ahí mismo). -->
      <router-link class="pesadas-button primary pesadas-rapida-terminar" :to="rutaGranel">
        Terminé de pesar <span aria-hidden="true">→</span>
      </router-link>

      <!-- Despique: al empezar, si la báscula no está conectada se pregunta si conectarla. -->
      <b-modal v-model="avisoBascula" title="Báscula sin conectar" hide-footer centered>
        <p>La báscula no está conectada. ¿Quieres conectarla para pesar?</p>
        <div class="pesadas-rapida-alerta-acciones">
          <button class="pesadas-button" type="button" @click="avisoBascula = false">Omitir</button>
          <button class="pesadas-button primary" type="button" @click="conectarBasculaDesdeAviso">Conectar báscula</button>
        </div>
      </b-modal>

      <!-- Medida de limpio con más de 30 kg en una sola pesada: confirmar o corregir. -->
      <b-modal v-model="alertaKilosVisible" title="Pesada mayor a 30 kg" hide-footer>
        <template v-if="alertaKilos">
          <p>La pesada es de <strong>{{ numero(alertaKilos.neto) }} kg</strong> netos en la medida <strong>{{ alertaKilos.medida }}</strong>. Una pesada de limpio no suele pasar de 30 kg.</p>
          <p>¿Confirmas que los kilos están bien?</p>
          <div class="pesadas-rapida-alerta-acciones">
            <button class="pesadas-button" type="button" @click="alertaKilos = null">Corregir</button>
            <button class="pesadas-button primary" type="button" @click="confirmarRegistroKilos">Confirmar</button>
          </div>
        </template>
      </b-modal>
    </template>
  </main>
</template>

<script>
import { nanoid } from 'nanoid';
import { BModal } from 'bootstrap-vue';
import { conectarPesadas } from '@/services/pesadas.service';
import { observarMedidasPesadas } from '@/services/medidasPesadas.service';
import { PesadasOutbox } from '@/services/pesadasOutbox';
import { guardarDespicadora, observarDespicadoras } from '@/services/despicadoras.service';
import { calcularNetoPesada, CLAVE_TRASTE_LOCAL, excedeLimiteMedidaLimpio, formatearTrasteManual, normalizarTextoPesada,
  parsearKilosBrutos, parsearPrecioColumna, parsearTraste, siguienteMedida, sumarPesada,
  sugerenciasMedida as sugerenciasMedidaUtil, sugerenciasPesada, TRASTES_PREDEFINIDOS } from '@/utils/pesadasRapida';
import { elementosPesadas, fechaPesadasValida, formatoPesada, resumenPesadas } from '@/utils/pesadas';
import { claveTrasteDia, trastesDelDia } from '@/utils/pesadasGranel';
import { ES_DESPIQUE } from '@/config/variante';
import { useBasculaStore } from '@/stores/bascula';
import { redondearKilos } from '@/utils/basculaFlotante';

// Si la báscula deja de mandar datos más de esto, su peso ya no se puede registrar.
const VIGENCIA_BASCULA_MS = 4000;
import './pesadas.css';

export default {
  name: 'PesadasRapida',
  components: { BModal },
  props: { fecha: { type: String, required: true } },
  data: () => ({ datosGuardados: {}, estado: { pending: false, saving: false, error: '', storageError: false },
    cargando: true, errorCarga: '', online: navigator.onLine, desdeCache: true, servidorPendiente: false,
    despicadoras: [], nombre: '', seleccionada: null, kilosTexto: '', traste: null, trasteManual: '',
    trasteManualActivo: false, medidaId: '', seleccionMedidaInicialHecha: false, editandoColumna: null, mostrarSugerencias: false, indiceActivo: -1,
    medidasPorDefecto: [], avisoBascula: false, ahoraBascula: Date.now(),
    alertaKilos: null,
    error: '', registrando: false, ultimas: [], ultimoRegistro: null, filaInicialId: 'inicial' }),
  computed: {
    bascula() { return useBasculaStore(); },
    // Peso de la báscula redondeado a un decimal, si la lectura sigue vigente.
    pesoBascula() {
      const { kilos, ultimaLecturaMs } = this.bascula;
      if (kilos === null || this.ahoraBascula - ultimaLecturaMs >= VIGENCIA_BASCULA_MS) return null;
      return redondearKilos(kilos, 1);
    },
    puedeRegistrarBascula() { return this.pesoBascula !== null && this.pesoBascula > 0; },
    textoPesoBascula() { return this.pesoBascula === null ? 'Sin lectura' : `${this.pesoBascula.toFixed(1)} kg`; },
    fechaValida() { return fechaPesadasValida(this.fecha); },
    // Predefinidos + los trastes "Otro" que ya se usaron este día (se guardan al registrar).
    trastes() { return trastesDelDia(this.datosGuardados, TRASTES_PREDEFINIDOS); },
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
    // La pesada a granel abre solo la medida que se acaba de registrar (o la seleccionada).
    rutaGranel() {
      const medida = (this.ultimoRegistro && this.ultimoRegistro.medidaId) || this.medidaId;
      return { path: `/pesadas/${this.fecha}/granel`, query: medida ? { medida } : {} };
    },
    medidaActual() { return this.columnas.find(col => col.id === this.medidaId) || null; },
    // En grande va el neto de la pesada que se va a registrar (kilos − traste),
    // no lo que lleva la despicadora ni el total del día.
    netoActual() {
      let bruto;
      try { bruto = parsearKilosBrutos(this.kilosTexto); } catch (_error) { return null; }
      if (this.trasteEfectivo == null) return null;
      return calcularNetoPesada(bruto, this.trasteEfectivo);
    },
    netoMostrar() { const neto = this.netoActual; return neto == null || neto <= 0 ? 0 : neto; },
    // Abajo, en chiquito: lo que lleva hoy la despicadora (0 si es nueva).
    // Sin nombre escrito, el total del día.
    textoLlevaHoy() {
      if (!this.nombreCanonico) return `Kilos del día: ${formatoPesada(this.resumen.kilos)} kg`;
      return `${this.nombreCanonico} lleva hoy ${formatoPesada(this.kilosHoyPersona)} kg`;
    },
    // La hoja ya se conoce (cargó o se confirmó que no existe): no son los
    // valores por defecto previos a la primera lectura.
    datosListos() { return !this.cargando || Object.keys(this.datosGuardados.columnas || {}).length > 0 || !!this.datosGuardados.fecha; },
    sugerenciasMedida() {
      if (!this.editandoColumna || this.editandoColumna.campo !== 'medida') return [];
      return sugerenciasMedidaUtil(this.columnas, this.editandoColumna.id, this.editandoColumna.valor, this.medidasPorDefecto);
    },
    // Modal de alerta de kilos: se abre con los datos de la pesada pendiente y se cierra al vaciarlos.
    alertaKilosVisible: {
      get() { return !!this.alertaKilos; },
      set(valor) { if (!valor) this.alertaKilos = null; }
    },
  },
  watch: {
    fecha() { this.iniciar(); },
    // El traste recordado en el dispositivo puede ser un "Otro" de otro día: si este día no lo
    // tiene como botón, se muestra en el campo "Otro" con su valor.
    trastes(trastes) {
      if (this.traste == null || this.trasteManualActivo || !this.datosListos || trastes.includes(this.traste)) return;
      this.trasteManualActivo = true;
      this.trasteManual = formatearTrasteManual(String(this.traste));
      this.traste = null;
    },
    columnas(columnas) {
      if (!columnas.length || columnas.some(col => col.id === this.medidaId)) return;
      if (!this.seleccionMedidaInicialHecha) {
        // Espera a conocer la hoja real (no los valores por defecto).
        if (!this.datosListos) return;
        this.seleccionMedidaInicialHecha = true;
        this.seleccionarSiguienteMedida();
        return;
      }
      this.medidaId = columnas[0].id;
    },
    cargando(cargando) {
      if (!cargando && !this.seleccionMedidaInicialHecha) {
        this.seleccionMedidaInicialHecha = true;
        this.seleccionarSiguienteMedida();
      }
    },
    nombre(texto) {
      if (this.seleccionada && normalizarTextoPesada(texto) !== normalizarTextoPesada(this.seleccionada.nombre)) this.seleccionada = null;
      this.indiceActivo = -1;
    }
  },
  mounted() {
    // App de despique: si la báscula no está conectada, se pregunta (con opción de omitir).
    const bascula = useBasculaStore();
    if (ES_DESPIQUE && bascula.soportada && !bascula.conectada && !bascula.conectando) this.avisoBascula = true;
    this._relojBascula = setInterval(() => { this.ahoraBascula = Date.now(); }, 500);
    this.cargarTraste();
    this.iniciar();
    this._unsubscribeDespicadoras = observarDespicadoras(dias => { this.despicadoras = dias; }, () => { this.error = 'No se pudo cargar el catálogo de despicadoras.'; });
    this._unsubscribeMedidas = observarMedidasPesadas(medidas => { this.medidasPorDefecto = medidas; }, () => { /* Sin medidas por defecto: solo se sugieren las ya hechas hoy. */ });
    window.addEventListener('online', this.actualizarConexion);
    window.addEventListener('offline', this.actualizarConexion);
    window.addEventListener('storage', this.actualizarStorage);
    window.addEventListener('beforeunload', this.antesDeCerrar);
  },
  beforeRouteLeave(to, from, next) { if (this._outbox) this._outbox.flush(); next(); },
  beforeDestroy() {
    clearInterval(this._relojBascula);
    this.desconectar();
    if (this._unsubscribeDespicadoras) this._unsubscribeDespicadoras();
    if (this._unsubscribeMedidas) this._unsubscribeMedidas();
    window.removeEventListener('online', this.actualizarConexion);
    window.removeEventListener('offline', this.actualizarConexion);
    window.removeEventListener('storage', this.actualizarStorage);
    window.removeEventListener('beforeunload', this.antesDeCerrar);
  },
  methods: {
    numero: formatoPesada,
    // Se cierra el aviso y se conecta en el mismo toque (Web Bluetooth lo exige para abrir la lista).
    conectarBasculaDesdeAviso() {
      this.avisoBascula = false;
      useBasculaStore().conectar();
    },
    cargarTraste() {
      try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_TRASTE_LOCAL) || 'null');
        if (!guardado) return;
        if (guardado.manual) { this.trasteManualActivo = true; this.trasteManual = formatearTrasteManual(String(guardado.valor)); }
        else if (Number(guardado.valor) > 0 && Number(guardado.valor) < 1) this.traste = Number(guardado.valor);
      } catch (_error) { /* Sin traste guardado: se pesa sin restar nada. */ }
    },
    guardarTraste() {
      try {
        localStorage.setItem(CLAVE_TRASTE_LOCAL, JSON.stringify(this.trasteManualActivo
          ? { manual: true, valor: this.trasteManual }
          : { manual: false, valor: this.traste }));
      } catch (_error) { /* El traste solo no se recuerda en este dispositivo. */ }
    },
    // Al entrar a Pesar rápido: la siguiente medida después de la última con
    // kilos del día. Si ya todas tienen kilos, se agrega una columna en blanco
    // y se abre su nombre para que el usuario la elija (con sugerencias).
    seleccionarSiguienteMedida() {
      const siguiente = siguienteMedida(this.columnas, this.resumen.kilosPorColumna);
      if (siguiente) { this.medidaId = siguiente.id; return; }
      const hayRegistradas = this.columnas.some(col => (this.resumen.kilosPorColumna[col.id] || 0) > 0);
      if (!hayRegistradas) { if (this.columnas.length) this.medidaId = this.columnas[0].id; return; }
      this.agregarMedida();
    },
    // Columna nueva al final (precio 10), seleccionada y con su nombre abierto para escribirlo
    // (salen las medidas sugeridas). La usa el botón "+" y la entrada cuando ya todas tienen kilos.
    agregarMedida() {
      if (this.editandoColumna) this.confirmarEdicionColumna();
      const id = nanoid();
      this.guardarCampos({ [`columnas.${id}.medida`]: '', [`columnas.${id}.precio`]: 10, [`columnas.${id}.orden`]: `${Date.now()}-${id}` });
      this.medidaId = id;
      this.editandoColumna = { id, campo: 'medida', valor: '' };
      this.enfocarEditorColumna();
    },
    enfocarEditorColumna() {
      this.$nextTick(() => {
        const input = this.$refs.editorColumna;
        const campoInput = Array.isArray(input) ? input[0] : input;
        if (campoInput) { campoInput.focus(); campoInput.select(); }
      });
    },
    // Elegir una medida sugerida la pone como nombre NUEVO en la columna que
    // se está editando, aunque ya exista otra columna con ese nombre.
    // Nunca salta a la columna ya registrada.
    elegirSugerenciaMedida(medida) {
      const edicion = this.editandoColumna;
      if (!edicion) return;
      this.editandoColumna = null;
      this.guardarCampos({ [`columnas.${edicion.id}.medida`]: medida.trim() });
      this.error = '';
      this._outbox.flush();
    },
    // Mitades del chip: el primer toque selecciona la columna; tocar de nuevo
    // la mitad de la columna ya seleccionada abre la edición de ese campo.
    tocarMitad(columna, campo) {
      if (this.medidaId !== columna.id) { this.medidaId = columna.id; return; }
      this.editandoColumna = { id: columna.id, campo,
        valor: campo === 'medida' ? (columna.medida || '') : String(columna.precio ?? 10) };
      this.enfocarEditorColumna();
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
    // Traste "Otro": al escribir se pone el punto decimal por default
    // ("2" -> "0.2") y solo se acepta una décima, para que nunca sea 1 kg o más.
    escribirTrasteManual(event) {
      const crudo = event.target.value;
      const anterior = this.trasteManual;
      // Al borrar no se reformatea, para poder vaciar el campo.
      if (crudo.length < anterior.length) { this.trasteManual = crudo; this.guardarTraste(); return; }
      const formateado = formatearTrasteManual(crudo);
      if ((formateado.split('.')[1] || '').length > 1) { event.target.value = anterior; return; }
      this.trasteManual = formateado;
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
      this.medidaId = '';
      this.editandoColumna = null;
      this.seleccionMedidaInicialHecha = false;
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
    // Enter en kilos SOLO oculta el teclado: no registra ni limpia nada.
    // Únicamente el botón "Registrar pesada" registra.
    enterKilos() {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    },
    // Pone el peso de la báscula (un decimal) en los kilos; "Registrar pesada" sigue siendo el que registra.
    registrarPesoBascula() {
      if (!this.puedeRegistrarBascula) return;
      this.kilosTexto = this.pesoBascula.toFixed(1);
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
      // Medida de limpio (Ajustes > Medidas) con más de 30 kg en una sola pesada:
      // se pide confirmar antes de registrar. Las demás medidas no tienen límite.
      const medidaNombre = this.medidaActual ? (this.medidaActual.medida || '') : '';
      if (excedeLimiteMedidaLimpio(medidaNombre, neto, this.medidasPorDefecto)) {
        this.alertaKilos = { medida: medidaNombre, neto, nombre };
        return;
      }
      this.aplicarRegistro(neto, nombre);
    },
    // Confirmar la pesada que excedió el límite de medida de limpio.
    confirmarRegistroKilos() {
      const pendiente = this.alertaKilos;
      this.alertaKilos = null;
      if (!pendiente) return;
      this.aplicarRegistro(pendiente.neto, pendiente.nombre);
    },
    aplicarRegistro(neto, nombre) {
      if (this.registrando || !this.medidaId) return;
      this.registrando = true;
      try {
        const personaId = this.personaActual ? this.personaActual.id : nanoid();
        const actual = this.personaActual ? (this.datos.pesos?.[personaId]?.[this.medidaId] || 0) : 0;
        const nuevo = sumarPesada(actual, neto);
        const campos = { [`pesos.${personaId}.${this.medidaId}`]: nuevo };
        // Un traste "Otro" queda guardado en el día como botón, porque seguramente se vuelve a usar.
        const trasteNuevo = this.trasteManualActivo && this.trasteEfectivo > 0 && !this.trastes.includes(this.trasteEfectivo)
          ? this.trasteEfectivo : null;
        if (trasteNuevo != null) campos[`trastesDia.${claveTrasteDia(trasteNuevo)}`] = trasteNuevo;
        if (!this.personaActual) {
          campos[`personas.${personaId}.nombre`] = nombre;
          campos[`personas.${personaId}.orden`] = `${Date.now()}-${personaId}`;
        }
        this.guardarCampos(campos);
        this._outbox.flush();
        const medida = this.medidaActual ? (this.medidaActual.medida || 'Sin medida') : '';
        const registro = { personaId, medidaId: this.medidaId, anterior: actual, neto, nuevo, nombre, medida, cuando: Date.now() };
        this.ultimoRegistro = registro;
        // El traste "Otro" recién guardado pasa a ser su botón (queda seleccionado).
        if (trasteNuevo != null) {
          this.trasteManualActivo = false;
          this.trasteManual = '';
          this.traste = trasteNuevo;
          this.guardarTraste();
        }
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
