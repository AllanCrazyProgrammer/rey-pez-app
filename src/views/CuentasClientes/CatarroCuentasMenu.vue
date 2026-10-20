<template>
  <div class="catarro-cuentas-menu-container">
    <router-link to="/cuentas-mexico" class="action-button menu-regresar">
      <span aria-hidden="true">←</span> Cuentas México
    </router-link>
    <header class="menu-encabezado">
      <h1>Cuentas de Catarro</h1>
      <router-link to="/cuentas-catarro/nueva" class="action-button new-cuenta-btn">
        <span aria-hidden="true">+</span> Nueva Cuenta
      </router-link>
    </header>

    <DeudasCatarro :saldo-cuentas-centavos="saldoCuentasCentavos" :cargando-cuentas="isLoading"
      :error-cuentas="!!errorCuentas" @seleccion="pestanaActiva = $event">
      <template v-slot:acciones>
        <button type="button" class="ver-abonos-btn" @click="mostrarAbonos = true">Ver abonos</button>
      </template>
    </DeudasCatarro>

    <ModalAbonosCatarro v-if="mostrarAbonos" :cuentas="cuentas" @cerrar="mostrarAbonos = false" />

    <div v-show="pestanaActiva === 'actuales'" id="cuentas-actuales-catarro" role="tabpanel" aria-labelledby="pestana-catarro-actuales">
    <div class="cuentas-list card">
    <div class="registros-encabezado">
      <h2>Registros de Cuentas</h2>
      <div class="filter-container">
      <label for="filter-select">Filtrar por estado:</label>
      <select id="filter-select" v-model="filtroEstado">
        <option value="todas">Todas</option>
        <option value="pagadas">Pagadas</option>
        <option value="no-pagadas">No Pagadas</option>
        <option value="sin-nota">Sin cuenta</option>
      </select>
      </div>
    </div>
      <p v-if="cargandoEmbarques" class="loading">Buscando cuentas faltantes desde el 15 de octubre de 2026…</p>
      <p v-if="errorEmbarques" class="error-pendientes" role="alert">
        No se pudieron consultar las cuentas faltantes.
        <button type="button" @click="escucharEmbarques">Reintentar</button>
      </p>
      <p v-if="errorCreacion" class="error-pendientes" role="alert">{{ errorCreacion }}</p>
      <div v-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="cuentasFiltradas.length === 0" class="no-records">
        No hay registros de cuentas que coincidan con el filtro.
      </div>
      <ul v-else>
        <li v-for="cuenta in cuentasPaginadas" :key="cuenta.id" class="cuenta-item" :class="{ 'cuenta-sin-nota': cuenta.missingNota, 'tiene-observacion': cuenta.tieneObservacion || (cuenta.observacion && cuenta.observacion.trim().length) }">
          <div class="cuenta-content">
            <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
            <p v-if="cuenta.missingNota" class="texto-sin-nota">Sin cuenta registrada</p>
            <p v-else class="cuenta-summary">
              <span>Saldo Hoy: ${{ formatNumber(cuenta.saldoHoy) }}</span>
              <span v-if="cuenta.totalNota > 0">Saldo pendiente: ${{ formatNumber(cuenta.totalNota) }}</span>
            </p>
            <div v-if="cuenta.tieneObservacion || (cuenta.observacion && cuenta.observacion.trim().length)" class="observacion-container">
              <p class="observacion-texto">{{ cuenta.observacion }}</p>
              <button class="delete-observacion-btn" @click="borrarObservacion(cuenta.id)" title="Borrar observación">×</button>
            </div>
            <div v-if="cuenta.abonos && cuenta.abonos.length > 0" class="abonos-info">
              <p v-for="(abono, index) in cuenta.abonos" :key="index" class="abono-detail">
                <span class="abono-label">Abono:</span>
                <span class="abono-monto">${{ formatNumber(abono.monto) }}</span>
                <span class="abono-descripcion">{{ abono.descripcion || 'Sin descripción' }}</span>
              </p>
            </div>
          </div>
          <div class="cuenta-actions">
            <template v-if="!cuenta.missingNota">
              <button @click="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>
              <button @click="borrarCuenta(cuenta.id)" class="delete-btn">Borrar</button>
            </template>
            <button v-else type="button" class="nota-pendiente-hint" :disabled="creatingFecha !== null" @click="crearNota(cuenta.fecha)">
              {{ creatingFecha === cuenta.fecha ? 'Creando...' : 'Crear nota' }}
            </button>
          </div>
        </li>
      </ul>
      <div v-if="totalPaginas > 1" class="pagination-controls">
        <button @click="paginaActual = 1" :disabled="paginaActual === 1" class="pagination-btn">&laquo;</button>
        <button @click="paginaActual--" :disabled="paginaActual === 1" class="pagination-btn">&lsaquo; Anterior</button>
        <span class="pagination-info">{{ paginaActual }} / {{ totalPaginas }}</span>
        <button @click="paginaActual++" :disabled="paginaActual === totalPaginas" class="pagination-btn">Siguiente &rsaquo;</button>
        <button @click="paginaActual = totalPaginas" :disabled="paginaActual === totalPaginas" class="pagination-btn">&raquo;</button>
      </div>
    </div>
    </div>

    <template v-if="showSaveMessage && lastSaveMessage">
      <div class="save-message">
        {{ lastSaveMessage }}
      </div>
    </template>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, orderBy, doc, onSnapshot, where, updateDoc, getDoc } from 'firebase/firestore';
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';
import { normalizarFechaValor } from '@/utils/dateUtils';
import { INICIO_CUENTAS_PENDIENTES_CATARRO, cuentasPendientesCatarro, combinarEmbarquesCatarro } from '@/utils/cuentasPendientesCatarro';
import PapeleraService from '@/services/PapeleraService';
import DeudasCatarro from '@/components/Cuentas/DeudasCatarro.vue';
import ModalAbonosCatarro from '@/components/Cuentas/ModalAbonosCatarro.vue';
import { formatNumber, formatearFecha as formatDate } from '@/utils/formatters';
import { encadenarSaldosCatarro } from '@/utils/saldosCatarro';

