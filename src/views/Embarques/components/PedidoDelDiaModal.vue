<template>
  <div v-if="mostrar" class="modal-pedido-overlay" @click="cerrarModal">
    <section
      class="modal-pedido-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pedido-dia-titulo"
      @click.stop
    >
      <div class="modal-pedido-header">
        <div class="modal-pedido-titulo">
          <span class="modal-pedido-icono"><i class="fas fa-clipboard-list"></i></span>
          <div>
            <span class="modal-pedido-kicker">PEDIDO DEL EMBARQUE</span>
            <h2 id="pedido-dia-titulo">Pedido del día</h2>
            <p>{{ fechaEmbarque }}</p>
          </div>
        </div>
        <button class="btn-cerrar-modal" type="button" aria-label="Cerrar pedido del día" @click="cerrarModal">&times;</button>
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
                  <i class="fas fa-eye"></i> {{ pedido.mostrarDetalles ? 'Ocultar' : 'Ver detalle' }}
                </button>
                <button @click="editarPedido(pedido)" class="btn-editar-pedido">
                  <i class="fas fa-pen"></i> Editar
                </button>
              </div>
            </div>
            
            <div v-if="pedido.mostrarDetalles" class="pedido-detalles">
              <!-- Detalles para pedido crudo -->
              <div v-if="pedido.tipo === 'crudo'" class="detalles-crudo">
                <h4>Detalle por Cliente:</h4>
                <div class="clientes-grid">
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
              </div>
              
              <!-- Detalles para pedido limpio -->
              <div v-else class="detalles-limpio">
                <h4>Detalle por Cliente:</h4>
                <div class="clientes-grid">
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
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - 
                        <span class="tipo-producto" :class="{ 'no-sh20': item.tipo && item.tipo !== 'S/H20' }">
                          {{ item.tipo || 'Sin tipo' }}
                        </span>
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
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - 
                        <span class="tipo-producto" :class="{ 'no-sh20': item.tipo && item.tipo !== 'S/H20' }">
                          {{ item.tipo || 'Sin tipo' }}
                        </span>
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
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - 
                        <span class="tipo-producto" :class="{ 'no-sh20': item.tipo && item.tipo !== 'S/H20' }">
                          {{ item.tipo || 'Sin tipo' }}
                        </span>
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
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - 
                        <span class="tipo-producto" :class="{ 'no-sh20': item.tipo && item.tipo !== 'S/H20' }">
                          {{ item.tipo || 'Sin tipo' }}
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  <!-- Lorena -->
                  <div v-if="pedido.lorena && pedido.lorena.length > 0" class="cliente-limpio lorena">
                    <strong>Lorena:</strong>
                    <div v-for="(item, index) in pedido.lorena" :key="index" class="item-limpio-container" v-if="item.kilos">
                      <label class="item-checkbox-container">
                        <input 
                          type="checkbox" 
                          :checked="getItemCompletadoState(pedido.id, 'limpio', 'lorena', index)"
                          @change="toggleItemCompletado(pedido.id, 'limpio', 'lorena', index, $event.target.checked)"
                        >
                        <span class="item-checkmark"></span>
                      </label>
                      <span class="item-limpio" :class="{ 'completado': getItemCompletadoState(pedido.id, 'limpio', 'lorena', index) }">
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - 
                        <span class="tipo-producto" :class="{ 'no-sh20': item.tipo && item.tipo !== 'S/H20' }">
                          {{ item.tipo || 'Sin tipo' }}
                        </span>
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
                        {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - 
                        <span class="tipo-producto" :class="{ 'no-sh20': item.tipo && item.tipo !== 'S/H20' }">
                          {{ item.tipo || 'Sin tipo' }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-pedido-footer">
        <button @click="cerrarModal" class="btn-cerrar-footer">Cerrar</button>
      </div>
    </section>
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { factorAgua } from '@/utils/factorAgua';

export default {
  name: 'PedidoDelDiaModal',
  props: {
    mostrar: {
      type: Boolean,
      default: false
    },
    fechaEmbarque: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      pedidosDelDia: [],
      cargandoPedidos: false,
      itemsCompletados: {} // Estructura: { pedidoId: { 'tipo-cliente-itemKey': boolean } }
    };
  },
  watch: {
    mostrar(newVal) {
      if (newVal) {
        this.cargarPedidosDelDia();
      }
    }
  },
  methods: {
    async cargarPedidosDelDia() {
      // No cargar si no hay fecha de embarque
      if (!this.fechaEmbarque || this.fechaEmbarque.trim() === '') {
        return;
      }
      
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
        
        // Lorena
        if (data.lorena) {
          data.lorena.forEach((item, index) => {
            const itemKey = `limpio-lorena-${index}`;
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
        if (pedido.lorena) {
          totalKilos += this.calcularKilosCliente(pedido.lorena);
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
        if (pedido.lorena) {
          totalTaras += this.calcularTarasCliente(pedido.lorena);
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
      let kilos13y2 = 0;
      let kilosTaras135 = 0;
      let kilos7y3 = 0;

      items.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * factorAgua(item);
            } else if (item.tipo === '1.35 y .15' || item.tipo === '1.3 y .2') {
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
          } else if (item.tipo === '1.3 y .2') {
            kilos13y2 += Number(item.kilos) * 1.3;
          } else if (item.tipo === '.7 y .3') {
            kilos7y3 += Number(item.kilos) * 0.7;
          }
        }
      });

      return kilosSinH2O + kilosTaras + kilosTaras135 + kilosConH2O + kilos135 + kilos13y2 + kilos7y3;
    },
    calcularTarasCliente(items) {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilos135 = 0;
      let kilos13y2 = 0;

      items.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos);
          } else if (item.tipo === '1.3 y .2') {
            kilos13y2 += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 25;
      const tarasPor135 = kilos135 / (1.35 * 25);
      const tarasPor13y2 = kilos13y2 / (1.3 * 25);

      return tarasDirectas + tarasPorKilos + tarasPor135 + tarasPor13y2;
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
      this.cerrarModal();
    },
    crearPedidoCrudo() {
      this.$router.push({
        path: '/procesos/pedidos/crudo',
        query: { fecha: this.fechaEmbarque }
      });
      this.cerrarModal();
    },
    crearPedidoLimpio() {
      this.$router.push({
        path: '/procesos/pedidos/limpio',
        query: { fecha: this.fechaEmbarque }
      });
      this.cerrarModal();
    },
    cerrarModal() {
      this.$emit('cerrar');
      this.pedidosDelDia = [];
      this.itemsCompletados = {};
    }
  }
};
</script>

<style scoped>
/* Modal del Pedido del Día */
.modal-pedido-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  padding: clamp(14px, 3vw, 34px);
  background: rgba(2, 8, 20, 0.86);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50000;
  box-sizing: border-box;
  isolation: isolate;
  overscroll-behavior: contain;
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(10px);
  }
}

