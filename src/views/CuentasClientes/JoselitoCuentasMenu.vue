<template>
  <div class="joselito-cuentas-menu-container">
    <h1>Menú de Cuentas Joselito</h1>
    
    <div class="actions-container">
      <router-link to="/cuentas-mexico" class="action-button back-btn">
        Cuentas México
      </router-link>
      <router-link to="/cuentas-joselito/nueva" class="action-button new-cuenta-btn">
        Nueva Cuenta
      </router-link>
      <router-link to="/ventas-ganancias-joselito" class="action-button ventas-ganancias-btn">
        Ventas y Ganancias
      </router-link>
      <button @click="showAbonosModal = true" class="action-button abonos-btn">
        Abonos
      </button>
      <PreciosHistorialModal clienteActual="joselito" />
      <StashModalV2 cliente="joselito" />
    </div>

    <!-- Modal de Abonos -->
    <div v-if="showAbonosModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Historial de Abonos</h2>
          <button @click="showAbonosModal = false" class="close-modal-btn">&times;</button>
        </div>
        
        <div class="fecha-filtros">
          <div class="fecha-grupo">
            <label>Desde:</label>
            <input 
              type="date" 
              v-model="fechaInicio" 
              class="fecha-input"
              @change="calcularTotalAbonos"
            >
          </div>
          <div class="fecha-grupo">
            <label>Hasta:</label>
            <input 
              type="date" 
              v-model="fechaFin" 
              class="fecha-input"
              @change="calcularTotalAbonos"
            >
          </div>
        </div>

        <div v-if="totalAbonosPeriodo !== null" class="total-abonos">
          <span class="total-label">Total de abonos en el periodo:</span>
          <span class="total-monto">${{ formatNumber(totalAbonosPeriodo) }}</span>
        </div>

        <div class="abonos-list">
          <div v-if="abonosHistorial.length === 0" class="no-records">
            No hay abonos registrados.
          </div>
          <div v-else>
            <div v-for="(abono, index) in abonosHistorial" :key="index" class="abono-item">
              <div class="abono-fecha">{{ formatDate(abono.fecha) }}</div>
              <div class="abono-details">
                <span class="abono-monto">${{ formatNumber(abono.monto) }}</span>
                <span class="abono-descripcion">{{ abono.descripcion }}</span>
              </div>
            </div>
          </div>
        </div>
        <button @click="showAbonosModal = false" class="close-btn">Cerrar</button>
      </div>
    </div>

    <div class="cuentas-list">
      <h2>Registros de Cuentas</h2>
      <div v-if="error" class="error-message">
        Error al cargar los datos: {{ error }}
      </div>
      <div v-else-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="cuentas.length === 0" class="no-records">
        No hay registros de cuentas que coincidan con el filtro.
      </div>
      <ul v-else>
        <li v-for="cuenta in cuentas" 
            :key="cuenta.id" 
            class="cuenta-item"
            :class="{ 
              'tiene-observacion': cuenta.tieneObservacion,
              'cuenta-sin-nota': cuenta.missingNota
            }">
          <div class="cuenta-content">
            <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
            <p class="cuenta-summary">
              <span v-if="!cuenta.missingNota">Saldo Hoy: ${{ formatNumber(cuenta.saldoHoy) }}</span>
              <span v-else class="texto-sin-nota">Sin nota registrada</span>
              <span v-if="!cuenta.missingNota">Total Acumulado: ${{ formatNumber(cuenta.totalNota) }}</span>
            </p>
            <div v-if="cuenta.tieneObservacion" class="observacion-badge" @click="mostrarObservacion(cuenta)">
              Ver observación
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
            <button v-if="!cuenta.missingNota" @click="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>  
            <button v-if="!cuenta.missingNota" @click="borrarCuenta(cuenta.id)" class="delete-btn">Borrar</button>
            <button
              v-else
              class="nota-pendiente-hint"
              type="button"
              :disabled="creatingFecha === normalizarFechaValor(cuenta.fecha)"
              @click="crearNota(cuenta.fecha)"
            >
              {{ creatingFecha === normalizarFechaValor(cuenta.fecha) ? 'Creando...' : 'Crear nota' }}
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Modal para mostrar observación -->
    <div v-if="showObservacionModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Observación</h3>
        <p class="observacion-text">{{ observacionActual }}</p>
        <div class="modal-buttons">
          <button @click="showObservacionModal = false" class="btn-cerrar">Cerrar</button>
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
import { collection, query, orderBy, deleteDoc, doc, onSnapshot, updateDoc, getDocs, where, limit } from 'firebase/firestore';
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModalV2 from '@/components/StashModalV2.vue';

