<template>
  <div class="boton-reporte-mensual">
    <!-- Botón flotante principal -->
    <div class="fab-container">
      <button 
        @click="toggleMenu" 
        :class="['fab-main', { 'active': menuAbierto }]"
        aria-label="Menú de reportes"
      >
        <i class="fab-icon">{{ menuAbierto ? '✕' : '📊' }}</i>
      </button>
      
      <!-- Menú desplegable -->
      <transition name="fab-menu">
        <div v-if="menuAbierto" class="fab-menu">
          <router-link 
            to="/barcos/resumen-mensual" 
            class="fab-option"
            @click="cerrarMenu"
          >
            <i class="option-icon">📈</i>
            <span class="option-text">Reporte Mensual</span>
          </router-link>
          
          <button 
            @click="generarReporteRapido" 
            class="fab-option"
          >
            <i class="option-icon">⚡</i>
            <span class="option-text">Reporte Rápido</span>
          </button>
          
          <button 
            @click="exportarDatos" 
            class="fab-option"
          >
            <i class="option-icon">📄</i>
            <span class="option-text">Exportar PDF</span>
          </button>
        </div>
      </transition>
    </div>
    
    <!-- Overlay para cerrar el menú -->
    <div 
      v-if="menuAbierto" 
      class="fab-overlay" 
      @click="cerrarMenu"
    ></div>
    
    <!-- Modal de reporte rápido -->
    <div v-if="mostrarModalRapido" class="modal-overlay" @click="cerrarModalRapido">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>📊 Reporte Rápido</h3>
          <button @click="cerrarModalRapido" class="btn-cerrar">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="resumen-rapido">
            <div class="periodo-selector">
              <label>Seleccionar período:</label>
              <select v-model="periodoSeleccionado" class="select-periodo">
                <option value="mes-actual">Mes actual</option>
                <option value="mes-anterior">Mes anterior</option>
                <option value="ultimos-3-meses">Últimos 3 meses</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            
            <div v-if="periodoSeleccionado === 'personalizado'" class="fechas-personalizadas">
              <div class="fecha-grupo">
                <label>Desde:</label>
                <input type="date" v-model="fechaInicio" class="input-fecha">
              </div>
              <div class="fecha-grupo">
                <label>Hasta:</label>
                <input type="date" v-model="fechaFin" class="input-fecha">
              </div>
            </div>
            
            <div class="opciones-reporte">
              <h4>Incluir en el reporte:</h4>
              <div class="checkbox-grupo">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="incluirGraficos" checked>
                  <span class="checkmark">✓</span>
                  Gráficos y estadísticas
                </label>
                
                <label class="checkbox-item">
                  <input type="checkbox" v-model="incluirDetalle" checked>
                  <span class="checkmark">✓</span>
                  Detalle por proveedor
                </label>
                
                <label class="checkbox-item">
                  <input type="checkbox" v-model="incluirComparacion">
                  <span class="checkmark">✓</span>
                  Comparación con período anterior
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="cerrarModalRapido" class="btn-secundario">
            Cancelar
          </button>
          <button @click="procesarReporteRapido" class="btn-primario">
            <i class="btn-icon">🚀</i>
            Generar Reporte
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BotonReporteMensual',
  data() {
    return {
      menuAbierto: false,
      mostrarModalRapido: false,
      periodoSeleccionado: 'mes-actual',
      fechaInicio: '',
      fechaFin: '',
      incluirGraficos: true,
      incluirDetalle: true,
      incluirComparacion: false
    };
  },
  mounted() {
    // Establecer fechas por defecto
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaInicio = primerDiaMes.toISOString().split('T')[0];
    this.fechaFin = hoy.toISOString().split('T')[0];
    
    // Cerrar menú al hacer scroll
    window.addEventListener('scroll', this.cerrarMenu);
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.cerrarMenu);
  },
  methods: {
    toggleMenu() {
      this.menuAbierto = !this.menuAbierto;
    },
    
    cerrarMenu() {
      this.menuAbierto = false;
    },
    
    generarReporteRapido() {
      this.cerrarMenu();
      this.mostrarModalRapido = true;
    },
    
    cerrarModalRapido() {
      this.mostrarModalRapido = false;
    },
    
    async procesarReporteRapido() {
      try {
        // Aquí iría la lógica para generar el reporte rápido
        console.log('Generando reporte rápido con opciones:', {
          periodo: this.periodoSeleccionado,
          fechaInicio: this.fechaInicio,
          fechaFin: this.fechaFin,
          incluirGraficos: this.incluirGraficos,
          incluirDetalle: this.incluirDetalle,
          incluirComparacion: this.incluirComparacion
        });
        
        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Por ahora redirigir al reporte mensual completo
        this.$router.push('/barcos/resumen-mensual');
        this.cerrarModalRapido();
        
        // Mostrar mensaje de éxito
        this.$emit('reporte-generado', {
          tipo: 'rapido',
          periodo: this.periodoSeleccionado
        });
        
      } catch (error) {
        console.error('Error al generar reporte rápido:', error);
        alert('Error al generar el reporte rápido');
      }
    },
    
    async exportarDatos() {
      this.cerrarMenu();
      
      try {
        // Navegar directamente al reporte mensual para usar la función de PDF
        this.$router.push('/barcos/resumen-mensual');
        
        this.$emit('datos-exportados');
        
      } catch (error) {
        console.error('Error al navegar al reporte:', error);
        alert('Error al acceder al reporte');
      }
    }
  }
};
</script>