.modal-pedido-content {
  background: linear-gradient(145deg, #101c31 0%, #08111f 100%);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 18px;
  box-shadow: 
    0 28px 80px rgba(0, 0, 0, 0.58),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 48px rgba(14, 165, 233, 0.10);
  width: min(1120px, 100%);
  height: min(860px, calc(100dvh - clamp(28px, 6vw, 68px)));
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #e8eef9;
  animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalSlideIn {
  from {
    transform: translateY(-50px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.modal-pedido-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 0 0 auto;
  gap: 20px;
  padding: 18px 22px;
  background: linear-gradient(120deg, rgba(17, 34, 58, 0.98), rgba(8, 19, 35, 0.98));
  color: #f8fbff;
  border-bottom: 1px solid rgba(56, 189, 248, 0.28);
  position: relative;
  overflow: hidden;
}

.modal-pedido-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.modal-pedido-header h2 {
  margin: 2px 0 0;
  font-size: clamp(1.3rem, 2vw, 1.65rem);
  font-weight: 700;
  line-height: 1.1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  z-index: 1;
  position: relative;
}

.modal-pedido-titulo {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.modal-pedido-icono {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border: 1px solid rgba(56, 189, 248, 0.48);
  border-radius: 13px;
  color: #67e8f9;
  background: linear-gradient(145deg, rgba(14, 165, 233, 0.22), rgba(59, 130, 246, 0.08));
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.08);
  font-size: 1.15rem;
}

.modal-pedido-kicker {
  display: block;
  color: #7dd3fc;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.modal-pedido-titulo p {
  margin: 5px 0 0;
  color: #94a3b8;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

.btn-cerrar-modal {
  background: rgba(15, 23, 42, 0.78);
  color: #fda4af;
  border: 1px solid rgba(251, 113, 133, 0.40);
  border-radius: 10px;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 1.2em;
  line-height: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.24);
  z-index: 1;
  position: relative;
}

.btn-cerrar-modal:hover {
  transform: scale(1.05);
  color: #fff;
  border-color: rgba(251, 113, 133, 0.75);
  background: rgba(190, 24, 93, 0.28);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.32);
}

.modal-pedido-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 20px 22px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  background: linear-gradient(180deg, rgba(8, 18, 33, 0.98), rgba(5, 12, 24, 0.98));
}

.cargando-pedidos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #94a3b8;
}

.cargando-pedidos p {
  font-size: 1.1rem;
  font-weight: 500;
  margin-top: 10px;
  color: #94a3b8;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(148, 163, 184, 0.22);
  border-radius: 50%;
  border-top-color: #667eea;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.sin-pedidos-dia {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.icono-sin-pedidos {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.7;
  animation: floatAnimation 3s ease-in-out infinite;
}

@keyframes floatAnimation {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.sin-pedidos-dia p {
  font-size: 1.2rem;
  color: #94a3b8;
  margin-bottom: 30px;
  font-weight: 500;
}

.acciones-sin-pedidos {
  display: flex;
  gap: 15px;
  max-width: 500px;
  width: 100%;
}

.btn-crear-pedido {
  flex: 1;
  padding: 15px 25px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
}

.btn-crear-pedido::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.btn-crear-pedido:hover::before {
  left: 100%;
}

.btn-crear-pedido.crudo {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(30, 136, 229, 0.3);
}

.btn-crear-pedido.crudo:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(30, 136, 229, 0.4);
}

.btn-crear-pedido.limpio {
  background: linear-gradient(135deg, #ff6f00 0%, #e65100 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(255, 111, 0, 0.3);
}

.btn-crear-pedido.limpio:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(255, 111, 0, 0.4);
}

.pedidos-dia-lista {
  width: 100%;
}

.pedido-item {
  background: linear-gradient(140deg, rgba(20, 34, 57, 0.96), rgba(11, 22, 39, 0.96));
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18), inset 0 1px rgba(255, 255, 255, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pedido-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.24);
  border-color: rgba(56, 189, 248, 0.34);
}

