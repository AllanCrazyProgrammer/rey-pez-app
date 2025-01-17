<template>
  <div class="lista-embarques">
 
    <div v-if="cargando" class="cargando">Cargando embarques...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <table v-if="embarques.length > 0" class="tabla-embarques">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Kilos Limpios</th>
            <th>Kilos Crudos</th>
            <th>Total Kilos</th>
            <th>Total Taras</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="embarque in embarques" :key="embarque.id">
            <td>{{ formatearFecha(embarque.fecha) }}</td>
            <td>{{ calcularKilosLimpios(embarque) }} kg</td>
            <td>{{ calcularKilosCrudos(embarque) }} kg</td>
            <td>{{ (Number(calcularKilosLimpios(embarque)) + Number(calcularKilosCrudos(embarque))).toFixed(1) }} kg</td>
            <td>{{ calcularTotalTaras(embarque) }}</td>
            <td>
              <button @click="editarEmbarque(embarque.id)" class="btn-detalles">Editar</button>
              <button @click="eliminarEmbarque(embarque.id)" class="btn-eliminar">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="sin-embarques">No hay embarques registrados.</div>
    </div>
 
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

export default {
  name: 'ListaEmbarques',
  data() {
    return {
      embarques: [],
      cargando: true,
      error: null
    };
  },
  methods: {
    async cargarEmbarques() {
      try {
        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const snapshot = await getDocs(embarquesRef);
        this.embarques = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => {
            const fechaA = a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha);
            const fechaB = b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha);
            return fechaB - fechaA; // Orden descendente
          });
        this.cargando = false;
      } catch (error) {
        console.error("Error al cargar los embarques:", error);
        this.error = "Hubo un error al cargar los embarques. Por favor, intente de nuevo más tarde.";
        this.cargando = false;
      }
    },
    formatearFecha(fecha) {
      if (!fecha) return 'Fecha no disponible';
      const fechaObj = fecha.toDate ? fecha.toDate() : new Date(fecha);
      // Ajustamos la fecha sumando un día
      fechaObj.setDate(fechaObj.getDate() + 1);
      return fechaObj.toLocaleDateString('es-ES');
    },
    calcularTotalKilos(embarque) {
      let totalKilos = 0;

      embarque.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.tipo === 'c/h20') {
            // Para productos c/h20, calcular la suma de (taras * bolsa) para cada grupo
            const reporteTaras = producto.reporteTaras || [];
            const reporteBolsas = producto.reporteBolsas || [];
            let sumaTotalKilos = 0;

            for (let i = 0; i < reporteTaras.length; i++) {
              const taras = parseInt(reporteTaras[i]) || 0;
              const bolsa = parseInt(reporteBolsas[i]) || 0;
              sumaTotalKilos += taras * bolsa;
            }

            // Multiplicar por el valor neto (0.65 por defecto)
            const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
            totalKilos += kilosReales;
          } else {
            // Para otros productos
            const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            const sumaTaras = this.calcularTotalTarasProducto(producto);
            const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
            totalKilos += sumaKilos - descuentoTaras;
          }
        });
      });

      return totalKilos.toFixed(1);
    },
    calcularTotalTaras(embarque) {
      let totalTaras = 0;
      const clientesPredefinidos = ['OTILIO', 'JOSELITO', 'CATARRO', 'OZUNA'];

      embarque.clientes.forEach(cliente => {
        // Solo procesar si el cliente está en la lista de predefinidos
        if (clientesPredefinidos.includes(cliente.nombre.toUpperCase())) {
          // Sumar taras de productos normales
          cliente.productos.forEach(producto => {
            totalTaras += this.calcularTotalTarasProducto(producto);
          });

          // Sumar taras de crudos
          if (cliente.crudos) {
            cliente.crudos.forEach(crudo => {
              crudo.items.forEach(item => {
                if (item.taras) {
                  const [cantidad] = item.taras.split('-').map(Number);
                  totalTaras += cantidad || 0;
                }
                if (item.sobrante) {
                  const [cantidadSobrante] = item.sobrante.split('-').map(Number);
                  totalTaras += cantidadSobrante || 0;
                }
              });
            });
          }
        }
      });

      return totalTaras;
    },
    calcularTotalTarasProducto(producto) {
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      return tarasNormales + tarasExtra;
    },
    verDetalles(embarqueId) {
      console.log('Navegando a detalles del embarque:', embarqueId);
      this.$router.push({ name: 'DetallesEmbarque', params: { id: embarqueId } });
    },
  
    editarEmbarque(embarqueId) {
      this.$router.push({ name: 'NuevoEmbarque', params: { id: embarqueId } });
    },
    regresarAMenu() {
      this.$router.push({ name: 'EmbarquesMenu' });
    },
    
    async eliminarEmbarque(embarqueId) {
      if (confirm('¿Estás seguro de que quieres eliminar este embarque?')) {
        try {
          const db = getFirestore();
          await deleteDoc(doc(db, 'embarques', embarqueId));
          this.embarques = this.embarques.filter(e => e.id !== embarqueId);
          alert('Embarque eliminado con éxito');
        } catch (error) {
          console.error("Error al eliminar el embarque:", error);
          alert('Hubo un error al eliminar el embarque. Por favor, intente de nuevo.');
        }
      }
    },

    calcularKilosLimpios(embarque) {
      let totalKilos = 0;

      embarque.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.tipo === 'c/h20') {
            // Para productos c/h20, calcular la suma de (taras * bolsa) para cada grupo
            const reporteTaras = producto.reporteTaras || [];
            const reporteBolsas = producto.reporteBolsas || [];
            let sumaTotalKilos = 0;

            for (let i = 0; i < reporteTaras.length; i++) {
              const taras = parseInt(reporteTaras[i]) || 0;
              const bolsa = parseInt(reporteBolsas[i]) || 0;
              sumaTotalKilos += taras * bolsa;
            }

            // Multiplicar por el valor neto (0.65 por defecto)
            const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
            totalKilos += kilosReales;
          } else {
            // Para otros productos
            const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            const sumaTaras = this.calcularTotalTarasProducto(producto);
            const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
            totalKilos += sumaKilos - descuentoTaras;
          }
        });
      });

      return totalKilos.toFixed(1);
    },

    calcularKilosCrudos(embarque) {
      let totalKilosCrudos = 0;

      embarque.clientes.forEach(cliente => {
        if (cliente.crudos) {
          cliente.crudos.forEach(crudo => {
            crudo.items.forEach(item => {
              if (item.taras) {
                const [cantidad, medida] = item.taras.split('-').map(Number);
                totalKilosCrudos += (cantidad || 0) * (medida || 0);
              }
              if (item.sobrante) {
                const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
                totalKilosCrudos += (cantidadSobrante || 0) * (medidaSobrante || 0);
              }
            });
          });
        }
      });

      return totalKilosCrudos.toFixed(1);
    },
  },
  mounted() {
    this.cargarEmbarques();
  }
};
</script>

