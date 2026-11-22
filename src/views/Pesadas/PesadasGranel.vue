<template>
  <main class="pesadas-page pesadas-granel-page">
    <header class="pesadas-heading">
      <div>
        <p class="pesadas-eyebrow">DESPUÉS DE PESAR</p>
        <h1>Pesada a granel <span v-if="fechaValida">{{ fechaTexto }}</span></h1>
        <p>Pesa las taras donde se vació el camarón de cada señora, con todo y tara. Se guarda solo.</p>
      </div>
    </header>

    <section v-if="!fechaValida" class="pesadas-card"><p class="pesadas-alert">La fecha no es válida. Vuelve al historial y selecciona un día.</p></section>
    <section v-else-if="cargando" class="pesadas-card"><p class="pesadas-empty">Abriendo la hoja del día…</p><p v-if="errorCarga" class="pesadas-alert" role="alert">{{ errorCarga }}</p><button v-if="errorCarga" class="pesadas-button" @click="reintentar">Reintentar</button></section>
    <section v-else-if="datosGuardados.eliminado" class="pesadas-card">
      <p class="pesadas-alert" role="alert">Esta jornada fue eliminada.</p>
      <router-link class="pesadas-button" to="/pesadas">Volver al historial</router-link>
    </section>
    <template v-else>
      <section class="pesadas-card pesadas-granel-config">
        <label class="pesadas-granel-kgtara">Kg por tara
          <input :value="borrador('kgPorTara', kgPorTara)" type="text" inputmode="decimal" autocomplete="off"
            aria-label="Kilos que pesa cada tara" :class="{ 'pesadas-granel-error': errores.kgPorTara }"
            @input="escribir('kgPorTara', $event)" @change="guardarKgPorTara($event)">
        </label>
        <span class="pesadas-hint">Tara sin tapa: 2 kg. Neto = kilos − taras × {{ numero(kgPorTara) }} kg.</span>
        <p v-if="errores.kgPorTara" class="pesadas-alert" role="alert">{{ errores.kgPorTara }}</p>
      </section>

      <section v-if="!medidas.length" class="pesadas-card">
        <p class="pesadas-empty">Este día todavía no tiene medidas. Defínelas en la hoja del día o en Pesar rápido.</p>
      </section>

      <section v-for="medida in medidas" :key="medida.id" class="pesadas-card pesadas-granel-medida" :data-medida="medida.id"
        :aria-label="`Pesada a granel de ${medida.medida}`">
        <div class="pesadas-granel-medida-heading">
          <h2>{{ medida.medida }}</h2>
          <span>Despicadoras: {{ numero(medida.despicadoras) }} kg</span>
        </div>
        <div class="pesadas-granel-encabezados" aria-hidden="true"><span>Taras</span><span>Kilos (con tara)</span><span>Neto</span></div>
        <div v-for="(fila, index) in medida.filas" :key="fila.id" class="pesadas-granel-fila">
          <input :value="borrador(`${medida.id}.${fila.id}.taras`, fila.taras)" type="text" inputmode="numeric" autocomplete="off"
            placeholder="0" :aria-label="`Número de taras, renglón ${index + 1} de ${medida.medida}`"
            :class="{ 'pesadas-granel-error': errores[`${medida.id}.${fila.id}.taras`] }"
            @input="escribir(`${medida.id}.${fila.id}.taras`, $event)" @change="guardarCelda(medida.id, fila, 'taras', $event)">
          <input :value="borrador(`${medida.id}.${fila.id}.kilos`, fila.kilos)" type="text" inputmode="decimal" autocomplete="off"
            placeholder="0.0" :aria-label="`Kilos con tara, renglón ${index + 1} de ${medida.medida}`"
            :class="{ 'pesadas-granel-error': errores[`${medida.id}.${fila.id}.kilos`] }"
            @input="escribir(`${medida.id}.${fila.id}.kilos`, $event)" @change="guardarCelda(medida.id, fila, 'kilos', $event)"
            @keydown.enter.prevent="soltar">
          <output class="pesadas-granel-neto">{{ netoTexto(medida.id, fila) }}</output>
        </div>
        <p v-if="errorMedida(medida.id)" class="pesadas-alert" role="alert">{{ errorMedida(medida.id) }}</p>
        <div class="pesadas-granel-botones">
          <button class="pesadas-button" type="button" :aria-label="`Agregar renglón a ${medida.medida}`" @click="agregarFila(medida.id)">+ Agregar</button>
          <button class="pesadas-button" type="button" :aria-label="`Quitar el último renglón de ${medida.medida}`"
            :disabled="medida.filas.length <= 1 && medida.filas[0].nueva" @click="quitarFila(medida)">− Quitar</button>
        </div>
        <div class="pesadas-granel-total">
          <span><small>Taras</small><strong>{{ medida.total.taras }}</strong></span>
          <span><small>Con tara</small><strong>{{ numero(medida.total.bruto) }} kg</strong></span>
          <span><small>Tara</small><strong>{{ numero(medida.total.tara) }} kg</strong></span>
          <span class="pesadas-granel-total-neto"><small>Neto</small><strong>{{ numero(medida.total.neto) }} kg</strong></span>
        </div>
        <!-- Al editar desde la hoja (sin ?medida=): kilos en crudo de la medida y su rendimiento. -->
        <div v-if="!medidaFiltro" class="pesadas-granel-crudo">
          <label>Kilos en crudo
            <input :value="borrador(`${medida.id}.crudo`, medida.crudo)" type="text" inputmode="decimal" autocomplete="off"
              placeholder="0.0" :aria-label="`Kilos en crudo de ${medida.medida}`"
              :class="{ 'pesadas-granel-error': errores[`${medida.id}.crudo`] }"
              @input="escribir(`${medida.id}.crudo`, $event)" @change="guardarCrudo(medida.id, $event)" @keydown.enter.prevent="soltar">
          </label>
          <span class="pesadas-granel-rendimiento">Rendimiento <strong>{{ medida.rendimiento == null ? '—' : `(${rendimientoTexto(medida.rendimiento)})` }}</strong></span>
        </div>
      </section>

      <section v-if="medidas.length && !medidaFiltro" class="pesadas-card pesadas-granel-general" aria-label="Total a granel del día">
        <h2>Total a granel</h2>
        <div class="pesadas-granel-total">
          <span><small>Taras</small><strong>{{ resumen.total.taras }}</strong></span>
          <span><small>Con tara</small><strong>{{ numero(resumen.total.bruto) }} kg</strong></span>
          <span><small>Tara</small><strong>{{ numero(resumen.total.tara) }} kg</strong></span>
          <span class="pesadas-granel-total-neto"><small>Neto</small><strong>{{ numero(resumen.total.neto) }} kg</strong></span>
        </div>
      </section>

      <p v-if="errorAccion || estado.error" class="pesadas-alert" role="alert">{{ errorAccion || estado.error }}</p>
      <div class="pesadas-granel-acciones">
        <button class="pesadas-button primary" type="button" @click="terminar">Listo — ver hoja</button>
        <!-- Saltar solo en el flujo de Pesar rápido (?medida=); desde la hoja no hace falta. -->
        <button v-if="$route.query.medida" class="pesadas-button" type="button" @click="saltar">Saltar</button>
      </div>
    </template>
  </main>