<style scoped>
.boton-reporte-mensual {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
}

/* Botón flotante principal */
.fab-container {
  position: relative;
}

.fab-main {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 1.5em;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab-main:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
}

.fab-main.active {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  transform: rotate(45deg);
}

.fab-icon {
  transition: all 0.3s ease;
}

/* Menú desplegable */
.fab-menu {
  position: absolute;
  bottom: 80px;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 200px;
}

.fab-option {
  background: white;
  border: none;
  border-radius: 12px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  text-decoration: none;
  color: #2c3e50;
  font-size: 0.95em;
}

.fab-option:hover {
  background: #f8f9fa;
  transform: translateX(-5px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.option-icon {
  font-size: 1.2em;
  width: 20px;
  text-align: center;
}

.option-text {
  font-weight: 500;
}

/* Transiciones del menú */
.fab-menu-enter-active,
.fab-menu-leave-active {
  transition: all 0.3s ease;
}

.fab-menu-enter,
.fab-menu-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Overlay */
.fab-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: -1;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 20px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 25px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3em;
}

.btn-cerrar {
  background: none;
  border: none;
  color: white;
  font-size: 1.5em;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.btn-cerrar:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.modal-body {
  padding: 30px;
  overflow-y: auto;
  max-height: calc(90vh - 160px);
}

.periodo-selector {
  margin-bottom: 25px;
}

.periodo-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.select-periodo {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1em;
  background: white;
}

.fechas-personalizadas {
  margin-bottom: 25px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.fecha-grupo label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #34495e;
}

.input-fecha {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95em;
}

.opciones-reporte h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.1em;
}

.checkbox-grupo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.checkbox-item:hover {
  background: #f8f9fa;
}

.checkbox-item input[type="checkbox"] {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: transparent;
  font-size: 0.8em;
}

.checkbox-item input[type="checkbox"]:checked + .checkmark {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.modal-footer {
  background: #f8f9fa;
  padding: 20px 30px;
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

.btn-secundario,
.btn-primario {
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secundario {
  background: #e0e0e0;
  color: #2c3e50;
}

.btn-secundario:hover {
  background: #d0d0d0;
}

.btn-primario {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primario:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .boton-reporte-mensual {
    bottom: 20px;
    right: 20px;
  }
  
  .fab-main {
    width: 50px;
    height: 50px;
    font-size: 1.3em;
  }
  
  .fab-menu {
    min-width: 180px;
  }
  
  .fab-option {
    padding: 12px 15px;
    font-size: 0.9em;
  }
  
  .modal-content {
    margin: 10px;
  }
  
  .fechas-personalizadas {
    grid-template-columns: 1fr;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .btn-secundario,
  .btn-primario {
    width: 100%;
    justify-content: center;
  }
}

/* Efectos adicionales */
@keyframes pulse {
  0% {
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  }
  50% {
    box-shadow: 0 4px 25px rgba(102, 126, 234, 0.6);
  }
  100% {
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  }
}

.fab-main:not(.active) {
  animation: pulse 2s infinite;
}
</style> 