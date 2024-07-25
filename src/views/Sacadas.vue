<template>
    <div class="sacadas-container" v-if="isLoaded">
      <div class="back-button-container">
        <BackButton to="/sacadas" />
      </div>
      <h2 class="date-header">{{ formattedDate }}</h2>
      <div class="sacadas-content">
        <div class="entradas-section">
          <h3>Entradas</h3>
          <div class="input-group">
            <select v-model="newEntrada.tipo" required @change="resetEntradaSelections">
              <option value="">Tipo</option>
              <option value="proveedor">Proveedor</option>
              <option value="maquila">Maquila</option>
            </select>
            <select v-model="newEntrada.proveedor" required>
              <option value="">{{ newEntrada.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}</option>
              <option v-for="prov in filteredProveedoresEntrada" :key="prov.id" :value="prov.nombre">
                {{ prov.nombre }}
              </option>
            </select>
            <select v-model="newEntrada.medida" required>
              <option value="">Medida</option>
              <option v-for="medida in filteredMedidasEntrada" :key="medida.id" :value="medida.nombre">
                {{ medida.nombre }}
              </option>
            </select>
            <input v-model.number="newEntrada.kilos" type="number" placeholder="Kilos" step="0.1" required />
            <button @click="addEntrada">Agregar Entrada</button>
          </div>
          <ul class="list">
            <li v-for="(entrada, index) in entradas" :key="'entrada-' + index">
              {{ entrada.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}: {{ entrada.proveedor }} - {{ entrada.medida }}: {{ formatNumber(entrada.kilos) }} kg
              <button @click="removeEntrada(index)" class="delete-btn">&times;</button>
            </li>
          </ul>
          <p class="total">Total Entradas: {{ formatNumber(totalEntradas) }} kg</p>
        </div>
        
        <div class="salidas-section">
          <h3>Salidas</h3>
          <div class="input-group">
            <select v-model="newSalida.tipo" required @change="resetSalidaSelections">
              <option value="">Tipo</option>
              <option value="proveedor">Proveedor</option>
              <option value="maquila">Maquila</option>
            </select>
            <select v-model="newSalida.proveedor" required>
              <option value="">{{ newSalida.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}</option>
              <option v-for="prov in filteredProveedoresSalida" :key="prov.id" :value="prov.nombre">
                {{ prov.nombre }}
              </option>
            </select>
            <select v-model="newSalida.medida" required>
              <option value="">Medida</option>
              <option v-for="medida in filteredMedidasSalida" :key="medida.id" :value="medida.nombre">
                {{ medida.nombre }}
              </option>
            </select>
            <input v-model.number="newSalida.kilos" type="number" placeholder="Kilos" step="0.1" required />
            <button @click="addSalida">Agregar Salida</button>
          </div>
          <ul class="list">
            <li v-for="(salida, index) in salidas" :key="'salida-' + index">
              {{ salida.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}: {{ salida.proveedor }} - {{ salida.medida }}: {{ formatNumber(salida.kilos) }} kg
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
      </div>
      
      <button @click="saveReport" class="save-button">{{ isEditing ? 'Actualizar' : 'Guardar' }} Informe del Día</button>
    </div>
  </template>
  
  <script>
  import { db } from '@/firebase';
  import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
  import BackButton from '../components/BackButton.vue';
  
  export default {
    name: 'Sacadas',
    components: {
      BackButton
    },
    data() {
      return {
        currentDate: new Date(),
        entradas: [],
        salidas: [],
        proveedores: [],
        medidas: [],
        newEntrada: { tipo: 'proveedor', proveedor: '', medida: '', kilos: null },
        newSalida: { tipo: 'proveedor', proveedor: '', medida: '', kilos: null },
        isEditing: false,
        sacadaId: null,
        isLoaded: false
      };
    },
    computed: {
      formattedDate() {
        return this.currentDate.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
      },
      filteredProveedoresEntrada() {
        return this.proveedores.filter(p => p.tipo === this.newEntrada.tipo);
      },
      filteredProveedoresSalida() {
        return this.proveedores.filter(p => p.tipo === this.newSalida.tipo);
      },
      filteredMedidasEntrada() {
        if (this.newEntrada.tipo === 'maquila') {
          const maquila = this.proveedores.find(p => p.nombre === this.newEntrada.proveedor);
          return maquila ? this.medidas.filter(m => m.tipo === 'maquila' && m.maquilaId === maquila.id) : [];
        } else {
          return this.medidas.filter(m => m.tipo === 'general');
        }
      },
      filteredMedidasSalida() {
        if (this.newSalida.tipo === 'maquila') {
          const maquila = this.proveedores.find(p => p.nombre === this.newSalida.proveedor);
          return maquila ? this.medidas.filter(m => m.tipo === 'maquila' && m.maquilaId === maquila.id) : [];
        } else {
          return this.medidas.filter(m => m.tipo === 'general');
        }
      },
      totalEntradas() {
        return Number(this.entradas.reduce((total, entrada) => total + entrada.kilos, 0).toFixed(1));
      },
      totalSalidas() {
        return Number(this.salidas.reduce((total, salida) => total + salida.kilos, 0).toFixed(1));
      }
    },
    methods: {
      async loadProveedores() {
        const querySnapshot = await getDocs(collection(db, 'proveedores'));
        this.proveedores = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      async loadMedidas() {
        const querySnapshot = await getDocs(collection(db, 'medidas'));
        this.medidas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      resetEntradaSelections() {
        this.newEntrada.proveedor = '';
        this.newEntrada.medida = '';
      },
      resetSalidaSelections() {
        this.newSalida.proveedor = '';
        this.newSalida.medida = '';
      },
      addEntrada() {
        if (this.newEntrada.tipo && this.newEntrada.proveedor && this.newEntrada.medida && this.newEntrada.kilos) {
          this.entradas.push({
            tipo: this.newEntrada.tipo,
            proveedor: this.newEntrada.proveedor,
            medida: this.newEntrada.medida,
            kilos: Number(this.newEntrada.kilos.toFixed(1))
          });
          this.newEntrada = { tipo: 'proveedor', proveedor: '', medida: '', kilos: null };
        }
      },
      addSalida() {
        if (this.newSalida.tipo && this.newSalida.proveedor && this.newSalida.medida && this.newSalida.kilos) {
          this.salidas.push({
            tipo: this.newSalida.tipo,
            proveedor: this.newSalida.proveedor,
            medida: this.newSalida.medida,
            kilos: Number(this.newSalida.kilos.toFixed(1))
          });
          this.newSalida = { tipo: 'proveedor', proveedor: '', medida: '', kilos: null };
        }
      },
      removeEntrada(index) {
        this.entradas.splice(index, 1);
      },
      removeSalida(index) {
        this.salidas.splice(index, 1);
      },
      formatNumber(value) {
        return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      },
      async loadSacada(id) {
        console.log("Cargando sacada con ID:", id);
        const docRef = doc(db, 'sacadas', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          console.log("Documento encontrado:", docSnap.data());
          const data = docSnap.data();
          this.currentDate = data.fecha instanceof Date ? data.fecha : data.fecha.toDate();
          console.log("Fecha cargada:", this.currentDate);
          this.entradas = data.entradas || [];
          console.log("Entradas cargadas:", this.entradas);
          this.salidas = data.salidas || [];
          console.log("Salidas cargadas:", this.salidas);
          this.sacadaId = id;
          this.isEditing = true;
        } else {
          console.log("No se encontró el documento con ID:", id);
        }
      },
      async saveReport() {
        try {
          const reportData = {
            fecha: this.currentDate,
            entradas: this.entradas,
            salidas: this.salidas,
            totalEntradas: this.totalEntradas,
            totalSalidas: this.totalSalidas
          };
  
          if (this.isEditing) {
            await updateDoc(doc(db, 'sacadas', this.sacadaId), reportData);
            alert("Informe del día actualizado exitosamente");
          } else {
            await addDoc(collection(db, 'sacadas'), reportData);
            alert("Informe del día guardado exitosamente");
          }
          // Redirigir a la lista de sacadas o reiniciar el formulario según sea necesario
        } catch (error) {
          console.error("Error al guardar/actualizar el documento: ", error);
          alert("Error al guardar/actualizar el informe del día: " + error.message);
        }
      }
    },
    async created() {
      await this.loadProveedores();
      await this.loadMedidas();
      if (this.$route.params.id) {
        console.log("ID de la ruta encontrado:", this.$route.params.id);
        await this.loadSacada(this.$route.params.id);
      } else {
        console.log("No se encontró ID en la ruta");
      }
      this.isLoaded = true;
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