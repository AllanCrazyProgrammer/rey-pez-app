<!-- HeaderEmbarque.vue -->
<template>
  <div class="header-embarque">
    <div class="header-hero">
      <div class="titulo-embarque">
        <h1>
          <span class="titulo-icono"><i class="fas fa-ship"></i></span>
          {{ modoEdicion ? 'Embarque' : 'Nuevo embarque' }}
        </h1>
      </div>
      <div class="estado-operacion">
        <span class="estado-punto" :class="{ 'estado-punto--alerta': embarqueBloqueado }"></span>
        <strong>{{ embarqueBloqueado ? 'Protegido' : 'Editable' }}</strong>
      </div>
      <div class="botones">
        <button type="button" @click="volverAEmbarquesMenu" class="btn-volver">
          <i class="fas fa-arrow-left"></i> Menú
        </button>
        <button type="button" @click="toggleBloqueo" :class="['btn-bloqueo', { 'bloqueado': embarqueBloqueado }]">
          <i :class="['fas', embarqueBloqueado ? 'fa-lock' : 'fa-lock-open']"></i>
          {{ embarqueBloqueado ? 'Desbloquear' : 'Proteger' }}
        </button>
        <button type="button" @click="abrirConfiguracionMedidas" class="btn-configuracion-medidas">
          <i class="fas fa-sliders-h"></i> Medidas
        </button>
      </div>
    </div>

    <div class="botones-accion">
      <!-- Siempre renderizado: evita que el encabezado salte durante cada
           ciclo de guardado automático. Solo cambia su estado visual. -->
      <button
        @click="$emit('sync-manual')"
        class="btn btn-sync"
        :class="isSyncing ? 'btn-secondary' : (hasPendingChanges ? 'btn-primary' : 'btn-sincronizado')"
        :disabled="isSyncing || !hasPendingChanges"
        :title="hasPendingChanges || isSyncing ? 'Guardar cambios en la nube' : 'Todos los cambios están guardados'"
      >
        <i class="fas" :class="isSyncing ? 'fa-spinner fa-spin' : (hasPendingChanges ? 'fa-cloud-upload-alt' : 'fa-check-circle')"></i>
        {{ isSyncing ? 'Subiendo...' : (hasPendingChanges ? 'Subir Cambios' : 'Guardado') }}
      </button>
      <button @click="verPedidoDelDia" class="btn btn-success" title="Ver pedido del día de hoy">
        <i class="fas fa-clipboard-list"></i> Pedido del Día
      </button>
      <GenerarEsqueletoEmbarqueButton
        :fecha-embarque="fechaLocal"
        :embarque-bloqueado="embarqueBloqueado"
        @esqueleto-generado="onEsqueletoGenerado"
        @error="onEsqueletoError"
      />
      <button @click="$emit('generar-taras')" class="btn btn-info" :disabled="isGeneratingPdf">
        <span v-if="isGeneratingPdf && pdfType === 'taras'" class="loader-inline"></span>
        <i v-else class="fas fa-file-pdf"></i> PDF Taras
      </button>
      <button @click="$emit('generar-resumen')" class="btn btn-info" :disabled="isGeneratingPdf">
        <span v-if="isGeneratingPdf && pdfType === 'resumen'" class="loader-inline"></span>
        <i v-else class="fas fa-file-pdf"></i> Resumen Embarque
      </button>
      <button 
        v-if="embarqueId && embarqueId !== ''" 
        class="btn btn-warning"
        :class="{ 'disabled': isGeneratingPdf }"
        :disabled="isGeneratingPdf"
        @click="$emit('abrir-rendimientos')"
      >
        <i class="fas fa-chart-line"></i> Rendimientos
      </button>
      <precios-historial-modal 
        compact
        :clienteActual="clienteEmbarque"
        @precio-agregado="onPrecioAgregado">
      </precios-historial-modal>
    </div>

    <div class="header datos-operacion">
      <div class="header-row">
        <div class="fecha-selector">
          <span class="selector-icono"><i class="far fa-calendar-alt"></i></span>
          <div class="selector-campo">
          <label for="fecha">Fecha de embarque</label>
          <input type="date" id="fecha" v-model="fechaLocal" class="form-control" required :disabled="embarqueBloqueado"
            @change="actualizarFecha">
          </div>
        </div>
        <div class="carga-selector">
          <span class="selector-icono"><i class="fas fa-truck-loading"></i></span>
          <div class="selector-campo">
          <label for="cargaCon">Responsable de carga</label>
          <select id="cargaCon" v-model="cargaConLocal" class="form-control" required :disabled="embarqueBloqueado"
            @change="actualizarCargaCon">
            <option value="">Seleccionar</option>
            <option value="Porro">Porro</option>
            <option value="Caminante">Caminante</option>
          </select>
          </div>
        </div>
        <div class="acciones-multi-nota">
          <button
            class="btn btn-multi-notas"
            type="button"
            :disabled="isSyncing"
            @click="$emit('abrir-multi-notas')"
            title="Generar varias notas PDF a la vez"
          >
            <i class="fas fa-clone"></i>
            Notas PDF múltiples
          </button>
        </div>
      </div>
    </div>

    <!-- Modal del Pedido del Día -->
    <PedidoDelDiaModal 
      :mostrar="mostrarModalPedido"
      :fechaEmbarque="fechaLocal"
      @cerrar="cerrarModalPedido"
    />
  </div>