.pedido-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.pedido-tipo {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.tipo-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 25px;
  font-weight: 700;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.3);
}

.pedido-totales {
  display: flex;
  gap: 20px;
  font-size: 1.2rem;
  font-weight: 600;
  color: #dbeafe;
}

.pedido-totales span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  background: rgba(30, 64, 175, 0.20);
  border: 1px solid rgba(96, 165, 250, 0.25);
  border-radius: 20px;
  font-size: 1rem;
}

.pedido-acciones {
  display: flex;
  gap: 10px;
}

.btn-ver-pedido,
.btn-editar-pedido {
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
}

.btn-ver-pedido {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
}

.btn-ver-pedido:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4);
}

.btn-editar-pedido {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  box-shadow: 0 3px 10px rgba(139, 92, 246, 0.3);
}

.btn-editar-pedido:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(139, 92, 246, 0.4);
}

.pedido-detalles {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.clientes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 15px;
  margin-top: 10px;
  align-items: start;
}

.detalles-crudo h4,
.detalles-limpio h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2rem;
  font-weight: 700;
  text-align: center;
  padding: 10px 20px;
  background: rgba(14, 165, 233, 0.12);
  color: #bae6fd;
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 10px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.cliente-crudo,
.cliente-limpio {
  min-width: 0;
  margin-bottom: 0;
  padding: 15px;
  background: linear-gradient(145deg, rgba(22, 35, 56, 0.94), rgba(13, 25, 43, 0.94));
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.14);
  transition: all 0.3s ease;
}

