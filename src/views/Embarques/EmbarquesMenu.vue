<template>
  <div class="embarques-menu">
    <h1>Menú de Embarques</h1>
    <div class="menu-options">
      <button @click="nuevoEmbarque" class="btn-nuevo-embarque">Nuevo Embarque</button>
      <button @click="mostrarFletes" class="btn-fletes">Fletes</button>
      <button @click="verCuentaFletes" class="btn-cuenta-fletes">Cuenta de Fletes</button>
    </div>
    <ListaEmbarques />

    <!-- Modal de Fletes -->
    <div v-if="modalFletesVisible" class="modal-fletes" @click="cerrarModalFletes">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h2>Fletes de Joselito</h2>
          <button class="btn-cerrar" @click="cerrarModalFletes">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="cargandoFletes" class="cargando">Cargando fletes...</div>
          <div v-else-if="fletes.length === 0" class="sin-fletes">No hay fletes registrados.</div>
          <div v-else class="tabla-fletes-container">
            <table class="tabla-fletes">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Taras Limpio</th>
                  <th>Taras Crudo</th>
                  <th>Total Taras</th>
                  <th>Cargó</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="flete in fletes" :key="flete.fecha">
                  <td>{{ formatearFecha(flete.fecha) }}</td>
                  <td>{{ flete.tarasLimpio }}</td>
                  <td>{{ flete.tarasCrudo }}</td>
                  <td>{{ flete.tarasLimpio + flete.tarasCrudo }}</td>
                  <td>{{ flete.cargaCon }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ListaEmbarques from './ListaEmbarques.vue'
import { getFirestore, collection, getDocs } from 'firebase/firestore';

export default {
  name: 'EmbarquesMenu',
  components: {
    ListaEmbarques
  },
  data() {
    return {
      modalFletesVisible: false,
      fletes: [],
      cargandoFletes: false
    }
  },
  methods: {
    nuevoEmbarque() {
      this.$router.push({ name: 'NuevoEmbarque', params: { id: 'nuevo' } });
    },
    mostrarFletes() {
      this.modalFletesVisible = true;
      this.cargarFletes();
    },
    verCuentaFletes() {
      this.$router.push({ name: 'CuentaFletes' });
    },
    cerrarModalFletes() {
      this.modalFletesVisible = false;
    },
    async cargarFletes() {
      this.cargandoFletes = true;
      try {
        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const snapshot = await getDocs(embarquesRef);
        
        // Procesar los embarques para obtener los fletes de Joselito
        const fletesData = snapshot.docs
          .map(doc => {
            const data = doc.data();
            // Obtener la fecha del embarque sin ajustes
            let fecha = data.fecha.toDate ? data.fecha.toDate() : new Date(data.fecha);
            
            // Buscar los datos de Joselito
            const clienteJoselito = data.clientes?.find(cliente => 
              cliente.id === '1' || cliente.id === 1 || cliente.nombre === 'Joselito'
            );
            
            if (clienteJoselito) {
              let tarasLimpio = 0;
              let tarasCrudo = 0;

              // Calcular taras de limpio (productos normales)
              if (clienteJoselito.productos && Array.isArray(clienteJoselito.productos)) {
                tarasLimpio = clienteJoselito.productos.reduce((total, producto) => {
                  let tarasProducto = 0;
                  // Sumar taras normales
                  if (Array.isArray(producto.taras)) {
                    tarasProducto += producto.taras.reduce((sum, tara) => 
                      sum + (parseInt(tara) || 0), 0);
                  }
                  // Sumar taras extra
                  if (Array.isArray(producto.tarasExtra)) {
                    tarasProducto += producto.tarasExtra.reduce((sum, tara) => 
                      sum + (parseInt(tara) || 0), 0);
                  }
                  return total + tarasProducto;
                }, 0);
              }

              // Calcular taras de crudo
              if (clienteJoselito.crudos && Array.isArray(clienteJoselito.crudos)) {
                tarasCrudo = clienteJoselito.crudos.reduce((total, crudo) => {
                  if (!Array.isArray(crudo.items)) return total;
                  
                  return total + crudo.items.reduce((itemTotal, item) => {
                    let tarasItem = 0;
                    // Procesar taras principales
                    if (item.taras) {
                      const [cantidad] = item.taras.split('-');
                      tarasItem += parseInt(cantidad) || 0;
                    }
                    // Procesar sobrantes
                    if (item.sobrante) {
                      const [cantidadSobrante] = item.sobrante.split('-');
                      tarasItem += parseInt(cantidadSobrante) || 0;
                    }
                    return itemTotal + tarasItem;
                  }, 0);
                }, 0);
              }

              // Solo retornar si hay datos para este embarque
              return {
                fecha,
                tarasLimpio,
                tarasCrudo,
                cargaCon: data.cargaCon || 'No especificado'
              };
            }
            return null;
          })
          .filter(flete => flete !== null)
          .sort((a, b) => b.fecha - a.fecha); // Ordenar por fecha descendente
        
        console.log('Fletes procesados:', fletesData); // Para depuración
        this.fletes = fletesData;
      } catch (error) {
        console.error('Error al cargar los fletes:', error);
      } finally {
        this.cargandoFletes = false;
      }
    },
    formatearFecha(fecha) {
      // Crear una nueva fecha y sumar un día
      const fechaAjustada = new Date(fecha);
      fechaAjustada.setDate(fechaAjustada.getDate() + 1);
      
      return fechaAjustada.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }
}
</script>

<style scoped>
.embarques-menu {
  padding: 20px;
  text-align: center;
}

.menu-options {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.btn-nuevo-embarque, .btn-fletes {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  transition: background-color 0.3s;
}

.btn-nuevo-embarque {
  background-color: #4CAF50;
  color: white;
}

.btn-fletes {
  background-color: #2196F3;
  color: white;
}

.btn-nuevo-embarque:hover {
  background-color: #45a049;
}

.btn-fletes:hover {
  background-color: #1976D2;
}

.btn-cuenta-fletes {
  background-color: #FF9800;
  color: white;
}

.btn-cuenta-fletes:hover {
  background-color: #F57C00;
}

h1 {
  margin-bottom: 20px;
  color: #333;
}

/* Estilos del Modal */
.modal-fletes {
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

.modal-contenido {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.btn-cerrar {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.tabla-fletes-container {
  overflow-x: auto;
}

.tabla-fletes {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.tabla-fletes th,
.tabla-fletes td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.tabla-fletes th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #333;
}

.tabla-fletes tr:hover {
  background-color: #f5f5f5;
}

.cargando,
.sin-fletes {
  text-align: center;
  padding: 20px;
  color: #666;
}

@media (max-width: 768px) {
  .menu-options {
    flex-direction: column;
    align-items: center;
  }

  .btn-nuevo-embarque,
  .btn-fletes {
    width: 100%;
    max-width: 300px;
  }

  .tabla-fletes th,
  .tabla-fletes td {
    padding: 8px;
    font-size: 14px;
  }
}
</style>