export default {
  name: 'JoselitoCuentasMenu',
  components: {
    BackButton,
    PreciosHistorialModal,
    StashModalV2
  },
  data() {
    return {
      cuentas: [],
      isLoading: true,
      unsubscribe: null,
      error: null,
      showAbonosModal: false,
      fechaInicio: '',
      fechaFin: '',
      totalAbonosPeriodo: null,
      abonosHistorial: [],
      showObservacionModal: false,
      observacionActual: '',
      lastSaveMessage: '',
      showSaveMessage: false,
      saveMessageTimer: null,
      creatingFecha: null
    };
  },
  methods: {
    normalizarFechaValor(valor) {
      if (!valor) return null;
      try {
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
        if (valor.seconds) {
          const d = new Date(valor.seconds * 1000);
          return d.toISOString().split('T')[0];
        }
        if (valor instanceof Date) {
          return valor.toISOString().split('T')[0];
        }
        const d = new Date(valor);
        if (!Number.isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (_) {
        return null;
      }
      return null;
    },
    async loadCuentas() {
      try {
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasJoselito');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));
        
        // Usar onSnapshot para actualizaciones en tiempo real
        this.unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const cuentasActualizadas = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const fechaNormalizada = this.normalizarFechaValor(data.fecha);
            const totalCobros = (data.cobros || []).reduce((sum, cobro) => 
              sum + (parseFloat(cobro.monto) || 0), 0);
            const totalAbonos = (data.abonos || []).reduce((sum, abono) => 
              sum + (parseFloat(abono.monto) || 0), 0);

            return {
              id: doc.id,
              fecha: fechaNormalizada || data.fecha,
              saldoHoy: data.totalGeneralVenta || 0,
              totalCobros,
              totalAbonos,
              totalNota: data.nuevoSaldoAcumulado || 0,
              nuevoSaldoAcumulado: data.nuevoSaldoAcumulado || 0,
              saldoAcumuladoAnterior: data.saldoAcumuladoAnterior || 0,
              abonos: data.abonos || [],
              tieneObservacion: data.tieneObservacion || false,
              observacion: data.observacion || ''
            };
          });

          // Ordenar las cuentas por fecha
          const cuentasOrdenadas = cuentasActualizadas.sort((a, b) => 
            new Date(a.fecha) - new Date(b.fecha)
          );

          let saldoAcumulado = 0;
          const actualizaciones = [];

          // Procesar cada cuenta y preparar las actualizaciones
          for (let i = 0; i < cuentasOrdenadas.length; i++) {
            const cuenta = cuentasOrdenadas[i];
            const totalDia = cuenta.saldoHoy - cuenta.totalCobros - cuenta.totalAbonos;
            saldoAcumulado += totalDia;

            const saldoAnterior = i === 0 ? 0 : cuentasOrdenadas[i-1].nuevoSaldoAcumulado;
            
            if (cuenta.saldoAcumuladoAnterior !== saldoAnterior || 
                cuenta.nuevoSaldoAcumulado !== saldoAcumulado) {
              
              actualizaciones.push({
                id: cuenta.id,
                updates: {
                  saldoAcumuladoAnterior: saldoAnterior,
                  nuevoSaldoAcumulado: saldoAcumulado
                }
              });
            }

            cuenta.totalNota = saldoAcumulado;
            cuenta.saldoAcumuladoAnterior = saldoAnterior;

            if (saldoAcumulado <= 0) {
              saldoAcumulado = 0;
            }
          }

          if (actualizaciones.length > 0) {
            await Promise.all(actualizaciones.map(({ id, updates }) => 
              updateDoc(doc(db, 'cuentasJoselito', id), updates)
            ));
          }

          // Buscar embarques de Joselito que no tengan nota
          const fechasConNota = new Set(cuentasOrdenadas.map(c => this.normalizarFechaValor(c.fecha)));
          const embarquesRef = collection(db, 'embarques');
          const embarquesSnapshot = await getDocs(query(embarquesRef, orderBy('fecha', 'desc'), limit(200)));

          const faltantes = [];
          embarquesSnapshot.forEach(docSnap => {
            const data = docSnap.data() || {};
            const fechaEmbarque = this.normalizarFechaValor(data.fecha);
            if (!fechaEmbarque || fechasConNota.has(fechaEmbarque)) return;

            const clientes = data.clientes || [];
            const productosRaiz = data.productos || [];

            const tieneJoselito = clientes.some(cliente => {
              const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
              const nombreCliente = (cliente.nombre || '').toLowerCase();
              const esJoselito = clienteId === '1' || nombreCliente.includes('joselito');
              const tieneProductos = Array.isArray(cliente.productos) && cliente.productos.some(p => p && (p.medida || (Array.isArray(p.kilos) && p.kilos.some(k => Number(k) > 0))));
              const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
              return esJoselito && (tieneProductos || tieneCrudos);
            }) || productosRaiz.some(producto => {
              const clienteId = (producto.clienteId ?? producto.cliente ?? '').toString();
              const tieneContenido = producto && (producto.medida || (Array.isArray(producto.kilos) && producto.kilos.some(k => Number(k) > 0)));
              return clienteId === '1' && tieneContenido;
            });

            if (tieneJoselito) {
              faltantes.push({
                id: `missing-${fechaEmbarque}`,
                fecha: fechaEmbarque,
                saldoHoy: 0,
                totalCobros: 0,
                totalAbonos: 0,
                totalNota: 0,
                nuevoSaldoAcumulado: 0,
                saldoAcumuladoAnterior: 0,
                abonos: [],
                tieneObservacion: false,
                observacion: '',
                missingNota: true
              });
            }
          });

          const consolidadas = [...cuentasOrdenadas, ...faltantes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          this.cuentas = consolidadas;
          this.isLoading = false;
        });

      } catch (error) {
        console.error("Error al cargar cuentas: ", error);
        this.error = error.message;
        this.cuentas = [];
        this.isLoading = false;
      }
    },
    formatDate(date) {
      const fechaLocal = new Date(date);
      fechaLocal.setMinutes(fechaLocal.getMinutes() + fechaLocal.getTimezoneOffset());
      return fechaLocal.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    formatNumber(value) {
      return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    editarCuenta(id) {
      this.$router.push(`/cuentas-joselito/${id}?edit=true`);
    },
    mapProductosConNombreAlternativo(productos = []) {
      return (productos || []).map(prod => {
        // Respetar exactamente los espacios definidos en el nombre alternativo
        // sin recortes ni trims.
        const nombreAlt = prod.nombreAlternativoPDF
          ?? prod.nombreAlternativo
          ?? prod.medidaMostrar
          ?? prod.displayMedida
          ?? null;
        const medidaFinal = (nombreAlt !== undefined && nombreAlt !== null)
          ? nombreAlt
          : prod.medida;
        return {
          ...prod,
          medida: medidaFinal,
          medidaOriginal: medidaFinal
        };
      });
    },
    async crearNota(fecha) {
      const fechaNormalizada = this.normalizarFechaValor(fecha) || new Date().toISOString().split('T')[0];
      if (this.creatingFecha === fechaNormalizada) return;

      this.creatingFecha = fechaNormalizada;
      try {
        const embarquesRef = collection(db, 'embarques');
        // Consulta amplia para evitar problemas de tipo (Timestamp vs string)
        const embarquesSnapshot = await getDocs(query(embarquesRef, orderBy('fecha', 'desc'), limit(300)));
        const embarqueDoc = embarquesSnapshot.docs.find(docSnap => {
          const data = docSnap.data() || {};
          return this.normalizarFechaValor(data.fecha) === fechaNormalizada;
        });

        if (!embarqueDoc) {
          alert('No se encontró un embarque para esta fecha. Crea la nota manualmente.');
          return;
        }

        const data = embarqueDoc.data() || {};
        const clientes = data.clientes || [];
        const clienteJoselito = clientes.find(cliente => {
          const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
          const nombreCliente = (cliente.nombre || '').toLowerCase();
          const esJoselito = clienteId === '1' || nombreCliente.includes('joselito');
          const tieneProductos = Array.isArray(cliente.productos) && cliente.productos.some(p => p && (p.medida || (Array.isArray(p.kilos) && p.kilos.some(k => Number(k) > 0))));
          const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
          return esJoselito && (tieneProductos || tieneCrudos);
        });

        const productosJoselito = this.mapProductosConNombreAlternativo(clienteJoselito?.productos || []);
        const crudosJoselito = clienteJoselito?.crudos || [];

        const clienteCrudosTotales = data.clienteCrudos || data.clientesCrudos || {};
        const embarqueCliente = {
          ...data,
          fecha: fechaNormalizada,
          productos: productosJoselito,
          clienteCrudos: { '1': crudosJoselito },
          productosTotales: data.productos || [],
          clienteCrudosTotales: Object.keys(clienteCrudosTotales).length ? clienteCrudosTotales : { '1': crudosJoselito },
          costosPorMedida: data.costosPorMedida || {},
          aplicarCostoExtra: data.aplicarCostoExtra || {},
          costoExtra: data.costoExtra
        };

        await EmbarqueCuentasService.crearCuentaJoselito(embarqueCliente, this.$router);

        if (this.lastSaveMessage !== 'Cuenta creada desde embarque y abierta en nueva pestaña' || !this.showSaveMessage) {
          this.lastSaveMessage = 'Cuenta creada desde embarque y abierta en nueva pestaña';
          this.showSaveMessage = true;
          if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
          this.saveMessageTimer = setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
        }
      } catch (error) {
        console.error('Error al crear la nota desde embarque:', error);
        alert(`No se pudo crear la nota desde el embarque: ${error.message || error}`);
      } finally {
        this.creatingFecha = null;
      }
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasJoselito', id));
          if (this.lastSaveMessage !== 'Registro de cuenta borrado con éxito' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Registro de cuenta borrado con éxito';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        } catch (error) {
          console.error("Error al borrar el registro de cuenta: ", error);
          if (this.lastSaveMessage !== 'Error al borrar el registro de cuenta' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Error al borrar el registro de cuenta';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        }
      }
    },
    calcularTotalAbonos() {
      if (!this.fechaInicio || !this.fechaFin) {
        this.totalAbonosPeriodo = null;
        return;
      }

      const inicio = new Date(this.fechaInicio);
      const fin = new Date(this.fechaFin);
      
      // Ajustar fin al final del día
      fin.setHours(23, 59, 59, 999);

      const abonosFiltrados = this.abonosHistorial.filter(abono => {
        const fechaAbono = new Date(abono.fecha);
        return fechaAbono >= inicio && fechaAbono <= fin;
      });

      this.totalAbonosPeriodo = abonosFiltrados.reduce((total, abono) => 
        total + (parseFloat(abono.monto) || 0), 0);
    },
    async cargarHistorialAbonos() {
      try {
        const cuentasRef = collection(db, 'cuentasJoselito');
        const querySnapshot = await getDocs(cuentasRef);
        
        let todosLosAbonos = [];
        querySnapshot.forEach(doc => {
          const cuenta = doc.data();
          if (cuenta.abonos && cuenta.abonos.length > 0) {
            cuenta.abonos.forEach(abono => {
              todosLosAbonos.push({
                ...abono,
                fecha: cuenta.fecha
              });
            });
          }
        });

        // Ordenar abonos por fecha, del más reciente al más antiguo
        this.abonosHistorial = todosLosAbonos.sort((a, b) => 
          new Date(b.fecha) - new Date(a.fecha)
        );

        // Recalcular total si hay fechas seleccionadas
        if (this.fechaInicio && this.fechaFin) {
          this.calcularTotalAbonos();
        }
      } catch (error) {
        console.error("Error al cargar historial de abonos:", error);
      }
    },
    mostrarObservacion(cuenta) {
      this.observacionActual = cuenta.observacion;
      this.showObservacionModal = true;
    }
  },
  watch: {
    showAbonosModal(newValue) {
      if (newValue) {
        this.cargarHistorialAbonos();
      }
    }
  },
  created() {
    this.loadCuentas();
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
};
</script>

<style scoped>
.joselito-cuentas-menu-container {
  max-width: 800px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1, h2 {
  color: #2196F3;
  text-align: center;
}

.actions-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 30px 0;
  flex-wrap: wrap;
}

.action-button {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  transition: all 0.3s ease;
  min-width: 160px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  background-color: #1976D2;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.back-btn {
  background-color: #6c757d;
}

.back-btn:hover {
  background-color: #5a6268;
}

.new-cuenta-btn {
  background-color: #2196F3;
}

.new-cuenta-btn:hover {
  background-color: #1976D2;
}

.ventas-ganancias-btn {
  background-color: #4CAF50;
}

.ventas-ganancias-btn:hover {
  background-color: #45a049;
}

.abonos-btn {
  background-color: #FF9800;
}

.abonos-btn:hover {
  background-color: #F57C00;
}

@media (max-width: 768px) {
  .actions-container {
    flex-direction: column;
    gap: 10px;
    padding: 0 15px;
  }

  .action-button {
    width: 100%;
    min-width: unset;
    padding: 15px;
  }
}

.cuentas-list {
  background-color: #f0f4f8;
  border-radius: 8px;
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

.cuenta-item.cuenta-sin-nota {
  background: #f2f2f2;
  border-left: 4px solid #bdbdbd;
}

.cuenta-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.cuenta-content {
  margin-bottom: 10px;
}

.cuenta-date {
  color: #2196F3;
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

.texto-sin-nota {
  color: #666;
  font-weight: 600;
}

.nota-pendiente-hint {
  color: #2196F3;
  font-weight: 700;
  align-self: center;
  background: #e6f3ff;
  border: 1px dashed #64b5f6;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;
  text-align: center;
}

.nota-pendiente-hint[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.nota-pendiente-hint:hover,
.nota-pendiente-hint:focus {
  background: #d6eaff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transform: translateY(-1px);
}

.nota-pendiente-hint:active {
  transform: translateY(0);
}

.nota-pendiente-hint:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .nota-pendiente-hint {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .joselito-cuentas-menu-container {
    padding: 10px;
    width: 100%;
  }

  .actions-container {
    flex-direction: column;
    gap: 10px;
  }

  .action-button {
    width: 100%;
    text-align: center;
  }

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

.ventas-ganancias-btn {
  background-color: #4CAF50;
}

.ventas-ganancias-btn:hover {
  background-color: #45a049;
}

.error-message {
  color: #f44336;
  text-align: center;
  padding: 10px;
  margin: 10px 0;
  background-color: #ffebee;
  border-radius: 4px;
}

.abonos-info {
  margin-top: 10px;
  padding: 5px 0;
}

.abono-detail {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 5px 0;
  font-size: 0.9em;
  color: #2196F3;
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

.modal {
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
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #2196F3;
}

.modal-header h2 {
  margin: 0;
  color: #000000;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.fecha-filtros {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.fecha-grupo {
  flex: 1;
}

.fecha-grupo label {
  display: block;
  margin-bottom: 5px;
  color: #666;
}

.fecha-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.total-abonos {
  background-color: #e8f5e9;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-weight: bold;
  color: #2e7d32;
}

.total-monto {
  font-size: 1.2em;
  font-weight: bold;
  color: #2e7d32;
}

.abonos-list {
  margin-bottom: 20px;
}

.abono-item {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.abono-fecha {
  font-weight: bold;
  color: #000000;
  margin-bottom: 5px;
}

.abono-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.abono-monto {
  color: #4CAF50;
  font-weight: bold;
  font-size: 1.1em;
}

.abono-descripcion {
  color: #666;
  font-style: italic;
}

.close-btn {
  width: 100%;
  padding: 10px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.close-btn:hover {
  background-color: #5a6268;
}

.no-records {
  text-align: center;
  color: #666;
  padding: 20px;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .fecha-filtros {
    flex-direction: column;
    gap: 10px;
  }

  .abono-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}

.tiene-observacion {
  border: 2px solid #ff0000 !important;
}

.observacion-badge {
  background-color: #ff0000;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
  display: inline-block;
  margin-top: 8px;
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