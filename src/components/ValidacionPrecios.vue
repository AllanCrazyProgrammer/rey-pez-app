<template>
  <div class="validacion-precios">
    <div class="validacion-header">
      <h4>🔍 Validación de Precios en Tiempo Real</h4>
      <button @click="mostrarDetalles = !mostrarDetalles" class="toggle-btn">
        {{ mostrarDetalles ? 'Ocultar' : 'Mostrar' }} Detalles
      </button>
    </div>

    <div v-if="mostrarDetalles" class="validacion-content">
      <!-- Información general -->
      <div class="info-general">
        <div class="info-item">
          <span class="label">Fecha Embarque:</span>
          <span class="value">{{ fechaEmbarque || 'No definida' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Cliente:</span>
          <span class="value">{{ clienteId || 'General' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Total Precios:</span>
          <span class="value">{{ preciosActuales.length }}</span>
        </div>
        <div class="info-item">
          <span class="label">Precios Válidos:</span>
          <span class="value">{{ preciosValidosParaFecha.length }}</span>
        </div>
      </div>

      <!-- Validación por medida -->
      <div v-if="medidaValidacion" class="medida-validacion">
        <h5>Validación para: {{ medidaValidacion }}</h5>
        <div class="validacion-resultado">
          <div class="resultado-item" :class="{ 'precio-encontrado': precioEncontrado, 'precio-no-encontrado': !precioEncontrado }">
            <span class="label">Precio Encontrado:</span>
            <span class="value">
              {{ precioEncontrado ? `$${precioEncontrado}` : 'No encontrado' }}
            </span>
          </div>
          
          <div v-if="preciosAlternativos.length" class="precios-alternativos">
            <h6>Precios Alternativos Disponibles:</h6>
            <div v-for="precio in preciosAlternativos" :key="precio.id" class="precio-alternativo">
              <span class="medida">{{ precio.producto }}</span>
              <span class="valor">${{ precio.precio }}</span>
              <span class="fecha">{{ formatearFecha(precio.fecha) }}</span>
              <span v-if="precio.clienteId" class="cliente" :style="{ backgroundColor: obtenerColorCliente(precio.clienteId) }">
                {{ obtenerNombreCliente(precio.clienteId) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Diagnóstico de problemas -->
      <div v-if="problemasDetectados.length" class="problemas-detectados">
        <h5>⚠️ Problemas Detectados:</h5>
        <div v-for="problema in problemasDetectados" :key="problema.tipo" class="problema">
          <span class="tipo">{{ problema.tipo }}:</span>
          <span class="descripcion">{{ problema.descripcion }}</span>
        </div>
      </div>

      <!-- Medidas sin precio -->
      <div v-if="medidasSinPrecio.length" class="medidas-sin-precio">
        <h5>📋 Medidas sin Precio Asignado:</h5>
        <div class="lista-medidas">
          <span v-for="medida in medidasSinPrecio" :key="medida" class="medida-tag">
            {{ medida }}
          </span>
        </div>
      </div>

      <!-- Controles de debugging -->
      <div class="controles-debug">
        <button @click="ejecutarValidacionCompleta" class="btn-validacion">
          🔄 Ejecutar Validación Completa
        </button>
        <button @click="forzarRecargaPrecios" class="btn-recarga">
          🔄 Forzar Recarga de Precios
        </button>
        <button @click="exportarReporte" class="btn-reporte">
          📊 Exportar Reporte
        </button>
        <button @click="limpiarLogs" class="btn-limpiar">
          🗑️ Limpiar Logs
        </button>
        <button @click="debugFirestore" class="btn-debug">
          🔍 Debug Firestore
        </button>
        <button @click="verificarIntegridad" class="btn-integridad">
          🔍 Verificar Integridad
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { obtenerPrecioParaMedida, obtenerPreciosParaFecha, normalizarMedida } from '@/utils/preciosHistoricos';
import { normalizarFechaISO, formatearFechaParaMostrar, esFechaValida } from '@/utils/dateUtils';
import { debugPreciosFirestore } from '@/utils/debugPrecios';

export default {
  name: 'ValidacionPrecios',
  props: {
    preciosActuales: {
      type: Array,
      default: () => []
    },
    fechaEmbarque: {
      type: String,
      default: ''
    },
    clienteId: {
      type: String,
      default: ''
    },
    medidasProductos: {
      type: Array,
      default: () => []
    },
    medidaValidacion: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      mostrarDetalles: false,
      clientes: [
        { id: 'joselito', nombre: 'Joselito', color: '#2196F3' },
        { id: 'catarro', nombre: 'Catarro', color: '#d32f2f' },
        { id: 'otilio', nombre: 'Otilio', color: '#FFD700' },
        { id: 'ozuna', nombre: 'Ozuna', color: '#07711e' }
      ]
    };
  },
  computed: {
    fechaNormalizada() {
      return this.fechaEmbarque ? normalizarFechaISO(this.fechaEmbarque) : normalizarFechaISO(new Date());
    },
    
    preciosValidosParaFecha() {
      return this.preciosActuales.filter(precio => 
        esFechaValida(precio.fecha, this.fechaNormalizada)
      );
    },
    
    precioEncontrado() {
      if (!this.medidaValidacion) return null;
      return obtenerPrecioParaMedida(
        this.preciosActuales,
        this.medidaValidacion,
        this.fechaNormalizada,
        this.clienteId
      );
    },
    
    preciosAlternativos() {
      if (!this.medidaValidacion) return [];
      
      const medidaNormalizada = normalizarMedida(this.medidaValidacion);
      return this.preciosValidosParaFecha.filter(precio => {
        const precioMedidaNorm = normalizarMedida(precio.producto);
        return precioMedidaNorm.includes(medidaNormalizada.substring(0, 3)) || 
               medidaNormalizada.includes(precioMedidaNorm.substring(0, 3));
      }).slice(0, 5);
    },
    
    medidasSinPrecio() {
      return this.medidasProductos.filter(medida => {
        const precio = obtenerPrecioParaMedida(
          this.preciosActuales,
          medida,
          this.fechaNormalizada,
          this.clienteId
        );
        return precio === null;
      });
    },
    
    problemasDetectados() {
      const problemas = [];
      
      // Verificar si hay fechas futuras
      const fechasFuturas = this.preciosActuales.filter(precio => 
        !esFechaValida(precio.fecha, this.fechaNormalizada)
      );
      if (fechasFuturas.length > 0) {
        problemas.push({
          tipo: 'Fechas Futuras',
          descripcion: `${fechasFuturas.length} precios con fechas posteriores al embarque`
        });
      }
      
      // Verificar precios sin timestamp
      const preciosSinTimestamp = this.preciosActuales.filter(precio => !precio.timestamp);
      if (preciosSinTimestamp.length > 0) {
        problemas.push({
          tipo: 'Sin Timestamp',
          descripcion: `${preciosSinTimestamp.length} precios sin timestamp para ordenamiento`
        });
      }
      
      // Verificar medidas duplicadas
      const medidas = new Map();
      this.preciosValidosParaFecha.forEach(precio => {
        const key = `${normalizarMedida(precio.producto)}-${precio.clienteId || 'general'}`;
        if (medidas.has(key)) {
          medidas.set(key, medidas.get(key) + 1);
        } else {
          medidas.set(key, 1);
        }
      });
      
      const duplicados = Array.from(medidas.entries()).filter(([_, count]) => count > 1);
      if (duplicados.length > 0) {
        problemas.push({
          tipo: 'Medidas Duplicadas',
          descripcion: `${duplicados.length} medidas con múltiples precios en la misma fecha`
        });
      }
      
      return problemas;
    }
  },
  methods: {
    formatearFecha(fecha) {
      return formatearFechaParaMostrar(fecha);
    },
    
    obtenerNombreCliente(clienteId) {
      const cliente = this.clientes.find(c => c.id === clienteId);
      return cliente ? cliente.nombre : 'Desconocido';
    },
    
    obtenerColorCliente(clienteId) {
      const cliente = this.clientes.find(c => c.id === clienteId);
      return cliente ? cliente.color : '#666';
    },
    
    ejecutarValidacionCompleta() {
      console.log('[VALIDACION] === Iniciando validación completa de precios ===');
      console.log('[VALIDACION] Fecha embarque:', this.fechaNormalizada);
      console.log('[VALIDACION] Cliente:', this.clienteId || 'General');
      console.log('[VALIDACION] Total precios:', this.preciosActuales.length);
      console.log('[VALIDACION] Precios válidos para fecha:', this.preciosValidosParaFecha.length);
      console.log('[VALIDACION] Problemas detectados:', this.problemasDetectados);
      console.log('[VALIDACION] Medidas sin precio:', this.medidasSinPrecio);
      
      // Emitir evento con resultados
      this.$emit('validacion-completada', {
        fecha: this.fechaNormalizada,
        cliente: this.clienteId,
        totalPrecios: this.preciosActuales.length,
        preciosValidos: this.preciosValidosParaFecha.length,
        problemas: this.problemasDetectados,
        medidasSinPrecio: this.medidasSinPrecio
      });
    },
    
    exportarReporte() {
      const reporte = {
        timestamp: new Date().toISOString(),
        fecha: this.fechaNormalizada,
        cliente: this.clienteId || 'General',
        preciosActuales: this.preciosActuales,
        preciosValidos: this.preciosValidosParaFecha,
        problemas: this.problemasDetectados,
        medidasSinPrecio: this.medidasSinPrecio
      };
      
      const blob = new Blob([JSON.stringify(reporte, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-precios-${this.fechaNormalizada}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    
    limpiarLogs() {
      // Limpiar los logs del sistema de precios
      const logTypes = ['[PRECIOS]', '[PRODUCTO-ITEM]', '[EMBARQUE-CUENTAS]', '[VALIDACION]'];
      console.clear();
      console.log('🧹 Logs del sistema de precios limpiados');
    },
    
    forzarRecargaPrecios() {
      console.log('[VALIDACION] 🔄 Forzando recarga de precios desde componente padre...');
      
      // Emitir evento para que el componente padre recargue los precios
      this.$emit('forzar-recarga-precios');
      
      // También ejecutar validación después de un pequeño delay
      setTimeout(() => {
        this.ejecutarValidacionCompleta();
      }, 1000);
    },
    
    async debugFirestore() {
      console.log('[VALIDACION] 🔍 Ejecutando debugging de Firestore...');
      try {
        await debugPreciosFirestore();
      } catch (error) {
        console.error('[VALIDACION] ❌ Error en debugging de Firestore:', error);
      }
    },
    
    verificarIntegridad() {
      console.log('[VALIDACION] 🔍 Solicitando verificación de integridad de productos...');
      
      // Emitir evento para que el componente padre ejecute la verificación
      this.$emit('verificar-integridad-productos');
    }
  },
  watch: {
    medidaValidacion: {
      immediate: true,
      handler() {
        if (this.medidaValidacion && this.mostrarDetalles) {
          this.$nextTick(() => {
            console.log(`[VALIDACION] Validando medida: ${this.medidaValidacion}`);
            console.log(`[VALIDACION] Precio encontrado: ${this.precioEncontrado}`);
            console.log(`[VALIDACION] Precios alternativos:`, this.preciosAlternativos);
          });
        }
      }
    }
  }
};
</script>

<style scoped>
.validacion-precios {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  font-size: 0.9em;
}

.validacion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.validacion-header h4 {
  margin: 0;
  color: #495057;
}

.toggle-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
}

.toggle-btn:hover {
  background: #0056b3;
}

.info-general {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
  padding: 10px;
  background: white;
  border-radius: 6px;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.label {
  font-weight: 600;
  color: #6c757d;
}

.value {
  color: #212529;
  font-weight: 500;
}

.medida-validacion {
  background: white;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
  border-left: 4px solid #007bff;
}

.validacion-resultado {
  margin-top: 10px;
}

.resultado-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.precio-encontrado {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.precio-no-encontrado {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
}

.precios-alternativos {
  margin-top: 15px;
}

.precios-alternativos h6 {
  margin: 0 0 10px 0;
  color: #6c757d;
}

.precio-alternativo {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 10px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 5px;
  align-items: center;
}

.precio-alternativo .medida {
  font-weight: 600;
}

.precio-alternativo .valor {
  color: #28a745;
  font-weight: 600;
}

.precio-alternativo .fecha {
  color: #6c757d;
  font-size: 0.8em;
}

.precio-alternativo .cliente {
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 600;
}

.problemas-detectados {
  background: #fff3cd;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #ffc107;
  margin-bottom: 15px;
}

.problemas-detectados h5 {
  margin: 0 0 10px 0;
  color: #856404;
}

.problema {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
}

.problema .tipo {
  font-weight: 600;
  color: #856404;
}

.problema .descripcion {
  color: #6c757d;
}

.medidas-sin-precio {
  background: white;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.medidas-sin-precio h5 {
  margin: 0 0 10px 0;
  color: #495057;
}

.lista-medidas {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.medida-tag {
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  color: #495057;
}

.controles-debug {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.controles-debug button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
  transition: background-color 0.3s;
}

.btn-validacion {
  background: #007bff !important;
}

.btn-recarga {
  background: #17a2b8 !important;
}

.btn-reporte {
  background: #28a745 !important;
}

.btn-limpiar {
  background: #dc3545 !important;
}

.btn-debug {
  background: #6f42c1 !important;
}

.btn-integridad {
  background: #fd7e14 !important;
}

.controles-debug button:hover {
  opacity: 0.8;
}

@media (max-width: 768px) {
  .info-general {
    grid-template-columns: 1fr;
  }
  
  .precio-alternativo {
    grid-template-columns: 1fr;
    gap: 5px;
  }
  
  .controles-debug {
    flex-direction: column;
  }
}
</style> 