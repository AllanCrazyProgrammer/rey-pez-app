<!-- HeaderEmbarque.vue -->
<template>
  <div class="header-embarque">
    <h1>{{ modoEdicion ? 'Embarque' : 'Nuevo Embarque' }}</h1>
    <div class="botones">
      <button @click="volverAEmbarquesMenu" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver a Menu
      </button>
      <button @click="toggleBloqueo" :class="['btn-bloqueo', { 'bloqueado': embarqueBloqueado }]">
        <i :class="['fas', embarqueBloqueado ? 'fa-lock' : 'fa-lock-open']"></i>
        {{ embarqueBloqueado ? 'Desbloquear' : 'Bloquear' }} Embarque
      </button>
    </div>

    <div class="botones-accion">
      <button @click="verPedidoDelDia" class="btn btn-success" title="Ver pedido del día de hoy">
        <i class="fas fa-clipboard-list"></i> Pedido del Día
      </button>
      <button @click="$emit('generar-taras')" class="btn btn-info" :disabled="isGeneratingPdf">
        <span v-if="isGeneratingPdf && pdfType === 'taras'" class="loader-inline"></span>
        <i v-else class="fas fa-file-pdf"></i> PDF Taras
      </button>
      <button @click="$emit('generar-resumen')" class="btn btn-info" :disabled="isGeneratingPdf">
        <span v-if="isGeneratingPdf && pdfType === 'resumen'" class="loader-inline"></span>
        <i v-else class="fas fa-file-pdf"></i> Resumen Embarque
      </button>
      <router-link v-if="embarqueId && embarqueId !== ''" :to="{ name: 'Rendimientos', params: { id: embarqueId } }" class="btn btn-warning"
        :class="{ 'disabled': isGeneratingPdf }">
        <i class="fas fa-chart-line"></i> Rendimientos
      </router-link>
      <precios-historial-modal :clienteActual="clienteEmbarque">
      </precios-historial-modal>
    </div>

    <div class="header">
      <div class="header-row">
        <div class="fecha-selector">
          <label for="fecha">Fecha de Embarque:</label>
          <input type="date" id="fecha" v-model="fechaLocal" class="form-control" required :disabled="embarqueBloqueado"
            @change="actualizarFecha">
        </div>
        <div class="carga-selector">
          <label for="cargaCon">Carga con:</label>
          <select id="cargaCon" v-model="cargaConLocal" class="form-control" required :disabled="embarqueBloqueado"
            @change="actualizarCargaCon">
            <option value="">Seleccionar</option>
            <option value="Porro">Porro</option>
            <option value="Caminante">Caminante</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Modal del Pedido del Día -->
    <div v-if="mostrarModalPedido" class="modal-pedido-overlay" @click="cerrarModalPedido">
      <div class="modal-pedido-content" @click.stop>
        <div class="modal-pedido-header">
          <h2>📋 Pedido del Día - {{ fechaEmbarque }}</h2>
          <button class="btn-cerrar-modal" @click="cerrarModalPedido">&times;</button>
        </div>
        
        <div class="modal-pedido-body">
          <div v-if="cargandoPedidos" class="cargando-pedidos">
            <div class="spinner"></div>
            <p>Cargando pedidos del día...</p>
          </div>
          
          <div v-else-if="pedidosDelDia.length === 0" class="sin-pedidos-dia">
            <div class="icono-sin-pedidos">📄</div>
            <p>No hay pedidos registrados para el día {{ fechaEmbarque }}</p>
            <div class="acciones-sin-pedidos">
              <button @click="crearPedidoCrudo" class="btn-crear-pedido crudo">
                + Crear Pedido Crudo
              </button>
              <button @click="crearPedidoLimpio" class="btn-crear-pedido limpio">
                + Crear Pedido Limpio
              </button>
            </div>
          </div>
          
          <div v-else class="pedidos-dia-lista">
            <div v-for="pedido in pedidosDelDia" :key="pedido.id" class="pedido-item">
              <div class="pedido-header">
                <div class="pedido-tipo">
                  <span class="tipo-badge">{{ capitalizarPrimeraLetra(pedido.tipo) }}</span>
                  <div class="pedido-totales">
                    <span>{{ calcularKilosPedido(pedido) }} kg</span>
                    <span>{{ calcularTarasPedido(pedido) }} T</span>
                  </div>
                </div>
                <div class="pedido-acciones">
                  <button @click="verDetallesPedido(pedido)" class="btn-ver-pedido">
                    👁️ Ver
                  </button>
                  <button @click="editarPedido(pedido)" class="btn-editar-pedido">
                    ✏️ Editar
                  </button>
                </div>
              </div>
              
              <div v-if="pedido.mostrarDetalles" class="pedido-detalles">
                <!-- Detalles para pedido crudo -->
                <div v-if="pedido.tipo === 'crudo'" class="detalles-crudo">
                  <h4>Detalle por Cliente:</h4>
                  <div v-for="(cliente, nombreCliente) in pedido.pedidos" :key="nombreCliente" class="cliente-crudo">
                    <strong>{{ nombreCliente }}:</strong>
                    <div class="columnas-crudo">
                      <div v-for="(valor, columna) in cliente" :key="columna" v-if="valor" class="columna-item">
                        <label class="item-checkbox-container">
                          <input 
                            type="checkbox" 
                            :checked="getItemCompletadoState(pedido.id, 'crudo', nombreCliente, columna)"
                            @change="toggleItemCompletado(pedido.id, 'crudo', nombreCliente, columna, $event.target.checked)"
                          >
                          <span class="item-checkmark"></span>
                        </label>
                        <span class="columna-texto" :class="{ 'completado': getItemCompletadoState(pedido.id, 'crudo', nombreCliente, columna) }">
                          {{ columna }}: {{ valor }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Detalles para pedido limpio -->
                <div v-else class="detalles-limpio">
                  <h4>Detalle por Cliente:</h4>
                  
                  <!-- Otilio -->
                  <div v-if="pedido.otilio && pedido.otilio.length > 0" class="cliente-limpio otilio">
                    <strong>Otilio:</strong>
                    <div v-for="(item, index) in pedido.otilio" :key="index" class="item-limpio-container" v-if="item.kilos">
                      <label class="item-checkbox-container">
                        <input 
                          type="checkbox" 
                          :checked="getItemCompletadoState(pedido.id, 'limpio', 'otilio', index)"
                          @change="toggleItemCompletado(pedido.id, 'limpio', 'otilio', index, $event.target.checked)"
                        >
                        <span class="item-checkmark"></span>
                      </label>
                      <span class="item-limpio" :class="{ 'completado': getItemCompletadoState(pedido.id, 'limpio', 'otilio', index) }">
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - {{ item.tipo || 'Sin tipo' }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Catarro -->
                  <div v-if="pedido.catarro && pedido.catarro.length > 0" class="cliente-limpio catarro">
                    <strong>Catarro:</strong>
                    <div v-for="(item, index) in pedido.catarro" :key="index" class="item-limpio-container" v-if="item.kilos">
                      <label class="item-checkbox-container">
                        <input 
                          type="checkbox" 
                          :checked="getItemCompletadoState(pedido.id, 'limpio', 'catarro', index)"
                          @change="toggleItemCompletado(pedido.id, 'limpio', 'catarro', index, $event.target.checked)"
                        >
                        <span class="item-checkmark"></span>
                      </label>
                      <span class="item-limpio" :class="{ 'completado': getItemCompletadoState(pedido.id, 'limpio', 'catarro', index) }">
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - {{ item.tipo || 'Sin tipo' }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Joselito -->
                  <div v-if="pedido.joselito && pedido.joselito.length > 0" class="cliente-limpio joselito">
                    <strong>Joselito:</strong>
                    <div v-for="(item, index) in pedido.joselito" :key="index" class="item-limpio-container" v-if="item.kilos">
                      <label class="item-checkbox-container">
                        <input 
                          type="checkbox" 
                          :checked="getItemCompletadoState(pedido.id, 'limpio', 'joselito', index)"
                          @change="toggleItemCompletado(pedido.id, 'limpio', 'joselito', index, $event.target.checked)"
                        >
                        <span class="item-checkmark"></span>
                      </label>
                      <span class="item-limpio" :class="{ 'completado': getItemCompletadoState(pedido.id, 'limpio', 'joselito', index) }">
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - {{ item.tipo || 'Sin tipo' }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Ozuna -->
                  <div v-if="pedido.ozuna && pedido.ozuna.length > 0" class="cliente-limpio ozuna">
                    <strong>Ozuna:</strong>
                    <div v-for="(item, index) in pedido.ozuna" :key="index" class="item-limpio-container" v-if="item.kilos">
                      <label class="item-checkbox-container">
                        <input 
                          type="checkbox" 
                          :checked="getItemCompletadoState(pedido.id, 'limpio', 'ozuna', index)"
                          @change="toggleItemCompletado(pedido.id, 'limpio', 'ozuna', index, $event.target.checked)"
                        >
                        <span class="item-checkmark"></span>
                      </label>
                      <span class="item-limpio" :class="{ 'completado': getItemCompletadoState(pedido.id, 'limpio', 'ozuna', index) }">
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - {{ item.tipo || 'Sin tipo' }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Clientes temporales -->
                  <div v-for="(cliente, id) in pedido.clientesTemporales" :key="id" v-if="cliente.pedidos && cliente.pedidos.length > 0" class="cliente-limpio temporal">
                    <strong>{{ cliente.nombre }}:</strong>
                    <div v-for="(item, index) in cliente.pedidos" :key="index" class="item-limpio-container" v-if="item.kilos">
                      <label class="item-checkbox-container">
                        <input 
                          type="checkbox" 
                          :checked="getItemCompletadoState(pedido.id, 'limpio', id, index)"
                          @change="toggleItemCompletado(pedido.id, 'limpio', id, index, $event.target.checked)"
                        >
                        <span class="item-checkmark"></span>
                      </label>
                      <span class="item-limpio" :class="{ 'completado': getItemCompletadoState(pedido.id, 'limpio', id, index) }">
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - {{ item.tipo || 'Sin tipo' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-pedido-footer">
          <button @click="cerrarModalPedido" class="btn-cerrar-footer">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, addDoc } from 'firebase/firestore';

export default {
  name: 'HeaderEmbarque',
  components: {
    PreciosHistorialModal
  },
  props: {
    modoEdicion: {
      type: Boolean,
      default: false
    },
    embarqueBloqueado: {
      type: Boolean,
      default: false
    },
    embarque: {
      type: Object,
      required: true,
      validator: (obj) => {
        return 'fecha' in obj && 'cargaCon' in obj;
      }
    },
    isGeneratingPdf: {
      type: Boolean,
      default: false
    },
    pdfType: {
      type: String,
      default: ''
    },
    embarqueId: {
      type: String,
      default: ''
    },
    clienteEmbarque: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      fechaLocal: this.embarque.fecha,
      cargaConLocal: this.embarque.cargaCon,
      mostrarModalPedido: false,
      pedidosDelDia: [],
      cargandoPedidos: false,
      fechaEmbarque: '',
      itemsCompletados: {} // Estructura: { pedidoId: { 'tipo-cliente-itemKey': boolean } }
    };
  },
  watch: {
    'embarque.fecha'(newVal) {
      this.fechaLocal = newVal;
    },
    'embarque.cargaCon'(newVal) {
      this.cargaConLocal = newVal;
    }
  },
  methods: {
    volverAEmbarquesMenu() {
      this.$emit('volver');
    },
    toggleBloqueo() {
      this.$emit('toggle-bloqueo');
    },
    actualizarFecha() {
      if (this.embarqueId) {
        localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
      }
      this.$emit('verificar-fecha', this.fechaLocal);
    },
    actualizarCargaCon() {
      this.$emit('update:cargaCon', this.cargaConLocal);
    },
    verPedidoDelDia() {
      this.fechaEmbarque = this.fechaLocal;
      this.mostrarModalPedido = true;
      this.cargarPedidosDelDia();
    },
    async cargarPedidosDelDia() {
      this.cargandoPedidos = true;
      try {
        const db = getFirestore();
        const pedidosRef = collection(db, 'pedidos');
        const q = query(pedidosRef, where('fecha', '==', this.fechaEmbarque));
        const snapshot = await getDocs(q);

        this.pedidosDelDia = [];
        this.itemsCompletados = {};
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          this.pedidosDelDia.push({
            id: doc.id,
            ...data,
            mostrarDetalles: false
          });
          
          // Cargar estado completado de items individuales
          this.cargarEstadosCompletados(doc.id, data);
        });
      } catch (error) {
        console.error("Error al cargar los pedidos del día:", error);
        alert('Hubo un error al cargar los pedidos del día. Por favor, intente de nuevo.');
      } finally {
        this.cargandoPedidos = false;
      }
    },
    cargarEstadosCompletados(pedidoId, data) {
      this.$set(this.itemsCompletados, pedidoId, {});
      
      if (data.tipo === 'crudo' && data.pedidos) {
        // Para pedidos crudos
        for (const cliente in data.pedidos) {
          for (const columna in data.pedidos[cliente]) {
            const itemKey = `crudo-${cliente}-${columna}`;
            if (data.itemsCompletados && data.itemsCompletados[itemKey]) {
              this.$set(this.itemsCompletados[pedidoId], itemKey, data.itemsCompletados[itemKey]);
            }
          }
        }
      } else if (data.tipo === 'limpio') {
        // Para pedidos limpios - Otilio
        if (data.otilio) {
          data.otilio.forEach((item, index) => {
            const itemKey = `limpio-otilio-${index}`;
            if (data.itemsCompletados && data.itemsCompletados[itemKey]) {
              this.$set(this.itemsCompletados[pedidoId], itemKey, data.itemsCompletados[itemKey]);
            }
          });
        }
        
        // Catarro
        if (data.catarro) {
          data.catarro.forEach((item, index) => {
            const itemKey = `limpio-catarro-${index}`;
            if (data.itemsCompletados && data.itemsCompletados[itemKey]) {
              this.$set(this.itemsCompletados[pedidoId], itemKey, data.itemsCompletados[itemKey]);
            }
          });
        }
        
        // Joselito
        if (data.joselito) {
          data.joselito.forEach((item, index) => {
            const itemKey = `limpio-joselito-${index}`;
            if (data.itemsCompletados && data.itemsCompletados[itemKey]) {
              this.$set(this.itemsCompletados[pedidoId], itemKey, data.itemsCompletados[itemKey]);
            }
          });
        }
        
        // Ozuna
        if (data.ozuna) {
          data.ozuna.forEach((item, index) => {
            const itemKey = `limpio-ozuna-${index}`;
            if (data.itemsCompletados && data.itemsCompletados[itemKey]) {
              this.$set(this.itemsCompletados[pedidoId], itemKey, data.itemsCompletados[itemKey]);
            }
          });
        }
        
        // Clientes temporales
        if (data.clientesTemporales) {
          for (const clienteId in data.clientesTemporales) {
            const cliente = data.clientesTemporales[clienteId];
            if (cliente.pedidos) {
              cliente.pedidos.forEach((item, index) => {
                const itemKey = `limpio-${clienteId}-${index}`;
                if (data.itemsCompletados && data.itemsCompletados[itemKey]) {
                  this.$set(this.itemsCompletados[pedidoId], itemKey, data.itemsCompletados[itemKey]);
                }
              });
            }
          }
        }
      }
    },
    async toggleItemCompletado(pedidoId, tipo, cliente, itemKey, completado) {
      try {
        // Crear la clave única para el item
        const uniqueKey = `${tipo}-${cliente}-${itemKey}`;
        
        // Actualizar el estado local inmediatamente
        if (!this.itemsCompletados[pedidoId]) {
          this.$set(this.itemsCompletados, pedidoId, {});
        }
        this.$set(this.itemsCompletados[pedidoId], uniqueKey, completado);
        
        // Guardar en Firebase
        const db = getFirestore();
        const pedidoRef = doc(db, 'pedidos', pedidoId);
        
        await updateDoc(pedidoRef, {
          [`itemsCompletados.${uniqueKey}`]: completado,
          [`itemsCompletados.${uniqueKey}_fecha`]: completado ? new Date().toISOString() : null
        });
        
        console.log(`Item ${uniqueKey} en pedido ${pedidoId} marcado como ${completado ? 'completado' : 'pendiente'}`);
      } catch (error) {
        console.error('Error al actualizar estado del item:', error);
        // Revertir el cambio local si hay error
        const uniqueKey = `${tipo}-${cliente}-${itemKey}`;
        this.$set(this.itemsCompletados[pedidoId], uniqueKey, !completado);
        alert('Error al actualizar el estado del item. Por favor, intente de nuevo.');
      }
    },
    getItemCompletadoState(pedidoId, tipo, cliente, itemKey) {
      const uniqueKey = `${tipo}-${cliente}-${itemKey}`;
      return this.itemsCompletados[pedidoId] && this.itemsCompletados[pedidoId][uniqueKey] || false;
    },
    capitalizarPrimeraLetra(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    },
    calcularKilosPedido(pedido) {
      if (pedido.tipo === 'crudo') {
        let totalPiezas = 0;
        if (pedido.pedidos) {
          for (const cliente in pedido.pedidos) {
            for (const columna in pedido.pedidos[cliente]) {
              const valor = pedido.pedidos[cliente][columna];
              if (valor && !isNaN(valor)) {
                totalPiezas += parseFloat(valor);
              }
            }
          }
        }
        return (totalPiezas * 19).toFixed(0);
      } else { // limpio
        let totalKilos = 0;
        
        if (pedido.otilio) {
          totalKilos += this.calcularKilosCliente(pedido.otilio);
        }
        if (pedido.catarro) {
          totalKilos += this.calcularKilosCliente(pedido.catarro);
        }
        if (pedido.joselito) {
          totalKilos += this.calcularKilosCliente(pedido.joselito);
        }
        if (pedido.ozuna) {
          totalKilos += this.calcularKilosCliente(pedido.ozuna);
        }
        
        if (pedido.clientesTemporales) {
          for (const clienteId in pedido.clientesTemporales) {
            const cliente = pedido.clientesTemporales[clienteId];
            if (cliente.pedidos) {
              totalKilos += this.calcularKilosCliente(cliente.pedidos);
            }
          }
        }
        
        return Math.round(totalKilos).toString();
      }
    },
    calcularTarasPedido(pedido) {
      if (pedido.tipo === 'crudo') {
        const kilos = parseFloat(this.calcularKilosPedido(pedido));
        return Math.round(kilos / 19).toString();
      } else { // limpio
        let totalTaras = 0;
        
        if (pedido.otilio) {
          totalTaras += this.calcularTarasCliente(pedido.otilio);
        }
        if (pedido.catarro) {
          totalTaras += this.calcularTarasCliente(pedido.catarro);
        }
        if (pedido.joselito) {
          totalTaras += this.calcularTarasCliente(pedido.joselito);
        }
        if (pedido.ozuna) {
          totalTaras += this.calcularTarasCliente(pedido.ozuna);
        }
        
        if (pedido.clientesTemporales) {
          for (const clienteId in pedido.clientesTemporales) {
            const cliente = pedido.clientesTemporales[clienteId];
            if (cliente.pedidos) {
              totalTaras += this.calcularTarasCliente(cliente.pedidos);
            }
          }
        }
        
        return Math.round(totalTaras).toString();
      }
    },
    calcularKilosCliente(items) {
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;
      let kilos135 = 0;
      let kilosTaras135 = 0;
      let kilos7y3 = 0;

      items.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else if (item.tipo === '1.35 y .15') {
              kilosTaras135 += Number(item.kilos) * 30;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos) * 1.35;
          } else if (item.tipo === '.7 y .3') {
            kilos7y3 += Number(item.kilos) * 0.7;
          }
        }
      });

      return kilosSinH2O + kilosTaras + kilosTaras135 + kilosConH2O + kilos135 + kilos7y3;
    },
    calcularTarasCliente(items) {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilos135 = 0;

      items.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 25;
      const tarasPor135 = kilos135 / (1.35 * 25);

      return tarasDirectas + tarasPorKilos + tarasPor135;
    },
    verDetallesPedido(pedido) {
      this.$set(pedido, 'mostrarDetalles', !pedido.mostrarDetalles);
    },
    editarPedido(pedido) {
      const ruta = pedido.tipo === 'crudo' ? '/procesos/pedidos/crudo' : '/procesos/pedidos/limpio';
      this.$router.push({
        path: ruta,
        query: { edit: 'true', id: pedido.id, fecha: pedido.fecha }
      });
      this.cerrarModalPedido();
    },
    crearPedidoCrudo() {
      this.$router.push({
        path: '/procesos/pedidos/crudo',
        query: { fecha: this.fechaEmbarque }
      });
      this.cerrarModalPedido();
    },
    crearPedidoLimpio() {
      this.$router.push({
        path: '/procesos/pedidos/limpio',
        query: { fecha: this.fechaEmbarque }
      });
      this.cerrarModalPedido();
    },
    cerrarModalPedido() {
      this.mostrarModalPedido = false;
      this.pedidosDelDia = [];
      this.itemsCompletados = {};
    }
  }
};
</script>