</template>

<script>
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import PedidoDelDiaModal from './PedidoDelDiaModal.vue';
import GenerarEsqueletoEmbarqueButton from './GenerarEsqueletoEmbarqueButton.vue';

export default {
  name: 'HeaderEmbarque',
  components: {
    PreciosHistorialModal,
    PedidoDelDiaModal,
    GenerarEsqueletoEmbarqueButton
  },
  props: {
    modoEdicion: {
      type: Boolean,
      default: false
    },
    embarqueBloqueado: {
      type: Boolean,
      default: false
    },
    embarque: {
      type: Object,
      required: true,
      validator: (obj) => {
        return 'fecha' in obj && 'cargaCon' in obj;
      }
    },
    isGeneratingPdf: {
      type: Boolean,
      default: false
    },
    pdfType: {
      type: String,
      default: ''
    },
    embarqueId: {
      type: String,
      default: ''
    },
    clienteEmbarque: {
      type: String,
      default: ''
    },
    hasPendingChanges: {
      type: Boolean,
      default: false
    },
    isSyncing: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      fechaLocal: this.embarque.fecha,
      cargaConLocal: this.embarque.cargaCon,
      mostrarModalPedido: false
    };
  },
  watch: {
    'embarque.fecha'(newVal) {
      this.fechaLocal = newVal;
    },
    'embarque.cargaCon'(newVal) {
      this.cargaConLocal = newVal;
    }
  },
  methods: {
    volverAEmbarquesMenu() {
      this.$emit('volver');
    },
    toggleBloqueo() {
      this.$emit('toggle-bloqueo');
    },
    actualizarFecha() {
      if (this.embarqueId) {
        localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
      }
      this.$emit('verificar-fecha', this.fechaLocal);
    },
    actualizarCargaCon() {
      this.$emit('update:cargaCon', this.cargaConLocal);
    },
    verPedidoDelDia() {
      this.mostrarModalPedido = true;
    },
    cerrarModalPedido() {
      this.mostrarModalPedido = false;
    },
    abrirConfiguracionMedidas() {
      this.$emit('abrir-configuracion-medidas');
    },
    onPrecioAgregado(nuevoPrecio) {
      console.log('[HEADER-EMBARQUE] Precio agregado:', nuevoPrecio);
      // Reenviar el evento hacia arriba para que NuevoEmbarque.vue recargue sus precios
      this.$emit('precio-agregado', nuevoPrecio);
    },
    onEsqueletoGenerado(datos) {
      this.$emit('generar-esqueleto', datos);
    },
    onEsqueletoError(mensaje) {
      this.$emit('esqueleto-error', mensaje);
    }
  }
};
</script>

<style scoped>
.header-embarque {
  margin-bottom: 20px;
  text-align: center;
  width: 100%;
}

h1 {
  margin-bottom: 15px;
}

