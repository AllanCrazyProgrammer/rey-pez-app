<template>
  <div>
    <div v-if="!mostrarImpresion" class="pedidos-limpio-container">
      <h2>Pedido de Camarón Limpio</h2>
      
      <div class="header-container">
        <div class="fecha-container">
          <label for="fecha">Fecha:</label>
          <input 
            type="date" 
            id="fecha" 
            v-model="fecha" 
            required
            :max="fechaMaxima">
        </div>
        <MedidasModal @medidas-actualizadas="actualizarMedidas" />
      </div>

      <!-- Primera página - Otilio -->
      <div class="clientes-grid">
        <div class="cliente-seccion">
          <h2 class="cliente-titulo">Otilio</h2>
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoOtilio" :key="index" class="pedido-item">
              <div class="kilos-container">
                <div class="label-container">
                  <label>Kilos/Taras:</label>
                  <div class="tara-checkbox">
                    <input type="checkbox" v-model="item.esTara" id="taraOtilio">
                    <label for="taraOtilio">T</label>
                  </div>
                </div>
                <input type="number" v-model="item.kilos" class="input-grande input-kilos">
              </div>
              <div class="input-group">
                <div class="label-container">
                  <label>Medida:</label>
                  <button 
                    class="btn-proveedor"
                    @click="abrirModalProveedor(item)"
                    :class="{ 'active': item.esProveedor }"
                    :title="item.proveedor || 'Agregar proveedor'"
                  >
                    P
                  </button>
                </div>
                <select v-model="item.medida" class="input-grande input-medida">
                  <option value="">Seleccionar medida</option>
                  <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                    {{ medida.nombre }}
                  </option>
                </select>
              </div>
              <div class="input-group">
                <label>Tipo:</label>
                <select v-model="item.tipo" class="input-grande input-tipo">
                  <option value="">Seleccionar tipo</option>
                  <option value="S/H20">S/H20</option>
                  <option value="C/H20">C/H20</option>
                  <option value="Sellada">Sellada</option>
                </select>
              </div>
              <button @click="eliminarPedidoOtilio(index)" class="btn-eliminar" v-if="pedidoOtilio.length > 1">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <button @click="agregarFilaOtilio" class="btn-agregar">+ Agregar Fila</button>
        </div>

        <!-- Catarro -->
        <div class="cliente-seccion">
          <h3 class="cliente-titulo">Catarro</h3>
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoCatarro" :key="index" class="pedido-item">
              <div class="kilos-container">
                <div class="label-container">
                  <label>Kilos/Taras:</label>
                  <div class="tara-checkbox">
                    <input type="checkbox" v-model="item.esTara" id="taraCatarro">
                    <label for="taraCatarro">T</label>
                  </div>
                </div>
                <input type="number" v-model="item.kilos" class="input-grande input-kilos">
              </div>
              <div class="input-group">
                <div class="label-container">
                  <label>Medida:</label>
                  <button 
                    class="btn-proveedor"
                    @click="abrirModalProveedor(item)"
                    :class="{ 'active': item.esProveedor }"
                    :title="item.proveedor || 'Agregar proveedor'"
                  >
                    P
                  </button>
                </div>
                <select v-model="item.medida" class="input-grande input-medida">
                  <option value="">Seleccionar medida</option>
                  <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                    {{ medida.nombre }}
                  </option>
                </select>
              </div>
              <div class="input-group">
                <label>Tipo:</label>
                <select v-model="item.tipo" class="input-grande input-tipo">
                  <option value="">Seleccionar tipo</option>
                  <option value="S/H20">S/H20</option>
                  <option value="C/H20">C/H20</option>
                </select>
              </div>
              <button @click="eliminarPedidoCatarro(index)" class="btn-eliminar" v-if="pedidoCatarro.length > 1">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <button @click="agregarFilaCatarro" class="btn-agregar">+ Agregar Fila</button>
        </div>

        <!-- Joselito -->
        <div class="cliente-seccion">
          <h3 class="cliente-titulo">Joselito</h3>
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoJoselito" :key="index" class="pedido-item">
              <div class="kilos-container">
                <div class="label-container">
                  <label>Kilos/Taras:</label>
                  <div class="tara-checkbox">
                    <input type="checkbox" v-model="item.esTara" id="taraJoselito">
                    <label for="taraJoselito">T</label>
                  </div>
                </div>
                <input type="number" v-model="item.kilos" class="input-grande input-kilos">
              </div>
              <div class="input-group">
                <div class="label-container">
                  <label>Medida:</label>
                  <button 
                    class="btn-proveedor"
                    @click="abrirModalProveedor(item)"
                    :class="{ 'active': item.esProveedor }"
                    :title="item.proveedor || 'Agregar proveedor'"
                  >
                    P
                  </button>
                </div>
                <select v-model="item.medida" class="input-grande input-medida">
                  <option value="">Seleccionar medida</option>
                  <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                    {{ medida.nombre }}
                  </option>
                </select>
              </div>
              <div class="input-group">
                <label>Tipo:</label>
                <select v-model="item.tipo" class="input-grande input-tipo">
                  <option value="">Seleccionar tipo</option>
                  <option value="S/H20">S/H20</option>
                  <option value="C/H20">C/H20</option>
                  <option value="1.35 y .15">1.35 y .15</option>
                </select>
              </div>
              <button @click="eliminarPedidoJoselito(index)" class="btn-eliminar" v-if="pedidoJoselito.length > 1">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <button @click="agregarFilaJoselito" class="btn-agregar">+ Agregar Fila</button>
        </div>

        <!-- Ozuna -->
        <div class="cliente-seccion">
          <h3 class="cliente-titulo">Ozuna</h3>
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoOzuna" :key="index" class="pedido-item">
              <div class="kilos-container">
                <div class="label-container">
                  <label>Kilos/Taras:</label>
                  <div class="tara-checkbox">
                    <input type="checkbox" v-model="item.esTara" id="taraOzuna">
                    <label for="taraOzuna">T</label>
                  </div>
                </div>
                <input type="number" v-model="item.kilos" class="input-grande input-kilos">
              </div>
              <div class="input-group">
                <div class="label-container">
                  <label>Medida:</label>
                  <button 
                    class="btn-proveedor"
                    @click="abrirModalProveedor(item)"
                    :class="{ 'active': item.esProveedor }"
                    :title="item.proveedor || 'Agregar proveedor'"
                  >
                    P
                  </button>
                </div>
                <select v-model="item.medida" class="input-grande input-medida">
                  <option value="">Seleccionar medida</option>
                  <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                    {{ medida.nombre }}
                  </option>
                </select>
              </div>
              <div class="input-group">
                <label>Tipo:</label>
                <select v-model="item.tipo" class="input-grande input-tipo">
                  <option value="">Seleccionar tipo</option>
                  <option value="S/H20">S/H20</option>
                </select>
              </div>
              <button @click="eliminarPedidoOzuna(index)" class="btn-eliminar" v-if="pedidoOzuna.length > 1">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <button @click="agregarFilaOzuna" class="btn-agregar">+ Agregar Fila</button>
        </div>
      </div>

      <div class="buttons-container">
        <button @click="guardarPedido" class="btn-guardar">Guardar Pedido</button>
        <button @click="mostrarVistaImpresion" class="btn-imprimir">
          <i class="fas fa-print"></i> Vista Previa
        </button>
        <button @click="$router.push('/procesos/pedidos')" class="btn-cancelar">Cancelar</button>
      </div>
    </div>

    <PedidoLimpioImpresion
      v-else
      :fecha="fecha"
      :pedidoOtilio="pedidoOtilio"
      :pedidoCatarro="pedidoCatarro"
      :pedidoJoselito="pedidoJoselito"
      :pedidoOzuna="pedidoOzuna"
      @volver="mostrarImpresion = false"
    />

    <ProveedorModal
      :mostrar="mostrarModalProveedor"
      :proveedor="itemSeleccionado ? itemSeleccionado.proveedor : ''"
      @cerrar="mostrarModalProveedor = false"
      @guardar="guardarProveedor"
    />
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, addDoc, Timestamp, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import PedidoLimpioImpresion from './PedidoLimpioImpresion.vue'
import MedidasModal from '@/components/MedidasModal.vue'
import ProveedorModal from '@/components/ProveedorModal.vue'

