<template>
  <div class="producto" 
    :data-es-venta="producto.esVenta"
    :class="{
      'reporte-completo': coincideTarasYBolsas,
      'reporte-incompleto': !coincideTarasYBolsas && tieneAlgunReporte
    }"
  >
    <!-- Encabezado de la medida y selección -->
    <h2 class="encabezado-medida">
      <div class="botones-encabezado">
        <div class="botones-fila-superior">
          <button 
            @click="$emit('abrir-modal-precio', producto)" 
            class="btn-precio"
            :class="{ 'tiene-precio': producto.precio }"
          >
            $
          </button>
          <button 
            @click="$emit('abrir-modal-historial', producto)"
            class="btn-historial"
            title="Ver historial de precios"
          >
            <i class="fas fa-history"></i>
          </button>
        </div>
        <div class="botones-fila-inferior">
          <button 
            @click="$emit('eliminar-producto', producto)"
            class="btn-eliminar"
            :disabled="embarqueBloqueado"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="info-medida">
        <div class="medida-nombre">{{ producto.medida }}</div>
        <div class="tipo-producto">
          <select 
            v-model="producto.esVenta" 
            class="select-tipo-producto"
            :disabled="embarqueBloqueado"
          >
            <option :value="true">Venta</option>
            <option :value="false">Compra</option>
          </select>
        </div>
      </div>
    </h2>
    
    <!-- Sección de taras -->
    <div class="seccion-taras">
      <h3>Taras <span class="total-taras">(Total: {{ totalTaras }})</span></h3>
      <div class="taras-container">
        <div v-for="(tara, index) in producto.taras" :key="'tara-'+index" class="tara-item">
          <input 
            type="number" 
            v-model.number="producto.taras[index]" 
            class="input-tara" 
            placeholder="Tara"
            :disabled="embarqueBloqueado"
          >
          <input 
            type="number" 
            v-model.number="producto.kilos[index]" 
            class="input-kilos" 
            placeholder="Kilos"
            :disabled="embarqueBloqueado"
          >
          <button 
            @click="$emit('eliminar-tara', producto, index)" 
            class="btn-eliminar-tara"
            :disabled="embarqueBloqueado"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        <button 
          @click="$emit('agregar-tara', producto)" 
          class="btn-agregar-tara"
          :disabled="embarqueBloqueado"
        >
          <i class="fas fa-plus"></i> Agregar Tara
        </button>
      </div>
    </div>
    
    <!-- Sección de bolsas -->
    <div class="seccion-bolsas">
      <h3>Bolsas <span class="total-bolsas">(Total: {{ totalBolsas }})</span></h3>
      <div class="bolsas-container">
        <div v-for="(bolsa, index) in producto.bolsas" :key="'bolsa-'+index" class="bolsa-item">
          <input 
            type="number" 
            v-model.number="producto.bolsas[index]" 
            class="input-bolsa" 
            placeholder="Bolsa"
            :disabled="embarqueBloqueado"
          >
          <button 
            @click="$emit('eliminar-bolsa', producto, index)" 
            class="btn-eliminar-bolsa"
            :disabled="embarqueBloqueado"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        <button 
          @click="$emit('agregar-bolsa', producto)" 
          class="btn-agregar-bolsa"
          :disabled="embarqueBloqueado"
        >
          <i class="fas fa-plus"></i> Agregar Bolsa
        </button>
      </div>
    </div>
    
    <!-- Sección de notas -->
    <div class="seccion-notas">
      <h3>Notas</h3>
      <textarea 
        v-model="producto.notas" 
        class="textarea-notas" 
        placeholder="Notas adicionales..."
        :disabled="embarqueBloqueado"
      ></textarea>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProductoItem',
  props: {
    producto: {
      type: Object,
      required: true
    },
    embarqueBloqueado: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    totalTaras() {
      const tarasNormales = (this.producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
      const tarasExtra = (this.producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
      return tarasNormales + tarasExtra;
    },
    totalBolsas() {
      return (this.producto.bolsas || []).reduce((sum, bolsa) => sum + (bolsa || 0), 0);
    },
    coincideTarasYBolsas() {
      return this.totalTaras === this.totalBolsas && this.totalTaras > 0;
    },
    tieneAlgunReporte() {
      return this.totalTaras > 0 || this.totalBolsas > 0;
    }
  }
}
</script>

<style scoped>
.producto {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.producto.reporte-completo {
  border: 3px solid #28a745; /* Verde para reporte completo */
}

.producto.reporte-incompleto {
  border: 3px solid #dc3545; /* Rojo para reporte incompleto */
}

.encabezado-medida {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.botones-encabezado {
  display: flex;
  flex-direction: column;
}

.botones-fila-superior,
.botones-fila-inferior {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}

.btn-precio,
.btn-historial,
.btn-eliminar {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-precio {
  background-color: #f8f9fa;
  border: 1px solid #ddd;
}

.btn-precio.tiene-precio {
  background-color: #28a745;
  color: white;
}

.btn-historial {
  background-color: #17a2b8;
  color: white;
}

.btn-eliminar {
  background-color: #dc3545;
  color: white;
}

.info-medida {
  display: flex;
  flex-direction: column;
}

.medida-nombre {
  font-size: 1.2rem;
  font-weight: bold;
}

.select-tipo-producto {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ddd;
  margin-top: 5px;
}

.seccion-taras,
.seccion-bolsas,
.seccion-notas {
  margin-bottom: 20px;
}

.taras-container,
.bolsas-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tara-item,
.bolsa-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-tara,
.input-kilos,
.input-bolsa {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
}

.btn-eliminar-tara,
.btn-eliminar-bolsa {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
}

.btn-agregar-tara,
.btn-agregar-bolsa {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px;
  cursor: pointer;
  margin-top: 10px;
  align-self: flex-start;
}

.textarea-notas {
  width: 100%;
  min-height: 80px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

/* Estilos responsivos */
@media (max-width: 768px) {
  .encabezado-medida {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .botones-encabezado {
    margin-bottom: 10px;
  }
}
</style> 