<style scoped>
.header-embarque {
  margin-bottom: 20px;
  text-align: center;
  width: 100%;
}

h1 {
  margin-bottom: 15px;
}

.botones {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-volver {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
}

.btn-bloqueo {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-bloqueo.bloqueado {
  background-color: #dc3545;
}

.header {
  margin-top: 15px;
  width: 100%;
}

.header-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
}

.fecha-selector,
.carga-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-width: auto;
}

label {
  margin-bottom: 0;
  font-weight: 500;
  white-space: nowrap;
}

.form-control {
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  min-width: 200px;
}

.form-control:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.botones-accion {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 15px 0;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn:disabled,
.btn.disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.loader-inline {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Modal del Pedido del Día */
.modal-pedido-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-pedido-content {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-pedido-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.modal-pedido-header h2 {
  margin: 0;
  color: #343a40;
}

.btn-cerrar-modal {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 1.2em;
  line-height: 1;
}

.modal-pedido-body {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.cargando-pedidos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

 .spinner {
   border: 4px solid rgba(0, 0, 0, 0.1);
   border-left-color: #3498db;
   border-radius: 50%;
   width: 40px;
   height: 40px;
   animation: spin 1s linear infinite;
   margin-bottom: 15px;
 }

 @keyframes spin {
   0% { transform: rotate(0deg); }
   100% { transform: rotate(360deg); }
 }

.sin-pedidos-dia {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #6c757d;
}

.icono-sin-pedidos {
  font-size: 4em;
  margin-bottom: 15px;
}

.acciones-sin-pedidos {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-crear-pedido {
  padding: 8px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  transition: background-color 0.3s ease;
}

.btn-crear-pedido.crudo {
  background-color: #28a745;
  color: white;
}

.btn-crear-pedido.limpio {
  background-color: #007bff;
  color: white;
}

.btn-crear-pedido:hover {
  opacity: 0.9;
}

.pedidos-dia-lista {
  display: flex;
  flex-direction: column;
}

.pedido-item {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pedido-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #e9ecef;
  border-bottom: 1px solid #dee2e6;
}

/* Estilos para los checkboxes de items individuales */
.columna-item,
.item-limpio-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 5px 0;
}

.item-checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.item-checkbox-container input[type="checkbox"] {
  display: none;
}

.item-checkmark {
  position: relative;
  width: 16px;
  height: 16px;
  background-color: #fff;
  border: 2px solid #28a745;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.item-checkbox-container input[type="checkbox"]:checked + .item-checkmark {
  background-color: #28a745;
  border-color: #28a745;
}

.item-checkbox-container input[type="checkbox"]:checked + .item-checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.columna-texto,
.item-limpio {
  transition: all 0.3s ease;
}

.columna-texto.completado,
.item-limpio.completado {
  opacity: 0.6;
  text-decoration: line-through;
  color: #6c757d;
}

.pedido-tipo {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-grow: 1;
}

.tipo-badge {
  background-color: #6c757d;
  color: white;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 0.8em;
  font-weight: bold;
}

.pedido-totales {
  display: flex;
  gap: 10px;
  font-size: 0.9em;
  color: #495057;
}

.pedido-acciones {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.btn-ver-pedido,
.btn-editar-pedido {
  background-color: #007bff;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease;
}

.btn-ver-pedido:hover,
.btn-editar-pedido:hover {
  background-color: #0056b3;
}

.pedido-detalles {
  padding: 15px;
  border-top: 1px solid #e9ecef;
  background-color: #f1f3f5;
}

.detalles-crudo h4,
.detalles-limpio h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #343a40;
}

.cliente-crudo,
.cliente-limpio {
  margin-bottom: 15px;
  padding-left: 15px;
}

.cliente-crudo strong,
.cliente-limpio strong {
  font-weight: 600;
  color: #495057;
}

.columnas-crudo {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 5px;
}

.columna-texto {
  background-color: #e9ecef;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  color: #343a40;
}

.item-limpio {
  margin-top: 5px;
  font-size: 0.9em;
  color: #495057;
}

.modal-pedido-footer {
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cerrar-footer {
  background-color: #6c757d;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  transition: background-color 0.3s ease;
}

.btn-cerrar-footer:hover {
  background-color: #5a6268;
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    gap: 15px;
  }

  .fecha-selector,
  .carga-selector {
    flex-direction: column;
    width: 100%;
  }

  .form-control {
    width: 100%;
    min-width: auto;
  }

  .botones-accion {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .modal-pedido-content {
    width: 95%;
    max-width: 95%;
  }

  .btn-ver-pedido,
  .btn-editar-pedido {
    padding: 4px 8px;
    font-size: 0.8em;
  }

  .item-checkmark {
    width: 14px;
    height: 14px;
  }

  .item-checkbox-container input[type="checkbox"]:checked + .item-checkmark::after {
    font-size: 10px;
  }

  .columna-texto,
  .item-limpio {
    font-size: 0.85em;
  }
}
</style>