<template>
  <div v-if="mostrar" class="modal-pedido-overlay" @click="cerrarModal">
    <div class="modal-pedido-content" @click.stop>
      <div class="modal-pedido-header">
        <h2>📋 Pedidos de {{ nombreCliente }} - {{ fechaEmbarque }}</h2>
        <button class="btn-cerrar-modal" @click="cerrarModal">&times;</button>
      </div>
      
      <div class="modal-pedido-body">
        <div v-if="cargandoPedidos" class="cargando-pedidos">
          <div class="spinner"></div>
          <p>Cargando pedidos del cliente...</p>
        </div>
        
        <div v-else-if="!pedidoLimpio && !pedidoCrudo" class="sin-pedidos-cliente">
          <div class="icono-sin-pedidos">📄</div>
          <p>No hay pedidos registrados para {{ nombreCliente }} el día {{ fechaEmbarque }}</p>
          <div class="acciones-sin-pedidos">
            <button @click="crearPedidoCrudo" class="btn-crear-pedido crudo">
              + Crear Pedido Crudo
            </button>
            <button @click="crearPedidoLimpio" class="btn-crear-pedido limpio">
              + Crear Pedido Limpio
            </button>
          </div>
        </div>
        
        <div v-else class="pedidos-cliente-contenedor">
          <!-- Pedido Limpio -->
          <div v-if="pedidoLimpio" class="pedido-seccion limpio">
            <div class="pedido-seccion-header">
              <div class="pedido-tipo-info">
                <span class="tipo-badge limpio">Limpio</span>
                <div class="pedido-totales">
                  <span>{{ calcularKilosPedidoLimpio }} kg</span>
                  <span>{{ calcularTarasPedidoLimpio }} T</span>
                </div>
              </div>
              <div class="pedido-acciones">
                <button @click="editarPedido(pedidoLimpio)" class="btn-editar-pedido">
                  ✏️ Editar
                </button>
              </div>
            </div>
            
            <div class="pedido-detalles">
              <div class="items-lista">
                <div v-for="(item, index) in itemsPedidoLimpio" :key="index" class="item-pedido">
                  <label class="item-checkbox-container">
                    <input 
                      type="checkbox" 
                      :checked="getItemCompletadoState(pedidoLimpio.id, 'limpio', nombreClienteEncontradoLimpio, index)"
                      @change="toggleItemCompletado(pedidoLimpio.id, 'limpio', nombreClienteEncontradoLimpio, index, $event.target.checked)"
                    >
                    <span class="item-checkmark"></span>
                  </label>
                  <span class="item-texto" :class="{ 'completado': getItemCompletadoState(pedidoLimpio.id, 'limpio', nombreClienteEncontradoLimpio, index) }">
                    {{ item.kilos }}{{ item.esTara ? ' T' : ' kg' }} - {{ item.medida || 'Sin medida' }} - 
                    <span class="tipo-producto" :class="{ 'no-sh20': item.tipo && item.tipo !== 'S/H20' }">
                      {{ item.tipo || 'Sin tipo' }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pedido Crudo -->
          <div v-if="pedidoCrudo" class="pedido-seccion crudo">
            <div class="pedido-seccion-header">
              <div class="pedido-tipo-info">
                <span class="tipo-badge crudo">Crudo</span>
                <div class="pedido-totales">
                  <span>{{ calcularKilosPedidoCrudo }} kg</span>
                  <span>{{ calcularTarasPedidoCrudo }} T</span>
                </div>
              </div>
              <div class="pedido-acciones">
                <button @click="editarPedido(pedidoCrudo)" class="btn-editar-pedido">
                  ✏️ Editar
                </button>
              </div>
            </div>
            
            <div class="pedido-detalles">
              <div class="columnas-crudo">
                <div v-for="(valor, columna) in itemsPedidoCrudo" :key="columna" v-if="valor" class="columna-item">
                  <label class="item-checkbox-container">
                    <input 
                      type="checkbox" 
                      :checked="getItemCompletadoState(pedidoCrudo.id, 'crudo', nombreClienteEncontradoCrudo, columna)"
                      @change="toggleItemCompletado(pedidoCrudo.id, 'crudo', nombreClienteEncontradoCrudo, columna, $event.target.checked)"
                    >
                    <span class="item-checkmark"></span>
                  </label>
                  <span class="columna-texto" :class="{ 'completado': getItemCompletadoState(pedidoCrudo.id, 'crudo', nombreClienteEncontradoCrudo, columna) }">
                    {{ columna }}: {{ valor }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-pedido-footer">
        <button @click="cerrarModal" class="btn-cerrar-footer">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

export default {
  name: 'PedidoClienteModal',
  props: {
    mostrar: {
      type: Boolean,
      default: false
    },
    fechaEmbarque: {
      type: String,
      default: ''
    },
    nombreCliente: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      pedidoLimpio: null,
      pedidoCrudo: null,
      cargandoPedidos: false,
      itemsCompletados: {},
      nombreClienteEncontradoLimpio: null, // Nombre exacto encontrado en Firebase para limpio
      nombreClienteEncontradoCrudo: null  // Nombre exacto encontrado en Firebase para crudo
    };
  },
  computed: {
    clienteKey() {
      // Normalizar el nombre del cliente a minúsculas para coincidir con la estructura de Firebase
      return this.nombreCliente ? this.nombreCliente.toLowerCase() : '';
    },
    posiblesNombresCliente() {
      // Si no hay nombre de cliente, retornar array vacío
      if (!this.nombreCliente || this.nombreCliente.trim() === '') {
        return [];
      }
      
      // Generar array de posibles variaciones del nombre del cliente
      const nombres = [];
      const nombreOriginal = this.nombreCliente;
      
      // Agregar el nombre original
      nombres.push(nombreOriginal);
      
      // Agregar en minúsculas
      nombres.push(nombreOriginal.toLowerCase());
      
      // Agregar capitalizado (Primera letra mayúscula)
      nombres.push(nombreOriginal.charAt(0).toUpperCase() + nombreOriginal.slice(1).toLowerCase());
      
      // Para Veronica/Lorena, agregar ambas variaciones
      if (nombreOriginal.toLowerCase().includes('veronica') || nombreOriginal.toLowerCase().includes('lorena')) {
        nombres.push('Veronica', 'veronica', 'Lorena', 'lorena');
      }
      
      // Para Joselito/8a, agregar ambas variaciones (son la misma persona)
      if (nombreOriginal.toLowerCase().includes('joselito') || nombreOriginal.toLowerCase() === '8a') {
        nombres.push('Joselito', 'joselito', '8a', '8A');
      }
      
      // Retornar array único de nombres
      return [...new Set(nombres)];
    },
    itemsPedidoLimpio() {
      if (!this.pedidoLimpio) return [];
      
      // Buscar usando todas las variaciones posibles del nombre
      for (const nombreVariacion of this.posiblesNombresCliente) {
        if (this.pedidoLimpio[nombreVariacion] && this.pedidoLimpio[nombreVariacion].length > 0) {
          return this.pedidoLimpio[nombreVariacion];
        }
      }
      
      // Buscar en clientesTemporales con comparación flexible
      if (this.pedidoLimpio.clientesTemporales) {
        for (const id in this.pedidoLimpio.clientesTemporales) {
          const cliente = this.pedidoLimpio.clientesTemporales[id];
          if (cliente.nombre) {
            // Comparar de forma case-insensitive
            const nombreClienteTemporal = cliente.nombre.toLowerCase();
            for (const nombreVariacion of this.posiblesNombresCliente) {
              if (nombreClienteTemporal === nombreVariacion.toLowerCase()) {
                return cliente.pedidos || [];
              }
            }
          }
        }
      }
      
      return [];
    },
    itemsPedidoCrudo() {
      if (!this.pedidoCrudo || !this.pedidoCrudo.pedidos) return {};
      
      // Buscar usando todas las variaciones posibles del nombre
      for (const nombreVariacion of this.posiblesNombresCliente) {
        if (this.pedidoCrudo.pedidos[nombreVariacion]) {
          return this.pedidoCrudo.pedidos[nombreVariacion];
        }
      }
      
      return {};
    },
    calcularKilosPedidoLimpio() {
      let totalKilos = 0;
      this.itemsPedidoLimpio.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            if (item.tipo === 'C/H20') {
              totalKilos += Number(item.kilos) * 30 * 0.65;
            } else if (item.tipo === '1.35 y .15') {
              totalKilos += Number(item.kilos) * 30;
            } else {
              totalKilos += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            totalKilos += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            totalKilos += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            totalKilos += Number(item.kilos) * 1.35;
          } else if (item.tipo === '.7 y .3') {
            totalKilos += Number(item.kilos) * 0.7;
          }
        }
      });
      return Math.round(totalKilos).toString();
    },
    calcularTarasPedidoLimpio() {
      let totalTaras = 0;
      let kilosSinH2O = 0;
      let kilos135 = 0;

      this.itemsPedidoLimpio.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            totalTaras += Number(item.kilos);
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 25;
      const tarasPor135 = kilos135 / (1.35 * 25);

      return Math.round(totalTaras + tarasPorKilos + tarasPor135).toString();
    },
    calcularKilosPedidoCrudo() {
      let totalPiezas = 0;
      for (const columna in this.itemsPedidoCrudo) {
        const valor = this.itemsPedidoCrudo[columna];
        if (valor && !isNaN(valor)) {
          totalPiezas += parseFloat(valor);
        }
      }
      return (totalPiezas * 19).toFixed(0);
    },
    calcularTarasPedidoCrudo() {
      const kilos = parseFloat(this.calcularKilosPedidoCrudo);
      return Math.round(kilos / 19).toString();
    }
  },
  watch: {
    mostrar(newVal) {
      if (newVal) {
        this.cargarPedidosCliente();
      }
    }
  },
  methods: {
    async cargarPedidosCliente() {
      // No cargar si no hay nombre de cliente
      if (!this.nombreCliente || this.nombreCliente.trim() === '') {
        return;
      }
      
      this.cargandoPedidos = true;
      try {
        const db = getFirestore();
        const pedidosRef = collection(db, 'pedidos');
        const q = query(pedidosRef, where('fecha', '==', this.fechaEmbarque));
        const snapshot = await getDocs(q);

        this.pedidoLimpio = null;
        this.pedidoCrudo = null;
        this.itemsCompletados = {};
        this.nombreClienteEncontradoLimpio = null;
        this.nombreClienteEncontradoCrudo = null;
        
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          
          if (data.tipo === 'limpio') {
            // Verificar si este pedido limpio contiene datos para el cliente usando todas las variaciones
            let nombreEncontrado = null;
            
            // Buscar en las propiedades directas del pedido
            for (const nombreVariacion of this.posiblesNombresCliente) {
              if (data[nombreVariacion] && data[nombreVariacion].length > 0) {
                nombreEncontrado = nombreVariacion;
                break;
              }
            }
            
            // También verificar en clientesTemporales
            if (!nombreEncontrado && data.clientesTemporales) {
              for (const id in data.clientesTemporales) {
                const cliente = data.clientesTemporales[id];
                if (cliente.nombre) {
                  const nombreClienteTemporal = cliente.nombre.toLowerCase();
                  for (const nombreVariacion of this.posiblesNombresCliente) {
                    if (nombreClienteTemporal === nombreVariacion.toLowerCase()) {
                      nombreEncontrado = cliente.nombre; // Usar el nombre tal como está en Firebase
                      break;
                    }
                  }
                  if (nombreEncontrado) break;
                }
              }
            }
            
            if (nombreEncontrado) {
              this.pedidoLimpio = {
                id: docSnap.id,
                ...data
              };
              this.nombreClienteEncontradoLimpio = nombreEncontrado;
              this.cargarEstadosCompletados(docSnap.id, data, 'limpio');
            }
          } else if (data.tipo === 'crudo') {
            // Verificar si este pedido crudo contiene datos para el cliente usando todas las variaciones
            let nombreEncontrado = null;
            if (data.pedidos) {
              for (const nombreVariacion of this.posiblesNombresCliente) {
                if (data.pedidos[nombreVariacion]) {
                  nombreEncontrado = nombreVariacion;
                  break;
                }
              }
            }
            
            if (nombreEncontrado) {
              this.pedidoCrudo = {
                id: docSnap.id,
                ...data
              };
              this.nombreClienteEncontradoCrudo = nombreEncontrado;
              this.cargarEstadosCompletados(docSnap.id, data, 'crudo');
            }
          }
        });
      } catch (error) {
        console.error("Error al cargar los pedidos del cliente:", error);
        alert('Hubo un error al cargar los pedidos del cliente. Por favor, intente de nuevo.');
      } finally {
        this.cargandoPedidos = false;
      }
    },
    cargarEstadosCompletados(pedidoId, data, tipo) {
      this.$set(this.itemsCompletados, pedidoId, {});
      
      if (!data.itemsCompletados) return;
      
      if (tipo === 'limpio') {
        // Usar el nombre encontrado guardado en lugar de buscar nuevamente
        const nombreEncontrado = this.nombreClienteEncontradoLimpio;
        
        // Cargar estados de items del cliente usando el nombre encontrado
        if (nombreEncontrado && data[nombreEncontrado]) {
          data[nombreEncontrado].forEach((item, index) => {
            const itemKey = `limpio-${nombreEncontrado}-${index}`;
            if (data.itemsCompletados[itemKey]) {
              this.$set(this.itemsCompletados[pedidoId], itemKey, data.itemsCompletados[itemKey]);
            }
          });
        }
        
        // Cargar estados de clientes temporales
        if (data.clientesTemporales) {
          for (const id in data.clientesTemporales) {
            const cliente = data.clientesTemporales[id];
            if (cliente.nombre === nombreEncontrado && cliente.pedidos) {
              cliente.pedidos.forEach((item, index) => {
                const itemKey = `limpio-${id}-${index}`;
                if (data.itemsCompletados[itemKey]) {
                  this.$set(this.itemsCompletados[pedidoId], itemKey, data.itemsCompletados[itemKey]);
                }
              });
            }
          }
        }
      } else if (tipo === 'crudo') {
        // Usar el nombre encontrado guardado en lugar de buscar nuevamente
        const nombreEncontrado = this.nombreClienteEncontradoCrudo;
        
        // Cargar estados de items crudo usando el nombre encontrado
        if (nombreEncontrado && data.pedidos && data.pedidos[nombreEncontrado]) {
          for (const columna in data.pedidos[nombreEncontrado]) {
            const itemKey = `crudo-${nombreEncontrado}-${columna}`;
            if (data.itemsCompletados[itemKey]) {
              this.$set(this.itemsCompletados[pedidoId], itemKey, data.itemsCompletados[itemKey]);
            }
          }
        }
      }
    },
    async toggleItemCompletado(pedidoId, tipo, cliente, itemKey, completado) {
      try {
        const uniqueKey = `${tipo}-${cliente}-${itemKey}`;
        
        if (!this.itemsCompletados[pedidoId]) {
          this.$set(this.itemsCompletados, pedidoId, {});
        }
        this.$set(this.itemsCompletados[pedidoId], uniqueKey, completado);
        
        const db = getFirestore();
        const pedidoRef = doc(db, 'pedidos', pedidoId);
        
        await updateDoc(pedidoRef, {
          [`itemsCompletados.${uniqueKey}`]: completado,
          [`itemsCompletados.${uniqueKey}_fecha`]: completado ? new Date().toISOString() : null
        });
        
        console.log(`Item ${uniqueKey} marcado como ${completado ? 'completado' : 'pendiente'}`);
      } catch (error) {
        console.error('Error al actualizar estado del item:', error);
        const uniqueKey = `${tipo}-${cliente}-${itemKey}`;
        this.$set(this.itemsCompletados[pedidoId], uniqueKey, !completado);
        alert('Error al actualizar el estado del item. Por favor, intente de nuevo.');
      }
    },
    getItemCompletadoState(pedidoId, tipo, cliente, itemKey) {
      const uniqueKey = `${tipo}-${cliente}-${itemKey}`;
      return this.itemsCompletados[pedidoId] && this.itemsCompletados[pedidoId][uniqueKey] || false;
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
      this.pedidoLimpio = null;
      this.pedidoCrudo = null;
      this.itemsCompletados = {};
      this.nombreClienteEncontradoLimpio = null;
      this.nombreClienteEncontradoCrudo = null;
    }
  }
};
</script>

