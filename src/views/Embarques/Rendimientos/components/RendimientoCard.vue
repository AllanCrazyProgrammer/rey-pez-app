<template>
  <div class="rendimiento-card">
    <div class="medida-info">
      <div class="medida-header">
        <span class="medida-label editable-label" @click="$emit('editarNombre', medida)">
          {{ nombrePersonalizado }}
        </span>
        <div class="controles-medida">
          <div class="ocultar-control">
            <input 
              type="checkbox" 
              :id="'ocultar-' + medida"
              :checked="medidaOculta"
              @change="$emit('toggleOcultar', medida)"
            >
            <label :for="'ocultar-' + medida">Ocultar en PDF</label>
          </div>
          <div class="analizar-ganancia-control">
            <input 
              type="checkbox" 
              :id="'analizar-' + medida"
              :checked="analizarGanancia"
              @change="$emit('toggleAnalizar', medida)"
            >
            <label :for="'analizar-' + medida">Analizar ganancia</label>
          </div>
          <div class="maquila-ganancia-control">
            <input 
              type="checkbox" 
              :id="'maquila-' + medida"
              :checked="analizarMaquilaGanancia"
              @change="$emit('toggleMaquila', medida)"
            >
            <label :for="'maquila-' + medida">Maquila ganancia</label>
          </div>
          <div v-if="analizarMaquilaGanancia" class="maquila-precio-input">
            <input 
              type="number" 
              step="0.01"
              :value="precioMaquila"
              @input="$emit('updatePrecioMaquila', medida, $event.target.value)"
              placeholder="Precio por kg"
              class="precio-maquila-input"
            >
          </div>
        </div>
      </div>

      <div class="input-group">
        <template v-if="esMedidaMix">
          <div class="mix-inputs">
            <div class="mix-input">
              <label @click="$emit('editarEtiqueta', medida, 'medida1')" class="editable-label">
                {{ etiqueta1 }}:
              </label>
              <input 
                type="number" 
                :value="kilosCrudos.medida1" 
                @input="$emit('updateKilosCrudos', medida, 'medida1', $event.target.value)"
                placeholder="Kilos medida 1"
              >
            </div>
            <div class="mix-input">
              <label @click="$emit('editarEtiqueta', medida, 'medida2')" class="editable-label">
                {{ etiqueta2 }}:
              </label>
              <input 
                type="number" 
                :value="kilosCrudos.medida2" 
                @input="$emit('updateKilosCrudos', medida, 'medida2', $event.target.value)"
                placeholder="Kilos medida 2"
              >
            </div>
          </div>
        </template>
        <template v-else>
          <label>Kilos en crudo:</label>
          <input 
            type="number" 
            :value="kilosCrudos" 
            @input="$emit('updateKilosCrudos', medida, null, $event.target.value)"
            placeholder="Ingrese kilos"
          >
        </template>
      </div>
      
      <div class="resultados">
        <p>Total embarcado: {{ formatearNumero(totalEmbarcado) }} kg</p>
        <p class="rendimiento">
          Rendimiento: 
          <span :class="{ 'rendimiento-alto': rendimiento > 1 }">
            {{ rendimiento.toFixed(2) }}
          </span>
        </p>
        
        <!-- Sección de ganancia -->
        <div v-if="gananciaCalculada && analizarGanancia" class="ganancia-info">
          <div class="ganancia-header">
            <h4>💰 Análisis de Ganancia</h4>
          </div>
          <div class="ganancia-detalles">
            <div class="ganancia-item">
              <span class="label">Precio de Venta:</span>
              <div class="precio-venta-container">
                <span class="valor precio-venta">${{ formatearPrecio(gananciaCalculada.precioVenta) }}</span>
                
                <span v-if="gananciaCalculada.esPromedio" 
                      class="precio-promedio-badge"
                      :title="`Precio promedio ponderado. Clientes con precios específicos: ${gananciaCalculada.clientesConEspecifico.join(', ')}`">
                  📊 Promedio
                </span>
                
                <span v-else-if="gananciaCalculada.esEspecifico" 
                      class="precio-especifico-badge"
                      :title="`Precio específico más reciente para ${gananciaCalculada.clienteEspecifico}`">
                  📌 {{ gananciaCalculada.clienteEspecifico }}
                </span>
                
                <span v-else class="precio-general-badge" title="Precio general">
                  🌐 General
                </span>
              </div>
            </div>
            <div class="ganancia-item">
              <span class="label">Costo Final:</span>
              <span class="valor costo-final">${{ formatearPrecio(gananciaCalculada.costoFinal) }}</span>
            </div>
            <div class="ganancia-item">
              <span class="label">Ganancia/kg:</span>
              <span class="valor ganancia-unitaria" 
                    :class="{ 
                      'ganancia-positiva': gananciaCalculada.gananciaUnitaria > 0,
                      'ganancia-negativa': gananciaCalculada.gananciaUnitaria < 0
                    }">
                ${{ formatearPrecio(gananciaCalculada.gananciaUnitaria) }}
              </span>
            </div>
            <div class="ganancia-item ganancia-total-item">
              <span class="label">Ganancia Total:</span>
              <span class="valor ganancia-total"
                    :class="{ 
                      'ganancia-positiva': gananciaCalculada.gananciaTotal > 0,
                      'ganancia-negativa': gananciaCalculada.gananciaTotal < 0
                    }">
                ${{ formatearPrecio(gananciaCalculada.gananciaTotal) }}
              </span>
            </div>
            <div class="ganancia-fecha">
              <span class="fecha-precio">Precio del: {{ formatearFecha(gananciaCalculada.fechaPrecio) }}</span>
            </div>
          </div>
        </div>
        
        <!-- Mensaje cuando no hay precio de venta -->
        <div v-else-if="analizarGanancia" class="sin-precio-venta">
          <p class="aviso-sin-precio">⚠️ No se encontró precio de venta para esta medida</p>
        </div>
        
        <!-- Sección de maquila ganancia -->
        <div v-if="analizarMaquilaGanancia" class="maquila-ganancia-info">
          <div class="maquila-ganancia-header">
            <h4>🏭 Maquila Ganancia</h4>
          </div>
          <div class="maquila-ganancia-detalles">
            <div class="ganancia-item">
              <span class="label">Kilos Embarcados:</span>
              <span class="valor">{{ formatearNumero(totalEmbarcado) }} kg</span>
            </div>
            <div class="ganancia-item">
              <span class="label">Precio Maquila:</span>
              <span class="valor precio-maquila">${{ formatearPrecio(precioMaquila || 0) }}</span>
            </div>
            <div class="ganancia-item ganancia-total-item">
              <span class="label">Ganancia Total Maquila:</span>
              <span class="valor ganancia-total ganancia-positiva">
                ${{ formatearPrecio(gananciaMaquila) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatearNumero, formatearPrecio, formatearFecha } from '../utils/formatters';
import { calcularGananciaMaquila } from '../utils/calculations';

export default {
  name: 'RendimientoCard',
  props: {
    medida: {
      type: String,
      required: true
    },
    nombrePersonalizado: {
      type: String,
      required: true
    },
    kilosCrudos: {
      type: [Number, Object],
      required: true
    },
    totalEmbarcado: {
      type: Number,
      required: true
    },
    rendimiento: {
      type: Number,
      required: true
    },
    medidaOculta: {
      type: Boolean,
      default: false
    },
    analizarGanancia: {
      type: Boolean,
      default: false
    },
    analizarMaquilaGanancia: {
      type: Boolean,
      default: false
    },
    precioMaquila: {
      type: Number,
      default: 0
    },
    gananciaCalculada: {
      type: Object,
      default: null
    }
  },
  computed: {
    esMedidaMix() {
      return this.medida.toLowerCase().includes('mix');
    },
    etiqueta1() {
      return this.esMedidaMix ? 
        (this.kilosCrudos.etiqueta1 || 'Kilos en crudo (Medida 1)') : 
        'Kilos en crudo (Medida 1)';
    },
    etiqueta2() {
      return this.esMedidaMix ? 
        (this.kilosCrudos.etiqueta2 || 'Kilos en crudo (Medida 2)') : 
        'Kilos en crudo (Medida 2)';
    },
    gananciaMaquila() {
      return calcularGananciaMaquila(this.medida, this.totalEmbarcado, this.precioMaquila);
    }
  },
  methods: {
    formatearNumero,
    formatearPrecio,
    formatearFecha
  }
};
</script>

<style scoped>
.rendimiento-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #fff;
}

