<template>
  <div class="pedidos-menu-container">
    <h1 class="menu-title">Menú de Pedidos</h1>
    
    <div class="actions-container">
      <router-link to="/procesos/pedidos/nuevo" class="action-button">
        <button class="btn-nuevo-pedido">
          <i class="fas fa-plus"></i>
          Nuevo Pedido
        </button>
      </router-link>
    </div>

    <div class="pedidos-list">
      <div class="filtros">
        <div class="filtro-tipo">
          <label>Tipo:</label>
          <select v-model="filtroTipo">
            <option value="todos">Todos</option>
            <option value="crudo">Crudo</option>
            <option value="limpio">Limpio</option>
          </select>
        </div>
        <div class="filtro-fecha">
          <label>Fecha:</label>
          <input type="date" v-model="filtroFecha">
        </div>
      </div>

      <div class="tabla-pedidos" v-if="pedidosFiltrados.length > 0">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pedido in pedidosFiltrados" :key="pedido.id">
              <td class="fecha-celda">
                <div class="fecha-container">
                  <div class="fecha-dia">{{ obtenerDia(pedido.fecha) }}</div>
                  <div class="fecha-mes-ano">
                    <span class="mes">{{ obtenerMes(pedido.fecha) }}</span>
                    <span class="ano">{{ obtenerAno(pedido.fecha) }}</span>
                  </div>
                </div>
              </td>
              <td class="detalles-celda">
                <div class="tipo-acciones">
                  <span class="tipo-badge" :class="pedido.tipo">
                    {{ capitalizarPrimeraLetra(pedido.tipo) }}
                  </span>
                  <span v-if="pedido.tipo === 'crudo'" class="kilos-badge">
                    <div class="kilos-taras-container">
                      <div>{{ Math.round(calcularKilos(pedido)) }} Kg</div>
                      <div>{{ Math.round(calcularTaras(pedido)) }} T</div>
                    </div>
                  </span>
                  <div class="acciones">
                    <button @click="editarPedido(pedido)" class="btn-editar" title="Ver">
                      Ver
                    </button>
                    <button @click="imprimirPedido(pedido)" class="btn-imprimir" title="Imprimir">
                      <i class="fas fa-print"></i>
                      Imprimir
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="no-pedidos">
        No hay pedidos que coincidan con los filtros seleccionados
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'

export default {
  name: 'PedidosMenu',
  data() {
    return {
      pedidos: [],
      filtroTipo: 'todos',
      filtroFecha: ''
    }
  },
  computed: {
    pedidosFiltrados() {
      return this.pedidos
        .filter(pedido => {
          const cumpleTipo = this.filtroTipo === 'todos' || pedido.tipo === this.filtroTipo
          const cumpleFecha = !this.filtroFecha || pedido.fecha === this.filtroFecha
          return cumpleTipo && cumpleFecha
        })
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    }
  },
  methods: {
    obtenerDia(fecha) {
      const date = new Date(fecha + 'T00:00:00')
      return date.getDate().toString().padStart(2, '0')
    },
    obtenerMes(fecha) {
      const date = new Date(fecha + 'T00:00:00')
      const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
      return meses[date.getMonth()]
    },
    obtenerAno(fecha) {
      const date = new Date(fecha + 'T00:00:00')
      return date.getFullYear()
    },
    formatearFecha(fecha) {
      const date = new Date(fecha)
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
      return date.toLocaleDateString('es-ES')
    },
    capitalizarPrimeraLetra(texto) {
      return texto.charAt(0).toUpperCase() + texto.slice(1)
    },
    calcularKilos(pedido) {
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
      return (totalPiezas * 19).toFixed(2);
    },
    calcularTaras(pedido) {
      const kilos = parseFloat(this.calcularKilos(pedido));
      return (kilos / 19).toFixed(2);
    },
    imprimirPedido(pedido) {
      this.$router.push({
        name: pedido.tipo === 'crudo' ? 'PedidoCrudosImpresion' : 'PedidoLimpiosImpresion',
        params: {
          fecha: pedido.fecha,
          pedidos: pedido.pedidos,
          columnas: pedido.columnas
        }
      })
    },
    editarPedido(pedido) {
      const ruta = pedido.tipo === 'crudo' ? '/procesos/pedidos/crudo' : '/procesos/pedidos/limpio'
      this.$router.push({
        path: ruta,
        query: { edit: 'true', id: pedido.id }
      })
    }
  },
  created() {
    const q = query(collection(db, 'pedidos'), orderBy('createdAt', 'desc'))
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.pedidos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    })
  },
  beforeDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }
}
</script>