<style scoped>
/* Reutilizar estilos del PedidoDelDiaModal */
.modal-pedido-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.3) 0%, rgba(80, 200, 120, 0.3) 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
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
  background: linear-gradient(145deg, #ffffff 0%, #f8f9fc 100%);
  border-radius: 20px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  width: 95%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  padding: 15px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
  overflow: hidden;
}

.modal-pedido-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1;
  position: relative;
}

.btn-cerrar-modal {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 1.2em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(238, 90, 82, 0.3);
  z-index: 1;
}

.btn-cerrar-modal:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 6px 20px rgba(238, 90, 82, 0.4);
}

.modal-pedido-body {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.5) 0%, rgba(255, 255, 255, 0.8) 100%);
}

.cargando-pedidos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #64748b;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #667eea;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sin-pedidos-cliente {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.icono-sin-pedidos {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.7;
}

.sin-pedidos-cliente p {
  font-size: 1.1rem;
  color: #64748b;
  margin-bottom: 30px;
  font-weight: 500;
}

.acciones-sin-pedidos {
  display: flex;
  gap: 15px;
  width: 100%;
  max-width: 500px;
}

.btn-crear-pedido {
  flex: 1;
  padding: 12px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  color: white;
}

.btn-crear-pedido.crudo {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  box-shadow: 0 4px 15px rgba(30, 136, 229, 0.3);
}