export default {
  name: 'CatarroCuentasMenu',
  components: {
    DeudasCatarro,
    ModalAbonosCatarro,
  },
  data() {
    return {
      pestanaActiva: 'actuales',
      cuentas: [],
      embarques: [],
      cargandoEmbarques: true,
      errorEmbarques: false,
      errorCreacion: '',
      creatingFecha: null,
      unsubscribeEmbarques: null,
      isLoading: true,
      errorCuentas: '',
      filtroEstado: 'todas',
      unsubscribe: null,
      lastSaveMessage: '',
      showSaveMessage: false,
      saveMessageTimer: null,
      paginaActual: 1,
      mostrarAbonos: false
    };
  },
  computed: {
    saldoCuentasCentavos() {
      // La primera cuenta es la más reciente y ya incluye las anteriores.
      return Math.max(0, Math.round(Number(this.cuentas[0]?.nuevoSaldoAcumulado || 0) * 100));
    },
    cuentasConPendientes() {
      return [...this.cuentas, ...cuentasPendientesCatarro(this.cuentas, this.embarques)]
        .sort((a, b) => normalizarFechaValor(b.fecha).localeCompare(normalizarFechaValor(a.fecha)));
    },
    cuentasFiltradas() {
      switch (this.filtroEstado) {
        case 'pagadas':
          return this.cuentasConPendientes.filter(cuenta => cuenta.estadoPagado);
        case 'no-pagadas':
          return this.cuentasConPendientes.filter(cuenta => !cuenta.estadoPagado);
        case 'sin-nota':
          return this.cuentasConPendientes.filter(cuenta => cuenta.missingNota);
        default:
          return this.cuentasConPendientes;
      }
    },
    totalPaginas() {
      return Math.max(1, Math.ceil(this.cuentasFiltradas.length / 10));
    },
    cuentasPaginadas() {
      const inicio = (this.paginaActual - 1) * 10;
      return this.cuentasFiltradas.slice(inicio, inicio + 10);
    }
  },
  watch: {
    totalPaginas(total) {
      this.paginaActual = Math.min(this.paginaActual, total);
    },
    filtroEstado() {
      this.paginaActual = 1;
    }
  },
  methods: {
    formatNumber,
    formatDate,
    escucharEmbarques() {
      if (this.unsubscribeEmbarques) this.unsubscribeEmbarques();
      this.cargandoEmbarques = true;
      this.errorEmbarques = false;
      this.unsubscribeEmbarques = onSnapshot(query(collection(db, 'embarques'),
        where('fecha', '>=', INICIO_CUENTAS_PENDIENTES_CATARRO), orderBy('fecha', 'desc')), snapshot => {
        this.embarques = snapshot.docs.map(documento => ({ ...documento.data(), id: documento.id }));
        this.cargandoEmbarques = false;
      }, () => {
        this.errorEmbarques = true;
        this.cargandoEmbarques = false;
      });
    },
    async crearNota(fecha) {
      if (this.creatingFecha) return;
      const fechaNormalizada = normalizarFechaValor(fecha);
      if (!fechaNormalizada || fechaNormalizada < INICIO_CUENTAS_PENDIENTES_CATARRO) return;
      this.creatingFecha = fechaNormalizada;
      this.errorCreacion = '';
      try {
        const fuentes = this.embarques.filter(embarque => normalizarFechaValor(embarque.fecha) === fechaNormalizada);
        const documentos = await Promise.all(fuentes.map(embarque => getDoc(doc(db, 'embarques', embarque.id))));
        const actuales = documentos.filter(documento => documento.exists()).map(documento => documento.data());
        const datos = combinarEmbarquesCatarro(actuales, fechaNormalizada);
        const id = await EmbarqueCuentasService.crearCuentaCatarro(datos, null);
        this.editarCuenta(id);
      } catch (error) {
        this.errorCreacion = error.code === 'cuenta-duplicada'
          ? 'Esta cuenta ya fue creada. Abre la cuenta existente desde la lista.'
          : `No se pudo crear la cuenta: ${error.message || error}`;
      } finally {
        this.creatingFecha = null;
      }
    },
    async loadCuentas() {
      try {
        this.isLoading = true;
        this.errorCuentas = '';
        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));
        
        // Usar onSnapshot para actualizaciones en tiempo real
        // Solo lectura: los saldos se muestran con la cadena compartida y se
        // escriben al guardar una cuenta, no cada vez que se abre el menú.
        this.unsubscribe = onSnapshot(q, (querySnapshot) => {
          const crudas = querySnapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
          const cadena = encadenarSaldosCatarro(crudas);
          this.cuentas = cadena.map((cuenta) => ({
            id: cuenta.id,
            fecha: cuenta.fecha,
            saldoHoy: Number(cuenta.totalGeneralVenta) || 0,
            totalNota: cuenta.nuevoSaldoAcumulado,
            estadoPagado: cuenta.estadoPagado,
            nuevoSaldoAcumulado: cuenta.nuevoSaldoAcumulado,
            saldoAcumuladoAnterior: cuenta.saldoAcumuladoAnterior,
            abonos: cuenta.abonos || [],
            tieneObservacion: cuenta.tieneObservacion || false,
            observacion: cuenta.observacion || '',
          })).sort((a, b) => normalizarFechaValor(b.fecha).localeCompare(normalizarFechaValor(a.fecha)));
          this.isLoading = false;
        }, error => {
          this.errorCuentas = error.message || 'No se pudieron cargar las cuentas.';
          this.isLoading = false;
        });

      } catch (error) {
        console.error("Error al cargar cuentas: ", error);
        this.errorCuentas = error.message;
        this.cuentas = [];
        this.isLoading = false;
      }
    },
    editarCuenta(id) {
      this.$router.push(`/cuentas-catarro/${id}?edit=true`);
    },
    async borrarCuenta(id) {
      const cuenta = this.cuentas.find(c => c.id === id);
      const detalleCuenta = cuenta
        ? `la cuenta del ${this.formatDate(cuenta.fecha)} (Saldo Hoy: $${this.formatNumber(cuenta.saldoHoy)}${cuenta.totalNota > 0 ? `, Saldo pendiente: $${this.formatNumber(cuenta.totalNota)}` : ''})`
        : 'este registro de cuenta';
      if (confirm(`¿Estás seguro de que quieres borrar ${detalleCuenta}?`)) {
        try {
          await PapeleraService.borrarConRespaldo('cuentasCatarro', id, null, 'Borrado manual desde menú de cuentas Catarro');
          if (this.lastSaveMessage !== 'Registro de cuenta borrado con éxito' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Registro de cuenta borrado con éxito';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        } catch (error) {
          console.error('Error al borrar con respaldo:', error);
          if (this.lastSaveMessage !== 'No se pudo completar el borrado. El registro NO fue borrado.' || !this.showSaveMessage) {
            this.lastSaveMessage = 'No se pudo completar el borrado. El registro NO fue borrado.';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        }
      }
    },
    async borrarObservacion(id) {
      if (confirm('¿Estás seguro de que quieres borrar esta observación?')) {
        try {
          await updateDoc(doc(db, 'cuentasCatarro', id), {
            tieneObservacion: false,
            observacion: ''
          });
          if (this.lastSaveMessage !== 'Observación borrada con éxito' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Observación borrada con éxito';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        } catch (error) {
          console.error("Error al borrar la observación: ", error);
          if (this.lastSaveMessage !== 'Error al borrar la observación' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Error al borrar la observación';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        }
      }
    }
  },
  mounted() {
    this.loadCuentas();
    this.escucharEmbarques();
  },
  beforeDestroy() {
    // Limpiar el listener cuando el componente se desmonte
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.unsubscribeEmbarques) this.unsubscribeEmbarques();
    if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
  }
};
</script>

<style scoped>
.catarro-cuentas-menu-container {
  box-sizing: border-box;
  max-width: 1000px;
  width: calc(100% - 32px);
  margin: 24px auto;
  padding: 24px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  background: #e9edf2;
  border: 1px solid #c5cdd6;
  border-top: 5px solid #a41021;
  border-radius: 14px;
  color: #243047;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.menu-encabezado { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.menu-encabezado h1 { margin: 0; color: #8e1424; font-size: clamp(25px, 3vw, 32px); line-height: 1.2; letter-spacing: -.5px; text-align: left; }
h2 { color: #243047; }
.action-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-sizing: border-box; min-height: 44px; padding: 10px 16px; border: 1px solid #a41021; border-radius: 7px; font-size: 14px; font-weight: 600; line-height: 1.2; cursor: pointer; text-decoration: none; text-align: center; background: #a41021; color: #fff; transition: background-color .2s; }
.menu-encabezado .new-cuenta-btn:hover { background: #7f0f1d; }
.menu-regresar { align-self: flex-start; margin-bottom: 16px; background: #fff; color: #243047; border-color: #a3afbe; }
.menu-regresar:hover { background: #243047; color: #fff; }
.menu-regresar span { font-size: 20px; line-height: 1; }
.action-button:focus-visible { outline: 3px solid #a41021; outline-offset: 3px; }
.ver-abonos-btn { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; min-height: 40px; color: #a41021; background: #fff; border: 1px solid #a41021; border-radius: 7px; padding: 9px 14px; font-size: 13px; font-weight: 700; line-height: 1.2; cursor: pointer; }
.ver-abonos-btn:hover { background: #a41021; color: #fff; }
.ver-abonos-btn:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
@media (max-width: 600px) {
  .ver-abonos-btn { width: 100%; }
}
.registros-encabezado { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
.registros-encabezado h2 { margin: 0; font-size: 21px; }
.registros-encabezado .filter-container { display: flex; align-items: center; gap: 10px; margin: 0; text-align: left; font-size: 13px; }
.registros-encabezado select { min-height: 38px; padding: 6px 10px; background: #fff; color: #243047; border: 1px solid #a3afbe; border-radius: 6px; }
.cuentas-list > ul { margin: 0; padding: 0; list-style: none; }

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 16px;
}

.cuentas-list {
  background: #fff;
  border: 1px solid #c5cdd6;
  border-radius: 10px;
  padding: 20px;
  flex-grow: 1;
}

.loading, .no-records {
  text-align: center;
  color: #666;
  padding: 20px;
}

.cuenta-item {
  background-color: white;
  border-radius: 4px;
  margin-bottom: 15px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.3s ease;
}

.cuenta-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.cuenta-item.cuenta-sin-nota { background: #f2f2f2; border-left: 4px solid #bdbdbd; }
.texto-sin-nota { color: #666; font-weight: 600; }
.error-pendientes { color: #b71c1c; }
.nota-pendiente-hint { color: #b71c1c; font-weight: 700; background: #fff2e6; border: 1px dashed #d32f2f; border-radius: 8px; padding: 8px 14px; cursor: pointer; min-width: 140px; }
.nota-pendiente-hint:disabled { opacity: 0.7; cursor: not-allowed; }

.cuenta-content {
  margin-bottom: 10px;
}

.cuenta-date {
  color: #d32f2f;
  font-weight: bold;
  font-size: 1.1em;
  display: block;
  margin-bottom: 5px;
}

.cuenta-summary {
  font-size: 0.9em;
  color: #666;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cuenta-summary span {
  flex: 1 1 auto;
}

.cuenta-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.edit-btn, .delete-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease;
}

.edit-btn {
  background-color: #4CAF50;
  color: white;
}

.edit-btn:hover {
  background-color: #45a049;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

@media (max-width: 768px) {
  .catarro-cuentas-menu-container {
    padding: 10px;
    width: 100%;
  }

  .menu-encabezado { align-items: flex-start; }
  .menu-encabezado .new-cuenta-btn { width: auto; }
  .registros-encabezado { align-items: flex-start; }
  .registros-encabezado .filter-container { flex-wrap: wrap; }
  .cuentas-list { padding: 14px; }


  .cuenta-item {
    padding: 10px;
  }

  .cuenta-date {
    font-size: 1em;
  }

  .cuenta-summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .cuenta-summary span {
    width: 100%;
  }

  .cuenta-actions {
    flex-direction: row;
    justify-content: space-between;
  }

  .edit-btn, .delete-btn {
    padding: 8px 15px;
    font-size: 0.8em;
    flex-grow: 1;
  }
}

.filter-container {
  margin-bottom: 20px;
  text-align: right;
}

.filter-container select {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.ventas-ganancias-btn {
  background-color: #4CAF50;
}

.ventas-ganancias-btn:hover {
  background-color: #45a049;
}

.abonos-info {
  margin: 10px 0;
  padding: 5px 0;
}

.abono-detail {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 5px 0;
  font-size: 0.9em;
  color: #d32f2f;
}

.abono-label {
  font-weight: bold;
}

.abono-monto {
  color: #4CAF50;
  font-weight: bold;
}

.abono-descripcion {
  color: #666;
  font-style: italic;
}

@media (max-width: 768px) {
  .abono-detail {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}

.tiene-observacion {
  border: 2px solid #ff0000 !important;
}

.observacion-container {
  margin: 10px 0;
  padding: 10px;
  background-color: #fff3f3;
  border-left: 4px solid #ff0000;
  border-radius: 4px;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.observacion-texto {
  margin: 0;
  flex-grow: 1;
  white-space: pre-wrap;
  color: #d32f2f;
  font-size: 0.9em;
}

.delete-observacion-btn {
  background: none;
  border: none;
  color: #ff0000;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.delete-observacion-btn:hover {
  background-color: rgba(255, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .observacion-container {
    padding: 8px;
    margin: 8px 0;
  }
  
  .observacion-texto {
    font-size: 0.85em;
  }
  .pagination-controls {
    gap: 6px;
  }
  .pagination-btn {
    padding: 6px 10px;
    font-size: 13px;
  }
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.pagination-btn {
  background-color: #d32f2f;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s ease;
}

.pagination-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.pagination-btn:not(:disabled):hover {
  background-color: #b71c1c;
}

.pagination-info {
  font-weight: 700;
  font-size: 15px;
  color: #d32f2f;
  min-width: 60px;
  text-align: center;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.observacion-text {
  margin: 15px 0;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  white-space: pre-wrap;
}

.btn-cerrar {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
}

.save-message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 15px;
  z-index: 2000;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  max-width: 90vw;
  text-align: center;
}
</style>