.cliente-crudo:hover,
.cliente-limpio:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.20);
  border-color: rgba(56, 189, 248, 0.28);
}

.cliente-crudo strong,
.cliente-limpio strong {
  display: block;
  margin-bottom: 15px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #e2e8f0;
  padding: 8px 12px;
  background: rgba(51, 65, 85, 0.55);
  border-radius: 8px;
  text-align: center;
}

.columnas-crudo {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.columna-item,
.item-limpio-container {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  min-width: 0;
  background: rgba(6, 15, 29, 0.58);
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  transition: all 0.3s ease;
}

.columna-item:hover,
.item-limpio-container:hover {
  background: rgba(15, 32, 54, 0.86);
  border-color: rgba(56, 189, 248, 0.24);
  transform: translateX(2px);
}

.item-checkbox-container {
  position: relative;
  display: inline-block;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.item-checkbox-container input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.item-checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 22px;
  width: 22px;
  background: linear-gradient(135deg, #e0e7ff 0%, #e0f2fe 100%);
  border: 2px solid #a5b4fc;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.item-checkbox-container:hover .item-checkmark {
  border-color: #818cf8;
  transform: scale(1.1);
  box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.1);
}

.item-checkbox-container input:checked ~ .item-checkmark {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
  animation: checkAnimation 0.3s ease-out;
}

@keyframes checkAnimation {
  0% {
    transform: scale(1.3);
  }
  40% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

.item-checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 12px;
  border: solid white;
  border-width: 0 3px 3px 0;
  transform: rotate(45deg);
}

.item-checkbox-container input:checked ~ .item-checkmark:after {
  display: block;
  animation: checkmarkAnimation 0.2s ease-out 0.1s both;
}

@keyframes checkmarkAnimation {
  from {
    opacity: 0;
    transform: rotate(45deg) scale(0);
  }
  to {
    opacity: 1;
    transform: rotate(45deg) scale(1);
  }
}

.columna-texto,
.item-limpio {
  flex: 1;
  min-width: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #dbe6f5;
  overflow-wrap: anywhere;
  transition: all 0.3s ease;
}

.columna-texto.completado,
.item-limpio.completado {
  text-decoration: line-through;
  opacity: 0.6;
  color: #94a3b8;
}

.tipo-producto.no-sh20 {
  color: #2563eb;
  font-weight: 700;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid #3b82f6;
  display: inline-block;
}

/* Colores específicos para cada cliente */
.cliente-limpio.otilio strong {
  background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
  color: #92400e;
}

.cliente-limpio.catarro strong {
  background: linear-gradient(135deg, #fee2e2 0%, #f87171 100%);
  color: #991b1b;
}

.cliente-limpio.joselito strong {
  background: linear-gradient(135deg, #dbeafe 0%, #60a5fa 100%);
  color: #1e3a8a;
}

.cliente-limpio.ozuna strong {
  background: linear-gradient(135deg, #d1fae5 0%, #34d399 100%);
  color: #064e3b;
}

.cliente-limpio.lorena strong {
  background: linear-gradient(135deg, #fed7aa 0%, #fb923c 100%);
  color: #7c2d12;
}

.cliente-limpio.temporal strong {
  background: linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%);
  color: #1f2937;
}

.modal-pedido-footer {
  flex: 0 0 auto;
  padding: 14px 22px;
  background: rgba(8, 18, 33, 0.98);
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  display: flex;
  justify-content: flex-end;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.18);
}

.btn-cerrar-footer {
  min-width: 130px;
  padding: 10px 24px;
  background: rgba(30, 41, 59, 0.88);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.30);
  border-radius: 9px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.20);
  position: relative;
  overflow: hidden;
}

.btn-cerrar-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn-cerrar-footer:hover::before {
  left: 100%;
}

.btn-cerrar-footer:hover {
  transform: translateY(-2px);
  color: #fff;
  border-color: rgba(125, 211, 252, 0.50);
  background: rgba(30, 64, 175, 0.28);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
}

@media (max-width: 1024px) and (min-width: 769px) {
  .clientes-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .modal-pedido-overlay {
    padding: 10px;
  }

  .modal-pedido-content {
    width: 100%;
    max-width: 100%;
    height: calc(100dvh - 20px);
    margin: 0;
    border-radius: 14px;
  }

  .modal-pedido-header {
    padding: 12px 15px;
  }

  .modal-pedido-header h2 {
    font-size: 1.2rem;
  }

  .modal-pedido-body {
    padding: 12px 15px;
  }

  .pedido-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .pedido-tipo {
    width: 100%;
    justify-content: space-between;
  }

  .pedido-acciones {
    width: 100%;
    justify-content: flex-end;
  }

  .btn-ver-pedido,
  .btn-editar-pedido {
    padding: 8px 16px;
    font-size: 0.85rem;
  }

  .pedido-totales {
    font-size: 1rem;
  }

  .pedido-totales span {
    padding: 5px 10px;
    font-size: 0.9rem;
  }

  .detalles-crudo h4,
  .detalles-limpio h4 {
    font-size: 1.1rem;
    padding: 8px 16px;
  }

  .cliente-crudo,
  .cliente-limpio {
    padding: 12px;
  }

  .columna-texto,
  .item-limpio {
    font-size: 1rem;
  }

  .cliente-crudo strong,
  .cliente-limpio strong {
    font-size: 1rem;
    margin-bottom: 12px;
  }

  .clientes-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .acciones-sin-pedidos {
    max-width: 100%;
    gap: 12px;
  }

  .btn-crear-pedido {
    padding: 12px 20px;
    font-size: 14px;
  }

  .modal-pedido-footer {
    padding: 15px 20px;
  }

  .btn-cerrar-footer {
    padding: 10px 20px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .modal-pedido-content {
    width: 100%;
    border-radius: 12px;
  }

  .modal-pedido-header {
    padding: 12px 15px;
  }

  .modal-pedido-header h2 {
    font-size: 1.1rem;
  }

  .modal-pedido-icono {
    width: 38px;
    height: 38px;
    flex-basis: 38px;
    border-radius: 10px;
  }

  .modal-pedido-kicker {
    font-size: 0.58rem;
  }

  .modal-pedido-titulo p {
    font-size: 0.75rem;
  }

  .btn-cerrar-modal {
    width: 30px;
    height: 30px;
    font-size: 1rem;
  }

  .pedido-item {
    padding: 12px;
  }

  .tipo-badge {
    padding: 6px 12px;
    font-size: 0.85rem;
  }

  .pedido-totales {
    gap: 10px;
  }

  .pedido-totales span {
    padding: 4px 8px;
    font-size: 0.85rem;
  }

  .btn-ver-pedido,
  .btn-editar-pedido {
    padding: 6px 12px;
    font-size: 0.8rem;
  }

  .cliente-crudo,
  .cliente-limpio {
    padding: 10px;
  }

  .columna-texto,
  .item-limpio {
    font-size: 0.9rem;
  }

  .columna-item,
  .item-limpio-container {
    padding: 8px 10px;
  }

  .item-checkbox-container {
    width: 20px;
    height: 20px;
  }

  .item-checkmark {
    width: 20px;
    height: 20px;
  }

  .item-checkmark:after {
    left: 5px;
    top: 1px;
    width: 5px;
    height: 10px;
  }

  .acciones-sin-pedidos {
    flex-direction: column;
  }

  .btn-crear-pedido {
    width: 100%;
    padding: 12px;
  }

  .detalles-crudo h4,
  .detalles-limpio h4 {
    font-size: 1rem;
    padding: 10px 15px;
  }

  .clientes-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