export default {
  name: 'PedidosLimpio',
  components: {
    PedidoLimpioImpresion,
    MedidasModal,
    ProveedorModal
  },
  data() {
    return {
      fecha: new Date().toISOString().split('T')[0],
      pedidoOtilio: [{ kilos: null, medida: '', tipo: '', esTara: true, esProveedor: false, proveedor: '' }],
      pedidoCatarro: [{ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' }],
      pedidoJoselito: [{ kilos: null, medida: '', tipo: '', esTara: false, esProveedor: false, proveedor: '' }],
      pedidoOzuna: [{ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' }],
      mostrarImpresion: false,
      mostrarModalProveedor: false,
      itemSeleccionado: null,
      medidas: [],
      editando: false,
      pedidoId: null
    }
  },
  async created() {
    await this.cargarMedidas();
    
    // Verificar si estamos editando un pedido existente
    const { edit, id, fecha } = this.$route.query;
    if (edit === 'true' && id) {
      this.editando = true;
      this.pedidoId = id;
      await this.cargarPedido(id);
    } else if (fecha) {
      this.fecha = fecha;
    }
  },
  computed: {
    fechaMaxima() {
      const maxDate = new Date()
      maxDate.setMonth(maxDate.getMonth() + 3)
      return maxDate.toISOString().split('T')[0]
    },
    medidasOrdenadas() {
      // Separar medidas especiales y de granja
      const medidasEspeciales = this.medidas.filter(m => m.tipo === 'especial')
      const medidasGranja = this.medidas.filter(m => m.tipo === 'granja')

      // Ordenar medidas especiales alfabéticamente
      medidasEspeciales.sort((a, b) => a.nombre.localeCompare(b.nombre))

      // Ordenar medidas de granja por número
      medidasGranja.sort((a, b) => {
        const numA = parseInt(a.nombre.split('/')[0])
        const numB = parseInt(b.nombre.split('/')[0])
        return numA - numB
      })

      // Combinar ambas listas con especiales primero
      return [...medidasEspeciales, ...medidasGranja]
    }
  },
  methods: {
    async cargarMedidas() {
      try {
        const querySnapshot = await getDocs(collection(db, 'medidas'));
        this.medidas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error al cargar las medidas:', error);
      }
    },
    async cargarPedido(id) {
      try {
        const pedidoDoc = await getDoc(doc(db, 'pedidos', id));
        if (pedidoDoc.exists()) {
          const pedido = pedidoDoc.data();
          this.fecha = pedido.fecha;
          this.pedidoOtilio = pedido.otilio || [{ kilos: null, medida: '', tipo: '', esTara: true, esProveedor: false, proveedor: '' }];
          this.pedidoCatarro = pedido.catarro || [{ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' }];
          this.pedidoJoselito = pedido.joselito || [{ kilos: null, medida: '', tipo: '', esTara: false, esProveedor: false, proveedor: '' }];
          this.pedidoOzuna = pedido.ozuna || [{ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' }];
        } else {
          console.error('No se encontró el pedido');
          alert('No se encontró el pedido');
          this.$router.push('/procesos/pedidos');
        }
      } catch (error) {
        console.error('Error al cargar el pedido:', error);
        alert('Error al cargar el pedido');
      }
    },
    agregarFilaOtilio() {
      this.pedidoOtilio.push({ kilos: null, medida: '', tipo: '', esTara: true, esProveedor: false, proveedor: '' })
    },
    agregarFilaCatarro() {
      this.pedidoCatarro.push({ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' })
    },
    agregarFilaJoselito() {
      this.pedidoJoselito.push({ kilos: null, medida: '', tipo: '', esTara: false, esProveedor: false, proveedor: '' })
    },
    agregarFilaOzuna() {
      this.pedidoOzuna.push({ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' })
    },
    async guardarPedido() {
      try {
        const pedidoData = {
          fecha: this.fecha,
          otilio: this.pedidoOtilio,
          catarro: this.pedidoCatarro,
          joselito: this.pedidoJoselito,
          ozuna: this.pedidoOzuna,
          tipo: 'limpio',
          createdAt: this.editando ? Timestamp.fromDate(new Date(this.fecha)) : Timestamp.now()
        }
        
        if (this.editando && this.pedidoId) {
          await updateDoc(doc(db, 'pedidos', this.pedidoId), pedidoData);
          alert('Pedido actualizado exitosamente');
        } else {
          await addDoc(collection(db, 'pedidos'), pedidoData);
          alert('Pedido guardado exitosamente');
        }
        this.$router.push('/procesos/pedidos');
      } catch (error) {
        console.error('Error al guardar el pedido:', error);
        alert('Error al guardar el pedido. Por favor intente nuevamente.');
      }
    },
    mostrarVistaImpresion() {
      this.mostrarImpresion = true
    },
    actualizarMedidas(nuevasMedidas) {
      this.medidas = nuevasMedidas
    },
    eliminarPedidoOtilio(index) {
      this.pedidoOtilio.splice(index, 1)
      if (this.pedidoOtilio.length === 0) {
        this.agregarFilaOtilio()
      }
    },
    eliminarPedidoCatarro(index) {
      this.pedidoCatarro.splice(index, 1)
      if (this.pedidoCatarro.length === 0) {
        this.agregarFilaCatarro()
      }
    },
    eliminarPedidoJoselito(index) {
      this.pedidoJoselito.splice(index, 1)
      if (this.pedidoJoselito.length === 0) {
        this.agregarFilaJoselito()
      }
    },
    eliminarPedidoOzuna(index) {
      this.pedidoOzuna.splice(index, 1)
      if (this.pedidoOzuna.length === 0) {
        this.agregarFilaOzuna()
      }
    },
    abrirModalProveedor(item) {
      this.itemSeleccionado = item
      this.mostrarModalProveedor = true
    },
    guardarProveedor(proveedor) {
      if (this.itemSeleccionado) {
        this.itemSeleccionado.proveedor = proveedor.trim()
        this.itemSeleccionado.esProveedor = proveedor.trim() !== ''
      }
      this.mostrarModalProveedor = false
      this.itemSeleccionado = null
    },
    manejarCheckboxProveedor(item) {
      if (item.esProveedor) {
        this.abrirModalProveedor(item)
      } else {
        item.proveedor = ''
      }
    }
  }
}
</script>

<style scoped>
.pedidos-limpio-container {
  max-width: 1000px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.fecha-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.clientes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.cliente-seccion {
  background-color: #ffffff;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.cliente-titulo {
  font-size: 24px;
  margin-bottom: 20px;
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
}

.pedido-grid {
  display: grid;
  gap: 15px;
  margin-bottom: 20px;
}

.pedido-item {
  position: relative;
  display: grid;
  grid-template-columns: 0.8fr 2fr 1fr;
  gap: 15px;
  padding: 15px;
  padding-right: 45px;
  background-color: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
  align-items: flex-end;
}

.pedido-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.label-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 0;
  height: 30px;
}

.input-grande {
  padding: 8px 12px;
  font-size: 16px;
  border: 2px solid #bdc3c7;
  border-radius: 6px;
  height: 40px;
  min-width: 0;
}

.input-kilos {
  width: 100%;
  min-width: 100px;
}

.input-medida {
  width: 100%;
  min-width: 160px;
}

.input-tipo {
  width: 100%;
  min-width: 120px;
}

.btn-agregar {
  background-color: #2ecc71;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
}

.buttons-container {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
}

.btn-guardar,
.btn-imprimir,
.btn-cancelar {
  padding: 12px 24px;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-guardar {
  background-color: #3498db;
  color: white;
}

.btn-imprimir {
  background-color: #27ae60;
  color: white;
}

.btn-cancelar {
  background-color: #95a5a6;
  color: white;
}

.kilos-container {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.tara-checkbox {
  display: flex;
  align-items: center;
  gap: 5px;
}

.tara-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin: 0;
}

.tara-checkbox label {
  font-size: 14px;
  color: #34495e;
  cursor: pointer;
  margin: 0;
}

.proveedor-checkbox {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 10px;
}

.proveedor-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  margin: 0;
}

.proveedor-checkbox label {
  font-size: 14px;
  color: #34495e;
  cursor: pointer;
  margin: 0;
}

@media (max-width: 1400px) {
  .pedido-item {
    grid-template-columns: 0.8fr 1.8fr 1fr;
  }
}

@media (max-width: 1200px) {
  .clientes-grid {
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  .pedido-item {
    grid-template-columns: 1fr;
  }
  
  .input-grande {
    width: 100%;
  }
  
  .input-kilos,
  .input-medida,
  .input-tipo {
    min-width: 0;
  }
}

@media (max-width: 768px) {
  .clientes-grid {
    grid-template-columns: 1fr;
  }
  
  .cliente-seccion {
    margin-bottom: 20px;
  }

  .header-container {
    flex-direction: column;
    gap: 15px;
  }
  
  .fecha-container {
    width: 100%;
  }
}

select.input-medida {
  width: 100%;
  padding: 8px 12px;
  font-size: 16px;
  border: 2px solid #bdc3c7;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  height: 40px;
}

select.input-medida:focus {
  border-color: #3498db;
  outline: none;
}

.btn-eliminar {
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  transition: all 0.3s ease;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

.btn-proveedor {
  background-color: #95a5a6;
  color: white;
  border: 2px solid #7f8c8d;
  border-radius: 4px;
  width: 30px;
  height: 30px;
  cursor: pointer;
  margin-left: 10px;
  font-weight: bold;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.btn-proveedor.active {
  background-color: #27ae60;
  border: 3px solid #2ecc71;
  box-shadow: 0 0 8px rgba(46, 204, 113, 0.5);
}

.btn-proveedor:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  border-color: #3498db;
}
</style> 