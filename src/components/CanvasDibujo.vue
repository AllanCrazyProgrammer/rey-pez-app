<template>
  <div class="canvas-dibujo-container">
    <h3>Dibujo y Notas</h3>
    
    <div class="toolbar">
      <button id="pen-btn" :class="{ active: isPenMode }" @click="activatePenMode">✏️ Lápiz</button>
      <button id="select-btn" :class="{ active: !isPenMode && !eraserMode }" @click="activateSelectMode">👆 Seleccionar</button>
      <button id="eraser-btn" :class="{ active: eraserMode }" @click="activateEraserMode">🧹 Borrador</button>
      
      <div class="separator"></div>
      
      <button id="undo-btn" title="Retroceder un paso" @click="undo" :disabled="historyIndex <= 0">↩️ Deshacer</button>
      <button id="redo-btn" title="Avanzar un paso" @click="redo" :disabled="historyIndex >= history.length - 1">↪️ Rehacer</button>
      
      <div class="separator"></div>
      
      <button id="arrow-btn" @click="addArrow">↗️ Flecha</button>
      
      <div class="separator"></div>
      
      <div>
        <select id="pen-size" v-model="currentPenSize" @change="updatePenSize">
          <option value="1">Fino</option>
          <option value="3" selected>Medio</option>
          <option value="5">Grueso</option>
        </select>
      </div>
      
      <div class="separator"></div>
      
      <div style="display: flex; gap: 5px;">
        <div class="color-btn" 
          v-for="color in colors" 
          :key="color"
          :style="{ backgroundColor: color }" 
          :data-color="color"
          @click="changeColor(color)"></div>
      </div>
      
      <div class="separator"></div>
      
      <button id="clear-btn" @click="clearCanvas">🗑️ Limpiar</button>
    </div>
    
    <div class="canvas-container">
      <div class="canvas-wrapper">
        <canvas ref="canvas"></canvas>
      </div>
    </div>
    
    <div id="status-bar">
      Presión: {{ pressure.toFixed(2) }} | Posición: {{ position.x }}, {{ position.y }}
    </div>
  </div>
</template>

<script>
// Cambiar la forma de importar fabric.js
import 'fabric';
const fabric = window.fabric;