<style scoped>
.pedidos-menu-container {
  max-width: 1000px;
  width: 95%;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.menu-title {
  color: #2c3e50;
  font-size: 2.5em;
  margin-bottom: 40px;
  text-align: center;
  font-weight: 600;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
}

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 30px;
  width: 100%;
  max-width: 500px;
}

.btn-nuevo-pedido {
  width: 100%;
  padding: 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-nuevo-pedido:hover {
  background-color: #2980b9;
}

.action-button {
  text-decoration: none;
  width: 100%;
}

.pedidos-list {
  width: 100%;
  margin-top: 40px;
}

.filtros {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.filtro-tipo, .filtro-fecha {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filtro-tipo select, .filtro-fecha input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.tabla-pedidos {
  width: 100%;
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 1rem;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 20px;
}

th, td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #edf2f7;
  transition: background-color 0.2s ease;
}

th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #2d3748;
  text-transform: uppercase;
  font-size: 0.875rem;
  letter-spacing: 0.05em;
}

th:first-child {
  border-top-left-radius: 8px;
}

th:last-child {
  border-top-right-radius: 8px;
}

tr:hover td {
  background-color: #f7fafc;
}

.fecha-celda {
  width: 120px;
}

.fecha-container {
  background: #f8fafc;
  border-radius: 10px;
  padding: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.fecha-dia {
  font-size: 1.8em;
  font-weight: bold;
  color: #2c3e50;
  line-height: 1;
  margin-bottom: 4px;
}

.fecha-mes-ano {
  display: flex;
  flex-direction: column;
  font-size: 0.8em;
  color: #64748b;
}

.mes {
  font-weight: 600;
  letter-spacing: 0.05em;
}

.ano {
  font-size: 0.9em;
}

.detalles-celda {
  padding: 12px 16px;
}

.tipo-acciones {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tipo-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9em;
  text-transform: capitalize;
}

.tipo-badge.crudo {
  background-color: #fef3c7;
  color: #92400e;
}

.tipo-badge.limpio {
  background-color: #dcfce7;
  color: #166534;
}

.kilos-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9em;
  background-color: #e3f2fd;
  color: #1565c0;
}

.kilos-taras-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 0.9em;
}

.acciones {
  display: flex;
  gap: 8px;
}

.btn-editar, .btn-imprimir {
  padding: 6px 12px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9em;
}

.btn-editar {
  background-color: #e3f2fd;
  color: #1565c0;
  min-width: 50px;
}

.btn-editar:hover {
  background-color: #bbdefb;
  transform: translateY(-2px);
}

.btn-imprimir {
  background-color: #e8f5e9;
  color: #2e7d32;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 90px;
}

.btn-imprimir:hover {
  background-color: #c8e6c9;
  transform: translateY(-2px);
}

.btn-imprimir i {
  font-size: 0.9em;
}

@media (max-width: 768px) {
  .tabla-pedidos {
    padding: 0.5rem;
    border-radius: 8px;
  }

  th, td {
    padding: 12px 8px;
    font-size: 0.9rem;
  }

  .btn-editar, .btn-imprimir {
    padding: 6px 12px;
    font-size: 0.85em;
  }

  .fecha-celda {
    width: 100px;
  }

  .fecha-container {
    padding: 6px;
  }

  .fecha-dia {
    font-size: 1.5em;
  }

  .tipo-acciones {
    gap: 12px;
  }

  .btn-imprimir {
    min-width: 80px;
  }
}

@media (max-width: 480px) {
  th, td {
    padding: 10px 6px;
    font-size: 0.85rem;
  }

  .acciones {
    gap: 8px;
  }

  .btn-editar, .btn-imprimir {
    padding: 4px 8px;
    font-size: 0.8em;
  }

  .fecha-celda {
    width: 80px;
  }

  .fecha-container {
    padding: 4px;
  }

  .fecha-dia {
    font-size: 1.3em;
  }

  .tipo-badge {
    padding: 4px 8px;
    font-size: 0.8em;
  }

  .tipo-acciones {
    gap: 8px;
  }

  .btn-imprimir {
    min-width: 70px;
  }

  .kilos-taras-container {
    font-size: 0.8em;
  }
}

.no-pedidos {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}
</style> 