<template>
    <div class="sacadas-container">
        <div class="back-button-container">
      <BackButton to="/sacadas" />
    </div>
      <h2 class="date-header">{{ currentDate }}</h2>
      <div class="sacadas-content">
        <div class="entradas-section">
          <h3>Entradas</h3>
          <div class="input-group">
            <select v-model="newEntrada.proveedor" required>
              <option value="">Proveedor</option>
              <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.nombre">
                {{ proveedor.nombre }}
              </option>
            </select>
            <select v-model="newEntrada.producto" required>
              <option value="">Tipo</option>
              <option v-for="producto in productosOpciones" :key="producto" :value="producto">
                {{ producto }}
              </option>
            </select>
            <select v-model="newEntrada.medida" required>
              <option value="">Medida</option>
              <option v-for="medida in medidas" :key="medida.id" :value="medida.nombre">
                {{ medida.nombre }}
              </option>
            </select>
            <input v-model.number="newEntrada.kilos" type="number" placeholder="Kilos" step="0.1" required />
            <button @click="addEntrada">Agregar Entrada</button>
          </div>
          <ul class="list">
            <li v-for="(entrada, index) in entradas" :key="'entrada-' + index">
              {{ entrada.proveedor }} - {{ entrada.producto }} - {{ entrada.medida }}: {{ formatNumber(entrada.kilos) }} kg
              <button @click="removeEntrada(index)" class="delete-btn">&times;</button>
            </li>
          </ul>
          <p class="total">Total Entradas: {{ formatNumber(totalEntradas) }} kg</p>
        </div>
        
        <div class="salidas-section">
  <h3>Salidas</h3>
  <div class="input-group">
    <select v-model="newSalida.proveedor" required>
      <option value="">Proveedor</option>
      <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.nombre">
        {{ proveedor.nombre }}
      </option>
    </select>
    <select v-model="newSalida.producto" required>
      <option value="">Tipo</option>
      <option v-for="producto in productosOpciones" :key="producto" :value="producto">
        {{ producto }}
      </option>
    </select>
    <select v-model="newSalida.medida" required>
      <option value="">Medida</option>
      <option v-for="medida in medidas" :key="medida.id" :value="medida.nombre">
        {{ medida.nombre }}
      </option>
    </select>
    <input v-model.number="newSalida.kilos" type="number" placeholder="Kilos" step="0.1" required />
    <button @click="addSalida">Agregar Salida</button>
  </div>
  <ul class="list">
    <li v-for="(salida, index) in salidas" :key="'salida-' + index">
      {{ salida.proveedor }} - {{ salida.producto }} - {{ salida.medida }}: {{ formatNumber(salida.kilos) }} kg
      <button @click="removeSalida(index)" class="delete-btn">&times;</button>
    </li>
  </ul>
  <p class="total">Total Salidas: {{ formatNumber(totalSalidas) }} kg</p>