export default {
  name: 'CanvasDibujo',
  data() {
    return {
      canvas: null,
      canvasWidth: 800,
      canvasHeight: 400,
      colors: ['#000000', '#e74c3c', '#3498db', '#2ecc71'],
      currentColor: '#000000',
      currentPenSize: 3,
      isPenMode: true,
      eraserMode: false,
      pressure: 0,
      position: { x: 0, y: 0 },
      history: [],
      historyIndex: -1,
      canvasInitialized: false
    };
  },
  mounted() {
    // Asegurarnos de que fabric esté cargado
    console.log('Fabric disponible:', typeof fabric !== 'undefined');
    
    // Usar nextTick para asegurar que el DOM esté completamente renderizado
    this.$nextTick(() => {
      setTimeout(() => {
        // Dar un pequeño tiempo para asegurar que fabric se ha cargado completamente
        this.initCanvas();
      }, 100);
    });
    
    // Ajustar tamaño del canvas cuando cambia el tamaño de la ventana
    window.addEventListener('resize', this.resizeCanvas);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeCanvas);
    
    // Limpiar referencias al canvas para evitar memory leaks
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
  },
  methods: {
    initCanvas() {
      try {
        if (!this.$refs.canvas) {
          console.error('Elemento canvas no encontrado en el DOM');
          return;
        }
        
        // Verificar que fabric esté disponible
        if (typeof fabric === 'undefined') {
          console.error('Fabric.js no está disponible');
          
          // Intentar nuevamente después de un tiempo
          setTimeout(() => {
            console.log('Reintentando inicializar canvas...');
            this.initCanvas();
          }, 500);
          
          return;
        }
        
        console.log('Inicializando canvas con fabric:', fabric);
        
        // Calcular dimensiones del canvas
        this.resizeCanvasDimensions();
        
        // Inicializar canvas de fabric.js
        this.canvas = new fabric.Canvas(this.$refs.canvas, {
          width: this.canvasWidth,
          height: this.canvasHeight,
          isDrawingMode: true,
          enableRetinaScaling: true
        });
        
        if (!this.canvas) {
          console.error('Error al inicializar el canvas de fabric.js');
          return;
        }
        
        // Configurar estilo de dibujo
        this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
        this.canvas.freeDrawingBrush.width = this.currentPenSize;
        this.canvas.freeDrawingBrush.color = this.currentColor;
        
        // Configurar eventos del canvas
        this.setupCanvasEvents();
        
        // Marcar como inicializado
        this.canvasInitialized = true;
        
        // Guardar estado inicial
        this.saveToHistory();
        this.updateHistoryButtons();
        
        console.log('Canvas inicializado correctamente');
      } catch (error) {
        console.error('Error al inicializar el canvas:', error);
        
        // Reintentar después de un tiempo
        setTimeout(() => {
          console.log('Reintentando inicializar canvas después de error...');
          this.initCanvas();
        }, 1000);
      }
    },
    
    resizeCanvasDimensions() {
      try {
        // Obtener el ancho del contenedor padre y ajustar el tamaño del canvas
        const containerWidth = this.$el ? (this.$el.clientWidth || document.documentElement.clientWidth) : 800;
        this.canvasWidth = Math.min(containerWidth - 40, 800);
        this.canvasHeight = Math.min(window.innerHeight / 2, 400);
      } catch (error) {
        console.error('Error al dimensionar el canvas:', error);
      }
    },
    
    resizeCanvas() {
      try {
        this.resizeCanvasDimensions();
        
        if (this.canvas) {
          this.canvas.setWidth(this.canvasWidth);
          this.canvas.setHeight(this.canvasHeight);
          this.canvas.renderAll();
        }
      } catch (error) {
        console.error('Error al redimensionar el canvas:', error);
      }
    },
    
    setupCanvasEvents() {
      if (!this.canvas) return;
      
      try {
        // Evento para detectar cuando se completa un trazo
        this.canvas.on('path:created', () => {
          this.saveToHistory();
        });
        
        // Evento para detectar presión y posición
        this.canvas.on('mouse:down', (options) => {
          if (!this.canvas) return;
          
          if (this.eraserMode) {
            const pointer = this.canvas.getPointer(options.e);
            this.eraseObjectAtPoint(pointer);
          }
          
          if (this.canvas.isDrawingMode && options.e.pressure) {
            this.pressure = options.e.pressure;
            
            if (this.isPenMode && this.canvas.freeDrawingBrush) {
              // Ajustar grosor según presión
              const pressureSize = Math.max(0.5, Math.min(2, this.pressure)) * this.currentPenSize;
              this.canvas.freeDrawingBrush.width = pressureSize;
            }
          }
          
          this.updatePosition(options.e);
        });
        
        // Evento para detectar movimiento y presión
        this.canvas.on('mouse:move', (options) => {
          if (!this.canvas) return;
          
          if (this.canvas.isDrawingMode && options.e.pressure && this.isPenMode && this.canvas.freeDrawingBrush) {
            this.pressure = options.e.pressure;
            
            // Ajustar grosor según presión
            const pressureSize = Math.max(0.5, Math.min(2, this.pressure)) * this.currentPenSize;
            this.canvas.freeDrawingBrush.width = pressureSize;
          }
          
          this.updatePosition(options.e);
        });
        
        // Eventos para objetos añadidos, modificados o eliminados
        this.canvas.on('object:added', () => {
          if (!this.canvas) return;
          
          if (!this.canvas.isDrawingMode) {  // No guardar cuando estamos dibujando (ya lo hace path:created)
            this.saveToHistory();
          }
        });
        
        this.canvas.on('object:modified', () => {
          if (!this.canvas) return;
          this.saveToHistory();
        });
        
        this.canvas.on('object:removed', () => {
          if (!this.canvas) return;
          
          if (!this.eraserMode) {
            this.saveToHistory();
          }
        });
      } catch (error) {
        console.error('Error al configurar eventos del canvas:', error);
      }
    },
    
    // ===== FUNCIONES DE HISTORIAL =====
    
    saveToHistory() {
      if (!this.canvas) return;
      
      try {
        // Si estamos en algún punto intermedio del historial, eliminar estados futuros
        if (this.historyIndex < this.history.length - 1) {
          this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Guardar estado actual
        const json = JSON.stringify(this.canvas.toJSON());
        this.history.push(json);
        this.historyIndex = this.history.length - 1;
        
        // Actualizar estado de botones
        this.updateHistoryButtons();
      } catch (error) {
        console.error('Error al guardar historial:', error);
      }
    },
    
    undo() {
      if (!this.canvas) return;
      
      try {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.loadFromHistory();
        }
      } catch (error) {
        console.error('Error en operación deshacer:', error);
      }
    },
    
    redo() {
      if (!this.canvas) return;
      
      try {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.loadFromHistory();
        }
      } catch (error) {
        console.error('Error en operación rehacer:', error);
      }
    },
    
    loadFromHistory() {
      if (!this.canvas) return;
      
      try {
        if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
          this.canvas.loadFromJSON(this.history[this.historyIndex], () => {
            this.canvas.renderAll();
            this.updateHistoryButtons();
          });
        }
      } catch (error) {
        console.error('Error al cargar desde historial:', error);
      }
    },
    
    updateHistoryButtons() {
      // Esta función es manejada por el :disabled en los botones
    },
    
    // ===== FUNCIONES PRINCIPALES =====
    
    activatePenMode() {
      if (!this.canvas) return;
      
      try {
        // Desactivar modo borrador
        this.eraserMode = false;
        
        this.canvas.isDrawingMode = true;
        
        if (this.canvas.freeDrawingBrush) {
          this.canvas.freeDrawingBrush.color = this.currentColor;
          this.canvas.freeDrawingBrush.width = this.currentPenSize;
        }
        
        this.isPenMode = true;
        
        // Restaurar cursor normal
        this.canvas.defaultCursor = 'default';
      } catch (error) {
        console.error('Error al activar modo lápiz:', error);
      }
    },
    
    activateSelectMode() {
      if (!this.canvas) return;
      
      try {
        // Desactivar modo borrador
        this.eraserMode = false;
        
        this.canvas.isDrawingMode = false;
        this.isPenMode = false;
        
        // Restaurar cursor normal
        this.canvas.defaultCursor = 'default';
      } catch (error) {
        console.error('Error al activar modo selección:', error);
      }
    },
    
    activateEraserMode() {
      if (!this.canvas) return;
      
      try {
        // Activar modo borrador
        this.eraserMode = true;
        
        // Cambiar a modo selección
        this.canvas.isDrawingMode = false;
        this.isPenMode = false;
        
        // Cambiar cursor
        this.canvas.defaultCursor = 'crosshair';
      } catch (error) {
        console.error('Error al activar modo borrador:', error);
      }
    },
    
    eraseObjectAtPoint(pointer) {
      if (!this.canvas) return false;
      
      try {
        // Obtener objetos en el canvas
        const objects = this.canvas.getObjects();
        
        // Recorrer objetos en orden inverso
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i];
          
          // Comprobar si el cursor está sobre el objeto
          if (obj.containsPoint(pointer)) {
            this.canvas.remove(obj);
            this.canvas.renderAll();
            this.saveToHistory();
            return true;
          }
        }
      } catch (error) {
        console.error('Error al borrar objeto:', error);
      }
      
      return false;
    },
    
    addArrow() {
      if (!this.canvas) return;
      
      try {
        this.activateSelectMode();
        
        const arrow = new fabric.Path('M 0 0 L 100 0 M 90 -10 L 100 0 L 90 10', {
          stroke: this.currentColor,
          strokeWidth: 2,
          left: this.canvas.width / 2 - 50,
          top: this.canvas.height / 2,
          strokeLineCap: 'round',
          strokeLineJoin: 'round'
        });
        
        this.canvas.add(arrow);
        this.canvas.setActiveObject(arrow);
        this.saveToHistory();
      } catch (error) {
        console.error('Error al añadir flecha:', error);
      }
    },
    
    clearCanvas() {
      if (!this.canvas) return;
      
      try {
        if (confirm('¿Estás seguro que deseas limpiar todo el lienzo?')) {
          this.canvas.clear();
          this.saveToHistory();
        }
      } catch (error) {
        console.error('Error al limpiar canvas:', error);
      }
    },
    
    updatePosition(event) {
      if (!this.canvas || !this.canvas.upperCanvasEl) return;
      
      try {
        const rect = this.canvas.upperCanvasEl.getBoundingClientRect();
        this.position = {
          x: Math.round(event.clientX - rect.left),
          y: Math.round(event.clientY - rect.top)
        };
      } catch (error) {
        console.error('Error al actualizar posición:', error);
      }
    },
    
    updatePenSize() {
      if (!this.canvas || !this.isPenMode || !this.canvas.freeDrawingBrush) return;
      
      try {
        this.canvas.freeDrawingBrush.width = this.currentPenSize;
      } catch (error) {
        console.error('Error al actualizar tamaño de lápiz:', error);
      }
    },
    
    changeColor(color) {
      if (!this.canvas) return;
      
      try {
        this.currentColor = color;
        if (this.isPenMode && this.canvas.freeDrawingBrush) {
          this.canvas.freeDrawingBrush.color = this.currentColor;
        }
      } catch (error) {
        console.error('Error al cambiar color:', error);
      }
    }
  }
};
</script>

