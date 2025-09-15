<template>
  <div class="modal-overlay" v-if="isOpen" @click="closeModal">
    <div class="modal-content" @click.stop>
      <h2>Historial de Producto</h2>
      
      <!-- Formulario de selección -->
      <div class="form-group">
        <select v-model="filtros.tipo" @change="resetSelections">
          <option value="">Seleccionar Tipo</option>
          <option value="proveedor">Proveedor</option>
          <option value="maquila">Maquila</option>
        </select>

        <select v-model="filtros.proveedor" @change="onProveedorChange">
          <option value="">Seleccionar {{ filtros.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}</option>
          <option v-for="prov in proveedoresFiltrados" :key="prov.id" :value="prov.nombre">
            {{ prov.nombre }}
          </option>
        </select>

        <select v-model="filtros.medida">
          <option value="">Seleccionar Medida</option>
          <option v-for="medida in medidasFiltradas" :key="medida.id" :value="medida.nombre">
            {{ medida.nombre }}
          </option>
        </select>

        <select v-model="filtros.movimiento">
          <option value="">Tipo de Movimiento</option>
          <option value="entradas">Entradas</option>
          <option value="salidas">Salidas</option>
          <option value="ambos">Ambos</option>
        </select>

        <input 
          type="date" 
          v-model="filtros.fechaDesde" 
          placeholder="Fecha desde (opcional)"
          title="Fecha desde (opcional)"
        >

        <input 
          type="date" 
          v-model="filtros.fechaHasta" 
          placeholder="Fecha hasta (opcional)"
          title="Fecha hasta (opcional)"
        >

        <button @click="buscarHistorial" :disabled="!isFormValid">Buscar</button>
      </div>

      <!-- Tabla de resultados -->
      <div class="results-container" v-if="historial.length > 0">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Kilos</th>
              <th>Precio</th>
              <th v-if="filtros.movimiento === 'ambos'">Tipo</th>
              <th>Embarcado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in historial" :key="index">
              <td>{{ formatDate(item.fecha) }}</td>
              <td>{{ formatNumber(item.kilos) }} kg</td>
              <td>{{ item.precio ? `$${item.precio}` : '-' }}</td>
              <td v-if="filtros.movimiento === 'ambos'">
                <span :class="item.tipoMovimiento === 'entradas' ? 'tipo-entrada' : 'tipo-salida'">
                  {{ item.tipoMovimiento === 'entradas' ? 'Entrada' : 'Salida' }}
                </span>
              </td>
              <td>
                <span v-if="item.embarqueInfo" :class="getEmbarqueStatusClass(item.embarqueInfo)">
                  {{ getEmbarqueStatusText(item.embarqueInfo) }}
                </span>
                <span v-else class="sin-embarque">-</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td><strong>Total Registros: {{ historial.length }}</strong></td>
              <td><strong>{{ formatNumber(totalKilos) }} kg</strong></td>
              <td><strong>{{ totalConPrecio > 0 ? `$${formatNumber(promedioPrecios)}` : '-' }}</strong></td>
              <td v-if="filtros.movimiento === 'ambos'"></td>
              <td><strong>{{ totalEmbarcados }}/{{ historial.length }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div v-else-if="busquedaRealizada" class="no-results">
        No se encontraron registros para los criterios seleccionados.
      </div>


      <button class="close-button" @click="closeModal">&times;</button>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import moment from 'moment';

export default {
  name: 'HistorialProductoModal',
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    proveedores: {
      type: Array,
      required: true
    },
    medidas: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      filtros: {
        tipo: '',
        proveedor: '',
        medida: '',
        movimiento: '',
        fechaDesde: '',
        fechaHasta: ''
      },
      historial: [],
      busquedaRealizada: false
    };
  },
  computed: {
    proveedoresFiltrados() {
      return this.proveedores.filter(p => p.tipo === this.filtros.tipo);
    },
    medidasFiltradas() {
      if (this.filtros.tipo === 'maquila') {
        const maquila = this.proveedores.find(p => p.nombre === this.filtros.proveedor);
        return maquila ? this.medidas.filter(m => m.tipo === 'maquila' && m.maquilaId === maquila.id) : [];
      } else {
        const proveedor = this.proveedores.find(p => p.nombre === this.filtros.proveedor);
        return proveedor 
          ? this.medidas.filter(m => m.proveedorId === proveedor.id || (!m.proveedorId && m.tipo === 'general'))
          : this.medidas.filter(m => m.tipo === 'general');
      }
    },
    isFormValid() {
      return this.filtros.tipo && 
             this.filtros.proveedor && 
             this.filtros.medida && 
             this.filtros.movimiento;
    },
    totalKilos() {
      return this.historial.reduce((sum, item) => sum + item.kilos, 0);
    },
    totalEmbarcados() {
      return this.historial.filter(item => 
        item.embarqueInfo && item.embarqueInfo.embarcado
      ).length;
    },
    totalConPrecio() {
      return this.historial.filter(item => item.precio && item.precio > 0).length;
    },
    promedioPrecios() {
      const itemsConPrecio = this.historial.filter(item => item.precio && item.precio > 0);
      if (itemsConPrecio.length === 0) return 0;
      const suma = itemsConPrecio.reduce((sum, item) => sum + item.precio, 0);
      return suma / itemsConPrecio.length;
    }
  },
  methods: {
    resetSelections() {
      this.filtros.proveedor = '';
      this.filtros.medida = '';
      this.historial = [];
      this.busquedaRealizada = false;
    },
    onProveedorChange() {
      this.filtros.medida = '';
      this.historial = [];
      this.busquedaRealizada = false;
    },
    async buscarHistorial() {
      try {
        const sacadasRef = collection(db, 'sacadas');
        const q = query(sacadasRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        
        this.historial = [];
        const historialTemp = [];
        
        querySnapshot.docs.forEach(doc => {
          const sacada = doc.data();
          
          // Determinar qué tipos de movimientos buscar
          const tiposMovimiento = this.filtros.movimiento === 'ambos' 
            ? ['entradas', 'salidas'] 
            : [this.filtros.movimiento];
          
          tiposMovimiento.forEach(tipoMovimiento => {
            const movimientos = sacada[tipoMovimiento] || [];
            
            movimientos.forEach(movimiento => {
              if (movimiento.tipo === this.filtros.tipo &&
                  movimiento.proveedor === this.filtros.proveedor &&
                  movimiento.medida === this.filtros.medida) {
                
                const fechaSacada = sacada.fecha.toDate();
                
                // Aplicar filtro de fechas si están definidos
                if (this.filtros.fechaDesde) {
                  const fechaDesde = new Date(this.filtros.fechaDesde);
                  if (fechaSacada < fechaDesde) return;
                }
                
                if (this.filtros.fechaHasta) {
                  const fechaHasta = new Date(this.filtros.fechaHasta);
                  fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día hasta
                  if (fechaSacada > fechaHasta) return;
                }
                
                historialTemp.push({
                  fecha: fechaSacada,
                  kilos: movimiento.kilos,
                  precio: movimiento.precio,
                  tipoMovimiento: tipoMovimiento
                });
              }
            });
          });
        });
        
        // Ahora verificar embarques para cada registro del historial
        await this.verificarEmbarques(historialTemp);
        
        // Debug: Log información de búsqueda
        console.log(`[HISTORIAL] Búsqueda completada para ${this.filtros.medida}:`);
        console.log(`[HISTORIAL] - Registros encontrados: ${this.historial.length}`);
        console.log(`[HISTORIAL] - Registros embarcados: ${this.totalEmbarcados}`);
        if (this.filtros.fechaDesde || this.filtros.fechaHasta) {
          console.log(`[HISTORIAL] - Rango de fechas: ${this.filtros.fechaDesde || 'Sin límite'} a ${this.filtros.fechaHasta || 'Sin límite'}`);
        }
        
        this.busquedaRealizada = true;
      } catch (error) {
        console.error('Error al buscar historial:', error);
        alert('Error al buscar el historial');
      }
    },
    formatDate(date) {
      return moment(date).format('DD/MM/YYYY');
    },
    formatNumber(value) {
      return value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },
    async verificarEmbarques(historialTemp) {
      try {
        // Obtener todos los embarques
        const embarquesRef = collection(db, 'embarques');
        const embarquesSnapshot = await getDocs(embarquesRef);
        
        // Crear un mapa de embarques por fecha
        const embarquesPorFecha = new Map();
        
        embarquesSnapshot.docs.forEach(doc => {
          const embarque = doc.data();
          let fechaEmbarque;
          
          // Manejar diferentes formatos de fecha
          if (embarque.fecha && typeof embarque.fecha.toDate === 'function') {
            fechaEmbarque = embarque.fecha.toDate();
          } else if (embarque.fecha instanceof Date) {
            fechaEmbarque = embarque.fecha;
          } else if (typeof embarque.fecha === 'string') {
            fechaEmbarque = new Date(embarque.fecha);
          }
          
          if (fechaEmbarque) {
            const fechaISO = fechaEmbarque.toISOString().split('T')[0];
            if (!embarquesPorFecha.has(fechaISO)) {
              embarquesPorFecha.set(fechaISO, []);
            }
            embarquesPorFecha.get(fechaISO).push({
              id: doc.id,
              data: embarque
            });
          }
        });
        
        // Verificar cada registro del historial
        this.historial = historialTemp.map(item => {
          const fechaItem = item.fecha.toISOString().split('T')[0];
          const embarquesDeFecha = embarquesPorFecha.get(fechaItem) || [];
          
          let embarqueInfo = null;
          
          // Buscar en todos los embarques de esa fecha
          for (const embarqueData of embarquesDeFecha) {
            try {
              const encontrado = this.buscarProductoEnEmbarque(
                embarqueData.data, 
                this.filtros.proveedor, 
                this.filtros.medida
              );
              
              if (encontrado.encontrado) {
                embarqueInfo = {
                  embarcado: true,
                  embarqueId: embarqueData.id,
                  kilosEmbarcados: encontrado.kilosEmbarcados,
                  rendimiento: encontrado.rendimiento,
                  medidaEncontrada: encontrado.medidaEncontrada
                };
                break;
              }
            } catch (error) {
              console.error(`[HISTORIAL] Error al procesar embarque ${embarqueData.id}:`, error);
              // Continuar con el siguiente embarque
              continue;
            }
          }
          
          if (!embarqueInfo && embarquesDeFecha.length > 0) {
            embarqueInfo = {
              embarcado: false,
              embarqueId: embarquesDeFecha[0].id,
              razon: 'No encontrado en embarque'
            };
          }
          
          return {
            ...item,
            embarqueInfo
          };
        });
        
      } catch (error) {
        console.error('Error al verificar embarques:', error);
        // Si hay error, usar el historial sin información de embarques
        this.historial = historialTemp;
      }
    },

    buscarProductoEnEmbarque(embarqueData, proveedor, medida) {
      let encontrado = false;
      let kilosEmbarcados = 0;
      let rendimiento = null;
      let medidaEncontrada = '';
      
      // Normalizar medida buscada para comparación flexible
      const medidaNormalizada = this.normalizarMedida(medida);
      
      // Buscar en productos de clientes
      if (embarqueData.clientes) {
        for (const cliente of embarqueData.clientes) {
          if (cliente.productos) {
            for (const producto of cliente.productos) {
              // Verificar si coincide la medida con búsqueda flexible
              const medidaProducto = producto.medida || '';
              const medidaProductoNormalizada = this.normalizarMedida(medidaProducto);
              
              if (this.compararMedidas(medidaNormalizada, medidaProductoNormalizada)) {
                encontrado = true;
                medidaEncontrada = medidaProducto;
                
                // Calcular kilos embarcados
                if (producto.kilos && Array.isArray(producto.kilos)) {
                  kilosEmbarcados += producto.kilos.reduce((sum, kilo) => {
                    return sum + (parseFloat(kilo) || 0);
                  }, 0);
                }
                
                // Restar taras si está configurado
                if (producto.restarTaras && producto.taras && Array.isArray(producto.taras)) {
                  try {
                    const totalTaras = producto.taras.reduce((sum, tara, index) => {
                      // Validar que tara sea una cadena antes de usar split
                      if (typeof tara === 'string' && tara.includes('-')) {
                        const partes = tara.split('-');
                        const cantidad = parseInt(partes[0]) || 0;
                        return sum + cantidad;
                      } else if (typeof tara === 'number') {
                        // Si es un número, usarlo directamente
                        return sum + tara;
                      } else if (typeof tara === 'string' && !isNaN(tara)) {
                        // Si es una cadena numérica, convertirla
                        return sum + (parseInt(tara) || 0);
                      } else {
                        // Log para debug de tipos inesperados
                        console.warn(`[HISTORIAL] Tara inválida en índice ${index}:`, {
                          tipo: typeof tara,
                          valor: tara,
                          medida: medidaProducto
                        });
                        return sum;
                      }
                    }, 0);
                    kilosEmbarcados -= totalTaras * 3; // Peso estándar de tara
                  } catch (taraError) {
                    console.error(`[HISTORIAL] Error procesando taras para medida ${medidaProducto}:`, {
                      error: taraError,
                      taras: producto.taras
                    });
                    // Continuar sin restar taras si hay error
                  }
                }
              }
            }
          }
        }
      }
      
      // Buscar en kilos crudos/rendimientos con búsqueda flexible
      if (encontrado && embarqueData.kilosCrudos) {
        let kilosCrudos = null;
        
        // Buscar la medida exacta primero
        if (embarqueData.kilosCrudos[medida]) {
          kilosCrudos = embarqueData.kilosCrudos[medida];
        } else if (embarqueData.kilosCrudos[medidaEncontrada]) {
          kilosCrudos = embarqueData.kilosCrudos[medidaEncontrada];
        } else {
          // Buscar con normalización
          for (const [claveMedida, valor] of Object.entries(embarqueData.kilosCrudos)) {
            if (this.compararMedidas(medidaNormalizada, this.normalizarMedida(claveMedida))) {
              kilosCrudos = valor;
              break;
            }
          }
        }
        
        if (kilosCrudos) {
          let totalCrudos = 0;
          
          if (typeof kilosCrudos === 'object' && kilosCrudos.medida1 !== undefined) {
            // Medida mixta
            totalCrudos = (parseFloat(kilosCrudos.medida1) || 0) + (parseFloat(kilosCrudos.medida2) || 0);
          } else {
            totalCrudos = parseFloat(kilosCrudos) || 0;
          }
          
          if (totalCrudos > 0 && kilosEmbarcados > 0) {
            rendimiento = totalCrudos / kilosEmbarcados;
          }
        }
      }
      
      return {
        encontrado,
        kilosEmbarcados,
        rendimiento,
        medidaEncontrada
      };
    },

    // Método para normalizar medidas (quitar espacios, convertir a minúsculas, etc.)
    normalizarMedida(medida) {
      if (!medida) return '';
      return medida
        .toLowerCase()
        .replace(/\s+/g, '') // Quitar todos los espacios
        .replace(/selecta/g, 'sel') // Normalizar "selecta" a "sel"
        .replace(/especial/g, 'esp') // Normalizar "especial" a "esp"
        .replace(/premium/g, 'prem') // Normalizar "premium" a "prem"
        .trim();
    },

    // Método para comparar medidas de forma flexible
    compararMedidas(medida1, medida2) {
      if (!medida1 || !medida2) return false;
      
      // Comparación exacta primero
      if (medida1 === medida2) return true;
      
      // Extraer números de la medida (ej: "36/40" -> ["36", "40"])
      const numeros1 = medida1.match(/\d+/g) || [];
      const numeros2 = medida2.match(/\d+/g) || [];
      
      // Si tienen los mismos números en el mismo orden, considerarlas iguales
      if (numeros1.length === numeros2.length && numeros1.length > 0) {
        const numerosIguales = numeros1.every((num, index) => num === numeros2[index]);
        if (numerosIguales) {
          // Verificar si ambas contienen variaciones comunes
          const variaciones1 = this.extraerVariaciones(medida1);
          const variaciones2 = this.extraerVariaciones(medida2);
          
          // Si una contiene "sel" y la otra "selecta", son equivalentes
          const tieneSelecta = (variaciones1.includes('sel') || variaciones1.includes('selecta')) &&
                              (variaciones2.includes('sel') || variaciones2.includes('selecta'));
          
          // Si tienen los mismos números, considerarlas compatibles
          return true;
        }
      }
      
      return false;
    },

    // Extraer variaciones de texto de una medida
    extraerVariaciones(medida) {
      const variaciones = [];
      const medidaLower = medida.toLowerCase();
      
      if (medidaLower.includes('sel') || medidaLower.includes('selecta')) {
        variaciones.push('sel', 'selecta');
      }
      if (medidaLower.includes('esp') || medidaLower.includes('especial')) {
        variaciones.push('esp', 'especial');
      }
      if (medidaLower.includes('prem') || medidaLower.includes('premium')) {
        variaciones.push('prem', 'premium');
      }
      
      return variaciones;
    },


    getEmbarqueStatusClass(embarqueInfo) {
      if (!embarqueInfo) return 'sin-embarque';
      return embarqueInfo.embarcado ? 'embarcado-si' : 'embarcado-no';
    },

    getEmbarqueStatusText(embarqueInfo) {
      if (!embarqueInfo) return '-';
      
      if (embarqueInfo.embarcado) {
        let texto = '✓ Sí';
        if (embarqueInfo.kilosEmbarcados) {
          texto += ` (${this.formatNumber(embarqueInfo.kilosEmbarcados)} kg)`;
        }
        if (embarqueInfo.rendimiento) {
          texto += ` - R: ${embarqueInfo.rendimiento.toFixed(2)}`;
        }
        // Mostrar la medida encontrada si es diferente a la buscada
        if (embarqueInfo.medidaEncontrada && 
            embarqueInfo.medidaEncontrada.toLowerCase() !== this.filtros.medida.toLowerCase()) {
          texto += ` [${embarqueInfo.medidaEncontrada}]`;
        }
        return texto;
      } else {
        return '✗ No';
      }
    },
    

    closeModal() {
      this.$emit('close');
      this.resetSelections();
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.form-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.form-group select,
.form-group input[type="date"] {
  flex: 1;
  min-width: 180px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-group button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.form-group button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.results-container {
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th, td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-button:hover {
  color: #000;
}

.no-results {
  text-align: center;
  padding: 20px;
  color: #666;
}

.tipo-entrada {
  background-color: #d4edda;
  color: #155724;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.tipo-salida {
  background-color: #f8d7da;
  color: #721c24;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.embarcado-si {
  color: #28a745;
  font-weight: bold;
}

.embarcado-no {
  color: #dc3545;
  font-weight: bold;
}

.sin-embarque {
  color: #6c757d;
  font-style: italic;
}

.total-row {
  background-color: #f0f0f0 !important;
  font-weight: bold;
}

.total-row td {
  border-top: 2px solid #333;
}


@media (max-width: 768px) {
  .form-group {
    flex-direction: column;
  }

  .form-group select,
  .form-group input[type="date"] {
    width: 100%;
  }
}
</style> 