<style scoped>
.lista-embarques {
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.cargando, .error, .sin-embarques {
  text-align: center;
  padding: 20px;
  font-size: 18px;
}

.error {
  color: #d9534f;
}

.tabla-embarques {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.tabla-embarques th, .tabla-embarques td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.tabla-embarques th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.tabla-embarques tr:nth-child(even) {
  background-color: #f9f9f9;
}

.tabla-embarques tr:hover {
  background-color: #f5f5f5;
}

.btn-detalles {
  background-color: #5bc0de;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-detalles:hover {
  background-color: #46b8da;
}

.btn-lista-embarques {
  background-color: #5bc0de;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-lista-embarques:hover {
  background-color: #46b8da;
}

.botones {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.btn-regresar {
  background-color: #f0ad4e;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-regresar:hover {
  background-color: #ec971f;
}

.btn-eliminar {
  background-color: #d9534f;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-left: 5px;
}

.btn-eliminar:hover {
  background-color: #c9302c;
}

/* Agregar estos estilos para mejorar la visualización de la tabla */
.tabla-embarques td {
  white-space: nowrap;
  padding: 12px 15px;
}

.tabla-embarques th {
  white-space: nowrap;
  padding: 12px 15px;
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
}

@media (max-width: 1200px) {
  .tabla-embarques {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}
</style>
