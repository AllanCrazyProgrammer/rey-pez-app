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
          Consulta las revisiones y registra el mantenimiento de cada cuarto.
        </p>
      </div>
      <button @click="nuevaBitacora" class="btn-primary">
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
        <h2 id="room-heading">Último registro por cuarto</h2>
        <span>Selecciona un cuarto para filtrar</span>
      </div>
      <div class="room-grid">
        <button
          v-for="cuarto in resumenCuartos"
          :key="cuarto.id"
          class="room-card"
          :class="{ selected: filtrosCuarto === cuarto.id }"
          :aria-pressed="filtrosCuarto === cuarto.id"
          @click="filtrosCuarto = filtrosCuarto === cuarto.id ? '' : cuarto.id"
        >
          <span class="room-name"
            ><i class="far fa-snowflake" aria-hidden="true"></i> {{ cuarto.nombre }}</span
          >
          <template v-if="!cargando && !errorCarga && cuarto.ultimo">
            <strong v-if="tieneTemperatura(cuarto.ultimo.temperatura)" class="room-temperature"
              >{{ cuarto.ultimo.temperatura }} <small>°C</small></strong
            >
            <span v-else class="room-empty">Sin registro</span>
            <span class="estado-tag" :class="claseEstado(cuarto.ultimo.estado)">{{
              cuarto.ultimo.estado || 'Sin estado'
            }}</span>
            <span class="room-date">{{ formatearFecha(cuarto.ultimo.fecha) }}</span>
          </template>
          <span v-else class="room-empty">{{
            cargando ? 'Cargando…' : errorCarga ? 'No disponible' : 'Sin registros'
          }}</span>
        </button>
      </div>
    </section>

    <section class="history-panel" aria-labelledby="history-heading" :aria-busy="cargando">
      <div class="section-heading history-heading">
        <h2 id="history-heading">Historial de mantenimiento</h2>
        <span aria-live="polite">{{
          cargando
            ? 'Cargando…'
            : bitacorasFiltradas.length + ' de ' + bitacoras.length + ' registros'
        }}</span>
      </div>
      <div class="filters-container">
        <div class="filter-group search-group">
          <label for="buscar">Buscar en bitácoras</label
          ><input
            id="buscar"
            v-model="busqueda"
            type="search"
            class="form-control"
            placeholder="Técnico, observaciones o acciones…"
          />
        </div>
        <div class="filter-group">
          <label for="cuarto-select">Cuarto frío</label
          ><select id="cuarto-select" v-model="filtrosCuarto" class="form-control">
            <option value="">Todos los cuartos</option>
            <option v-for="cuarto in cuartos" :key="cuarto.id" :value="cuarto.id">
              {{ cuarto.nombre }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label for="estado-filtro">Estado</label
          ><select id="estado-filtro" v-model="filtroEstado" class="form-control">
            <option value="">Todos los estados</option>
            <option v-for="estado in estados" :key="estado">{{ estado }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="fecha-desde">Desde</label
          ><input
            type="date"
            id="fecha-desde"
            v-model="filtroFechaDesde"
            :max="filtroFechaHasta || undefined"
            class="form-control"
          />
        </div>
        <div class="filter-group">
          <label for="fecha-hasta">Hasta</label
          ><input
            type="date"
            id="fecha-hasta"
            v-model="filtroFechaHasta"
            :min="filtroFechaDesde || undefined"
            class="form-control"
          />
        </div>
      </div>
      <div class="filter-caption">
        <span
          :class="{ 'date-error': rangoInvalido }"
          :role="rangoInvalido ? 'alert' : undefined"
          >{{
            rangoInvalido
              ? 'La fecha inicial debe ser anterior o igual a la final.'
              : 'Los filtros se aplican automáticamente · Más recientes primero'
          }}</span
        ><button v-if="hayFiltros" class="text-button" @click="limpiarFiltros">
          Limpiar filtros
        </button>
      </div>
      <div v-if="cargando" class="empty-state" role="status">
        <i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
        <h3>Cargando bitácoras…</h3>
      </div>
      <div v-else-if="errorCarga" class="empty-state">
        <h3>No se pudo cargar el historial</h3>
        <p>Reintenta para consultar los registros.</p>
      </div>
      <div v-else-if="!bitacorasFiltradas.length" class="empty-state">
        <i class="far fa-clipboard" aria-hidden="true"></i>
        <h3>
          {{ hayFiltros ? 'No encontramos coincidencias' : 'Registra el primer mantenimiento' }}
        </h3>
        <p>
          {{
            hayFiltros
              ? 'Prueba con otro cuarto, estado o rango de fechas.'
              : 'Guarda la temperatura, el diagnóstico y las acciones realizadas.'
          }}
        </p>
        <button v-if="hayFiltros" class="btn-secondary" @click="limpiarFiltros">
          Limpiar filtros</button
        ><button v-else class="btn-primary" @click="nuevaBitacora">Crear primera bitácora</button>
      </div>
      <div v-else class="table-responsive">
        <table class="bitacoras-table">
          <thead>
            <tr>
              <th scope="col">Fecha / cuarto</th>
              <th scope="col">Temperatura</th>
              <th scope="col">Técnico</th>
              <th scope="col">Mantenimiento</th>
              <th scope="col">Estado</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bitacora in bitacorasFiltradas" :key="bitacora.id">
              <td class="record-title">
                <strong>{{ formatearNombreCuarto(bitacora.cuartoId) }}</strong
                ><span>{{ formatearFecha(bitacora.fecha) }}</span>
              </td>
              <td data-label="Temperatura" class="temperature-cell">
                {{ mostrarTemperatura(bitacora.temperatura) }}
              </td>
              <td data-label="Técnico">{{ bitacora.tecnico }}</td>
              <td data-label="Mantenimiento">{{ bitacora.tipoMantenimiento }}</td>
              <td data-label="Estado">
                <span class="estado-tag" :class="claseEstado(bitacora.estado)">{{
                  bitacora.estado || 'Sin estado'
                }}</span>
              </td>
              <td>
                <div class="acciones">
                  <button
                    @click="verDetalles(bitacora)"
                    class="btn-detail"
                    :aria-label="
                      'Ver detalles de ' +
                      formatearNombreCuarto(bitacora.cuartoId) +
                      ', ' +
                      formatearFecha(bitacora.fecha)
                    "
                  >
                    Ver detalle</button
                  ><button
                    @click="editarBitacora(bitacora)"
                    class="btn-accion"
                    title="Editar bitácora"
                    :aria-label="
                      'Editar bitácora de ' +
                      formatearNombreCuarto(bitacora.cuartoId) +
                      ', ' +
                      formatearFecha(bitacora.fecha)
                    "
                  >
                    <i class="fas fa-pen" aria-hidden="true"></i></button
                  ><button
                    @click="confirmarEliminarBitacora(bitacora)"
                    class="btn-accion eliminar"
                    title="Eliminar bitácora"
                    :aria-label="
                      'Eliminar bitácora de ' +
                      formatearNombreCuarto(bitacora.cuartoId) +
                      ', ' +
                      formatearFecha(bitacora.fecha)
                    "
                  >
                    <i class="far fa-trash-alt" aria-hidden="true"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
          <p v-if="errorFormulario" class="notice notice-error form-help" role="alert">
            {{ errorFormulario }}
          </p>
          <fieldset :disabled="guardando" class="form-fields">
            <div class="form-group">
              <label for="cuarto">Cuarto Frío:</label>
              <select id="cuarto" v-model="bitacoraActual.cuartoId" class="form-control" required>
                <option value="" disabled>Seleccione un cuarto frío</option>
                <option value="1">Cuarto Frío #1</option>
                <option value="2">Cuarto Frío #2</option>
                <option value="3">Cuarto Frío #3</option>
                <option value="4">Cuarto Frío #4</option>
                <option value="5">Cuarto Frío #5</option>
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
          </fieldset>
        </form>
        <div class="modal-footer">
          <button @click="cerrarFormulario" class="btn-cancelar" :disabled="guardando">
            Cancelar
          </button>
          <button
            type="submit"
            form="bitacora-form"
            class="btn-guardar"
            :disabled="guardando || !!campoDictado"
          >
            {{
              guardando
                ? 'Guardando...'
                : campoDictado
                ? 'Detén el dictado'
                : 'Guardar'
            }}
          </button>
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
import { db } from '@/firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { formatearFecha } from '@/utils/formatters';
import DictadoTextarea from '@/components/DictadoTextarea.vue';

export default {
  name: 'Bitacoras',
  components: { DictadoTextarea },
  data() {
    return {
      bitacoras: [],
      cuartos: [
        { id: '1', nombre: 'Cuarto frío #1' },
        { id: '2', nombre: 'Cuarto frío #2' },
        { id: '3', nombre: 'Cuarto frío #3' },
        { id: '4', nombre: 'Cuarto frío #4' },
        { id: '5', nombre: 'Cuarto frío #5' },
      ],
      estados: ['Óptimo', 'Regular', 'Requiere Atención', 'Crítico'],
      busqueda: '',
      filtroEstado: '',
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
      filtrosCuarto: '',
      filtroFechaDesde: '',
      filtroFechaHasta: '',
      cargando: true,
      guardando: false,
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
    hayFiltros() {
      return !!(
        this.busqueda ||
        this.filtroEstado ||
        this.filtrosCuarto ||
        this.filtroFechaDesde ||
        this.filtroFechaHasta
      );
    },
    rangoInvalido() {
      return !!(
        this.filtroFechaDesde &&
        this.filtroFechaHasta &&
        this.filtroFechaDesde > this.filtroFechaHasta
      );
    },
    resumenCuartos() {
      return this.cuartos.map((cuarto) => ({
        ...cuarto,
        ultimo: this.bitacoras
          .filter((b) => String(b.cuartoId) === cuarto.id)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0],
      }));
    },
    bitacorasFiltradas() {
      if (this.rangoInvalido) return [];
      let resultado = [...this.bitacoras];
      const texto = this.normalizarTexto(this.busqueda.trim());
      if (texto)
        resultado = resultado.filter((b) =>
          this.normalizarTexto(
            [
              b.tecnico,
              b.observaciones,
              b.accionesRealizadas,
              b.tipoMantenimiento,
              this.formatearNombreCuarto(b.cuartoId),
            ].join(' ')
          ).includes(texto)
        );
      if (this.filtroEstado) resultado = resultado.filter((b) => b.estado === this.filtroEstado);

      if (this.filtrosCuarto) {
        resultado = resultado.filter((b) => String(b.cuartoId) === this.filtrosCuarto);
      }

      if (this.filtroFechaDesde) {
        resultado = resultado.filter((b) => new Date(b.fecha) >= new Date(this.filtroFechaDesde));
      }

      if (this.filtroFechaHasta) {
        resultado = resultado.filter((b) => new Date(b.fecha) <= new Date(this.filtroFechaHasta));
      }

      return resultado.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
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
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.tecladoModal);
    if (this.modalActivo) document.body.style.overflow = this.overflowAnterior || '';
  },
  created() {
    this.cargarBitacoras();
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
    nuevaBitacora() {
      this.modoEdicion = false;
      this.errorFormulario = '';
      this.bitacoraActual = this.inicializarBitacora();
      this.bitacoraActual.cuartoId = this.filtrosCuarto;
      this.mostrarFormulario = true;
    },
    limpiarFiltros() {
      this.busqueda =
        this.filtroEstado =
        this.filtrosCuarto =
        this.filtroFechaDesde =
        this.filtroFechaHasta =
          '';
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
          ...this.$refs.dialogo.querySelectorAll('button, input, select, textarea, [tabindex="0"]'),
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
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
          };
        });

        console.log(`Se cargaron ${this.bitacoras.length} bitácoras`);
      } catch (error) {
        console.error('Error al cargar bitácoras:', error);
        this.errorCarga =
          'No pudimos cargar las bitácoras. Revisa tu conexión e inténtalo de nuevo.';
      } finally {
        this.cargando = false;
      }
    },
    formatearNombreCuarto(cuartoId) {
      if (!cuartoId) return '';
      return `Cuarto Frío #${cuartoId}`;
    },
    editarBitacora(bitacora) {
      this.errorFormulario = '';
      this.modoEdicion = true;
      this.bitacoraActual = { ...bitacora };
      this.mostrarFormulario = true;
    },
    verDetalles(bitacora) {
      this.bitacoraDetalle = { ...bitacora };
      this.mostrarDetalles = true;
    },
    cerrarFormulario() {
      if (this.guardando) return;
      this.mostrarFormulario = false;
      this.modoEdicion = false;
      this.bitacoraActual = this.inicializarBitacora();
      this.guardando = false;
    },
    async guardarBitacora() {
      if (this.guardando || this.campoDictado) return;
      this.errorFormulario = '';
      if (this.validarFormulario()) {
        this.guardando = true;
        try {
          // Asegurarse de que los datos sean válidos
          const bitacoraData = {
            ...this.bitacoraActual,
            cuartoId: this.bitacoraActual.cuartoId.toString(),
            temperatura: this.tieneTemperatura(this.bitacoraActual.temperatura)
              ? Number(this.bitacoraActual.temperatura)
              : null,
            tecnico: this.bitacoraActual.tecnico.trim(),
            tipoMantenimiento: this.bitacoraActual.tipoMantenimiento,
            estado: this.bitacoraActual.estado,
            observaciones: this.bitacoraActual.observaciones || '',
            accionesRealizadas: this.bitacoraActual.accionesRealizadas || '',
            updatedAt: serverTimestamp(),
          };

          if (this.modoEdicion) {
            // Verificar que el ID sea válido
            if (!bitacoraData.id) {
              throw new Error('ID de bitácora no válido para actualización');
            }

            console.log('Actualizando bitácora con ID:', bitacoraData.id);

            // Actualizar bitácora existente
            const { id, ...dataSinId } = bitacoraData;
            const bitacoraRef = doc(db, 'bitacoras', id.toString());
            await updateDoc(bitacoraRef, dataSinId);

            // Actualizar en el array local
            const index = this.bitacoras.findIndex((b) => b.id === id);
            if (index !== -1) {
              this.bitacoras.splice(index, 1, bitacoraData);
            }

            console.log('Bitácora actualizada con éxito');
          } else {
            // Crear nueva bitácora
            bitacoraData.createdAt = serverTimestamp();
            console.log('Creando nueva bitácora');

            const docRef = await addDoc(collection(db, 'bitacoras'), bitacoraData);

            // Agregar al array local con el ID generado
            const nuevaBitacora = {
              ...bitacoraData,
              id: docRef.id.toString(),
            };

            console.log('Nueva bitácora creada con ID:', nuevaBitacora.id);
            this.bitacoras.unshift(nuevaBitacora);
          }

          this.mensaje = this.modoEdicion
            ? 'Bitácora actualizada correctamente.'
            : 'Bitácora creada correctamente.';
          this.guardando = false;
          this.cerrarFormulario();
        } catch (error) {
          console.error('Error al guardar bitácora:', error);
          this.errorFormulario =
            'No se pudo guardar. Tus cambios siguen aquí; revisa tu conexión y vuelve a intentarlo.';
        } finally {
          this.guardando = false;
        }
      }
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
        this.errorFormulario =
          'Completa los campos obligatorios e introduce una temperatura válida.';
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
  padding: 28px 32px 64px;
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
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
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
.room-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 30px;
}
.room-card {
  text-align: left;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 13px;
  padding: 18px;
  min-height: 170px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  color: var(--ink);
}
.room-card:hover {
  background: #f6faf7;
  border-color: #8db3a3;
}
.room-card.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
  background: #eef7f1;
}
.room-name {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.room-name i {
  color: #43816d;
}
.room-temperature {
  font-size: 29px;
  line-height: 1;
  letter-spacing: -0.7px;
  font-variant-numeric: tabular-nums;
}
.room-temperature small {
  font-size: 16px;
  font-weight: 400;
  color: var(--muted);
}
.room-date,
.room-empty {
  font-size: 12px;
  color: var(--muted);
}
.room-date {
  margin-top: auto;
}
.room-empty {
  margin: auto 0;
}
.history-panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 6px 24px #193e3010;
}
.history-heading {
  padding: 24px 24px 0;
  margin-bottom: 20px;
}
.filters-container {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1.1fr 1fr 1fr;
  gap: 12px;
  padding: 0 24px;
}
.filter-group {
  min-width: 0;
}
.filter-group label,
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
  font-size: 14px;
  color-scheme: light;
}
.form-control::placeholder {
  color: #6c7b74;
}
.filter-caption {
  min-height: 53px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  color: var(--muted);
  font-size: 12px;
}
.text-button {
  background: none;
  color: var(--accent);
  border: none;
  padding: 8px 0;
  font-weight: 600;
}
.date-error {
  color: #ad3030;
}
.table-responsive {
  overflow-x: auto;
}
.bitacoras-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.bitacoras-table th {
  text-align: left;
  padding: 13px 18px;
  background: #f3f7f4;
  border-block: 1px solid var(--line);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #587164;
}
.bitacoras-table td {
  padding: 18px;
  border-bottom: 1px solid #e9efea;
  vertical-align: middle;
  overflow-wrap: anywhere;
}
.bitacoras-table tr:last-child td {
  border-bottom: 0;
}
.bitacoras-table tbody tr:hover {
  background: #fafcfb;
}
.record-title strong,
.record-title > span {
  display: block;
}
.record-title strong {
  font-weight: 600;
  margin-bottom: 5px;
}
.record-title > span {
  font-size: 12px;
  color: var(--muted);
}
.temperature-cell {
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
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
.acciones {
  display: flex;
  gap: 5px;
  align-items: center;
}
.btn-detail,
.btn-accion {
  border: 1px solid var(--line);
  color: var(--accent);
  background: white;
  border-radius: 7px;
  min-height: 40px;
  padding: 8px 10px;
  white-space: nowrap;
  font-size: 12px;
}
.btn-accion {
  min-width: 40px;
}
.btn-detail:hover,
.btn-accion:hover {
  background: #edf5ef;
}
.btn-accion.eliminar {
  color: #ac4747;
  border-color: transparent;
}
.btn-accion.eliminar:hover {
  background: #fce8e8;
}
.empty-state {
  padding: 58px 20px;
  text-align: center;
  color: var(--muted);
  border-top: 1px solid var(--line);
}
.empty-state > i {
  font-size: 30px;
  color: #719584;
  margin-bottom: 18px;
}
.empty-state h3 {
  font-size: 19px;
  color: var(--ink);
  margin-bottom: 10px;
}
.empty-state p {
  font-size: 14px;
  margin-bottom: 22px;
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
  align-items: center;
  padding: 20px;
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
  grid-template-columns: 1fr 1fr;
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
textarea.form-control {
  resize: vertical;
  min-height: 82px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  background: #f8faf8;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
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
@media (max-width: 1100px) {
  .filters-container {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .search-group {
    grid-column: 1 / -1;
  }
  .room-card {
    padding: 14px;
  }
}
@media (max-width: 760px) {
  .bitacoras-container {
    padding: 20px 16px 40px;
  }
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 18px;
  }
  .page-header .btn-primary {
    align-self: flex-start;
  }
  .room-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .room-card {
    min-height: 162px;
  }
  .room-card:last-child {
    grid-column: 1 / -1;
    min-height: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
  }
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }
  .history-heading {
    padding: 20px 16px 0;
  }
  .filters-container {
    padding: 0 16px;
    grid-template-columns: 1fr 1fr;
  }
  .form-control {
    font-size: 16px;
  }
  .filter-caption {
    padding: 12px 16px;
    align-items: flex-start;
    flex-direction: column;
    gap: 0;
  }
  .bitacoras-table,
  .bitacoras-table tbody,
  .bitacoras-table tr,
  .bitacoras-table td {
    display: block;
    width: 100%;
  }
  .bitacoras-table thead {
    display: none;
  }
  .bitacoras-table tbody {
    padding: 0 12px 12px;
  }
  .bitacoras-table tr {
    border: 1px solid var(--line);
    border-radius: 10px;
    margin-bottom: 12px;
    padding: 14px;
  }
  .bitacoras-table tr:last-child {
    margin-bottom: 0;
  }
  .bitacoras-table td {
    border: none;
    padding: 7px 0;
  }
  .bitacoras-table td[data-label] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    text-align: right;
  }
  .bitacoras-table td[data-label]::before {
    content: attr(data-label);
    color: var(--muted);
    font-size: 12px;
    font-weight: 400;
    flex-shrink: 0;
  }
  .record-title {
    border-bottom: 1px solid var(--line) !important;
    padding: 0 0 12px !important;
    margin-bottom: 7px;
  }
  .acciones {
    margin-top: 7px;
  }
  .btn-detail {
    flex: 1;
  }
  .btn-detail,
  .btn-accion {
    min-height: 44px;
  }
  .modal-overlay {
    padding: 10px;
  }
  .modal-content {
    max-height: calc(100dvh - 20px);
    border-radius: 12px;
  }
  .modal-header,
  .modal-body {
    padding: 18px;
  }
  .modal-footer {
    padding: 14px 18px;
  }
}
@media (max-width: 400px) {
  .form-fields {
    grid-template-columns: 1fr;
  }
  .modal-header h2 {
    font-size: 19px;
  }
}
</style>
