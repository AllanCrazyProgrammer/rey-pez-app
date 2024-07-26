<template>
  <div class="gestionar-productos-container">
    <div class="back-button-container">
      <BackButton to="/sacadas" />
    </div>
    <h1>Gestión de Productos</h1>
    
    <div class="actions-container">
      <router-link to="/gestionar-medidas" class="action-button">
        Gestionar Medidas
      </router-link>
      <router-link to="/gestionar-proveedores" class="action-button">
        Gestionar Proveedores
      </router-link>
    </div>

    <div class="modify-product-form">
      <h2>Modificar Existencia de Producto</h2>
      <form @submit.prevent="modifyProduct">
        <div class="form-group">
          <label for="tipo">Tipo:</label>
          <select v-model="modifyProductData.tipo" id="tipo" required>
            <option value="proveedor">Proveedor</option>
            <option value="maquila">Maquila</option>
          </select>
        </div>
        <div class="form-group">
          <label for="proveedor">Proveedor/Maquila:</label>
          <select v-model="modifyProductData.proveedor" id="proveedor" required>
            <option value="">Seleccione un proveedor/maquila</option>
            <option v-for="prov in proveedoresFiltrados" :key="prov.id" :value="prov.nombre">
              {{ prov.nombre }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="medida">Medida:</label>
          <select v-model="modifyProductData.medida" id="medida" required>
            <option value="">Seleccione una medida</option>
            <option v-for="medida in medidasFiltradas" :key="medida.id" :value="medida.nombre">
              {{ medida.nombre }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="kilos">Kilos:</label>
          <input v-model.number="modifyProductData.kilos" id="kilos" type="number" step="0.1" required>
        </div>
        <div class="form-group">
          <label for="operacion">Operación:</label>
          <select v-model="modifyProductData.operacion" id="operacion" required>
            <option value="sumar">Sumar</option>
            <option value="restar">Restar</option>
          </select>
        </div>
      
        <button type="submit" class="submit-btn">Modificar Existencia</button>
      </form>
    </div>

    <div class="products-list">
      <h2>Existencias Actuales</h2>
      <ul>
        <li v-for="(proveedor, proveedorNombre) in existencias" :key="proveedorNombre">
          <strong>{{ proveedorNombre }}</strong>
          <ul>
            <li v-for="(kilos, medida) in proveedor" :key="medida">
              {{ medida }} - {{ formatNumber(kilos) }} kg
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <router-link to="/sacadas" class="back-btn">Volver al Menú de Sacadas</router-link>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { db } from '@/firebase';
import { collection, getDocs, doc, updateDoc, query, where, addDoc } from 'firebase/firestore';
import BackButton from './BackButton.vue';

export default {
  name: 'GestionarProductos',
  components: {
    BackButton
  },
  setup() {
    const existencias = ref({});
    const medidas = ref([]);
    const proveedores = ref([]);
    const modifyProductData = ref({
      tipo: 'proveedor',
      proveedor: '',
      medida: '',
      kilos: null,
      operacion: 'sumar'
    });

    const loadExistencias = async () => {
      try {
        const sacadasSnapshot = await getDocs(collection(db, 'sacadas'));
        const newExistencias = {};

        sacadasSnapshot.forEach(doc => {
          const sacada = doc.data();
          sacada.entradas.forEach(entrada => {
            if (!newExistencias[entrada.proveedor]) {
              newExistencias[entrada.proveedor] = {};
            }
            if (!newExistencias[entrada.proveedor][entrada.medida]) {
              newExistencias[entrada.proveedor][entrada.medida] = 0;
            }
            newExistencias[entrada.proveedor][entrada.medida] += entrada.kilos;
          });
          sacada.salidas.forEach(salida => {
            if (!newExistencias[salida.proveedor]) {
              newExistencias[salida.proveedor] = {};
            }
            if (!newExistencias[salida.proveedor][salida.medida]) {
              newExistencias[salida.proveedor][salida.medida] = 0;
            }
            newExistencias[salida.proveedor][salida.medida] -= salida.kilos;
          });
        });

        // Filtrar medidas con 0 o menos kilos
        Object.keys(newExistencias).forEach(proveedor => {
          newExistencias[proveedor] = Object.fromEntries(
            Object.entries(newExistencias[proveedor]).filter(([_, kilos]) => kilos > 0)
          );
        });

        existencias.value = newExistencias;
      } catch (error) {
        console.error("Error al cargar existencias: ", error);
      }
    };

    const loadMedidas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'medidas'));
        medidas.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar medidas: ", error);
      }
    };

    const loadProveedores = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedores'));
        proveedores.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar proveedores: ", error);
      }
    };

    const modifyProduct = async () => {
      try {
        const { proveedor, medida, kilos, operacion } = modifyProductData.value;
        const sacadaData = {
          fecha: new Date(),
          entradas: [],
          salidas: []
        };

        if (operacion === 'sumar') {
          sacadaData.entradas.push({ proveedor, medida, kilos });
        } else {
          sacadaData.salidas.push({ proveedor, medida, kilos });
        }

        await addDoc(collection(db, 'sacadas'), sacadaData);

        alert('Existencia modificada con éxito');
        modifyProductData.value = { tipo: 'proveedor', proveedor: '', medida: '', kilos: null, operacion: 'sumar' };
        loadExistencias();
      } catch (error) {
        console.error("Error al modificar producto: ", error);
        alert('Error al modificar la existencia del producto');
      }
    };

    const formatNumber = (value) => {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };

    const proveedoresFiltrados = computed(() => {
      return proveedores.value.filter(prov => 
        modifyProductData.value.tipo === 'proveedor' ? prov.tipo !== 'maquila' : prov.tipo === 'maquila'
      );
    });

    const medidasFiltradas = computed(() => {
      return medidas.value.filter(medida => 
        modifyProductData.value.tipo === 'proveedor' ? medida.tipo === 'general' : medida.tipo === 'maquila'
      );
    });

    onMounted(() => {
      loadExistencias();
      loadMedidas();
      loadProveedores();
    });

    return {
      existencias,
      medidas,
      proveedores,
      modifyProductData,
      modifyProduct,
      formatNumber,
      proveedoresFiltrados,
      medidasFiltradas
    };
  }
};
</script>

<style scoped>
.gestionar-productos-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #e8f0fe;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

h1, h2 {
  color: #3760b0;
}

.actions-container {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
}

.action-button, .submit-btn, .back-btn {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.action-button:hover, .submit-btn:hover, .back-btn:hover {
  background-color: #2a4a87;
}

.modify-product-form, .products-list {
  margin-top: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #3760b0;
}

.form-group input, .form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  background-color: white;
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-btn {
  margin-top: 20px;
}

.back-button-container {
  margin-bottom: 20px;
}
</style>