.botones {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-volver {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
}

.btn-bloqueo {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-bloqueo.bloqueado {
  background-color: #dc3545;
}

.btn-configuracion-medidas {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-configuracion-medidas:hover {
  background-color: #0056b3;
}

.header {
  margin-top: 15px;
  width: 100%;
}

.header-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.fecha-selector,
.carga-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-width: auto;
}

label {
  margin-bottom: 0;
  font-weight: 500;
  white-space: nowrap;
}

.form-control {
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  min-width: 200px;
}

.form-control:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.botones-accion {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 15px 0;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-multi-notas {
  background-color: #563d7c;
  color: #fff;
  border: none;
  padding: 10px 14px;
  border-radius: 6px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 10px rgba(86, 61, 124, 0.25);
}

.btn-multi-notas:hover {
  background-color: #452c65;
}

.btn-multi-notas:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.acciones-multi-nota {
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn:disabled,
.btn.disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.loader-inline {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}





@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    gap: 15px;
  }

  .fecha-selector,
  .carga-selector {
    flex-direction: column;
    width: 100%;
  }

  .acciones-multi-nota,
  .btn-multi-notas {
    width: 100%;
  }

  .form-control {
    width: 100%;
    min-width: auto;
  }

  .botones-accion {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .btn {
    width: 100%;
    justify-content: center;
    padding: 12px 20px;
    font-size: 0.9rem;
  }


}

/* Cabina principal */
.header-embarque {
  position: relative;
  overflow: hidden;
  margin: 0 0 12px;
  padding: 9px 11px;
  text-align: left;
  color: #e8eef9;
  border: 1px solid rgba(148, 163, 184, .17);
  border-radius: 14px;
  background: linear-gradient(125deg, rgba(18, 30, 52, .95), rgba(8, 15, 29, .9));
  box-shadow: 0 28px 70px rgba(0, 0, 0, .35), inset 0 1px rgba(255, 255, 255, .08);
  backdrop-filter: blur(24px);
}

.header-embarque::before {
  content: '';
  position: absolute;
  top: -140px;
  right: -80px;
  width: 360px;
  height: 360px;
  border: 1px solid rgba(56, 217, 255, .15);
  border-radius: 50%;
  box-shadow: 0 0 80px rgba(56, 217, 255, .08), inset 0 0 80px rgba(139, 92, 246, .06);
  pointer-events: none;
  animation: radar-drift 12s ease-in-out infinite alternate;
}

.header-embarque::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(110deg, transparent 38%, rgba(255, 255, 255, .045) 48%, transparent 58%);
  transform: translateX(-120%);
  animation: panel-scan 8s ease-in-out infinite;
}

.header-hero,
.botones,
.botones-accion,
.datos-operacion {
  position: relative;
  z-index: 1;
}

.header-hero {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}

.titulo-embarque { margin-right: auto; }

.titulo-embarque h1 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: #f8fbff;
  font-size: clamp(1.05rem, 1.8vw, 1.35rem);
  font-weight: 780;
  letter-spacing: -.045em;
  line-height: 1;
}

.titulo-icono {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: #06101c;
  font-size: .72rem;
  border-radius: 8px;
  background: linear-gradient(135deg, #b8f4ff, #38d9ff 55%, #8b5cf6);
  box-shadow: 0 0 32px rgba(56, 217, 255, .32);
}

.estado-operacion {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: auto;
  padding: 5px 8px;
  border: 1px solid rgba(148, 163, 184, .15);
  border-radius: 999px;
  background: rgba(3, 8, 18, .42);
  box-shadow: inset 0 1px rgba(255,255,255,.04);
}

.estado-punto {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 5px rgba(74, 222, 128, .1), 0 0 18px #4ade80;
  animation: status-pulse 2.2s ease-out infinite;
}

.estado-punto--alerta {
  background: #fb7185;
  box-shadow: 0 0 0 5px rgba(251, 113, 133, .1), 0 0 18px #fb7185;
}

.estado-operacion strong {
  color: #e8eef9;
  font-size: .66rem;
  letter-spacing: .02em;
}

.botones {
  justify-content: flex-start;
  gap: 5px;
  margin: 0;
}

.btn-volver,
.btn-bloqueo,
.btn-configuracion-medidas,
.btn {
  min-height: 30px;
  padding: 5px 8px;
  font-size: .72rem;
  line-height: 1;
  color: #dbe7f8;
  border: 1px solid rgba(148, 163, 184, .17);
  border-radius: 8px;
  background: rgba(20, 33, 55, .78);
  box-shadow: inset 0 1px rgba(255,255,255,.06);
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease, background .2s ease;
}

.btn-volver:hover,
.btn-bloqueo:hover,
.btn-configuracion-medidas:hover,
.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  color: #fff;
  border-color: rgba(56, 217, 255, .5);
  background: rgba(28, 48, 78, .95);
  box-shadow: 0 8px 24px rgba(0,0,0,.22), 0 0 18px rgba(56,217,255,.08);
}

.btn-bloqueo,
.btn-bloqueo.bloqueado,
.btn-configuracion-medidas { background: rgba(20, 33, 55, .78); }

.btn-bloqueo:not(.bloqueado) i { color: #4ade80; }
.btn-bloqueo.bloqueado i { color: #fb7185; }
.btn-configuracion-medidas i { color: #38d9ff; }

.botones-accion {
  justify-content: flex-start;
  gap: 5px;
  margin: 4px 0 5px;
  padding: 5px;
  border: 1px solid rgba(148, 163, 184, .12);
  border-radius: 10px;
  background: rgba(3, 8, 18, .32);
}

.btn-info,
.btn-success,
.btn-warning,
.btn-multi-notas {
  color: #dbe7f8;
  background: rgba(20, 33, 55, .78);
}

.btn-info i { color: #38d9ff; }
.btn-success i { color: #4ade80; }
.btn-warning i { color: #fbbf24; }
.btn-multi-notas i { color: #c4b5fd; }

/* El ancho permanece estable en Guardado / Subir cambios / Subiendo para
   que los botones vecinos y las secciones inferiores no se desplacen. */
.btn-sync {
  min-width: 138px;
  justify-content: center;
}

.btn-sincronizado {
  color: #a7f3d0;
  background: rgba(16, 185, 129, .1);
  box-shadow: inset 0 0 0 1px rgba(74, 222, 128, .28), inset 0 1px rgba(255,255,255,.06);
}

.btn-sincronizado i { color: #4ade80; }

.btn-sincronizado:disabled {
  opacity: 1;
  cursor: default;
}

.datos-operacion {
  margin: 0;
  padding: 5px;
  border: 1px solid rgba(148, 163, 184, .13);
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(17, 29, 49, .72), rgba(9, 18, 34, .58));
}

.header-row {
  justify-content: flex-start;
  align-items: stretch;
  gap: 6px;
  margin: 0;
}

.fecha-selector,
.carga-selector {
  flex: 1 1 260px;
  align-items: center;
  gap: 7px;
  padding: 5px 7px;
  border: 1px solid rgba(148, 163, 184, .13);
  border-radius: 8px;
  background: rgba(2, 8, 18, .42);
}

.selector-icono {
  display: grid;
  width: 25px;
  height: 25px;
  flex: 0 0 25px;
  place-items: center;
  color: #38d9ff;
  border: 1px solid rgba(56,217,255,.2);
  border-radius: 7px;
  background: rgba(56,217,255,.08);
}

.selector-campo { width: 100%; }

.selector-campo label {
  display: block;
  margin: 0 0 2px;
  color: #71839f;
  font-size: .53rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.form-control {
  width: 100%;
  min-width: 0;
  padding: 0;
  color: #eef5ff;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: .78rem;
  font-weight: 650;
}

.form-control option { color: #111827; }

@keyframes radar-drift {
  to { transform: translate(-28px, 20px) scale(1.08); }
}

@keyframes panel-scan {
  0%, 55% { transform: translateX(-120%); }
  80%, 100% { transform: translateX(120%); }
}

@keyframes status-pulse {
  70% { box-shadow: 0 0 0 11px transparent, 0 0 18px currentColor; }
  100% { box-shadow: 0 0 0 0 transparent, 0 0 18px currentColor; }
}

@media (max-width: 768px) {
  .header-hero {
    align-items: center;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .estado-operacion { width: auto; }
  .botones-accion { flex-direction: row; align-items: stretch; }
  .botones-accion .btn { width: auto; flex: 1 1 160px; }
  .fecha-selector,
  .carga-selector {
    width: 100%;
    min-height: 42px;
    flex: 0 0 auto;
    flex-direction: row;
  }
}

</style>
