<template>
  <div class="lista-embarques">
 
    <div v-if="cargando" class="cargando">Cargando embarques...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <table v-if="embarques.length > 0" class="tabla-embarques">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Clientes</th>
            <th>Total Kilos</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="embarque in embarques" :key="embarque.id">
            <td>{{ formatearFecha(embarque.fecha) }}</td>
            <td>{{ obtenerClientes(embarque) }}</td>
            <td>{{ calcularTotalKilos(embarque) }} kg</td>
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
        this.embarques = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
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
    obtenerClientes(embarque) {
      return embarque.clientes.map(cliente => cliente.nombre).join(', ');
    },
    calcularTotalKilos(embarque) {
      console.log('Calculando total para embarque:', embarque);
      const total = embarque.clientes.reduce((total, cliente) => {
        console.log('Cliente:', cliente.nombre);
        const clienteTotal = cliente.productos ? cliente.productos.reduce((clienteTotal, producto) => {
          console.log('Producto:', producto.nombre, 'Kilos:', producto.totalKilos);
          return clienteTotal + (parseFloat(producto.totalKilos) || 0);
        }, 0) : 0;
        console.log('Total del cliente:', clienteTotal);
        return total + clienteTotal;
      }, 0);
      console.log('Total final:', total);
      return total.toFixed(1);
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
    }
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
</style>
