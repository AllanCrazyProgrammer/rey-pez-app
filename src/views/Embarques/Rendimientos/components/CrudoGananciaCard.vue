<template>
  <div class="crudo-ganancia-card">
    <div class="crudo-ganancia-header">
      <h4>{{ talla }}</h4>
      <div class="crudo-ganancia-controls">
        <label class="checkbox-container">
          <input 
            type="checkbox" 
            :checked="analizarGanancia"
            @change="$emit('toggleAnalizar', talla)"
          >
          <span class="checkmark"></span>
          Analizar ganancia
        </label>
      </div>
    </div>
    
    <!-- Información de ganancia -->
    <div v-if="ganancia && analizarGanancia" class="crudo-ganancia-info">
      <div class="crudo-ganancia-detalles">
        <div class="ganancia-item">
          <span class="label">Total Kilos:</span>
          <span class="valor">{{ formatearNumero(ganancia.totalKilos) }} kg</span>
        </div>
        <div class="ganancia-item">
          <span class="label">Precio Promedio:</span>
          <div class="precio-container">
            <span class="valor precio-venta">${{ formatearPrecio(ganancia.precioVenta) }}</span>
            <span v-if="ganancia.hayPreciosIndividuales" 
                  class="precio-individual-badge"
                  title="Incluye precios individuales">
              📝 Individual
            </span>
            <span v-else class="precio-sistema-badge" title="Precio del sistema">
              🌐 Sistema
            </span>
          </div>
        </div>
        <div class="ganancia-item">
          <span class="label">Costo Base:</span>
          <span class="valor costo-base">${{ formatearPrecio(ganancia.costoBase) }}</span>
        </div>
        <div class="ganancia-item">
          <span class="label">Ganancia/kg:</span>
          <span class="valor ganancia-unitaria" 
                :class="{ 
                  'ganancia-positiva': ganancia.gananciaUnitaria > 0,
                  'ganancia-negativa': ganancia.gananciaUnitaria < 0
                }">
            ${{ formatearPrecio(ganancia.gananciaUnitaria) }}
          </span>
        </div>
        <div class="ganancia-item ganancia-total-item">
          <span class="label">Ganancia Total:</span>
          <span class="valor ganancia-total"
                :class="{ 
                  'ganancia-positiva': ganancia.gananciaTotal > 0,
                  'ganancia-negativa': ganancia.gananciaTotal < 0
                }">
            ${{ formatearPrecio(ganancia.gananciaTotal) }}
          </span>
        </div>
        
        <!-- Detalles por cliente (solo si hay precios diferentes) -->
        <div v-if="mostrarDetallePorCliente" class="detalles-clientes">
          <h5>Detalle por Cliente:</h5>
          <div v-for="detalle in ganancia.detallesPorCliente" :key="detalle.cliente" class="detalle-cliente">
            <span class="cliente-nombre">{{ detalle.cliente }}:</span>
            <span class="cliente-kilos">{{ formatearNumero(detalle.kilos) }}kg</span>
            <span class="cliente-precio">${{ formatearPrecio(detalle.precioVenta) }}</span>
            <span class="cliente-ganancia" :class="{ 
              'ganancia-positiva': detalle.gananciaTotal > 0,
              'ganancia-negativa': detalle.gananciaTotal < 0
            }">
              ${{ formatearPrecio(detalle.gananciaTotal) }}
            </span>
            <span class="fuente-precio" :title="'Fuente del precio: ' + detalle.fuentePrecio">
              {{ obtenerIconoFuente(detalle.fuentePrecio) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mensaje cuando no hay análisis activado -->
    <div v-else-if="!analizarGanancia" class="sin-analisis-crudo">
      <p class="aviso-sin-analisis">Activar análisis de ganancia para ver detalles</p>
    </div>
    
    <!-- Mensaje cuando no hay datos -->
    <div v-else class="sin-datos-crudo">
      <p class="aviso-sin-datos">⚠️ No se encontraron datos de venta para esta talla</p>
    </div>
  </div>
</template>

<script>
import { formatearNumero, formatearPrecio } from '../utils/formatters';

export default {
  name: 'CrudoGananciaCard',
  props: {
    talla: {
      type: String,
      required: true
    },
    analizarGanancia: {
      type: Boolean,
      default: false
    },
    ganancia: {
      type: Object,
      default: null
    }
  },
  computed: {
    mostrarDetallePorCliente() {
      if (!this.ganancia || !this.ganancia.detallesPorCliente) return false;
      
      if (this.ganancia.detallesPorCliente.length <= 1) return false;
      
      const precios = this.ganancia.detallesPorCliente.map(detalle => detalle.precioVenta);
      const preciosUnicos = new Set(precios);
      
      return preciosUnicos.size > 1;
    }
  },
  methods: {
    formatearNumero,
    formatearPrecio,
    obtenerIconoFuente(fuentePrecio) {
      switch (fuentePrecio) {
        case 'individual': return '📝';
        case 'sistema-especifico': return '📌';
        default: return '🌐';
      }
    }
  }
};
</script>

<style scoped>
.crudo-ganancia-card {
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.crudo-ganancia-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.crudo-ganancia-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.crudo-ganancia-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2em;
  font-weight: bold;
}

.crudo-ganancia-controls {
  display: flex;
  align-items: center;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 0.9em;
  color: #27ae60;
  font-weight: bold;
}

.checkbox-container input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.checkmark {
  cursor: pointer;
}

.crudo-ganancia-info {
  margin-top: 15px;
}

.crudo-ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 15px;
}

.ganancia-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ganancia-item .label {
  font-weight: bold;
  color: #555;
}

.ganancia-item .valor {
  font-weight: bold;
  font-size: 1.1em;
}

.ganancia-total-item {
  grid-column: 1 / -1;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.precio-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.precio-individual-badge, .precio-sistema-badge {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.precio-individual-badge {
  background-color: #e8f5e8;
  color: #2d5a2d;
  border: 1px solid #a5d6a7;
}

.precio-sistema-badge {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

.ganancia-positiva {
  color: #27ae60;
}

.ganancia-negativa {
  color: #e74c3c;
}

.detalles-clientes {
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  grid-column: 1 / -1;
}

.detalles-clientes h5 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #495057;
  font-size: 1em;
}

.detalle-cliente {
  display: grid;
  grid-template-columns: 1fr auto auto auto auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-bottom: 8px;
}

.cliente-nombre {
  font-weight: bold;
  color: #2c3e50;
}

.cliente-kilos {
  font-size: 0.9em;
  color: #6c757d;
}

.cliente-precio {
  font-weight: bold;
  color: #007bff;
}

.cliente-ganancia {
  font-weight: bold;
  font-size: 1.1em;
}

.fuente-precio {
  font-size: 1.2em;
  cursor: help;
}

.sin-analisis-crudo {
  margin-top: 15px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  text-align: center;
}

.aviso-sin-analisis {
  margin: 0;
  color: #6c757d;
  font-style: italic;
}

.sin-datos-crudo {
  margin-top: 15px;
  padding: 20px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 5px;
  text-align: center;
}

.aviso-sin-datos {
  margin: 0;
  color: #856404;
  font-weight: bold;
}

@media (max-width: 768px) {
  .crudo-ganancia-detalles {
    grid-template-columns: 1fr;
  }
  
  .crudo-ganancia-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .detalle-cliente {
    grid-template-columns: 1fr;
    gap: 5px;
    text-align: left;
  }
  
  .cliente-nombre {
    font-size: 1.1em;
  }
}
</style>