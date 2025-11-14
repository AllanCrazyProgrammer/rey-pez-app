<template>
  <div class="pedidos-menu-container">
    <h1 class="menu-title">Menú de Pedidos</h1>
    
    <div class="actions-container">
      <div class="nuevo-pedido-buttons">
        <router-link to="/procesos/pedidos/crudo" class="action-button">
          <button class="btn-nuevo-pedido crudo">
            <i class="fas fa-plus"></i>
            Nuevo Pedido Crudo
          </button>
        </router-link>
        <router-link to="/procesos/pedidos/limpio" class="action-button">
          <button class="btn-nuevo-pedido limpio">
            <i class="fas fa-plus"></i>
            Nuevo Pedido Limpio
          </button>
        </router-link>
      </div>
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
            <tr v-for="grupo in pedidosFiltrados" :key="grupo.fecha">
              <td class="fecha-celda">
                <div class="fecha-container">
                  <div class="fecha-dia">{{ obtenerDia(grupo.fecha) }}</div>
                  <div class="fecha-mes-ano">
                    <span class="mes">{{ obtenerMes(grupo.fecha) }}</span>
                    <span class="ano">{{ obtenerAno(grupo.fecha) }}</span>
                  </div>
                  <div class="totales-dia">
                    <div>{{ calcularTotalesDia(grupo.pedidos).taras }} T</div>
                    <div>{{ calcularTotalesDia(grupo.pedidos).kilos }} Kg</div>
                  </div>
                </div>
              </td>
              <td class="detalles-celda">
                <div v-for="pedido in grupo.pedidos" :key="pedido.id" class="tipo-acciones">
                  <span class="tipo-badge" :class="pedido.tipo">
                    {{ capitalizarPrimeraLetra(pedido.tipo) }}
                  </span>
                  <span :class="['kilos-badge', pedido.tipo]">
                    <div class="kilos-taras-container">
                      <div>{{ pedido.tipo === 'crudo' ? formatearNumero(Math.round(calcularKilos(pedido))) : formatearNumero(Math.round(calcularKilosLimpio(pedido))) }} Kg</div>
                      <div>{{ pedido.tipo === 'crudo' ? Math.round(calcularTaras(pedido)) : Math.round(calcularTarasLimpio(pedido)) }} T</div>
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
                    <button @click="eliminarPedido(pedido)" class="btn-eliminar" title="Eliminar">
                      <i class="fas fa-trash"></i>
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
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'

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
      // Primero filtramos los pedidos según los criterios
      const pedidosFiltrados = this.pedidos.filter(pedido => {
        const cumpleTipo = this.filtroTipo === 'todos' || pedido.tipo === this.filtroTipo
        const cumpleFecha = !this.filtroFecha || pedido.fecha === this.filtroFecha
        return cumpleTipo && cumpleFecha
      })

      // Agrupamos los pedidos por fecha
      const pedidosAgrupados = pedidosFiltrados.reduce((acc, pedido) => {
        if (!acc[pedido.fecha]) {
          acc[pedido.fecha] = {
            fecha: pedido.fecha,
            pedidos: []
          }
        }
        acc[pedido.fecha].pedidos.push(pedido)
        return acc
      }, {})

      // Convertimos el objeto en array y ordenamos por fecha descendente
      return Object.values(pedidosAgrupados)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    }
  },
  methods: {
    formatearNumero(numero) {
      return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
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
    calcularKilosLimpio(pedido) {
      let totalKilos = 0;
      
      // Sumar kilos de cada cliente
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
      
      return totalKilos;
    },
    calcularTarasLimpio(pedido) {
      let totalTaras = 0;
      
      // Sumar taras de cada cliente
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
      
      return totalTaras;
    },
    calcularKilosCliente(items) {
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;
      let kilos135 = 0;
      let kilosTaras135 = 0;
      let kilos15y3 = 0;
      let kilosTaras15y3 = 0;
      let kilos7y3 = 0;

      items.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else if (item.tipo === '1.35 y .15') {
              kilosTaras135 += Number(item.kilos) * 30;
            } else if (item.tipo === '1.5 y .3') {
              kilosTaras15y3 += Number(item.kilos) * 30;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos) * 1.35;
          } else if (item.tipo === '1.5 y .3') {
            kilos15y3 += Number(item.kilos) * 1.5;
          } else if (item.tipo === '.7 y .3') {
            kilos7y3 += Number(item.kilos) * 0.7;
          }
        }
      });

      return kilosSinH2O + kilosTaras + kilosTaras135 + kilosTaras15y3 + kilosConH2O + kilos135 + kilos15y3 + kilos7y3;
    },
    calcularTarasCliente(items) {
      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilos135 = 0;
      let kilos15y3 = 0;

      items.forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === '1.35 y .15') {
            kilos135 += Number(item.kilos);
          } else if (item.tipo === '1.5 y .3') {
            kilos15y3 += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 25;
      const tarasPor135 = kilos135 / (1.35 * 25);
      const tarasPor15y3 = kilos15y3 / (1.5 * 25);

      return tarasDirectas + tarasPorKilos + tarasPor135 + tarasPor15y3;
    },
    imprimirPedido(pedido) {
      if (pedido.tipo === 'crudo') {
        // Replicar la misma lógica de filtrado que en la vista de crudos
        // para que la vista previa sea idéntica al botón de imprimir interno
        const pedidosConDatos = {};

        for (const cliente in pedido.pedidos) {
          let tieneValores = false;

          for (const columna in pedido.pedidos[cliente]) {
            const valor = pedido.pedidos[cliente][columna];
            if (valor && !isNaN(valor) && parseFloat(valor) > 0) {
              tieneValores = true;
              break;
            }
          }

          if (tieneValores) {
            pedidosConDatos[cliente] = pedido.pedidos[cliente];
          }
        }

        this.$router.push({
          name: 'PedidoCrudosImpresion',
          params: {
            fecha: pedido.fecha,
            pedidos: pedidosConDatos,
            columnas: pedido.columnas
          }
        });
      } else {
        // Para pedidos limpios - ir directamente a la vista previa
        this.$router.push({
          name: 'PedidoLimpioImpresion',
          params: {
            fecha: pedido.fecha,
            id: pedido.id,
            pedidoOtilio: pedido.otilio || [],
            pedidoCatarro: pedido.catarro || [],
            pedidoJoselito: pedido.joselito || [],
            pedidoOzuna: pedido.ozuna || [],
            pedidoLorena: pedido.lorena || [],
            clientesTemporales: pedido.clientesTemporales || {},
            rendimientosGuardados: pedido.rendimientos || {},
            divisoresGuardados: pedido.divisores || {},
            completadosGuardados: pedido.completados || {},
            kilosRefrigeradosGuardados: pedido.kilosRefrigerados || {}
          }
        });
      }
    },
    editarPedido(pedido) {
      const ruta = pedido.tipo === 'crudo' ? '/procesos/pedidos/crudo' : '/procesos/pedidos/limpio'
      this.$router.push({
        path: ruta,
        query: { edit: 'true', id: pedido.id, fecha: pedido.fecha }
      })
    },
    async eliminarPedido(pedido) {
      try {
        const confirmar = window.confirm('¿Está seguro que desea eliminar este pedido? Esta acción no se puede deshacer.')
        if (confirmar) {
          await deleteDoc(doc(db, 'pedidos', pedido.id))
          alert('Pedido eliminado exitosamente')
        }
      } catch (error) {
        console.error('Error al eliminar el pedido:', error)
        alert('Error al eliminar el pedido. Por favor intente nuevamente.')
      }
    },
    calcularTotalesDia(pedidos) {
      let totalKilos = 0;
      let totalTaras = 0;

      pedidos.forEach(pedido => {
        if (pedido.tipo === 'crudo') {
          totalKilos += Math.round(parseFloat(this.calcularKilos(pedido)));
          totalTaras += Math.round(parseFloat(this.calcularTaras(pedido)));
        } else if (pedido.tipo === 'limpio') {
          totalKilos += Math.round(this.calcularKilosLimpio(pedido));
          totalTaras += Math.round(this.calcularTarasLimpio(pedido));
        }
      });

      return {
        kilos: this.formatearNumero(totalKilos),
        taras: totalTaras
      };
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

.nuevo-pedido-buttons {
  display: flex;
  gap: 20px;
  width: 100%;
}

.btn-nuevo-pedido {
  width: 100%;
  padding: 15px;
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

.btn-nuevo-pedido.crudo {
  background-color: #1e88e5;
}

.btn-nuevo-pedido.crudo:hover {
  background-color: #1565c0;
}

.btn-nuevo-pedido.limpio {
  background-color: #e65100;
}

.btn-nuevo-pedido.limpio:hover {
  background-color: #ff9800;
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
  padding: 8px 0;
  border-bottom: 1px solid #edf2f7;
}

.tipo-acciones:last-child {
  border-bottom: none;
}

.tipo-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9em;
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tipo-badge.crudo {
  background-color: #1e88e5;
  color: #ffffff;
}

.tipo-badge.limpio {
  background-color: #e65100;
  color: white;
}

.kilos-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9em;
  background-color: transparent;
  color: inherit;
  margin-left: 8px;
}

.kilos-taras-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  margin-left: auto;
}

