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
        <div class="totales-generales">
          <div class="total-item">
            <span class="total-label">Total Taras:</span>
            <span class="total-value">{{ totalesGenerales.tarasTotal }} kg</span>
          </div>
          <div class="total-item">
            <span class="total-label">Total Kilos:</span>
            <span class="total-value">{{ totalesGenerales.kilosTotal }} kg</span>
          </div>
        </div>
        <MedidasModal @medidas-actualizadas="actualizarMedidas" />
      </div>

      <!-- Sistema de Tabs para clientes -->
      <div class="tabs-container">
        <div v-for="cliente in clientes" :key="cliente.id" class="tab-wrapper">
          <button 
            @click="clienteActivo = cliente.id"
            :class="['tab-button', { 'active': clienteActivo === cliente.id }]"
            :data-cliente="cliente.id"
          >
            {{ cliente.nombre }}
          </button>
          <div class="tab-totales" v-if="cliente.id === 'otilio'">
            <div>Taras: {{ calculosOtilio.tarasTotal }} kg</div>
            <div>Kilos: {{ calculosOtilio.kilosTotal }} kg</div>
          </div>
          <div class="tab-totales" v-if="cliente.id === 'catarro'">
            <div>Taras: {{ calculosCatarro.tarasTotal }} kg</div>
            <div>Kilos: {{ calculosCatarro.kilosTotal }} kg</div>
          </div>
          <div class="tab-totales" v-if="cliente.id === 'joselito'">
            <div>Taras: {{ calculosJoselito.tarasTotal }} kg</div>
            <div>Kilos: {{ calculosJoselito.kilosTotal }} kg</div>
          </div>
          <div class="tab-totales" v-if="cliente.id === 'ozuna'">
            <div>Taras: {{ calculosOzuna.tarasTotal }} kg</div>
            <div>Kilos: {{ calculosOzuna.kilosTotal }} kg</div>
          </div>
        </div>
      </div>

      <!-- Contenido de cada cliente -->
      <div class="clientes-content">
        <!-- Otilio -->
        <div v-show="clienteActivo === 'otilio'" class="cliente-seccion">
          <button @click="agregarFilaOtilio" class="btn-agregar">+ Agregar Fila</button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoOtilio" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + index">
                      <label :for="'tara' + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
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
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select v-model="item.tipo" class="input-field" :class="{ 'text-blue': item.tipo === 'C/H20' || item.tipo === '1.35 y .15' }">
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                  </select>
                </div>

                <button @click="eliminarPedidoOtilio(index)" class="btn-eliminar" v-if="pedidoOtilio.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Catarro -->
        <div v-show="clienteActivo === 'catarro'" class="cliente-seccion">
          <button @click="agregarFilaCatarro" class="btn-agregar">+ Agregar Fila</button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoCatarro" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + index">
                      <label :for="'tara' + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
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
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select v-model="item.tipo" class="input-field" :class="{ 'text-blue': item.tipo === 'C/H20' || item.tipo === '1.35 y .15' }">
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                  </select>
                </div>

                <button @click="eliminarPedidoCatarro(index)" class="btn-eliminar" v-if="pedidoCatarro.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Joselito -->
        <div v-show="clienteActivo === 'joselito'" class="cliente-seccion">
          <button @click="agregarFilaJoselito" class="btn-agregar">+ Agregar Fila</button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoJoselito" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + index">
                      <label :for="'tara' + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
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
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select v-model="item.tipo" class="input-field" :class="{ 'text-blue': item.tipo === 'C/H20' || item.tipo === '1.35 y .15' }">
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                  </select>
                </div>

                <button @click="eliminarPedidoJoselito(index)" class="btn-eliminar" v-if="pedidoJoselito.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Ozuna -->
        <div v-show="clienteActivo === 'ozuna'" class="cliente-seccion">
          <button @click="agregarFilaOzuna" class="btn-agregar">+ Agregar Fila</button>
          
          <div class="pedido-grid">
            <div v-for="(item, index) in pedidoOzuna" :key="index" class="pedido-item">
              <div class="input-row">
                <div class="input-group-compact kilos">
                  <div class="label-container">
                    <label>Kilos:</label>
                    <div class="tara-checkbox">
                      <input type="checkbox" v-model="item.esTara" :id="'tara' + index">
                      <label :for="'tara' + index">T</label>
                    </div>
                  </div>
                  <input type="number" v-model="item.kilos" class="input-field">
                </div>

                <div class="input-group-compact medida">
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
                  <select v-model="item.medida" class="input-field">
                    <option value="">Seleccionar</option>
                    <option v-for="medida in medidasOrdenadas" :key="medida.id" :value="medida.nombre">
                      {{ medida.nombre }}
                    </option>
                  </select>
                </div>

                <div class="input-group-compact tipo">
                  <div class="label-container">
                    <label>Tipo:</label>
                    <select v-model="item.nota" class="input-field-notas">
                      <option value="">Notas</option>
                      <option value="Sellado">Sellado</option>
                      <option value="Kileado">Kileado</option>
                    </select>
                  </div>
                  <select v-model="item.tipo" class="input-field" :class="{ 'text-blue': item.tipo === 'C/H20' || item.tipo === '1.35 y .15' }">
                    <option value="">Seleccionar</option>
                    <option value="S/H20">S/H20</option>
                    <option value="C/H20" class="text-blue">C/H20</option>
                  </select>
                </div>

                <button @click="eliminarPedidoOzuna(index)" class="btn-eliminar" v-if="pedidoOzuna.length > 1">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
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
      pedidoId: null,
      clienteActivo: 'otilio',
      clientes: [
        { id: 'otilio', nombre: 'Otilio' },
        { id: 'catarro', nombre: 'Catarro' },
        { id: 'joselito', nombre: 'Joselito' },
        { id: 'ozuna', nombre: 'Ozuna' }
      ],
      itemSeleccionadoNotas: null,
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
    },
    // Cálculos para Otilio
    calculosOtilio() {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;

      this.pedidoOtilio.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 27;
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O);

      return {
        tarasDirectas: tarasDirectas.toFixed(2),
        tarasPorKilos: tarasPorKilos.toFixed(2),
        tarasTotal: tarasTotal.toString(),
        kilosSinH2O: Math.round(totalKilosSinH2O).toString(),
        kilosConH2O: kilosConH2O.toFixed(2),
        kilosTotal: kilosTotal.toString()
      };
    },
    // Cálculos para Catarro
    calculosCatarro() {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;

      this.pedidoCatarro.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 27;
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O);

      return {
        tarasDirectas: tarasDirectas.toFixed(2),
        tarasPorKilos: tarasPorKilos.toFixed(2),
        tarasTotal: tarasTotal.toString(),
        kilosSinH2O: Math.round(totalKilosSinH2O).toString(),
        kilosConH2O: kilosConH2O.toFixed(2),
        kilosTotal: kilosTotal.toString()
      };
    },
    // Cálculos para Joselito
    calculosJoselito() {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;

      this.pedidoJoselito.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 25;
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O);

      return {
        tarasDirectas: tarasDirectas.toFixed(2),
        tarasPorKilos: tarasPorKilos.toFixed(2),
        tarasTotal: tarasTotal.toString(),
        kilosSinH2O: Math.round(totalKilosSinH2O).toString(),
        kilosConH2O: kilosConH2O.toFixed(2),
        kilosTotal: kilosTotal.toString()
      };
    },
    // Cálculos para Ozuna
    calculosOzuna() {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;

      this.pedidoOzuna.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 27;
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O);

      return {
        tarasDirectas: tarasDirectas.toFixed(2),
        tarasPorKilos: tarasPorKilos.toFixed(2),
        tarasTotal: tarasTotal.toString(),
        kilosSinH2O: Math.round(totalKilosSinH2O).toString(),
        kilosConH2O: kilosConH2O.toFixed(2),
        kilosTotal: kilosTotal.toString()
      };
    },
    totalesGenerales() {
      const tarasTotal = Math.round(
        Number(this.calculosOtilio.tarasTotal) +
        Number(this.calculosCatarro.tarasTotal) +
        Number(this.calculosJoselito.tarasTotal) +
        Number(this.calculosOzuna.tarasTotal)
      );

      const kilosTotal = Math.round(
        Number(this.calculosOtilio.kilosTotal) +
        Number(this.calculosCatarro.kilosTotal) +
        Number(this.calculosJoselito.kilosTotal) +
        Number(this.calculosOzuna.kilosTotal)
      );

      return {
        tarasTotal: tarasTotal.toString(),
        kilosTotal: kilosTotal.toString()
      };
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
      this.pedidoOtilio.unshift({ kilos: null, medida: '', tipo: '', esTara: true, esProveedor: false, proveedor: '' })
    },
    agregarFilaCatarro() {
      this.pedidoCatarro.unshift({ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' })
    },
    agregarFilaJoselito() {
      this.pedidoJoselito.unshift({ kilos: null, medida: '', tipo: '', esTara: false, esProveedor: false, proveedor: '' })
    },
    agregarFilaOzuna() {
      this.pedidoOzuna.unshift({ kilos: null, medida: '', tipo: 'S/H20', esTara: false, esProveedor: false, proveedor: '' })
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
    },
    abrirMenuNotas(item) {
      if (this.itemSeleccionadoNotas === item) {
        this.itemSeleccionadoNotas = null;
      } else {
        this.itemSeleccionadoNotas = item;
      }
    },
    seleccionarNota(item, nota) {
      item.nota = nota;
      this.itemSeleccionadoNotas = null;
    },
    ordenarPedidosPorMedida(pedidos) {
      // Creamos una copia del array para no mutar el original directamente
      const pedidosOrdenados = [...pedidos];
      
      // Separamos los pedidos con medida y tipo de los que no los tienen
      const pedidosCompletos = pedidosOrdenados.filter(p => p.medida && p.tipo);
      const pedidosIncompletos = pedidosOrdenados.filter(p => !p.medida || !p.tipo);
      
      // Ordenamos solo los pedidos completos
      pedidosCompletos.sort((a, b) => {
        if (a.medida === b.medida) {
          return a.tipo.localeCompare(b.tipo);
        }
        return a.medida.localeCompare(b.medida);
      });
      
      // Retornamos primero los incompletos y luego los ordenados
      return [...pedidosIncompletos, ...pedidosCompletos];
    }
  },
  watch: {
    'pedidoOtilio': {
      deep: true,
      handler(newVal) {
        // Verificamos si realmente necesitamos ordenar
        const needsSort = newVal.some(item => item.medida && item.tipo);
        if (needsSort) {
          const ordenados = this.ordenarPedidosPorMedida(newVal);
          // Solo actualizamos si el orden es diferente
          if (JSON.stringify(ordenados) !== JSON.stringify(newVal)) {
            this.$nextTick(() => {
              this.pedidoOtilio = ordenados;
            });
          }
        }
      }
    },
    'pedidoCatarro': {
      deep: true,
      handler(newVal) {
        const needsSort = newVal.some(item => item.medida && item.tipo);
        if (needsSort) {
          const ordenados = this.ordenarPedidosPorMedida(newVal);
          if (JSON.stringify(ordenados) !== JSON.stringify(newVal)) {
            this.$nextTick(() => {
              this.pedidoCatarro = ordenados;
            });
          }
        }
      }
    },
    'pedidoJoselito': {
      deep: true,
      handler(newVal) {
        const needsSort = newVal.some(item => item.medida && item.tipo);
        if (needsSort) {
          const ordenados = this.ordenarPedidosPorMedida(newVal);
          if (JSON.stringify(ordenados) !== JSON.stringify(newVal)) {
            this.$nextTick(() => {
              this.pedidoJoselito = ordenados;
            });
          }
        }
      }
    },
    'pedidoOzuna': {
      deep: true,
      handler(newVal) {
        const needsSort = newVal.some(item => item.medida && item.tipo);
        if (needsSort) {
          const ordenados = this.ordenarPedidosPorMedida(newVal);
          if (JSON.stringify(ordenados) !== JSON.stringify(newVal)) {
            this.$nextTick(() => {
              this.pedidoOzuna = ordenados;
            });
          }
        }
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
  gap: 20px;
}

.fecha-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.totales-generales {
  display: flex;
  gap: 20px;
  background-color: #f8f9fa;
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.total-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.total-label {
  font-size: 14px;
  color: #6c757d;
}

.total-value {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.tabs-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tab-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.tab-totales {
  font-size: 14px;
  color: #666;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.tab-button {
  padding: 12px 25px;
  font-size: 23px;
  border: none;
  border-radius: 6px;
  background-color: #f0f0f0;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  margin: 0 2px;
  min-width: 160px;
}

/* Estilos base para los botones con sus colores correspondientes */
.tab-button[data-cliente="otilio"] {
  background-color: #f1c40f50;
  color: #2c3e50;
}

.tab-button[data-cliente="catarro"] {
  background-color: #e74c3c50;
  color: white;
}

.tab-button[data-cliente="joselito"] {
  background-color: #3498db50;
  color: white;
}

.tab-button[data-cliente="ozuna"] {
  background-color: #27ae6050;
  color: white;
}

/* Estados activos con color sólido */
.tab-button[data-cliente="otilio"].active {
  background-color: #f1c40f;
}

.tab-button[data-cliente="catarro"].active {
  background-color: #e74c3c;
}

.tab-button[data-cliente="joselito"].active {
  background-color: #3498db;
}

.tab-button[data-cliente="ozuna"].active {
  background-color: #27ae60;
}

/* Estados hover */
.tab-button[data-cliente="otilio"]:hover:not(.active) {
  background-color: #f1c40f80;
}

.tab-button[data-cliente="catarro"]:hover:not(.active) {
  background-color: #e74c3c80;
}

.tab-button[data-cliente="joselito"]:hover:not(.active) {
  background-color: #3498db80;
}

.tab-button[data-cliente="ozuna"]:hover:not(.active) {
  background-color: #27ae6080;
}

.clientes-content {
  border: 1px solid #ddd;
  border-radius: 0 8px 8px 8px;
  padding: 20px;
  background: white;
  min-height: 400px;
}

.cliente-seccion {
  background-color: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.cliente-titulo {
  display: none;
}

.pedido-grid {
  margin-bottom: 15px;
}

.btn-agregar {
  margin-bottom: 15px;
  width: 100%;
  padding: 18px;
  font-size: 23px;
  border-radius: 8px;
  background-color: #3498db;
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-agregar:hover {
  background-color: #2980b9;
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

.input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  position: relative;
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  width: 100%;
}

.input-group-compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kilos {
  width: 150px;
  flex-shrink: 0;
}

.medida {
  flex: 2;
  min-width: 200px;
}

.tipo {
  width: 180px;
  flex-shrink: 0;
}

.input-field {
  height: 45px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 23px;
  width: 100%;
}

.input-field:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.input-field-notas {
  height: 30px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  width: 120px;
  margin-left: 8px;
}

.input-field-notas:focus {
  border-color: #3498db;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.label-container {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 23px;
  color: #666;
}

.tara-checkbox {
  display: flex;
  align-items: center;
  gap: 3px;
}

.tara-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
}

.tara-checkbox label {
  font-size: 21px;
}

.btn-proveedor {
  width: 24px;
  height: 24px;
  font-size: 12px;
  padding: 0;
  margin-left: 4px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.btn-proveedor.active {
  border: 2px solid #27ae60;
  color: #27ae60;
  background-color: rgba(39, 174, 96, 0.1);
}

.btn-eliminar {
  position: static;
  transform: none;
  height: 40px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

@media (max-width: 1400px) {
  .pedido-item {
    grid-template-columns: 0.8fr 1.8fr 1fr;
  }
}

@media (max-width: 1200px) {
  .tabs-container {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  
  .tab-button {
    width: calc(50% - 8px);
    padding: 8px 15px;
    font-size: 18px;
    min-width: auto;
    margin: 0;
  }
}

@media (max-width: 480px) {
  .tab-button {
    width: calc(50% - 4px);
    padding: 6px 10px;
    font-size: 16px;
  }
}

@media (max-width: 768px) {
  .pedidos-limpio-container {
    padding: 10px;
    min-height: auto;
  }

  .tabs-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 15px;
    width: 100%;
  }

  .tab-wrapper {
    width: 100%;
  }

  .tab-button {
    width: 100%;
    min-width: unset;
    font-size: 18px;
    padding: 12px 8px;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 50px;
  }

  .tab-totales {
    font-size: 12px;
    padding: 4px;
    width: 100%;
    text-align: center;
    margin-top: -5px;
  }

  .tab-totales div {
    display: inline-block;
    margin: 0 5px;
  }

  .clientes-content {
    padding: 15px;
    border-radius: 8px;
    min-height: 300px;
  }

  .input-row {
    padding: 15px;
    padding-right: 45px;
    border: 1px solid #eee;
    margin-bottom: 10px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .input-field {
    font-size: 23px;
    height: 50px;
    padding: 8px 10px;
  }

  .label-container {
    font-size: 23px;
    margin-bottom: 5px;
  }

  .btn-eliminar {
    width: 28px;
    height: 28px;
    position: absolute;
    top: 10px;
    right: 1px;
    background-color: #ff4444;
    font-size: 12px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-agregar {
    width: 100%;
    padding: 18px;
    font-size: 23px;
    margin-top: 20px;
    border-radius: 8px;
  }

  .buttons-container {
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
  }

  .btn-guardar,
  .btn-imprimir,
  .btn-cancelar {
    width: 100%;
    padding: 18px;
    font-size: 23px;
    border-radius: 8px;
  }

  .tara-checkbox label {
    font-size: 21px;
  }

  .btn-proveedor {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }

  /* Mejor contraste para textos */
  .input-group-compact label {
    color: #2c3e50;
    font-weight: 500;
  }

  /* Separación entre elementos */
  .pedido-item {
    margin-bottom: 15px;
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;
  }

  .pedido-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .tipo-container {
    width: 100%;
  }
  
  .tipo-notas-container {
    width: 100%;
  }
}

@media (max-width: 375px) {
  .pedidos-limpio-container {
    padding: 5px;
    width: 100%;
  }

  .tabs-container {
    gap: 3px;
    margin-bottom: 8px;
  }
  
  .tab-button {
    width: calc(50% - 3px);
    padding: 6px 4px;
    font-size: 14px;
    border-radius: 4px;
  }

  .input-row {
    flex-direction: column;
    padding: 8px;
    gap: 6px;
  }

  .input-group-compact {
    width: 100%;
  }

  .kilos, .medida, .tipo {
    width: 100%;
    min-width: unset;
  }

  .input-field {
    height: 36px;
    font-size: 14px;
    padding: 4px 6px;
  }

  .label-container {
    font-size: 14px;
  }

  .tara-checkbox label {
    font-size: 14px;
  }

  .btn-eliminar {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .buttons-container {
    gap: 6px;
    flex-direction: column;
  }

  .btn-guardar,
  .btn-imprimir,
  .btn-cancelar {
    width: 100%;
    padding: 8px 12px;
    font-size: 14px;
  }

  .btn-proveedor {
    width: 20px;
    height: 20px;
    font-size: 12px;
    border-width: 1.5px;
  }

  .btn-proveedor.active {
    border-width: 1.5px;
  }

  .input-field-notas {
    width: 80px;
    font-size: 12px;
    height: 25px;
    padding: 2px 4px;
  }

  .tipo {
    width: 100%;
  }
}

.btn-notas {
  width: 24px;
  height: 24px;
  font-size: 12px;
  padding: 0;
  margin-left: 4px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  background-color: #95a5a6;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.btn-notas.active {
  border: 2px solid #7f8c8d;
  background-color: #7f8c8d;
}

.menu-notas {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 120px;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

@media (max-width: 768px) {
  .btn-notas {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }
}

@media (max-width: 375px) {
  .btn-notas {
    width: 20px;
    height: 20px;
    font-size: 12px;
    border-width: 1.5px;
  }
}

.text-blue {
  color: #3498db !important;
}

select.text-blue {
  color: #3498db !important;
}

select option.text-blue {
  color: #3498db;
}

/* Estilos para el resumen de cálculos */
.resumen-calculos {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.resumen-calculos h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.2em;
}

.calculos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.calculo-item {
  background-color: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.calculo-item.total {
  background-color: #f1f8ff;
  border-color: #3498db;
}

.calculo-label {
  font-size: 0.9em;
  color: #666;
}

.calculo-valor {
  font-size: 1.2em;
  font-weight: 600;
  color: #2c3e50;
}

.calculo-item.total .calculo-valor {
  color: #3498db;
}

@media (max-width: 768px) {
  .calculos-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .resumen-calculos {
    padding: 15px;
    margin: 15px 0;
  }
  
  .calculo-item {
    padding: 10px;
  }
  
  .calculo-label {
    font-size: 0.85em;
  }
  
  .calculo-valor {
    font-size: 1.1em;
  }
}

@media (max-width: 480px) {
  .calculos-grid {
    grid-template-columns: 1fr;
  }
  
  .resumen-calculos {
    padding: 12px;
    margin: 12px 0;
  }
  
  .calculo-item {
    padding: 8px;
  }
}
</style> 