.btn-crear-pedido.limpio {
  background: linear-gradient(135deg, #ff6f00 0%, #e65100 100%);
  box-shadow: 0 4px 15px rgba(255, 111, 0, 0.3);
}

.btn-crear-pedido:hover {
  transform: translateY(-2px);
}

.pedidos-cliente-contenedor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pedido-seccion {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.pedido-seccion:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.pedido-seccion.limpio {
  border-color: rgba(255, 111, 0, 0.3);
}

.pedido-seccion.crudo {
  border-color: rgba(30, 136, 229, 0.3);
}

.pedido-seccion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f1f5f9;
}

.pedido-tipo-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.tipo-badge {
  padding: 8px 16px;
  border-radius: 25px;
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
  color: white;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}

.tipo-badge.limpio {
  background: linear-gradient(135deg, #ff6f00 0%, #e65100 100%);
}

.tipo-badge.crudo {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
}

.pedido-totales {
  display: flex;
  gap: 15px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #475569;
}

.pedido-totales span {
  padding: 6px 14px;
  background: linear-gradient(135deg, #e0e7ff 0%, #e0f2fe 100%);
  border-radius: 20px;
  font-size: 0.95rem;
}

.btn-editar-pedido {
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  box-shadow: 0 3px 10px rgba(139, 92, 246, 0.3);
  transition: all 0.3s ease;
}

.btn-editar-pedido:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(139, 92, 246, 0.4);
}

.items-lista,
.columnas-crudo {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-pedido,
.columna-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #fafbfc 0%, #f3f4f6 100%);
  border-radius: 10px;
  border: 1px solid rgba(229, 231, 235, 0.5);
  transition: all 0.3s ease;
}

.item-pedido:hover,
.columna-item:hover {
  background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
  transform: translateX(5px);
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
  transition: all 0.3s ease;
}

.item-checkbox-container:hover .item-checkmark {
  border-color: #818cf8;
  transform: scale(1.1);
}

.item-checkbox-container input:checked ~ .item-checkmark {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-color: #10b981;
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
}

.item-texto,
.columna-texto {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 600;
  color: #334155;
  transition: all 0.3s ease;
}

.item-texto.completado,
.columna-texto.completado {
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
  display: inline-block;
}

.modal-pedido-footer {
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 1px solid rgba(226, 232, 240, 0.5);
  display: flex;
  justify-content: center;
}

.btn-cerrar-footer {
  padding: 12px 40px;
  background: linear-gradient(135deg, #64748b 0%, #475569 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  box-shadow: 0 4px 15px rgba(100, 116, 139, 0.3);
}

.btn-cerrar-footer:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(100, 116, 139, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .modal-pedido-content {
    width: 95%;
    max-width: 100%;
  }

  .pedido-seccion-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .pedido-acciones {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  .acciones-sin-pedidos {
    flex-direction: column;
  }

  .item-texto,
  .columna-texto {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .modal-pedido-header h2 {
    font-size: 1.1rem;
  }

  .pedido-totales {
    flex-direction: column;
    gap: 8px;
  }

  .tipo-badge {
    font-size: 0.8rem;
    padding: 6px 12px;
  }
}
</style>

