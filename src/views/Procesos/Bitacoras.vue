<template>
  <div class="bitacoras-container">
    <router-link to="/procesos" class="back-link"
      ><i class="fas fa-arrow-left" aria-hidden="true"></i> Procesos</router-link
    >
    <header class="page-header">
      <div>
        <p class="eyebrow">CONTROL DE MANTENIMIENTO</p>
        <h1>Bitácoras de cuartos fríos</h1>
        <p class="page-description">
          Abre un cuarto para ver sus revisiones, registrar mantenimiento y anotar sus equipos.
        </p>
      </div>
      <button type="button" @click="nuevaBitacora()" class="btn-primary">
        <i class="fas fa-plus" aria-hidden="true"></i> Nueva bitácora
      </button>
    </header>

    <div v-if="mensaje" class="notice" role="status">
      {{ mensaje }}<button @click="mensaje = ''" aria-label="Cerrar aviso">×</button>
    </div>
    <div v-if="errorCarga" class="notice notice-error" role="alert">
      {{ errorCarga }}<button @click="cargarBitacoras">Reintentar</button>
    </div>

    <section class="room-section" aria-labelledby="room-heading">
      <div class="section-heading">
        <h2 id="room-heading">Cuartos fríos</h2>
        <span>Toca un cuarto para ver sus registros y equipos</span>
      </div>
      <div class="lista-cuartos">
        <div v-for="(fila, indiceFila) in filasCuartos" :key="fila.clave" class="fila-cuartos">
          <TarjetaCuarto
            v-for="(cuarto, indiceEnFila) in fila.cuartos"
            :key="cuarto.id"
            :cuarto="cuarto"
            :seleccionado="cuartoActivo === cuarto.id"
            :cargando="cargando"
            :error-carga="errorCarga"
            :equipos-listos="equiposListos"
            :ocupada-foto="fotoOcupada[cuarto.id] || ''"
            :error-foto="errorFoto[cuarto.id] || ''"
            :style="{ '--i': indiceFila * columnas + indiceEnFila }"
            @alternar="alternarCuarto(cuarto.id)"
            @elegir-foto="guardarFotoMaquina(cuarto.id, $event)"
            @quitar-foto="quitarFotoMaquina(cuarto.id)"
          />
          <transition
            mode="out-in"
            @before-enter="antesDeAbrir"
            @enter="abrirPanel"
            @after-enter="despuesDeAbrir"
            @before-leave="antesDeCerrar"
            @leave="cerrarPanel"
          >
            <div
              v-if="fila.abierta && cuartoSeleccionado"
              :key="cuartoActivo"
              id="panel-cuarto"
              class="panel-cuarto-slot"
              role="region"
              aria-labelledby="panel-cuarto-titulo"
            >
              <PanelCuarto
                :cuarto="cuartoSeleccionado"
                :registros="registrosCuartoActivo"
                :cargando="cargando"
                :error-carga="errorCarga"
                :equipos="equiposPorCuarto[cuartoSeleccionado.id] || []"
                :equipos-listos="equiposListos"
                :cargando-equipos="cargandoEquipos"
                :error-equipos="errorEquipos"
                :guardando-equipos="guardandoEquipos"
                :error-guardado-equipos="errorGuardadoEquipos"
                :aviso-equipos="avisoEquipos"
                @nueva="nuevaBitacora(cuartoSeleccionado.id)"
                @ver="verDetalles"
                @editar="editarBitacora"
                @eliminar="confirmarEliminarBitacora"
                @guardar-equipos="guardarEquipos"
                @reintentar-equipos="cargarEquipos"
              />
            </div>
          </transition>
        </div>
      </div>
    </section>

    <!-- Modal para nueva/editar bitácora -->
    <div v-if="mostrarFormulario" key="formulario" class="modal-overlay">
      <div
        class="modal-content"
        ref="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabindex="-1"
      >
        <div class="modal-header">
          <h2 id="dialog-title">{{ modoEdicion ? 'Editar Bitácora' : 'Nueva Bitácora' }}</h2>
          <button
            @click="cerrarFormulario"
            class="btn-cerrar"
            aria-label="Cerrar ventana"
            :disabled="guardando || eliminando"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form id="bitacora-form" class="modal-body form-grid" @submit.prevent="guardarBitacora">
          <p class="form-help">
            Completa los datos del mantenimiento. Temperatura, observaciones y acciones son
            opcionales.
          </p>
          <fieldset :disabled="guardando || procesandoFotos" class="form-fields">
            <div class="form-group">
              <label for="cuarto">Cuarto:</label>
              <select id="cuarto" v-model="bitacoraActual.cuartoId" class="form-control" required>
                <option value="" disabled>Seleccione un cuarto</option>
                <option v-for="cuarto in cuartos" :key="cuarto.id" :value="cuarto.id">
                  {{ cuarto.nombre }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="fecha">Fecha:</label>
              <input
                type="date"
                id="fecha"
                v-model="bitacoraActual.fecha"
                class="form-control"
                required
              />
            </div>

            <div class="form-group">
              <label for="temperatura">Temperatura (°C, opcional):</label>
              <input
                type="number"
                id="temperatura"
                v-model="bitacoraActual.temperatura"
                class="form-control"
                step="0.1"
                placeholder="Sin registro"
              />
            </div>

            <div class="form-group">
              <label for="tecnico">Técnico:</label>
              <input
                type="text"
                id="tecnico"
                v-model.trim="bitacoraActual.tecnico"
                class="form-control"
                required
              />
            </div>

            <div class="form-group">
              <label for="tipo-mantenimiento">Tipo de Mantenimiento:</label>
              <select
                id="tipo-mantenimiento"
                v-model="bitacoraActual.tipoMantenimiento"
                class="form-control"
                required
              >
                <option value="" disabled>Seleccione tipo</option>
                <option value="Preventivo">Preventivo</option>
                <option value="Correctivo">Correctivo</option>
                <option value="Revisión">Revisión</option>
              </select>
            </div>

            <div class="form-group">
              <label for="estado">Estado:</label>
              <select id="estado" v-model="bitacoraActual.estado" class="form-control" required>
                <option value="" disabled>Seleccione estado</option>
                <option value="Óptimo">Óptimo</option>
                <option value="Regular">Regular</option>
                <option value="Requiere Atención">Requiere Atención</option>
                <option value="Crítico">Crítico</option>
              </select>
            </div>

            <DictadoTextarea
              id="observaciones"
              v-model="bitacoraActual.observaciones"
              class="form-group full-width"
              etiqueta="Observaciones"
              :bloqueado="!!campoDictado && campoDictado !== 'observaciones'"
              :deshabilitado="guardando"
              @dictando="actualizarDictado('observaciones', $event)"
            />
            <DictadoTextarea
              id="acciones"
              v-model="bitacoraActual.accionesRealizadas"
              class="form-group full-width"
              etiqueta="Acciones realizadas"
              :bloqueado="!!campoDictado && campoDictado !== 'acciones'"
              :deshabilitado="guardando"
              @dictando="actualizarDictado('acciones', $event)"
            />
            <div class="form-group full-width">
              <label for="fotos-bitacora">Fotos (opcional)</label>
              <input
                id="fotos-bitacora"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                class="form-control"
                aria-describedby="fotos-ayuda"
                @change="agregarFotos"
              />
              <p id="fotos-ayuda" class="form-help">
                Hasta 12 fotos JPG, PNG o WebP, de máximo 10 MB cada una. Las fotos grandes se
                reducen al elegirlas.
              </p>
              <p v-if="procesandoFotos" class="form-help" role="status">Preparando foto…</p>
              <div v-if="bitacoraActual.fotos.length" class="fotos-grid">
                <figure v-for="(foto, index) in bitacoraActual.fotos" :key="foto.id" class="foto-card">
                  <img :src="foto.preview || foto.url" :alt="foto.nombre || 'Foto del mantenimiento'" />
                  <figcaption>{{ foto.nombre }}</figcaption>
                  <button type="button" class="btn-secondary" @click="quitarFoto(index)"
                    :aria-label="'Quitar foto ' + (foto.nombre || index + 1)">Quitar</button>
                </figure>
              </div>
            </div>
          </fieldset>
        </form>
        <div class="modal-footer">
          <p
            v-if="errorFormulario"
            ref="errorFormulario"
            class="notice notice-error footer-error"
            role="alert"
          >
            {{ errorFormulario }}
          </p>
          <div class="footer-acciones">
            <button @click="cerrarFormulario" class="btn-cancelar" :disabled="guardando">
              Cancelar
            </button>
            <button
              type="submit"
              form="bitacora-form"
              class="btn-guardar"
              :disabled="guardando || procesandoFotos || !!campoDictado"
            >
              {{
                guardando
                  ? 'Guardando...'
                  : procesandoFotos
                  ? 'Preparando foto...'
                  : campoDictado
                  ? 'Detén el dictado'
                  : 'Guardar'
              }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para ver detalles -->
    <div v-if="mostrarDetalles" key="detalles" class="modal-overlay">
      <div
        class="modal-content"
        ref="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabindex="-1"
      >
        <div class="modal-header">
          <h2 id="dialog-title">Detalles de bitácora</h2>
          <button
            @click="mostrarDetalles = false"
            class="btn-cerrar"
            aria-label="Cerrar ventana"
            :disabled="guardando || eliminando"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body detalles">
          <div class="detalle-grupo">
            <h3>Información General</h3>
            <p>
              <strong>Cuarto Frío:</strong> {{ formatearNombreCuarto(bitacoraDetalle.cuartoId) }}
            </p>
            <p><strong>Fecha:</strong> {{ formatearFecha(bitacoraDetalle.fecha) }}</p>
            <p>
              <strong>Temperatura:</strong> {{ mostrarTemperatura(bitacoraDetalle.temperatura) }}
            </p>
            <p><strong>Técnico:</strong> {{ bitacoraDetalle.tecnico }}</p>
          </div>

          <div class="detalle-grupo">
            <h3>Mantenimiento</h3>
            <p><strong>Tipo:</strong> {{ bitacoraDetalle.tipoMantenimiento }}</p>
            <p>
              <strong>Estado:</strong>
              <span class="estado-tag" :class="claseEstado(bitacoraDetalle.estado)">{{
                bitacoraDetalle.estado
              }}</span>
            </p>
          </div>

          <div class="detalle-grupo">
            <h3>Observaciones</h3>
            <p class="texto-largo">{{ bitacoraDetalle.observaciones || 'Sin observaciones' }}</p>
          </div>

          <div class="detalle-grupo">
            <h3>Acciones Realizadas</h3>
            <p class="texto-largo">
              {{ bitacoraDetalle.accionesRealizadas || 'Sin acciones registradas' }}
            </p>
          </div>
          <div class="detalle-grupo">
            <h3>Fotos</h3>
            <div v-if="bitacoraDetalle.fotos && bitacoraDetalle.fotos.length" class="fotos-grid">
              <a v-for="foto in bitacoraDetalle.fotos" :key="foto.id" :href="foto.url"
                target="_blank" rel="noopener noreferrer" class="foto-card"
                :aria-label="'Abrir foto ' + (foto.nombre || 'del mantenimiento')">
                <img :src="foto.url" :alt="foto.nombre || 'Foto del mantenimiento'" loading="lazy" />
                <span>{{ foto.nombre || 'Ver foto' }}</span>
              </a>
            </div>
            <p v-else>Sin fotos registradas</p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="mostrarDetalles = false" class="btn-cerrar-detalles">Cerrar</button>
          <button @click="editarBitacoraDesdeDetalles" class="btn-editar-detalles">Editar</button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para eliminar -->
    <div v-if="mostrarConfirmacionEliminar" key="eliminar" class="modal-overlay">
      <div
        class="modal-content modal-confirmacion"
        ref="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabindex="-1"
      >
        <div class="modal-header">
          <h2 id="dialog-title">Eliminar bitácora</h2>
          <button
            @click="cerrarConfirmacion"
            class="btn-cerrar"
            aria-label="Cerrar ventana"
            :disabled="guardando || eliminando"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <p v-if="errorEliminar" class="notice notice-error" role="alert">{{ errorEliminar }}</p>
          <p class="mensaje-confirmacion">
            ¿Está seguro que desea eliminar la bitácora del
            {{ formatearFecha(bitacoraEliminar.fecha) }} para el
            {{ formatearNombreCuarto(bitacoraEliminar.cuartoId) }}?
          </p>
          <p class="advertencia">Esta acción no se puede deshacer.</p>
        </div>

        <div class="modal-footer">
          <button @click="cerrarConfirmacion" class="btn-cancelar" :disabled="eliminando">
            Cancelar
          </button>
          <button @click="eliminarBitacora" class="btn-eliminar" :disabled="eliminando">
            {{ eliminando ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db, storage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  collection,
  setDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { formatearFecha } from '@/utils/formatters';
import DictadoTextarea from '@/components/DictadoTextarea.vue';
import {
  TIEMPO_GUARDADO_MS,
  TIEMPO_REINTENTO_SUBIDA_MS,
  TIEMPO_SUBIDA_MS,
  conTiempo,
  mensajeErrorFoto,
  prepararFoto,
  rutaFotoMaquina,
  tipoDeArchivo,
} from '@/utils/fotosBitacora';
import TarjetaCuarto from '@/components/bitacoras/TarjetaCuarto.vue';
import PanelCuarto from '@/components/bitacoras/PanelCuarto.vue';
import {
  CUARTOS_FRIOS,
  equiposDesdeDocumento,
  fotoMaquinaDesdeDocumento,
  mensajeErrorCuartos,
  nombreDeCuarto,
  serializarEquipo,
  validarEquipo,
} from '@/utils/equiposCuarto';

export default {
  name: 'Bitacoras',
  components: { DictadoTextarea, TarjetaCuarto, PanelCuarto },
  data() {
    return {
      bitacoras: [],
      cuartos: CUARTOS_FRIOS,
      mensaje: '',
      errorCarga: '',
      errorFormulario: '',
      errorEliminar: '',
      campoDictado: '',
      mostrarFormulario: false,
      mostrarDetalles: false,
      mostrarConfirmacionEliminar: false,
      modoEdicion: false,
      bitacoraActual: this.inicializarBitacora(),
      bitacoraDetalle: {},
      bitacoraEliminar: {},
      cuartoActivo: '',
      columnas: 1,
      equiposPorCuarto: {},
      fotosMaquina: {},
      fotoOcupada: {},
      errorFoto: {},
      equiposListos: false,
      cargandoEquipos: true,
      errorEquipos: '',
      guardandoEquipos: false,
      errorGuardadoEquipos: '',
      avisoEquipos: '',
      cargando: true,
      guardando: false,
      procesandoFotos: false,
      eliminando: false,
    };
  },
  computed: {
    modalActivo() {
      return this.mostrarFormulario
        ? 'formulario'
        : this.mostrarDetalles
        ? 'detalles'
        : this.mostrarConfirmacionEliminar
        ? 'eliminar'
        : '';
    },
    resumenCuartos() {
      return this.cuartos.map((cuarto) => {
        const registros = this.registrosDe(cuarto.id);
        return {
          ...cuarto,
          ultimo: registros[0] || null,
          totalRegistros: registros.length,
          totalEquipos: (this.equiposPorCuarto[cuarto.id] || []).length,
          fotoMaquina: this.fotosMaquina[cuarto.id] || null,
        };
      });
    },
    filasCuartos() {
      const filas = [];
      const columnas = this.columnas || 1;
      for (let inicio = 0; inicio < this.resumenCuartos.length; inicio += columnas) {
        const cuartos = this.resumenCuartos.slice(inicio, inicio + columnas);
        filas.push({
          clave: cuartos.map((cuarto) => cuarto.id).join('-'),
          cuartos,
          abierta: cuartos.some((cuarto) => cuarto.id === this.cuartoActivo),
        });
      }
      return filas;
    },
    cuartoSeleccionado() {
      return this.resumenCuartos.find((cuarto) => cuarto.id === this.cuartoActivo) || null;
    },
    registrosCuartoActivo() {
      return this.cuartoActivo ? this.registrosDe(this.cuartoActivo) : [];
    },
  },
  watch: {
    modalActivo(actual, anterior) {
      if (actual) {
        if (!anterior) {
          this.focoAnterior = document.activeElement;
          this.overflowAnterior = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
        }
        this.$nextTick(() => {
          const dialogo = this.$refs.dialogo;
          if (dialogo) (dialogo.querySelector('input, select, button') || dialogo).focus();
        });
      } else {
        document.body.style.overflow = this.overflowAnterior || '';
        this.$nextTick(() => {
          if (this.focoAnterior && this.focoAnterior.isConnected) this.focoAnterior.focus();
        });
      }
    },
  },
  mounted() {
    document.addEventListener('keydown', this.tecladoModal);
    this.consultaDos = window.matchMedia('(min-width: 640px)');
    this.consultaCinco = window.matchMedia('(min-width: 1100px)');
    this._alCambiarColumnas = () => this.actualizarColumnas();
    this.consultaDos.addEventListener('change', this._alCambiarColumnas);
    this.consultaCinco.addEventListener('change', this._alCambiarColumnas);
  },
  beforeDestroy() {
    this._desmontado = true;
    document.removeEventListener('keydown', this.tecladoModal);
    if (this.consultaDos) this.consultaDos.removeEventListener('change', this._alCambiarColumnas);
    if (this.consultaCinco) this.consultaCinco.removeEventListener('change', this._alCambiarColumnas);
    this.liberarPreviews();
    if (this.modalActivo) document.body.style.overflow = this.overflowAnterior || '';
  },
  created() {
    this.actualizarColumnas();
    this.cargarBitacoras();
    this.cargarEquipos();
  },
  methods: {
    formatearFecha,
    actualizarDictado(campo, activo) {
      if (activo) this.campoDictado = campo;
      else if (this.campoDictado === campo) this.campoDictado = '';
    },
    tieneTemperatura(valor) {
      return valor !== null && valor !== undefined && String(valor).trim() !== '';
    },
    mostrarTemperatura(valor) {
      return this.tieneTemperatura(valor) ? `${valor} °C` : 'Sin registro';
    },
    normalizarTexto(valor) {
      return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    },
    claseEstado(estado) {
      return 'estado-' + this.normalizarTexto(estado).replace(/\s+/g, '-');
    },
    registrosDe(cuartoId) {
      return this.bitacoras
        .filter((bitacora) => String(bitacora.cuartoId) === String(cuartoId))
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    },
    actualizarColumnas() {
      if (window.matchMedia('(min-width: 1100px)').matches) this.columnas = 3;
      else if (window.matchMedia('(min-width: 640px)').matches) this.columnas = 2;
      else this.columnas = 1;
    },
    alternarCuarto(cuartoId) {
      if (this.guardandoEquipos) return;
      this.avisoEquipos = '';
      this.errorGuardadoEquipos = '';
      this.cuartoActivo = this.cuartoActivo === cuartoId ? '' : cuartoId;
    },
    movimientoReducido() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
    finalizarTransicion(el, done) {
      let cerrado = false;
      const finalizar = () => {
        if (cerrado) return;
        cerrado = true;
        clearTimeout(timer);
        el.removeEventListener('transitionend', alTerminar);
        done();
      };
      const alTerminar = (event) => {
        if (event.target !== el || event.propertyName !== 'height') return;
        finalizar();
      };
      const timer = setTimeout(finalizar, 800);
      el.addEventListener('transitionend', alTerminar);
    },
    antesDeAbrir(el) {
      el.style.overflow = 'hidden';
      if (this.movimientoReducido()) return;
      el.style.height = '0px';
      el.style.opacity = '0';
    },
    abrirPanel(el, done) {
      if (this.movimientoReducido()) {
        el.style.height = 'auto';
        el.style.opacity = '1';
        done();
        return;
      }
      requestAnimationFrame(() => {
        const alto = el.scrollHeight;
        el.style.transition = 'height 0.34s ease, opacity 0.34s ease';
        requestAnimationFrame(() => {
          el.style.height = `${alto}px`;
          el.style.opacity = '1';
        });
      });
      this.finalizarTransicion(el, done);
    },
    despuesDeAbrir(el) {
      el.style.height = 'auto';
      el.style.overflow = 'visible';
      el.style.transition = '';
      el.style.opacity = '';
      if (el.scrollIntoView) {
        el.scrollIntoView({
          behavior: this.movimientoReducido() ? 'auto' : 'smooth',
          block: 'nearest',
        });
      }
    },
    antesDeCerrar(el) {
      el.style.overflow = 'hidden';
      el.style.height = `${el.scrollHeight}px`;
    },
    cerrarPanel(el, done) {
      if (this.movimientoReducido()) {
        done();
        return;
      }
      el.style.transition = 'height 0.28s ease, opacity 0.28s ease';
      requestAnimationFrame(() => {
        el.style.height = '0px';
        el.style.opacity = '0';
      });
      this.finalizarTransicion(el, done);
    },
    nuevaBitacora(cuartoId) {
      const id = typeof cuartoId === 'string' ? cuartoId : this.cuartoActivo;
      this.liberarPreviews();
      this.modoEdicion = false;
      this.errorFormulario = '';
      this.bitacoraActual = this.inicializarBitacora();
      this.bitacoraActual.cuartoId = id || '';
      this.mostrarFormulario = true;
    },
    cerrarConfirmacion() {
      if (!this.eliminando) this.mostrarConfirmacionEliminar = false;
    },
    tecladoModal(event) {
      if (!this.modalActivo) return;
      if (event.key === 'Escape') {
        if (this.guardando || this.eliminando) return;
        if (this.mostrarFormulario) this.cerrarFormulario();
        this.mostrarDetalles = this.mostrarConfirmacionEliminar = false;
      }
      if (event.key === 'Tab' && this.$refs.dialogo) {
        const controles = [
          ...this.$refs.dialogo.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]'),
        ].filter((el) => !el.matches(':disabled'));
        const primero = controles[0];
        const ultimo = controles[controles.length - 1];
        if (!primero) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === primero || document.activeElement === this.$refs.dialogo)
        ) {
          event.preventDefault();
          ultimo.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === ultimo || document.activeElement === this.$refs.dialogo)
        ) {
          event.preventDefault();
          primero.focus();
        }
      }
    },
    inicializarBitacora() {
      return {
        id: null,
        cuartoId: '',
        fecha: this.fechaHoy(),
        temperatura: '',
        tecnico: '',
        tipoMantenimiento: '',
        estado: '',
        observaciones: '',
        accionesRealizadas: '',
        fotos: [],
        createdAt: null,
        updatedAt: null,
      };
    },
    fechaHoy() {
      const hoy = new Date();
      return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
        hoy.getDate()
      ).padStart(2, '0')}`;
    },
    async cargarBitacoras() {
      this.errorCarga = '';
      this.cargando = true;
      try {
        const bitacorasRef = collection(db, 'bitacoras');
        const q = query(bitacorasRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        if (this._desmontado) return;

        this.bitacoras = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          // Asegurarse de que el ID sea una cadena de texto
          const id = doc.id.toString();
          console.log(`Cargando bitácora con ID: ${id}`);

          return {
            id: id,
            cuartoId: data.cuartoId || '',
            fecha: data.fecha || new Date().toISOString().substr(0, 10),
            temperatura: this.tieneTemperatura(data.temperatura) ? data.temperatura : null,
            tecnico: data.tecnico || '',
            tipoMantenimiento: data.tipoMantenimiento || '',
            estado: data.estado || '',
            observaciones: data.observaciones || '',
            accionesRealizadas: data.accionesRealizadas || '',
            fotos: Array.isArray(data.fotos) ? data.fotos : [],
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
          };
        });

        console.log(`Se cargaron ${this.bitacoras.length} bitácoras`);
      } catch (error) {
        console.error('Error al cargar bitácoras:', error);
        if (!this._desmontado) {
          this.errorCarga =
            'No pudimos cargar las bitácoras. Revisa tu conexión e inténtalo de nuevo.';
        }
      } finally {
        if (!this._desmontado) this.cargando = false;
      }
    },
    async cargarEquipos() {
      this.errorEquipos = '';
      this.cargandoEquipos = true;
      try {
        const snapshot = await getDocs(collection(db, 'cuartos'));
        if (this._desmontado) return;
        const mapa = {};
        const fotos = {};
        this.cuartos.forEach((cuarto) => {
          mapa[cuarto.id] = [];
          fotos[cuarto.id] = null;
        });
        snapshot.forEach((documento) => {
          if (Object.prototype.hasOwnProperty.call(mapa, documento.id)) {
            mapa[documento.id] = equiposDesdeDocumento(documento.data());
            fotos[documento.id] = fotoMaquinaDesdeDocumento(documento.data());
          }
        });
        this.equiposPorCuarto = mapa;
        this.fotosMaquina = fotos;
        this.equiposListos = true;
      } catch (error) {
        console.error('Error al cargar equipos de cuartos:', error);
        if (!this._desmontado) {
          this.equiposListos = false;
          this.errorEquipos = mensajeErrorCuartos(error, 'cargar');
        }
      } finally {
        if (!this._desmontado) this.cargandoEquipos = false;
      }
    },
    async guardarEquipos(lista) {
      const cuartoId = this.cuartoActivo;
      if (!cuartoId || !this.equiposListos || this.guardandoEquipos) return;
      const serializados = (lista || []).map((equipo) => serializarEquipo(equipo));
      const invalido = serializados.map((equipo) => validarEquipo(equipo)).find(Boolean);
      this.avisoEquipos = '';
      this.errorGuardadoEquipos = invalido || '';
      if (invalido) return;
      this.guardandoEquipos = true;
      try {
        await setDoc(
          doc(db, 'cuartos', String(cuartoId)),
          { equipos: serializados },
          { merge: true }
        );
        if (this._desmontado) return;
        this.$set(this.equiposPorCuarto, cuartoId, serializados);
        this.avisoEquipos = 'Equipos guardados.';
      } catch (error) {
        console.error('Error al guardar equipos del cuarto:', error);
        if (!this._desmontado) this.errorGuardadoEquipos = mensajeErrorCuartos(error, 'guardar');
      } finally {
        if (!this._desmontado) this.guardandoEquipos = false;
      }
    },
    formatearNombreCuarto(cuartoId) {
      return nombreDeCuarto(cuartoId);
    },
    async guardarFotoMaquina(cuartoId, archivo) {
      if (!cuartoId || this.fotoOcupada[cuartoId]) return;
      this.$set(this.errorFoto, cuartoId, '');
      if (!tipoDeArchivo(archivo) || !archivo.size || archivo.size > 10 * 1024 * 1024) {
        this.$set(this.errorFoto, cuartoId, 'Selecciona una foto JPG, PNG o WebP de máximo 10 MB.');
        return;
      }
      this.$set(this.fotoOcupada, cuartoId, 'preparando');
      let path = '';
      try {
        const preparada = await prepararFoto(archivo);
        if (this._desmontado) return;
        path = rutaFotoMaquina(cuartoId);
        this.$set(this.fotoOcupada, cuartoId, 'subiendo');
        const fotoRef = ref(storage, path);
        await this.subirFoto(fotoRef, preparada.blob, preparada.contentType || 'image/jpeg');
        const url = await conTiempo(
          getDownloadURL(fotoRef),
          TIEMPO_GUARDADO_MS,
          'No pudimos confirmar la foto de la máquina.'
        );
        const anterior = this.fotosMaquina[cuartoId];
        await conTiempo(
          setDoc(doc(db, 'cuartos', String(cuartoId)), { fotoMaquina: { url, path } }, { merge: true }),
          TIEMPO_GUARDADO_MS,
          'No pudimos guardar la foto de la máquina.'
        );
        if (this._desmontado) return;
        this.$set(this.fotosMaquina, cuartoId, { url, path });
        if (anterior && anterior.path && anterior.path !== path) this.borrarArchivosFotos([anterior]);
      } catch (error) {
        console.error('Error al guardar la foto de la máquina:', error);
        if (path) this.borrarArchivosFotos([{ path }]);
        if (!this._desmontado) this.$set(this.errorFoto, cuartoId, mensajeErrorFoto(error));
      } finally {
        if (!this._desmontado) this.$set(this.fotoOcupada, cuartoId, '');
      }
    },
    async quitarFotoMaquina(cuartoId) {
      const actual = this.fotosMaquina[cuartoId];
      if (!actual || this.fotoOcupada[cuartoId]) return;
      this.$set(this.errorFoto, cuartoId, '');
      this.$set(this.fotoOcupada, cuartoId, 'quitando');
      try {
        await conTiempo(
          setDoc(doc(db, 'cuartos', String(cuartoId)), { fotoMaquina: deleteField() }, { merge: true }),
          TIEMPO_GUARDADO_MS,
          'No pudimos quitar la foto de la máquina.'
        );
        if (this._desmontado) return;
        this.$set(this.fotosMaquina, cuartoId, null);
        if (actual.path) this.borrarArchivosFotos([actual]);
      } catch (error) {
        console.error('Error al quitar la foto de la máquina:', error);
        if (!this._desmontado) this.$set(this.errorFoto, cuartoId, mensajeErrorFoto(error));
      } finally {
        if (!this._desmontado) this.$set(this.fotoOcupada, cuartoId, '');
      }
    },
    editarBitacora(bitacora) {
      this.errorFormulario = '';
      this.modoEdicion = true;
      this.liberarPreviews();
      this.bitacoraActual = { ...bitacora, fotos: (bitacora.fotos || []).map((foto) => ({ ...foto })) };
      this.mostrarFormulario = true;
    },
    verDetalles(bitacora) {
      this.bitacoraDetalle = { ...bitacora };
      this.mostrarDetalles = true;
    },
    cerrarFormulario() {
      if (this.guardando) return;
      this.liberarPreviews();
      this.mostrarFormulario = false;
      this.modoEdicion = false;
      this.bitacoraActual = this.inicializarBitacora();
      this.guardando = false;
    },
    mostrarErrorFormulario(mensaje) {
      this.errorFormulario = mensaje;
      this.$nextTick(() => {
        const aviso = this.$refs.errorFormulario;
        if (aviso && aviso.scrollIntoView) aviso.scrollIntoView({ block: 'nearest' });
      });
    },
    async agregarFotos(event) {
      if (this.guardando || this.procesandoFotos) return;
      this.errorFormulario = '';
      const archivos = Array.from(event.target.files || []);
      event.target.value = '';
      if (!archivos.length) return;
      if (this.bitacoraActual.fotos.length + archivos.length > 12) {
        this.mostrarErrorFormulario('Puedes adjuntar un máximo de 12 fotos por bitácora.');
        return;
      }
      if (archivos.some((archivo) => !tipoDeArchivo(archivo) || archivo.size > 10 * 1024 * 1024 || !archivo.size)) {
        this.mostrarErrorFormulario('Selecciona fotos JPG, PNG o WebP de máximo 10 MB cada una.');
        return;
      }
      const lote = {};
      this._loteFotos = lote;
      this.procesandoFotos = true;
      try {
        for (const archivo of archivos) {
          const preparada = await prepararFoto(archivo);
          if (this._loteFotos !== lote || !this.mostrarFormulario) return;
          this.bitacoraActual.fotos.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            nombre: archivo.name || 'foto.jpg',
            file: preparada.blob,
            contentType: preparada.contentType,
            preview: URL.createObjectURL(preparada.blob),
          });
        }
      } catch (error) {
        if (this._loteFotos === lote && this.mostrarFormulario) {
          this.mostrarErrorFormulario(
            error && error.code === 'timeout'
              ? mensajeErrorFoto(error)
              : 'No pudimos leer la foto. Vuelve a elegirla.'
          );
        }
      } finally {
        if (this._loteFotos === lote) this.procesandoFotos = false;
      }
    },
    quitarFoto(index) {
      if (this.guardando) return;
      const foto = this.bitacoraActual.fotos[index];
      if (foto.preview) URL.revokeObjectURL(foto.preview);
      this.bitacoraActual.fotos.splice(index, 1);
    },
    liberarPreviews() {
      (this.bitacoraActual.fotos || []).forEach((foto) => {
        if (foto.preview) URL.revokeObjectURL(foto.preview);
      });
    },
    async borrarArchivosFotos(fotos) {
      await Promise.all((fotos || []).filter((foto) => foto.path && foto.path.startsWith('bitacoras/'))
        .map(async (foto) => {
          try {
            await conTiempo(deleteObject(ref(storage, foto.path)), TIEMPO_GUARDADO_MS, 'limpieza');
          } catch (error) {
            console.warn('No se pudo limpiar una foto de bitácora:', error);
          }
        }));
    },
    subirFoto(referencia, blob, contentType) {
      const reintentoAnterior = storage.maxUploadRetryTime;
      storage.maxUploadRetryTime = TIEMPO_REINTENTO_SUBIDA_MS;
      return new Promise((resolve, reject) => {
        let cerrado = false;
        let timer = null;
        const terminar = (fn, valor) => {
          if (cerrado) return;
          cerrado = true;
          clearTimeout(timer);
          fn(valor);
        };
        const tarea = uploadBytesResumable(referencia, blob, {
          contentType: contentType || 'image/jpeg',
        });
        timer = setTimeout(() => {
          try { tarea.cancel(); } catch (error) { /* la subida ya terminó */ }
          const error = new Error('La subida de la foto tardó demasiado. Revisa tu conexión y vuelve a intentarlo.');
          error.code = 'timeout';
          terminar(reject, error);
        }, TIEMPO_SUBIDA_MS);
        tarea.on('state_changed', null, (error) => terminar(reject, error), () => terminar(resolve, tarea.snapshot));
      }).finally(() => {
        storage.maxUploadRetryTime = reintentoAnterior;
      });
    },
    async guardarBitacora() {
      if (this.guardando || this.procesandoFotos || this.campoDictado) return;
      this.errorFormulario = '';
      if (!this.validarFormulario()) return;
      this.guardando = true;
      const subidas = [];
      let guardada = null;
      let escrituraIniciada = false;
      let anteriores = [];
      let fotos = [];
      try {
        if (this.modoEdicion && !this.bitacoraActual.id) {
          throw new Error('ID de bitácora no válido para actualización');
        }
        const bitacoraRef = this.modoEdicion
          ? doc(db, 'bitacoras', this.bitacoraActual.id.toString())
          : doc(collection(db, 'bitacoras'));
        anteriores = (this.bitacoras.find((b) => b.id === bitacoraRef.id) || {}).fotos || [];
        fotos = [];
        for (const foto of this.bitacoraActual.fotos) {
          if (foto.file) {
            const path = `bitacoras/${bitacoraRef.id}/${foto.id}`;
            const fotoRef = ref(storage, path);
            subidas.push({ path });
            await this.subirFoto(fotoRef, foto.file, foto.contentType || tipoDeArchivo(foto.file) || 'image/jpeg');
            const url = await conTiempo(
              getDownloadURL(fotoRef),
              TIEMPO_GUARDADO_MS,
              'No pudimos confirmar la foto subida. Revisa tu conexión y vuelve a intentarlo.'
            );
            fotos.push({ id: foto.id, nombre: foto.nombre || '', path, url });
          } else {
            fotos.push({ id: foto.id, nombre: foto.nombre || '', path: foto.path || '', url: foto.url });
          }
        }
        const bitacoraData = {
          cuartoId: this.bitacoraActual.cuartoId.toString(),
          fecha: this.bitacoraActual.fecha,
          temperatura: this.tieneTemperatura(this.bitacoraActual.temperatura)
            ? Number(this.bitacoraActual.temperatura) : null,
          tecnico: this.bitacoraActual.tecnico.trim(),
          tipoMantenimiento: this.bitacoraActual.tipoMantenimiento,
          estado: this.bitacoraActual.estado,
          observaciones: this.bitacoraActual.observaciones || '',
          accionesRealizadas: this.bitacoraActual.accionesRealizadas || '',
          fotos,
          updatedAt: serverTimestamp(),
        };
        if (!this.modoEdicion) bitacoraData.createdAt = serverTimestamp();
        const escritura = this.modoEdicion
          ? updateDoc(bitacoraRef, bitacoraData)
          : setDoc(bitacoraRef, bitacoraData);
        try {
          await conTiempo(
            escritura,
            TIEMPO_GUARDADO_MS,
            'El guardado de la bitácora tardó demasiado. Revisa tu conexión y vuelve a intentarlo.'
          );
          guardada = { ...bitacoraData, id: bitacoraRef.id };
          escrituraIniciada = true;
        } catch (error) {
          if (error && error.code === 'timeout') escrituraIniciada = true;
          throw error;
        }
      } catch (error) {
        console.error('Error al guardar bitácora:', error);
        this.mostrarErrorFormulario(mensajeErrorFoto(error));
      } finally {
        this.guardando = false;
      }
      if (!guardada) {
        if (!escrituraIniciada) this.borrarArchivosFotos(subidas);
        return;
      }
      const index = this.bitacoras.findIndex((b) => b.id === guardada.id);
      if (index !== -1) this.bitacoras.splice(index, 1, guardada);
      else this.bitacoras.unshift(guardada);
      this.mensaje = this.modoEdicion
        ? 'Bitácora actualizada correctamente.' : 'Bitácora creada correctamente.';
      this.cerrarFormulario();
      this.borrarArchivosFotos(anteriores.filter((foto) => !fotos.some((actual) => actual.path === foto.path)));
    },
    validarFormulario() {
      // Validación básica
      if (
        !this.bitacoraActual.cuartoId ||
        !this.bitacoraActual.fecha ||
        !this.bitacoraActual.tecnico.trim() ||
        (this.tieneTemperatura(this.bitacoraActual.temperatura) &&
          !Number.isFinite(Number(this.bitacoraActual.temperatura))) ||
        !this.bitacoraActual.tipoMantenimiento ||
        !this.bitacoraActual.estado
      ) {
        this.mostrarErrorFormulario(
          'Completa los campos obligatorios e introduce una temperatura válida.'
        );
        return false;
      }
      return true;
    },
    editarBitacoraDesdeDetalles() {
      this.editarBitacora(this.bitacoraDetalle);
      this.mostrarDetalles = false;
    },
    confirmarEliminarBitacora(bitacora) {
      this.errorEliminar = '';
      if (!bitacora || !bitacora.id) {
        console.error('Intento de eliminar una bitácora sin ID válido:', bitacora);
        alert('No se puede eliminar esta bitácora porque no tiene un ID válido');
        return;
      }

      console.log('Preparando eliminación de bitácora con ID:', bitacora.id);
      this.bitacoraEliminar = { ...bitacora };
      this.mostrarConfirmacionEliminar = true;
    },
    async eliminarBitacora() {
      if (this.eliminando) return;
      this.errorEliminar = '';
      this.eliminando = true;
      try {
        // Verificar que el ID de la bitácora sea válido
        if (!this.bitacoraEliminar || !this.bitacoraEliminar.id) {
          throw new Error('ID de bitácora no válido');
        }

        const bitacoraId = this.bitacoraEliminar.id.toString();
        console.log('Intentando eliminar bitácora con ID:', bitacoraId);

        const bitacoraRef = doc(db, 'bitacoras', bitacoraId);
        await deleteDoc(bitacoraRef);
        await this.borrarArchivosFotos(this.bitacoraEliminar.fotos || []);

        // Eliminar del array local
        const index = this.bitacoras.findIndex((b) => b.id === bitacoraId);
        if (index !== -1) {
          this.bitacoras.splice(index, 1);
        }

        this.mostrarConfirmacionEliminar = false;
        this.mensaje = 'Bitácora eliminada correctamente.';
        this.bitacoraEliminar = {};
      } catch (error) {
        console.error('Error al eliminar bitácora:', error);
        this.errorEliminar =
          'No se pudo eliminar la bitácora. Revisa tu conexión y vuelve a intentarlo.';
      } finally {
        this.eliminando = false;
      }
    },
  },
};
</script>

<style scoped>
.bitacoras-container {
  --ink: #173b36;
  --muted: #61766e;
  --line: #dce6df;
  --accent: #17664e;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px max(16px, env(safe-area-inset-right)) calc(32px + env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
  color: var(--ink);
  font-family: 'Roboto', sans-serif;
}
.bitacoras-container * {
  box-sizing: border-box;
}
.back-link {
  color: var(--muted);
  font-size: 14px;
  display: inline-flex;
  gap: 9px;
  align-items: center;
  margin-bottom: 25px;
}
.page-header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  margin-bottom: 24px;
}
.page-header .btn-primary {
  width: 100%;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 1.8px;
  font-weight: 700;
  color: var(--accent);
  margin: 0 0 10px;
}
h1 {
  font-size: clamp(25px, 3vw, 36px);
  letter-spacing: -1px;
  font-weight: 700;
  margin: 0 0 10px;
}
.page-description {
  color: var(--muted);
  margin: 0;
  line-height: 1.6;
}
button {
  font: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
button:disabled {
  opacity: 0.55;
  cursor: wait;
}
button:focus-visible,
a:focus-visible,
.form-control:focus-visible {
  outline: 3px solid #378c73;
  outline-offset: 3px;
}
.btn-primary,
.btn-secondary,
.btn-guardar,
.btn-cancelar,
.btn-cerrar-detalles,
.btn-editar-detalles,
.btn-eliminar {
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 9px;
  border: 1px solid transparent;
  font-weight: 600;
}
.btn-primary,
.btn-guardar,
.btn-editar-detalles {
  background: var(--accent);
  color: #fff;
}
.btn-primary {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.btn-primary:hover,
.btn-guardar:hover,
.btn-editar-detalles:hover {
  background: #104d3a;
}
.btn-secondary,
.btn-cancelar,
.btn-cerrar-detalles {
  background: white;
  color: var(--ink);
  border-color: var(--line);
}
.btn-secondary:hover,
.btn-cancelar:hover,
.btn-cerrar-detalles:hover {
  background: #eff5f1;
}
.section-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 14px;
}
.section-heading h2 {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
}
.section-heading > span {
  color: var(--muted);
  font-size: 12px;
}
.lista-cuartos {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fila-cuartos {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  align-items: stretch;
}
.panel-cuarto-slot {
  grid-column: 1 / -1;
  min-width: 0;
}
.form-group label {
  font-size: 12px;
  font-weight: 600;
  display: block;
  margin-bottom: 7px;
  color: #425e53;
}
.form-control {
  width: 100%;
  min-height: 44px;
  height: auto;
  padding: 10px 11px;
  border: 1px solid #cddcd2;
  border-radius: 8px;
  background: white;
  color: var(--ink);
  font: inherit;
  font-size: 16px;
  color-scheme: light;
}
.form-control::placeholder {
  color: #6c7b74;
}
.estado-tag {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  background: #eef2ef;
  color: #52675d;
}
.estado-optimo {
  background: #e5f4eb;
  color: #226342;
}
.estado-regular {
  background: #fff4d8;
  color: #825c0b;
}
.estado-requiere-atencion {
  background: #fff0e1;
  color: #97511b;
}
.estado-critico {
  background: #fce8e8;
  color: #a33232;
}
.notice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  background: #e8f5ed;
  border: 1px solid #b8dcc7;
  padding: 13px 16px;
  border-radius: 9px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #245c3c;
}
.notice button {
  background: none;
  border: 0;
  color: inherit;
  font-weight: 600;
  min-height: 32px;
}
.notice-error {
  background: #fff0ed;
  border-color: #f1c9c3;
  color: #973b30;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: #10281fcc;
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 10px;
  z-index: 10000;
}
.modal-content {
  background: #fff;
  color: var(--ink);
  width: 100%;
  max-width: 700px;
  max-height: calc(100dvh - 40px);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px #0004;
  border: 1px solid var(--line);
}
.modal-confirmacion {
  max-width: 470px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.modal-header h2 {
  font-size: 21px;
  font-weight: 700;
  margin: 0;
}
.btn-cerrar {
  background: #f1f5f2;
  color: var(--muted);
  border: 0;
  border-radius: 8px;
  min-width: 40px;
  min-height: 40px;
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
  min-height: 0;
}
.form-help {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 20px;
}
.form-help.notice-error {
  color: #973b30;
}
.form-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  padding: 0;
  margin: 0;
  border: 0;
  min-width: 0;
}
.form-group {
  margin: 0;
  min-width: 0;
}
.full-width {
  grid-column: 1 / -1;
}
.fotos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}
.foto-card {
  margin: 0;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--accent);
}
.foto-card img {
  width: 100%;
  height: 130px;
  object-fit: cover;
  border-radius: 5px;
}
.foto-card figcaption,
.foto-card span {
  display: block;
  overflow-wrap: anywhere;
  font-size: 12px;
  margin: 8px 0;
}
.foto-card button { width: 100%; }
textarea.form-control {
  resize: vertical;
  min-height: 82px;
}
.modal-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  background: #f8faf8;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}
.footer-error {
  flex: 1 0 100%;
  margin: 0;
}
.footer-acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-left: auto;
}
.detalle-grupo {
  margin-bottom: 24px;
}
.detalle-grupo:last-child {
  margin-bottom: 0;
}
.detalles h3 {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 13px;
  color: var(--accent);
}
.detalles p {
  font-size: 14px;
  margin-bottom: 10px;
  overflow-wrap: anywhere;
}
.texto-largo {
  white-space: pre-line;
  padding: 15px;
  border-radius: 9px;
  background: #f3f7f4;
  line-height: 1.6;
}
.mensaje-confirmacion {
  line-height: 1.7;
}
.advertencia {
  color: #a33232;
  font-size: 13px;
}
.btn-eliminar {
  background: #af3838;
  color: #fff;
}
.btn-eliminar:hover {
  background: #8e2929;
}
@media (min-width: 640px) {
  .form-fields {
    grid-template-columns: 1fr 1fr;
  }
  .bitacoras-container {
    padding: 28px 32px 64px;
  }
  .page-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .page-header .btn-primary {
    width: auto;
  }
  .section-heading {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .fila-cuartos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .modal-overlay {
    align-items: center;
    padding: 20px;
  }
}
@media (min-width: 1100px) {
  .fila-cuartos {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  .panel-cuarto-slot {
    transition: none;
  }
}
</style>
