<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content historial-abonos-modal" @click.stop>
      <div class="modal-header">
        <h2>Historial de Abonos - {{ proveedor?.nombre }}</h2>
        <button @click="$emit('cerrar')" class="close-button">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Filtros y estadísticas -->
        <div class="filtros-container">
          <div class="filtros-row">
            <div class="filtro-grupo">
              <label for="filtroFechaDesde">Desde:</label>
              <input 
                id="filtroFechaDesde" 
                type="date" 
                v-model="filtros.fechaDesde"
                @change="aplicarFiltros"
              >
            </div>
            
            <div class="filtro-grupo">
              <label for="filtroFechaHasta">Hasta:</label>
              <input 
                id="filtroFechaHasta" 
                type="date" 
                v-model="filtros.fechaHasta"
                @change="aplicarFiltros"
              >
            </div>
            
            <div class="filtro-grupo">
              <label for="filtroTipo">Tipo:</label>
              <select id="filtroTipo" v-model="filtros.tipo" @change="aplicarFiltros">
                <option value="">Todos</option>
                <option value="individual">Individual</option>
                <option value="general">Abono General</option>
              </select>
            </div>
            
            <div class="filtro-grupo">
              <button @click="limpiarFiltros" class="btn-limpiar">
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        <!-- Estadísticas -->
        <div class="estadisticas-container">
          <div class="estadistica-card">
            <div class="estadistica-valor">${{ formatNumber(estadisticas.totalAbonos) }}</div>
            <div class="estadistica-label">Total Abonos</div>
          </div>
          
          <div class="estadistica-card">
            <div class="estadistica-valor">{{ estadisticas.cantidadAbonos }}</div>
            <div class="estadistica-label">Cantidad de Abonos</div>
          </div>
          
          <div class="estadistica-card">
            <div class="estadistica-valor">${{ formatNumber(estadisticas.promedioAbono) }}</div>
            <div class="estadistica-label">Promedio por Abono</div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="cargando" class="loading-container">
          <div class="spinner"></div>
          <p>Cargando historial de abonos...</p>
        </div>

        <!-- Lista de abonos -->
        <div v-else-if="abonosFiltrados.length > 0" class="abonos-container">
          <div class="paginacion-info">
            <p>Mostrando {{ (paginaActual - 1) * abonosPorPagina + 1 }} - {{ Math.min(paginaActual * abonosPorPagina, abonosFiltrados.length) }} de {{ abonosFiltrados.length }} abonos</p>
          </div>

          <div class="abonos-list">
            <div 
              v-for="(abono, index) in abonosPaginados" 
              :key="`${abono.deudaId}-${abono.id}`"
              class="abono-item"
              :class="{ 'abono-general': abono.esAbonoGeneral }"
            >
              <div class="abono-header">
                <div class="abono-fecha">
                  <i class="fas fa-calendar-alt"></i>
                  {{ formatearFecha(abono.fecha) }}
                </div>
                <div class="abono-monto">
                  ${{ formatNumber(abono.monto) }}
                </div>
                <div class="abono-tipo">
                  <span :class="abono.esAbonoGeneral ? 'tipo-general' : 'tipo-individual'">
                    {{ abono.esAbonoGeneral ? 'General' : 'Individual' }}
                  </span>
                </div>
                <div class="abono-acciones">
                  <button 
                    @click="confirmarEliminarAbono(abono)" 
                    class="btn-eliminar-abono"
                    title="Eliminar abono"
                  >
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              
              <div class="abono-body">
                <div class="abono-descripcion">
                  <i class="fas fa-comment-alt"></i>
                  {{ abono.descripcion }}
                </div>
                
                <div class="abono-deuda-info">
                  <span class="deuda-fecha">Deuda del {{ formatearFecha(abono.deudaFecha) }}</span>
                  <span class="deuda-total">Total deuda: ${{ formatNumber(abono.deudaTotal) }}</span>
                </div>
              </div>
              
              <div class="abono-footer">
                <div class="fecha-creacion">
                  Registrado: {{ formatearFechaHora(abono.fechaCreacion) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Paginación -->
          <div class="paginacion-container" v-if="totalPaginas > 1">
            <button 
              @click="cambiarPagina(paginaActual - 1)" 
              :disabled="paginaActual === 1"
              class="btn-paginacion"
            >
              <i class="fas fa-chevron-left"></i> Anterior
            </button>
            
            <div class="paginas-numeros">
              <button 
                v-for="pagina in paginasVisibles" 
                :key="pagina"
                @click="cambiarPagina(pagina)"
                :class="['btn-pagina', { 'activa': pagina === paginaActual }]"
              >
                {{ pagina }}
              </button>
            </div>
            
            <button 
              @click="cambiarPagina(paginaActual + 1)" 
              :disabled="paginaActual === totalPaginas"
              class="btn-paginacion"
            >
              Siguiente <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- No data -->
        <div v-else class="no-data">
          <div class="no-data-icon">
            <i class="fas fa-money-bill-wave"></i>
          </div>
          <h3>No hay abonos registrados</h3>
          <p v-if="Object.values(filtros).some(f => f)">
            No se encontraron abonos con los filtros aplicados.
          </p>
          <p v-else>
            Este proveedor no tiene abonos registrados aún.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

export default {
  name: 'HistorialAbonosModal',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    proveedor: {
      type: Object,
      required: true
    }
  },
  emits: ['cerrar', 'abono-eliminado'],
  data() {
    return {
      cargando: false,
      abonos: [],
      abonosFiltrados: [],
      
      // Paginación
      paginaActual: 1,
      abonosPorPagina: 10,
      
      // Filtros
      filtros: {
        fechaDesde: '',
        fechaHasta: '',
        tipo: ''
      }
    };
  },
  computed: {
    totalPaginas() {
      return Math.ceil(this.abonosFiltrados.length / this.abonosPorPagina);
    },
    
    abonosPaginados() {
      const inicio = (this.paginaActual - 1) * this.abonosPorPagina;
      const fin = inicio + this.abonosPorPagina;
      return this.abonosFiltrados.slice(inicio, fin);
    },
    
    paginasVisibles() {
      const paginas = [];
      const totalPaginas = this.totalPaginas;
      const actual = this.paginaActual;
      
      // Mostrar máximo 5 páginas
      let inicio = Math.max(1, actual - 2);
      let fin = Math.min(totalPaginas, inicio + 4);
      
      // Ajustar si estamos cerca del final
      if (fin - inicio < 4) {
        inicio = Math.max(1, fin - 4);
      }
      
      for (let i = inicio; i <= fin; i++) {
        paginas.push(i);
      }
      
      return paginas;
    },
    
    estadisticas() {
      const totalAbonos = this.abonosFiltrados.reduce((sum, abono) => sum + abono.monto, 0);
      const cantidadAbonos = this.abonosFiltrados.length;
      const promedioAbono = cantidadAbonos > 0 ? totalAbonos / cantidadAbonos : 0;
      
      return {
        totalAbonos,
        cantidadAbonos,
        promedioAbono
      };
    }
  },
  methods: {
    cerrarModal(event) {
      if (event.target === event.currentTarget) {
        this.$emit('cerrar');
      }
    },
    
    cambiarPagina(pagina) {
      if (pagina >= 1 && pagina <= this.totalPaginas) {
        this.paginaActual = pagina;
      }
    },
    
    async cargarHistorialAbonos() {
      if (!this.proveedor?.id) return;
      
      try {
        this.cargando = true;
        this.abonos = [];
        
        // Obtener todas las deudas del proveedor
        const deudasQuery = query(
          collection(db, 'deudas'),
          where('proveedorId', '==', this.proveedor.id)
        );
        
        const deudasSnapshot = await getDocs(deudasQuery);
        const deudas = deudasSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Para cada deuda, obtener sus abonos
        for (const deuda of deudas) {
          const abonosQuery = query(
            collection(db, 'deudas', deuda.id, 'abonos'),
            orderBy('fechaCreacion', 'desc')
          );
          
          const abonosSnapshot = await getDocs(abonosQuery);
          const abonosDeuda = abonosSnapshot.docs.map(doc => ({
            id: doc.id,
            deudaId: deuda.id,
            deudaFecha: deuda.fecha,
            deudaTotal: deuda.total,
            ...doc.data()
          }));
          
          this.abonos.push(...abonosDeuda);
        }
        
        // Ordenar todos los abonos por fecha de creación (más recientes primero)
        this.abonos.sort((a, b) => {
          const fechaA = a.fechaCreacion?.toDate?.() || new Date(a.fechaCreacion);
          const fechaB = b.fechaCreacion?.toDate?.() || new Date(b.fechaCreacion);
          return fechaB - fechaA;
        });
        
        // Aplicar filtros iniciales
        this.aplicarFiltros();
        
      } catch (error) {
        console.error('Error al cargar historial de abonos:', error);
        alert('Error al cargar el historial de abonos');
      } finally {
        this.cargando = false;
      }
    },
    
    aplicarFiltros() {
      this.abonosFiltrados = this.abonos.filter(abono => {
        // Filtro por fecha desde
        if (this.filtros.fechaDesde && abono.fecha < this.filtros.fechaDesde) {
          return false;
        }
        
        // Filtro por fecha hasta
        if (this.filtros.fechaHasta && abono.fecha > this.filtros.fechaHasta) {
          return false;
        }
        
        // Filtro por tipo
        if (this.filtros.tipo) {
          if (this.filtros.tipo === 'general' && !abono.esAbonoGeneral) {
            return false;
          }
          if (this.filtros.tipo === 'individual' && abono.esAbonoGeneral) {
            return false;
          }
        }
        
        return true;
      });
      
      // Resetear paginación
      this.paginaActual = 1;
    },
    
    limpiarFiltros() {
      this.filtros = {
        fechaDesde: '',
        fechaHasta: '',
        tipo: ''
      };
      this.aplicarFiltros();
    },
    
    formatNumber(number) {
      return number ? number.toLocaleString('es-MX', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) : '0.00';
    },
    
    formatearFecha(fechaString) {
      if (!fechaString) return '';
      
      const fecha = new Date(fechaString + 'T00:00:00');
      const opciones = { day: 'numeric', month: 'short', year: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    
    formatearFechaHora(timestamp) {
      if (!timestamp) return '';
      
      const fecha = timestamp?.toDate?.() || new Date(timestamp);
      const opciones = { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    
    confirmarEliminarAbono(abono) {
      const mensaje = `¿Está seguro de que desea eliminar este abono?\n\n` +
                     `Fecha: ${this.formatearFecha(abono.fecha)}\n` +
                     `Monto: $${this.formatNumber(abono.monto)}\n` +
                     `Tipo: ${abono.esAbonoGeneral ? 'Abono General' : 'Individual'}\n` +
                     `Descripción: ${abono.descripcion}\n\n` +
                     `Esta acción no se puede deshacer y afectará el saldo de la deuda.`;
                     
      if (confirm(mensaje)) {
        this.eliminarAbono(abono);
      }
    },
    
    async eliminarAbono(abono) {
      try {
        // Obtener la deuda actual para calcular el nuevo saldo
        const deudaRef = doc(db, 'deudas', abono.deudaId);
        const deudaDoc = await getDoc(deudaRef);
        
        if (!deudaDoc.exists()) {
          alert('Error: No se encontró la deuda asociada a este abono.');
          return;
        }
        
        const deudaData = deudaDoc.data();
        const saldoActual = deudaData.saldoPendiente || 0;
        const montoTotal = deudaData.total || 0;
        const nuevoSaldo = saldoActual + abono.monto; // Devolver el monto al saldo
        
        // Determinar el nuevo estado de la deuda basado en el nuevo saldo
        let nuevoEstado;
        if (nuevoSaldo <= 0) {
          nuevoEstado = 'pagado'; // Si no queda saldo, está pagado
        } else {
          nuevoEstado = 'pendiente'; // Si queda saldo, está pendiente
        }
        
        console.log('=== ELIMINANDO ABONO ===');
        console.log('Deuda ID:', abono.deudaId);
        console.log('Monto total de la deuda:', montoTotal);
        console.log('Saldo antes de eliminar:', saldoActual);
        console.log('Monto del abono eliminado:', abono.monto);
        console.log('Nuevo saldo calculado:', nuevoSaldo);
        console.log('Estado actual:', deudaData.estado);
        console.log('Nuevo estado calculado:', nuevoEstado);
        
        // Eliminar el abono de la subcolección
        const abonoRef = doc(db, 'deudas', abono.deudaId, 'abonos', abono.id);
        await deleteDoc(abonoRef);
        console.log('Abono eliminado de Firebase');
        
        // Crear el objeto de actualización con validación adicional
        const actualizacionDeuda = {
          saldoPendiente: Math.max(0, nuevoSaldo), // Asegurar que el saldo no sea negativo
          estado: nuevoEstado,
          fechaActualizacion: new Date().toISOString()
        };
        
        // Si el saldo nuevo es mayor que el total, algo está mal, usar el total como saldo
        if (nuevoSaldo > montoTotal) {
          console.warn('Saldo calculado mayor que el total, ajustando...');
          actualizacionDeuda.saldoPendiente = montoTotal;
          actualizacionDeuda.estado = 'pendiente';
        }
        
        console.log('Datos que se actualizarán en Firebase:', actualizacionDeuda);
        
        // Actualizar la deuda con el nuevo saldo y estado
        await updateDoc(deudaRef, actualizacionDeuda);
        console.log('Deuda actualizada en Firebase exitosamente');
        
        // Verificar que la actualización se aplicó correctamente
        const deudaVerificacion = await getDoc(deudaRef);
        if (deudaVerificacion.exists()) {
          const datosVerificacion = deudaVerificacion.data();
          console.log('=== VERIFICACIÓN POST-ACTUALIZACIÓN ===');
          console.log('Estado en Firebase:', datosVerificacion.estado);
          console.log('Saldo Pendiente en Firebase:', datosVerificacion.saldoPendiente);
          console.log('Fecha actualización:', datosVerificacion.fechaActualizacion);
          
          if (datosVerificacion.estado !== nuevoEstado) {
            console.error('¡ALERTA! El estado no se actualizó correctamente en Firebase');
            console.error('Esperado:', nuevoEstado, 'Encontrado:', datosVerificacion.estado);
          }
          
          if (Math.abs(datosVerificacion.saldoPendiente - actualizacionDeuda.saldoPendiente) > 0.01) {
            console.error('¡ALERTA! El saldo pendiente no se actualizó correctamente en Firebase');
            console.error('Esperado:', actualizacionDeuda.saldoPendiente, 'Encontrado:', datosVerificacion.saldoPendiente);
          }
        }
        
        // Mostrar mensaje de éxito con información detallada
        alert(`Abono eliminado exitosamente.\n\nDetalles:\n• Nuevo saldo pendiente: $${this.formatNumber(actualizacionDeuda.saldoPendiente)}\n• Estado: ${nuevoEstado.toUpperCase()}\n• Fecha: ${new Date().toLocaleString('es-MX')}`);
        
        // Recargar el historial de abonos
        await this.cargarHistorialAbonos();
        
        // Emitir evento para actualizar la lista de deudas en el componente padre
        this.$emit('abono-eliminado', {
          deudaId: abono.deudaId,
          proveedorId: this.proveedor.id,
          nuevoSaldo: actualizacionDeuda.saldoPendiente,
          nuevoEstado: nuevoEstado
        });
        
      } catch (error) {
        console.error('Error al eliminar el abono:', error);
        alert('Error al eliminar el abono. Por favor, intente de nuevo.');
      }
    }
  },
  
  watch: {
    mostrar(newVal) {
      if (newVal && this.proveedor) {
        this.cargarHistorialAbonos();
        this.limpiarFiltros();
      }
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.historial-abonos-modal {
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 2px solid #e9ecef;
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
  border-radius: 15px 15px 0 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: white;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 25px;
}

.filtros-container {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.filtros-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  align-items: end;
}

.filtro-grupo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filtro-grupo label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9em;
}

.filtro-grupo input,
.filtro-grupo select {
  padding: 8px 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.9em;
  transition: border-color 0.3s;
}

.filtro-grupo input:focus,
.filtro-grupo select:focus {
  outline: none;
  border-color: #9b59b6;
}

.btn-limpiar {
  padding: 8px 15px;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s;
}

.btn-limpiar:hover {
  background: #7f8c8d;
}

.estadisticas-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.estadistica-card {
  background: linear-gradient(135deg, #fff, #f8f9fa);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  border-left: 4px solid #9b59b6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.estadistica-valor {
  font-size: 1.8em;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 8px;
}

.estadistica-label {
  color: #7f8c8d;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.5px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #7f8c8d;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e9ecef;
  border-top: 4px solid #9b59b6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.paginacion-info {
  margin-bottom: 15px;
  color: #7f8c8d;
  font-size: 0.9em;
}

.abonos-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.abono-item {
  background: white;
  border-radius: 10px;
  border: 2px solid #e9ecef;
  overflow: hidden;
  transition: all 0.3s ease;
}

.abono-item:hover {
  border-color: #9b59b6;
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.1);
}

.abono-general {
  border-left: 4px solid #f39c12;
}

.abono-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-bottom: 1px solid #e9ecef;
}

.abono-fecha {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #2c3e50;
}

.abono-monto {
  font-size: 1.3em;
  font-weight: 700;
  color: #27ae60;
}

.abono-tipo {
  display: flex;
  align-items: center;
}

.tipo-general {
  background: #f39c12;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8em;
  font-weight: 500;
}

.tipo-individual {
  background: #3498db;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8em;
  font-weight: 500;
}

.abono-acciones {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-eliminar-abono {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(231, 76, 60, 0.3);
  position: relative;
  overflow: hidden;
}

.btn-eliminar-abono::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn-eliminar-abono:hover::before {
  left: 100%;
}

.btn-eliminar-abono:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
  background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
}

.btn-eliminar-abono:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(231, 76, 60, 0.3);
}

.btn-eliminar-abono i {
  font-size: 1em;
}

.abono-body {
  padding: 15px 20px;
}

.abono-descripcion {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-weight: 500;
  color: #2c3e50;
}

.abono-deuda-info {
  display: flex;
  justify-content: space-between;
  color: #7f8c8d;
  font-size: 0.9em;
}

.abono-footer {
  padding: 10px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.fecha-creacion {
  color: #95a5a6;
  font-size: 0.8em;
  text-align: right;
}

.paginacion-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #e9ecef;
}

.btn-paginacion {
  padding: 8px 15px;
  background: #ecf0f1;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-paginacion:hover:not(:disabled) {
  background: #bdc3c7;
}

.btn-paginacion:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.paginas-numeros {
  display: flex;
  gap: 5px;
}

.btn-pagina {
  padding: 8px 12px;
  background: #ecf0f1;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-pagina:hover {
  background: #bdc3c7;
}

.btn-pagina.activa {
  background: #9b59b6;
  color: white;
}

.no-data {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.no-data-icon {
  font-size: 4em;
  margin-bottom: 20px;
  opacity: 0.3;
}

.no-data h3 {
  margin: 0 0 10px 0;
  color: #95a5a6;
}

.no-data p {
  margin: 5px 0;
  font-size: 0.9em;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .historial-abonos-modal {
    width: 98%;
    margin: 10px;
  }
  
  .filtros-row {
    grid-template-columns: 1fr;
  }
  
  .estadisticas-container {
    grid-template-columns: 1fr;
  }
  
  .abono-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .abono-acciones {
    align-self: flex-end;
    margin-top: 10px;
  }
  
  .btn-eliminar-abono {
    padding: 10px 14px;
    font-size: 1em;
  }
  
  .abono-deuda-info {
    flex-direction: column;
    gap: 5px;
  }
  
  .paginacion-container {
    flex-direction: column;
    gap: 15px;
  }
}
</style>