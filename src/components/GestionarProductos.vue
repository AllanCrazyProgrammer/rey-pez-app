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

    <div class="add-product-form">
      <h2>Agregar Producto</h2>
      <form @submit.prevent="addProduct">
        <div class="form-group">
  <label for="producto">Producto:</label>
  <select v-model="newProduct.nombre" id="producto" required>
    <option value="">Seleccione un producto</option>
    <option v-for="producto in productosOpciones" :key="producto" :value="producto">
      {{ producto }}
    </option>
  </select>
</div>
        <div class="form-group">
          <label for="proveedor">Proveedor:</label>
          <select v-model="newProduct.proveedor" id="proveedor" required>
            <option value="">Seleccione un proveedor</option>
            <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.nombre">
              {{ proveedor.nombre }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="medida">Medida:</label>
          <select v-model="newProduct.medida" id="medida" required>
            <option value="">Seleccione una medida</option>
            <option v-for="medida in medidas" :key="medida.id" :value="medida.nombre">
              {{ medida.nombre }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="kilos">Kilos:</label>
          <input v-model.number="newProduct.kilos" id="kilos" type="number" step="0.1" required>
        </div>
        <button type="submit" class="submit-btn">Añadir Producto</button>
      </form>
    </div>

    <div class="products-list">
      <h2>Lista de Productos</h2>
      <ul>
        <li v-for="product in products" :key="product.id">
          <div class="product-info">
            <strong>{{ product.proveedor }}</strong> - {{ product.nombre }} - {{ product.medida }} - {{ formatNumber(product.kilos) }} kg
          </div>
          <button @click="deleteProduct(product.id)" class="delete-btn">Eliminar</button>
        </li>
      </ul>
    </div>

    <router-link to="/sacadas" class="back-btn">Volver al Menú de Sacadas</router-link>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import BackButton from './BackButton.vue';

export default {
  name: 'GestionarProductos',
  components: {
    BackButton
  },
  setup() {
    const products = ref([]);
    const medidas = ref([]);
    const proveedores = ref([]);
    const newProduct = ref({
      nombre: '',
      proveedor: '',
      medida: '',
      kilos: null
    });

    const productosOpciones = [
      "Cam s/c",
      "Cam c/c"
      // Añade aquí más opciones de productos según necesites
    ];

    const loadProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        products.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar productos: ", error);
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

    const addProduct = async () => {
      try {
        await addDoc(collection(db, 'products'), {
          nombre: newProduct.value.nombre,
          proveedor: newProduct.value.proveedor,
          medida: newProduct.value.medida,
          kilos: Number(newProduct.value.kilos.toFixed(1))
        });
        newProduct.value = { nombre: '', proveedor: '', medida: '', kilos: null };
        loadProducts();
      } catch (error) {
        console.error("Error al añadir producto: ", error);
      }
    };

    const deleteProduct = async (productId) => {
      if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        try {
          await deleteDoc(doc(db, 'products', productId));
          loadProducts();
        } catch (error) {
          console.error("Error al eliminar producto: ", error);
        }
      }
    };

    const formatNumber = (value) => {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };

    onMounted(() => {
      loadProducts();
      loadMedidas();
      loadProveedores();
    });

    return {
      products,
      medidas,
      proveedores,
      productosOpciones,  
      newProduct,
      addProduct,
      deleteProduct,
      formatNumber
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

.add-product-form, .products-list {
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

.delete-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-btn:hover {
  background-color: #c82333;
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