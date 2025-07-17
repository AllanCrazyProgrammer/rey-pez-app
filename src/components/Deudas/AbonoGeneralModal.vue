<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content abono-general-modal" @click.stop>
      <div class="modal-header">
        <h2>Abono General - {{ proveedor?.nombre }}</h2>
        <button @click="$emit('cerrar')" class="close-button">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Mensaje de error cuando no hay proveedor -->
        <div v-if="!proveedor" class="error-no-proveedor">
          <div class="error-icon">⚠️</div>
          <h3>No hay proveedor seleccionado</h3>
          <p>Para realizar un abono general, primero debe seleccionar un proveedor en el filtro.</p>
        </div>
        
        <!-- Contenido normal cuando hay proveedor -->
        <div v-else>
          <div class="proveedor-info">
            <div class="info-card">
              <h3>Resumen de Deudas</h3>
              <div class="resumen-items">
                <div class="resumen-item">
                  <span class="label">Total deudas pendientes:</span>
                  <span class="valor">{{ deudasPendientes.length }}</span>
                </div>
                <div class="resumen-item">
                  <span class="label">Saldo total pendiente:</span>
                  <span class="valor saldo-total">${{ formatNumber(saldoTotalPendiente) }}</span>
                </div>
              </div>
            </div>
          </div>

        <div class="form-abono">
          <h3>Realizar Abono General</h3>
          <div class="form-group">
            <label for="fechaAbono">Fecha del abono:</label>
            <input 
              id="fechaAbono" 
              type="date" 
              v-model="nuevoAbono.fecha" 
              required
            >
          </div>
          
          <div class="form-group">
            <label for="descripcionAbono">Descripción:</label>
            <input 
              id="descripcionAbono" 
              type="text" 
              v-model="nuevoAbono.descripcion" 
              placeholder="Ej: Pago general, Transferencia, etc."
              required
            >
          </div>
          
          <div class="form-group">
            <label for="montoAbono">Monto total a abonar:</label>
            <input 
              id="montoAbono" 
              type="number" 
              v-model.number="nuevoAbono.monto" 
              :max="saldoTotalPendiente"
              min="1"
              step="0.01"
              placeholder="0.00"
              required
            >
          </div>

          <div v-if="nuevoAbono.monto > 0" class="distribucion-preview">
            <h4>Distribución del abono:</h4>
            <div class="deudas-list">
              <div 
                v-for="(distribucion, index) in distribucionCalculada" 
                :key="distribucion.deudaId"
                class="deuda-distribucion"
              >
                <div class="deuda-info">
                  <span class="fecha">{{ formatearFecha(distribucion.fecha) }}</span>
                  <span class="saldo-actual">${{ formatNumber(distribucion.saldoActual) }}</span>
                </div>
                <div class="abono-aplicado">
                  <span class="monto-abono">${{ formatNumber(distribucion.montoAbono) }}</span>
                  <span class="saldo-restante">(Restante: ${{ formatNumber(distribucion.saldoRestante) }})</span>
                </div>
              </div>
            </div>
            
            <div class="resumen-distribucion">
              <div class="total-distribuido">
                <span>Total distribuido: ${{ formatNumber(totalDistribuido) }}</span>
              </div>
              <div v-if="montoSobrante > 0" class="monto-sobrante">
                <span>⚠️ Sobrante (se aplicará a la primera deuda): ${{ formatNumber(montoSobrante) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="$emit('cerrar')" class="btn-cancelar">
            Cancelar
          </button>
          <button 
            @click="aplicarAbonoGeneral" 
            class="btn-aplicar"
            :disabled="!puedeAplicar || guardando"
          >
            {{ guardando ? 'Aplicando...' : 'Aplicar Abono General' }}
          </button>
        </div>
        </div> <!-- Cierre del div v-else -->
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore';

export default {
  name: 'AbonoGeneralModal',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    proveedor: {
      type: Object,
      required: false,
      default: null
    }
  },
  emits: ['cerrar', 'abono-aplicado'],
  data() {
    return {
      deudasPendientes: [],
      guardando: false,
      nuevoAbono: {
        fecha: this.obtenerFechaActual(),
        descripcion: '',
        monto: null
      }
    };
  },
  computed: {
    saldoTotalPendiente() {
      return this.deudasPendientes.reduce((sum, deuda) => sum + deuda.saldoPendiente, 0);
    },
    
    puedeAplicar() {
      return this.nuevoAbono.fecha && 
             this.nuevoAbono.descripcion && 
             this.nuevoAbono.monto > 0 && 
             this.nuevoAbono.monto <= this.saldoTotalPendiente &&
             this.deudasPendientes.length > 0;
    },
    
    distribucionCalculada() {
      if (!this.nuevoAbono.monto || this.deudasPendientes.length === 0) return [];
      
      let montoRestante = this.nuevoAbono.monto;
      const distribucion = [];
      
      // Ordenar deudas por fecha (más antiguas primero)
      const deudasOrdenadas = [...this.deudasPendientes].sort((a, b) => 
        new Date(a.fecha) - new Date(b.fecha)
      );
      
      for (const deuda of deudasOrdenadas) {
        if (montoRestante <= 0) break;
        
        const montoAbono = Math.min(montoRestante, deuda.saldoPendiente);
        const saldoRestante = deuda.saldoPendiente - montoAbono;
        
        distribucion.push({
          deudaId: deuda.id,
          fecha: deuda.fecha,
          saldoActual: deuda.saldoPendiente,
          montoAbono: montoAbono,
          saldoRestante: saldoRestante
        });
        
        montoRestante -= montoAbono;
      }
      
      return distribucion;
    },
    
    totalDistribuido() {
      return this.distribucionCalculada.reduce((sum, dist) => sum + dist.montoAbono, 0);
    },
    
    montoSobrante() {
      return this.nuevoAbono.monto - this.totalDistribuido;
    }
  },
  methods: {
    obtenerFechaActual() {
      const fecha = new Date();
      // Usar la zona horaria local para evitar problemas de UTC
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // getMonth() retorna 0-11
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    },
    
    cerrarModal(event) {
      if (event.target === event.currentTarget) {
        this.$emit('cerrar');
      }
    },
    
    async cargarDeudasPendientes() {
      if (!this.proveedor?.id) {
        console.warn('No se puede cargar deudas: proveedor no seleccionado');
        this.deudasPendientes = [];
        return;
      }
      
      try {
        // Consulta sin orderBy para evitar el error de índice
        const deudasQuery = query(
          collection(db, 'deudas'),
          where('proveedorId', '==', this.proveedor.id),
          where('estado', '==', 'pendiente')
        );
        
        const querySnapshot = await getDocs(deudasQuery);
        let deudas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ordenar manualmente por fecha para evitar problema de índice
        deudas.sort((a, b) => {
          const fechaA = new Date(a.fecha);
          const fechaB = new Date(b.fecha);
          return fechaA - fechaB;
        });
        
        this.deudasPendientes = deudas;
        
      } catch (error) {
        console.error('Error al cargar deudas pendientes:', error);
        this.deudasPendientes = [];
        // Mostrar error específico según el tipo
        if (error.code === 'failed-precondition') {
          alert('Error de base de datos: Se requiere configurar un índice. Contacte al administrador.');
        } else {
          alert('Error al cargar las deudas pendientes. Por favor, intente de nuevo.');
        }
      }
    },
    
    async aplicarAbonoGeneral() {
      if (!this.puedeAplicar) return;
      
      try {
        this.guardando = true;
        
        // Aplicar abonos a cada deuda según la distribución calculada
        for (const distribucion of this.distribucionCalculada) {
          if (distribucion.montoAbono > 0) {
            // Agregar el abono a la deuda
            await addDoc(collection(db, 'deudas', distribucion.deudaId, 'abonos'), {
              descripcion: `${this.nuevoAbono.descripcion} (Abono General)`,
              monto: distribucion.montoAbono,
              fecha: this.nuevoAbono.fecha,
              fechaCreacion: new Date(),
              esAbonoGeneral: true
            });
            
            // Actualizar el saldo pendiente y estado de la deuda
            const nuevoSaldoPendiente = distribucion.saldoRestante;
            const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
            
            await updateDoc(doc(db, 'deudas', distribucion.deudaId), {
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoEstado
            });
          }
        }
        
        // Si hay monto sobrante, aplicarlo a la primera deuda
        if (this.montoSobrante > 0 && this.distribucionCalculada.length > 0) {
          const primeraDeuda = this.distribucionCalculada[0];
          
          await addDoc(collection(db, 'deudas', primeraDeuda.deudaId, 'abonos'), {
            descripcion: `${this.nuevoAbono.descripcion} (Abono General - Sobrante)`,
            monto: this.montoSobrante,
            fecha: this.nuevoAbono.fecha,
            fechaCreacion: new Date(),
            esAbonoGeneral: true
          });
          
          // Actualizar saldo de la primera deuda con el sobrante
          const saldoActualizado = primeraDeuda.saldoRestante - this.montoSobrante;
          await updateDoc(doc(db, 'deudas', primeraDeuda.deudaId), {
            saldoPendiente: Math.max(0, saldoActualizado),
            estado: saldoActualizado <= 0 ? 'pagado' : 'pendiente'
          });
        }
        
        alert(`Abono general de $${this.formatNumber(this.nuevoAbono.monto)} aplicado correctamente`);
        this.$emit('abono-aplicado');
        this.$emit('cerrar');
        
      } catch (error) {
        console.error('Error al aplicar abono general:', error);
        alert('Error al aplicar el abono general: ' + error.message);
      } finally {
        this.guardando = false;
      }
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
    }
  },
  
  watch: {
    mostrar(newVal) {
      if (newVal && this.proveedor) {
        this.cargarDeudasPendientes();
        // Resetear formulario
        this.nuevoAbono = {
          fecha: this.obtenerFechaActual(),
          descripcion: '',
          monto: null
        };
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

.abono-general-modal {
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 2px solid #e9ecef;
  background: linear-gradient(135deg, #3498db, #2980b9);
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

.error-no-proveedor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #dc2626;
}

.error-no-proveedor .error-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.error-no-proveedor h3 {
  margin: 0 0 15px 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.error-no-proveedor p {
  margin: 0;
  font-size: 1.1rem;
  color: #6b7280;
  max-width: 400px;
}

.proveedor-info {
  margin-bottom: 25px;
}

.info-card {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 10px;
  padding: 20px;
  border-left: 4px solid #3498db;
}

.info-card h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-weight: 600;
}

.resumen-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: 500;
  color: #5a6c7d;
}

.valor {
  font-weight: 600;
  color: #2c3e50;
}

.saldo-total {
  color: #e74c3c;
  font-size: 1.2em;
}

.form-abono {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-abono h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.distribucion-preview {
  margin-top: 25px;
  padding: 20px;
  background: white;
  border-radius: 10px;
  border: 2px solid #e9ecef;
}

.distribucion-preview h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-weight: 600;
}

.deudas-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.deuda-distribucion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 4px solid #3498db;
}

.deuda-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fecha {
  font-weight: 500;
  color: #2c3e50;
}

.saldo-actual {
  font-size: 0.9em;
  color: #7f8c8d;
}

.abono-aplicado {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.monto-abono {
  font-weight: 600;
  color: #27ae60;
  font-size: 1.1em;
}

.saldo-restante {
  font-size: 0.9em;
  color: #7f8c8d;
}

.resumen-distribucion {
  padding: 15px;
  background: linear-gradient(135deg, #e8f6f3, #d5f4e6);
  border-radius: 8px;
  border-left: 4px solid #27ae60;
}

.total-distribuido {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
}

.monto-sobrante {
  color: #f39c12;
  font-weight: 500;
  font-size: 0.9em;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 2px solid #e9ecef;
}

.btn-cancelar, .btn-aplicar {
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
}

.btn-cancelar {
  background: #bdc3c7;
  color: #2c3e50;
}

.btn-cancelar:hover {
  background: #95a5a6;
}

.btn-aplicar {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
}

.btn-aplicar:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
}

.btn-aplicar:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .abono-general-modal {
    width: 95%;
    margin: 10px;
  }
  
  .resumen-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .deuda-distribucion {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .abono-aplicado {
    align-items: flex-start;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
</style>