</template>

<script>
import { nanoid } from 'nanoid';
import { conectarPesadas } from '@/services/pesadas.service';
import { PesadasOutbox } from '@/services/pesadasOutbox';
import { elementosPesadas, fechaPesadasValida, formatoFechaPesadas, formatoPesada, resumenPesadas } from '@/utils/pesadas';
import { crudoGranel, filasGranel, formatoRendimiento, kgPorTaraGranel, rendimientoGranel, netoFilaGranel, parsearKgPorTara, parsearKilosGranel, parsearTarasGranel,
  resumenFilasGranel, resumenGranel } from '@/utils/pesadasGranel';
import './pesadas.css';

export default {
  name: 'PesadasGranel',
  props: { fecha: { type: String, required: true } },
  data: () => ({ datosGuardados: {}, estado: { pending: false, saving: false, error: '', storageError: false },
    cargando: true, errorCarga: '', online: navigator.onLine,
    // Renglones en blanco que se muestran antes de escribir en ellos (id por medida).
    filasNuevas: {}, borradores: {}, errores: {}, errorAccion: '' }),
  computed: {
    fechaValida() { return fechaPesadasValida(this.fecha); },
    fechaTexto() { return formatoFechaPesadas(this.fecha); },
    kgPorTara() { return kgPorTaraGranel(this.datosGuardados); },
    columnas() { return elementosPesadas(this.datosGuardados.columnas); },
    kilosPorColumna() { return resumenPesadas(this.datosGuardados).kilosPorColumna; },
    resumen() { return resumenGranel(this.datosGuardados, this.columnas, this.kilosPorColumna); },
    // Medidas con nombre o con kilos registrados; cada una con sus renglones guardados más los
    // renglones en blanco agregados (al menos uno, para que se pueda escribir de inmediato).
    // ?medida=<columnaId> (desde Pesar rápido): solo esa medida. Sin ella (desde la hoja), todas.
    medidaFiltro() {
      const id = this.$route.query.medida;
      return id && this.columnas.some(col => col.id === id) ? id : '';
    },
    medidas() {
      const visible = col => (this.medidaFiltro ? col.id === this.medidaFiltro
        : (col.medida || '').trim() || (this.kilosPorColumna[col.id] || 0) > 0 || filasGranel(this.datosGuardados, col.id).length);
      return this.columnas.filter(visible).map(col => {
        const guardadas = filasGranel(this.datosGuardados, col.id);
        const nuevas = (this.filasNuevas[col.id] || []).filter(id => !guardadas.some(fila => fila.id === id))
          .map(id => ({ id, taras: null, kilos: null, nueva: true }));
        // Sin renglones guardados se muestra uno inicial con id fijo por medida (sin tocar el estado
        // dentro del computed); al escribir en él se guarda con ese id.
        const inicial = { id: `inicial-${col.id}`, taras: null, kilos: null, nueva: true };
        const filas = guardadas.length ? [...guardadas, ...nuevas] : [inicial, ...nuevas];
        const total = resumenFilasGranel(guardadas, this.kgPorTara);
        const crudo = crudoGranel(this.datosGuardados, col.id);
        return { id: col.id, medida: col.medida || 'Sin medida', despicadoras: this.kilosPorColumna[col.id] || 0,
          filas, guardadas: guardadas.length, total, crudo, rendimiento: rendimientoGranel(crudo, total.neto) };
      });
    }
  },
  watch: { fecha() { this.iniciar(); } },
  mounted() {
    this.iniciar();
    window.addEventListener('online', this.actualizarConexion);
    window.addEventListener('offline', this.actualizarConexion);
    window.addEventListener('storage', this.actualizarStorage);
    window.addEventListener('beforeunload', this.flush);
  },
  beforeRouteLeave(to, from, next) { this.flush(); next(); },
  beforeDestroy() {
    this.desconectar();
    window.removeEventListener('online', this.actualizarConexion);
    window.removeEventListener('offline', this.actualizarConexion);
    window.removeEventListener('storage', this.actualizarStorage);
    window.removeEventListener('beforeunload', this.flush);
  },
  methods: {
    numero: formatoPesada,
    // Se calcula con lo que se va escribiendo (borradores), no solo con lo ya guardado.
    netoTexto(columnaId, fila) {
      let neto = null;
      try {
        const taras = parsearTarasGranel(this.borrador(`${columnaId}.${fila.id}.taras`, fila.taras));
        const kilos = parsearKilosGranel(this.borrador(`${columnaId}.${fila.id}.kilos`, fila.kilos));
        neto = netoFilaGranel({ taras, kilos }, this.kgPorTara);
      } catch (_error) { /* Dato inválido mientras escribe: se marca al salir del campo. */ }
      return neto == null ? '—' : `${formatoPesada(neto)} kg`;
    },
    borrador(clave, valor) {
      if (Object.prototype.hasOwnProperty.call(this.borradores, clave)) return this.borradores[clave];
      return valor == null ? '' : String(valor);
    },
    escribir(clave, event) { this.$set(this.borradores, clave, event.target.value); },
    errorMedida(columnaId) {
      const clave = Object.keys(this.errores).find(key => key.startsWith(`${columnaId}.`) && this.errores[key]);
      return clave ? this.errores[clave] : '';
    },
    limpiar(clave) { this.$delete(this.borradores, clave); this.$delete(this.errores, clave); },
    guardarCelda(columnaId, fila, campo, event) {
      const clave = `${columnaId}.${fila.id}.${campo}`;
      let valor;
      try { valor = campo === 'taras' ? parsearTarasGranel(event.target.value) : parsearKilosGranel(event.target.value); }
      catch (error) { this.$set(this.errores, clave, error.message); return; }
      const campos = { [`granel.${columnaId}.${fila.id}.${campo}`]: valor };
      // Hora de la pesada: cuando se escriben los kilos (se ve en el desglose de la hoja).
      if (campo === 'kilos' && valor != null) campos[`granel.${columnaId}.${fila.id}.hora`] = Date.now();
      // eliminado: false por si el id inicial de la medida se había quitado antes.
      if (fila.nueva) Object.assign(campos, { [`granel.${columnaId}.${fila.id}.orden`]: `${Date.now()}-${fila.id}`, [`granel.${columnaId}.${fila.id}.eliminado`]: false });
      this.guardarCampos(campos);
      this.limpiar(clave);
      if (!this.hayErrores()) this.errorAccion = '';
    },
    // Enter en kilos: soltar el campo cierra el teclado del celular (y el change guarda el valor).
    soltar(event) { event.target.blur(); },
    rendimientoTexto: formatoRendimiento,
    guardarCrudo(columnaId, event) {
      const clave = `${columnaId}.crudo`;
      let valor;
      try { valor = parsearKilosGranel(event.target.value); }
      catch (error) { this.$set(this.errores, clave, error.message); return; }
      this.guardarCampos({ [`granelCrudo.${columnaId}`]: valor });
      this.limpiar(clave);
      if (!this.hayErrores()) this.errorAccion = '';
    },
    guardarKgPorTara(event) {
      let valor;
      try { valor = parsearKgPorTara(event.target.value); }
      catch (error) { this.$set(this.errores, 'kgPorTara', error.message); return; }
      this.guardarCampos({ granelKgPorTara: valor });
      this.limpiar('kgPorTara');
    },
    agregarFila(columnaId) {
      const lista = this.filasNuevas[columnaId] || [];
      this.$set(this.filasNuevas, columnaId, [...lista, nanoid()]);
      this.$nextTick(() => {
        const tarjeta = this.$el.querySelector(`[data-medida="${columnaId}"]`);
        const inputs = tarjeta ? tarjeta.querySelectorAll('.pesadas-granel-fila input') : [];
        if (inputs.length >= 2) inputs[inputs.length - 2].focus();
      });
    },
    // Quita el último renglón: si es uno en blanco recién agregado solo desaparece; si ya tiene
    // datos se pide confirmación y se marca como eliminado.
    quitarFila(medida) {
      const ultima = medida.filas[medida.filas.length - 1];
      if (!ultima) return;
      Object.keys(this.borradores).filter(key => key.startsWith(`${medida.id}.${ultima.id}.`)).forEach(this.limpiar);
      if (ultima.nueva) {
        this.$set(this.filasNuevas, medida.id, (this.filasNuevas[medida.id] || []).filter(id => id !== ultima.id));
        return;
      }
      const conDatos = ultima.kilos != null || Number(ultima.taras) > 0;
      if (conDatos && !window.confirm(`¿Quitar el renglón de ${ultima.taras || 0} taras y ${formatoPesada(ultima.kilos || 0)} kg de ${medida.medida}?`)) return;
      this.guardarCampos({ [`granel.${medida.id}.${ultima.id}.eliminado`]: true });
    },
    hayErrores() { return Object.values(this.errores).some(Boolean); },
    terminar() {
      if (this.hayErrores()) { this.errorAccion = 'Corrige los campos marcados en rojo antes de terminar.'; return; }
      this.errorAccion = '';
      this.flush();
      this.$router.push(`/pesadas/${this.fecha}`);
    },
    saltar() {
      this.flush();
      this.$router.push(`/pesadas/${this.fecha}`);
    },
    desconectar() {
      if (this._unsubscribe) this._unsubscribe();
      if (this._outbox) this._outbox.dispose();
    },
    iniciar() {
      this.desconectar();
      this.datosGuardados = {};
      this.errorCarga = '';
      this.borradores = {};
      this.errores = {};
      this.filasNuevas = {};
      this.cargando = true;
      if (!this.fechaValida) { this.cargando = false; return; }
      const connection = conectarPesadas(this.fecha, (data, metadata) => {
        this._outbox.receive(data);
        this.cargando = !(metadata.exists || data.fecha || this.estado.pending || !metadata.fromCache);
        this.errorCarga = this.cargando && !this.online
          ? 'No hay una copia de esta fecha en este dispositivo. Conéctate para abrirla por primera vez.' : '';
      }, () => { this.errorCarga = 'No se pudo consultar la hoja. Tus cambios locales se conservan; pulsa Reintentar.'; });
      this._connection = connection;
      this._outbox = new PesadasOutbox({ fecha: this.fecha,
        storage: { get length() { return localStorage.length; }, key: index => localStorage.key(index), getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key) },
        write: connection.write,
        notify: state => { this.datosGuardados = state.data; this.estado = state; }
      });
      this._outbox.emit();
      this._unsubscribe = connection.subscribe();
      this._outbox.schedule();
    },
    guardarCampos(fields) {
      if (this.datosGuardados.eliminado || !this._outbox) return;
      const additions = this.datosGuardados.creadoEn ? {} : { creadoEn: new Date().toISOString() };
      this._outbox.edit({ ...additions, ...fields });
      this._outbox.flush();
    },
    flush() { if (this._outbox) this._outbox.flush(); },
    actualizarConexion() { this.online = navigator.onLine; if (this.online) this.flush(); },
    actualizarStorage(event) { if (this._outbox && (event.key?.startsWith(this._outbox.key + ':') || event.key === null)) this._outbox.syncStorage(); },
    reintentar() {
      if (this.errorCarga && this._connection) {
        if (this._unsubscribe) this._unsubscribe();
        this._unsubscribe = this._connection.subscribe();
      }
      this.flush();
    }
  }
};
</script>