</div>
      </div>
      
      <div class="summary">
        <h3>Resumen del Día</h3>
        <p>Total Entradas: {{ formatNumber(totalEntradas) }} kg</p>
        <p>Total Salidas: {{ formatNumber(totalSalidas) }} kg</p>
        <p>Balance: {{ formatNumber(balance) }} kg</p>
      </div>
      
      <button @click="saveReport" class="save-button">Guardar Informe del Día</button>
    </div>
  </template>
  
  <script>
  import { ref, computed, onMounted } from 'vue';
  import { db } from '@/firebase';
  import { collection, addDoc, getDocs } from 'firebase/firestore';
  import BackButton from '../components/BackButton.vue';
  
  export default {
    name: 'Sacadas',
    components: {
    BackButton
  },
    setup() {
      const currentDate = ref(new Date().toLocaleDateString());
      const entradas = ref([]);
      const salidas = ref([]);
      const proveedores = ref([]);
      const medidas = ref([]);
      const newEntrada = ref({ proveedor: '', producto: '', medida: '', kilos: null });
      const newSalida = ref({ proveedor: '', producto: '', medida: '', kilos: null });
  
      const productosOpciones = ["Cam s/c", "Cam c/c"];
  
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
  
      const addEntrada = () => {
        if (newEntrada.value.proveedor && newEntrada.value.producto && newEntrada.value.medida && newEntrada.value.kilos) {
          entradas.value.push({
            proveedor: newEntrada.value.proveedor,
            producto: newEntrada.value.producto,
            medida: newEntrada.value.medida,
            kilos: Number(newEntrada.value.kilos.toFixed(1))
          });
          newEntrada.value = { proveedor: '', producto: '', medida: '', kilos: null };
        }
      };
      const addSalida = () => {
  if (newSalida.value.proveedor && newSalida.value.producto && newSalida.value.medida && newSalida.value.kilos) {
    salidas.value.push({
      proveedor: newSalida.value.proveedor,
      producto: newSalida.value.producto,
      medida: newSalida.value.medida,
      kilos: Number(newSalida.value.kilos.toFixed(1))
    });
    newSalida.value = { proveedor: '', producto: '', medida: '', kilos: null };
  }
};
  
      const removeEntrada = (index) => {
        entradas.value.splice(index, 1);
      };
  
      const removeSalida = (index) => {
        salidas.value.splice(index, 1);
      };
  
      const totalEntradas = computed(() => {
        return Number(entradas.value.reduce((total, entrada) => total + entrada.kilos, 0).toFixed(1));
      });
  
      const totalSalidas = computed(() => {
        return Number(salidas.value.reduce((total, salida) => total + salida.kilos, 0).toFixed(1));
      });
  
      const balance = computed(() => {
        return Number((totalEntradas.value - totalSalidas.value).toFixed(1));
      });
  
      const formatNumber = (value) => {
        return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      };
  
      const saveReport = async () => {
        try {
          const docRef = await addDoc(collection(db, 'sacadas'), {
            fecha: currentDate.value,
            entradas: entradas.value,
            salidas: salidas.value,
            totalEntradas: totalEntradas.value,
            totalSalidas: totalSalidas.value,
            balance: balance.value
          });
          console.log("Documento guardado con ID: ", docRef.id);
          alert("Informe del día guardado exitosamente");
        } catch (error) {
          console.error("Error al guardar el documento: ", error);
          alert("Error al guardar el informe del día");
        }
      };
  
      onMounted(() => {
        loadProveedores();
        loadMedidas();
      });
  
      return {
        currentDate,
        entradas,
        salidas,
        proveedores,
        medidas,
        productosOpciones,
        newEntrada,
        newSalida,
        addEntrada,
        addSalida,
        removeEntrada,
        removeSalida,
        totalEntradas,
        totalSalidas,
        balance,
        formatNumber,
        saveReport
      };
    }
  };
  </script>
  <style scoped>
  .sacadas-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    background-color: #e8f0fe;
    border-radius: 20px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .date-header {
    text-align: center;
    color: #3760b0;
    font-size: 1.5em;
    margin-bottom: 20px;
  }
  
  .sacadas-content {
    display: flex;
    justify-content: space-between;
  }
  
  .entradas-section, .salidas-section {
    width: 48%;
  }
  
  h3 {
    color: #3760b0;
    border-bottom: 2px solid #3760b0;
    padding-bottom: 10px;
  }
  
  .input-group {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .input-group select,
  .input-group input {
    flex: 1;
    min-width: 120px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .input-group select {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat: no-repeat;
    background-position: right 10px top 50%;
    background-size: 12px auto;
    padding-right: 30px;
  }
  
  button {
    background-color: #3760b0;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.1s;
    font-size: 14px;
  }
  
  button:hover {
    background-color: #2a4a87;
  }
  
  button:active {
    transform: scale(0.98);
  }
  
  .list {
    list-style-type: none;
    padding: 0;
  }
  
  .list li {
    background-color: white;
    margin-bottom: 10px;
    padding: 12px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }
  
  .delete-btn {
    background-color: transparent;
    color: #ff4136;
    border: none;
    font-size: 1.2em;
    cursor: pointer;
    padding: 0 5px;
    transition: color 0.3s;
  }
  
  .delete-btn:hover {
    color: #d50000;
  }
  
  .total {
    font-weight: bold;
    color: #3760b0;
    font-size: 16px;
    margin-top: 15px;
  }
  
  .summary {
    margin-top: 30px;
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .summary h3 {
    color: #3760b0;
    border-bottom: none;
    margin-bottom: 15px;
  }
  
  .summary p {
    margin: 10px 0;
    font-size: 16px;
  }
  
  .save-button {
    display: block;
    width: 100%;
    margin-top: 20px;
    padding: 12px;
    font-size: 1.1em;
    background-color: #28a745;
  }
  
  .save-button:hover {
    background-color: #218838;
  }
  
  @media (max-width: 768px) {
    .sacadas-content {
      flex-direction: column;
    }
  
    .entradas-section, .salidas-section {
      width: 100%;
      margin-bottom: 30px;
    }
  
    .input-group {
      flex-direction: column;
    }
  
    .input-group select,
    .input-group input,
    .input-group button {
      width: 100%;
    }
  }
  </style>