.medida-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.medida-label {
  font-size: 1.2em;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
  display: block;
}

.editable-label {
  cursor: pointer;
  user-select: none;
  transition: color 0.3s ease;
}

.editable-label:hover {
  color: #3498db;
  text-decoration: underline;
}

.controles-medida {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ocultar-control,
.analizar-ganancia-control,
.maquila-ganancia-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
}

.ocultar-control {
  color: #666;
}

.analizar-ganancia-control,
.maquila-ganancia-control {
  color: #27ae60;
  font-weight: bold;
}

.ocultar-control input[type="checkbox"],
.analizar-ganancia-control input[type="checkbox"],
.maquila-ganancia-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.ocultar-control label,
.analizar-ganancia-control label,
.maquila-ganancia-control label {
  cursor: pointer;
  user-select: none;
}

.input-group {
  margin: 15px 0;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  color: #666;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.mix-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.mix-input {
  flex: 1;
}

.mix-input label {
  font-size: 0.9em;
}

.resultados {
  margin-top: 15px;
}

.resultados p {
  margin: 8px 0;
  font-size: 1.1em;
}

.rendimiento {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.rendimiento span {
  font-size: 1.2em;
  font-weight: bold;
}

.rendimiento-alto {
  color: #27ae60;
}

.ganancia-info {
  margin-top: 15px;
  padding: 15px;
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 5px;
}

.ganancia-header h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #34495e;
  font-size: 1.1em;
}

.ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
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

.ganancia-fecha {
  margin-top: 10px;
  font-size: 0.9em;
  color: #777;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.precio-venta-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.precio-especifico-badge, .precio-general-badge, .precio-promedio-badge {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.precio-especifico-badge {
  background-color: #e8f5e8;
  color: #2d5a2d;
  border: 1px solid #a5d6a7;
}

.precio-general-badge {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

.precio-promedio-badge {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}

.ganancia-positiva {
  color: #27ae60;
}

.ganancia-negativa {
  color: #e74c3c;
}

.sin-precio-venta {
  margin-top: 10px;
  padding: 10px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 5px;
  color: #856404;
  font-weight: bold;
  text-align: center;
}

.aviso-sin-precio {
  margin: 0;
  padding: 0;
}

.maquila-precio-input {
  margin-top: 10px;
  padding: 10px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.precio-maquila-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.maquila-ganancia-info {
  margin-top: 15px;
  padding: 15px;
  background-color: #f4f8ff;
  border: 1px solid #b3d9ff;
  border-radius: 5px;
}

.maquila-ganancia-header h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c5282;
  font-size: 1.1em;
}

.maquila-ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.precio-maquila {
  color: #2c5282;
  font-weight: bold;
}

@media (max-width: 768px) {
  .controles-medida {
    flex-direction: column;
    gap: 10px;
  }
  
  .medida-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .ocultar-control,
  .analizar-ganancia-control,
  .maquila-ganancia-control {
    font-size: 0.8em;
  }
  
  .ganancia-detalles {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .maquila-ganancia-detalles {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .precio-venta-container {
    align-items: flex-start;
  }
  
  .mix-inputs {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>