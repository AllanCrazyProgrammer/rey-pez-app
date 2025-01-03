<template>
  <div class="catarro-cuentas-menu-container">
    <h1>Menú de Cuentas Catarro</h1>
    
    <div class="actions-container">
      <router-link to="/cuentas-mexico" class="action-button back-btn">
        Cuentas México
      </router-link>
      <router-link to="/cuentas-catarro/nueva" class="action-button new-cuenta-btn">
        Nueva Cuenta
      </router-link>
      <router-link to="/ventas-ganancias-catarro" class="action-button ventas-ganancias-btn">
        Ventas y Ganancias
      </router-link>
      <PreciosHistorialModal />
    </div>

    <div class="filter-container">
      <label for="filter-select">Filtrar por estado:</label>
      <select id="filter-select" v-model="filtroEstado">
        <option value="todas">Todas</option>
        <option value="pagadas">Pagadas</option>
        <option value="no-pagadas">No Pagadas</option>
      </select>
    </div>

    <div class="cuentas-list">
      <h2>Registros de Cuentas</h2>
      <div v-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="cuentasFiltradas.length === 0" class="no-records">
        No hay registros de cuentas que coincidan con el filtro.
      </div>
      <ul v-else>
        <li v-for="cuenta in cuentasFiltradas" :key="cuenta.id" class="cuenta-item">
          <div class="cuenta-content">
            <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
            <p class="cuenta-summary">
              <span>Saldo Hoy: ${{ formatNumber(cuenta.saldoHoy) }}</span>
              <span>Total Acumulado: ${{ formatNumber(cuenta.totalNota) }}</span>
            </p>
            <span :class="['estado-cuenta', cuenta.estadoPagado ? 'pagado' : 'no-pagado']">
              {{ cuenta.estadoPagado ? 'Pagado' : 'No Pagado' }}
            </span>
          </div>
          <div class="cuenta-actions">
            <button @click="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>  
            <button @click="borrarCuenta(cuenta.id)" class="delete-btn">Borrar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, onSnapshot, where, updateDoc } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';

export default {
  name: 'CatarroCuentasMenu',
  components: {
    BackButton,
    PreciosHistorialModal
  },
  data() {
    return {
      cuentas: [],
      isLoading: true,
      filtroEstado: 'todas',
      unsubscribe: null
    };
  },
  computed: {
    cuentasFiltradas() {
      switch (this.filtroEstado) {
        case 'pagadas':
          return this.cuentas.filter(cuenta => cuenta.estadoPagado);
        case 'no-pagadas':
          return this.cuentas.filter(cuenta => !cuenta.estadoPagado);
        default:
          return this.cuentas;
      }
    }
  },
  methods: {
    async loadCuentas() {
      try {
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(cuentasRef, orderBy('fecha', 'desc'));
        
        // Usar onSnapshot para actualizaciones en tiempo real
        this.unsubscribe = onSnapshot(q, (querySnapshot) => {
          const cuentasActualizadas = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              fecha: data.fecha,
              saldoHoy: data.totalGeneralVenta || 0,
              totalCobros: (data.cobros || []).reduce((sum, cobro) => sum + (parseFloat(cobro.monto) || 0), 0),
              totalAbonos: (data.abonos || []).reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0),
              totalNota: 0, // Se calculará en actualizarSaldosAcumulados
              estadoPagado: data.estadoPagado || false
            };
          });

          // Actualizar las cuentas y recalcular saldos
          this.cuentas = cuentasActualizadas;
          this.actualizarSaldosAcumulados();
          this.isLoading = false;
        });

      } catch (error) {
        console.error("Error al cargar cuentas: ", error);
        this.cuentas = [];
        this.isLoading = false;
      }
    },
    async actualizarSaldosAcumulados() {
      try {
        // Ordenar las cuentas por fecha de manera ascendente para el cálculo
        const cuentasOrdenadas = [...this.cuentas].sort((a, b) => 
          new Date(a.fecha) - new Date(b.fecha)
        );

        let saldoAcumulado = 0;
        let ultimaCuentaPagada = null;
        
        // Encontrar la última cuenta pagada
        for (let i = cuentasOrdenadas.length - 1; i >= 0; i--) {
          if (cuentasOrdenadas[i].estadoPagado) {
            ultimaCuentaPagada = cuentasOrdenadas[i];
            break;
          }
        }

        // Si encontramos una cuenta pagada, solo calcular saldos para las cuentas posteriores
        const indiceCuentaPagada = ultimaCuentaPagada ? 
          cuentasOrdenadas.findIndex(c => c.id === ultimaCuentaPagada.id) : -1;

        // Actualizar todas las cuentas anteriores a la última pagada con saldo 0
        for (let i = 0; i <= indiceCuentaPagada; i++) {
          if (i >= 0) {
            const cuenta = cuentasOrdenadas[i];
            const cuentaRef = doc(db, 'cuentasCatarro', cuenta.id);
            await updateDoc(cuentaRef, {
              nuevoSaldoAcumulado: 0,
              estadoPagado: true
            });
            cuenta.totalNota = 0;
          }
        }

        // Calcular saldos acumulados solo para las cuentas posteriores a la última pagada
        for (let i = indiceCuentaPagada + 1; i < cuentasOrdenadas.length; i++) {
          const cuenta = cuentasOrdenadas[i];
          const cuentaRef = doc(db, 'cuentasCatarro', cuenta.id);
          
          // Calcular el total del día (saldo hoy + cobros - abonos)
          const totalDia = cuenta.saldoHoy + cuenta.totalCobros - cuenta.totalAbonos;
          
          if (!cuenta.estadoPagado) {
            saldoAcumulado += totalDia;
          }

          // Actualizar el total de la nota y el nuevo saldo acumulado
          cuenta.totalNota = saldoAcumulado;
          
          await updateDoc(cuentaRef, {
            nuevoSaldoAcumulado: saldoAcumulado,
            estadoPagado: saldoAcumulado === 0
          });
        }

        // Actualizar el estado local de las cuentas
        this.cuentas = [...this.cuentas]; // Forzar actualización de la vista

      } catch (error) {
        console.error("Error al actualizar saldos acumulados:", error);
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
      this.$router.push(`/cuentas-catarro/${id}?edit=true`);
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasCatarro', id));
          await this.actualizarSaldosAcumulados();
          alert('Registro de cuenta borrado con éxito');
        } catch (error) {
          console.error("Error al borrar el registro de cuenta: ", error);
          alert('Error al borrar el registro de cuenta');
        }
      }
    }
  },
  mounted() {
    this.loadCuentas();
  },
  beforeUnmount() {
    // Limpiar el listener cuando el componente se desmonte
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
};
</script>

<style scoped>
.catarro-cuentas-menu-container {
  max-width: 800px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1, h2 {
  color: #d32f2f;
  text-align: center;
}

.actions-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.action-button {
  background-color: #d32f2f;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.action-button:hover {
  background-color: #b71c1c;
}

.back-btn {
  background-color: #6c757d;
}

.back-btn:hover {
  background-color: #5a6268;
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

.cuenta-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

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

.filter-container {
  margin-bottom: 20px;
  text-align: right;
}

.filter-container select {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.estado-cuenta {
  font-weight: bold;
  padding: 5px 10px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 10px;
}

.pagado {
  background-color: #4CAF50;
  color: white;
}

.no-pagado {
  background-color: #f44336;
  color: white;
}

.ventas-ganancias-btn {
  background-color: #4CAF50;
}

.ventas-ganancias-btn:hover {
  background-color: #45a049;
}
</style>