<style scoped>
.canvas-dibujo-container {
  margin: 30px 0;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.canvas-dibujo-container h3 {
  text-align: center;
  margin-bottom: 20px;
  color: #2c3e50;
}

.toolbar {
  background-color: #f0f0f0;
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid #ddd;
  align-items: center;
  border-radius: 4px 4px 0 0;
  margin-bottom: 10px;
}

.toolbar button {
  padding: 8px 12px;
  border: none;
  background-color: #2c3e50;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.toolbar button:hover {
  background-color: #1e2b38;
}

.toolbar button.active {
  background-color: #3498db;
}

.toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.separator {
  width: 1px;
  height: 24px;
  background-color: #ccc;
  margin: 0 5px;
}

.color-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #ddd;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-btn:hover {
  transform: scale(1.1);
}

.canvas-container {
  position: relative;
  background-color: #f9f9f9;
  width: 100%;
  overflow: hidden;
  border-radius: 4px;
  margin-bottom: 10px;
}

.canvas-wrapper {
  background-color: white;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  position: relative;
  margin: 0 auto;
}

#status-bar {
  padding: 5px 10px;
  background-color: #e0e0e0;
  color: #333;
  text-align: right;
  font-size: 12px;
  border-radius: 0 0 4px 4px;
}

/* Responsive */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .toolbar > div {
    margin: 5px 0;
  }
  
  .separator {
    width: 100%;
    height: 1px;
    margin: 5px 0;
  }
}
</style> 