.kilos-taras-container div {
  background-color: rgba(255, 255, 255, 0.5);
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 60px;
  text-align: center;
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

.btn-eliminar {
  background-color: #fee2e2;
  color: #dc2626;
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
  min-width: 40px;
}

.btn-eliminar:hover {
  background-color: #fecaca;
  transform: translateY(-2px);
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

  .btn-eliminar {
    padding: 6px 12px;
    font-size: 0.85em;
  }

  .nuevo-pedido-buttons {
    flex-direction: column;
    gap: 10px;
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

  .btn-eliminar {
    padding: 4px 8px;
    font-size: 0.8em;
  }

  .nuevo-pedido-buttons {
    flex-direction: column;
    gap: 10px;
  }
}

@media (max-width: 375px) {
  .pedidos-menu-container {
    padding: 20px 10px;
  }

  .menu-title {
    font-size: 1.8em;
    margin-bottom: 20px;
  }

  .nuevo-pedido-buttons {
    gap: 8px;
  }

  .btn-nuevo-pedido {
    padding: 12px;
    font-size: 0.95em;
  }

  .tabla-pedidos {
    padding: 0.25rem;
  }

  th, td {
    padding: 8px 4px;
    font-size: 0.8rem;
  }

  .fecha-celda {
    width: 70px;
  }

  .fecha-container {
    padding: 4px 2px;
  }

  .fecha-dia {
    font-size: 1.2em;
  }

  .fecha-mes-ano {
    font-size: 0.7em;
  }

  .tipo-acciones {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 6px 0;
  }

  .acciones {
    width: 100%;
    justify-content: space-between;
  }

  .btn-editar, .btn-imprimir, .btn-eliminar {
    padding: 4px 6px;
    font-size: 0.75em;
    min-width: auto;
  }

  .tipo-badge {
    padding: 3px 6px;
    font-size: 0.75em;
  }

  .kilos-taras-container {
    gap: 4px;
    font-size: 0.75em;
    margin-left: 8px;
  }

  .kilos-taras-container div {
    padding: 1px 4px;
    border-radius: 8px;
    min-width: 45px;
  }

  .totales-dia {
    font-size: 0.8em;
    margin-top: 4px;
    padding-top: 4px;
  }

  .filtros {
    flex-direction: column;
    gap: 10px;
  }

  .filtro-tipo, .filtro-fecha {
    width: 100%;
  }

  .filtro-tipo select, .filtro-fecha input {
    width: 100%;
    padding: 6px;
  }
}

.no-pedidos {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

.kilos-badge.limpio {
  background-color: #fff3e0;
  color: #e65100;
}

.totales-dia {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #edf2f7;
  font-size: 0.9em;
  color: #2c3e50;
  font-weight: 600;
}

.totales-dia div {
  line-height: 1.4;
}
</style> 
