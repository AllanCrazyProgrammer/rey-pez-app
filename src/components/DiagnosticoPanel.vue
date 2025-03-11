<template>
  <div class="diagnostico-panel" :class="{ 'panel-expandido': expandido }">
    <div class="panel-header" @click="toggleExpansion">
      <div class="status-indicator" :class="indicadorClaseEstado"></div>
      <h4>Diagnóstico</h4>
      <span class="expand-indicator">{{ expandido ? '▼' : '▲' }}</span>
    </div>
    
    <div v-if="expandido" class="panel-content">
      <!-- Resumen de estado -->
      <div class="status-summary">
        <div class="status-item">
          <span class="status-label">Estado:</span>
          <span :class="'status-value ' + indicadorClaseEstado">{{ estadoConexion }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Última sincronización:</span>
          <span class="status-value">{{ formatearTimestamp(ultimaSincronizacion) }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Embarque ID:</span>
          <span class="status-value monospace">{{ embarqueId || 'N/A' }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Productos:</span>
          <span class="status-value">{{ cantidadItems }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Caché:</span>
          <span class="status-value">{{ cacheDisponible ? 'Disponible' : 'No disponible' }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Usuarios activos:</span>
          <span class="status-value">{{ usuariosActivosCount }}</span>
        </div>
      </div>
      
      <!-- Acciones de diagnóstico -->
      <div class="action-buttons">
        <button @click="forzarRecarga" class="btn-diagnostico">
          <i class="fas fa-sync-alt"></i> Forzar recarga
        </button>
        <button @click="limpiarCache" class="btn-diagnostico">
          <i class="fas fa-trash-alt"></i> Limpiar caché
        </button>
        <button @click="verificarConexion" class="btn-diagnostico">
          <i class="fas fa-network-wired"></i> Verificar conexión
        </button>
        <button @click="descargarLogs" class="btn-diagnostico">
          <i class="fas fa-download"></i> Descargar logs
        </button>
      </div>
      
      <!-- Registro de actividad -->
      <div class="log-container">
        <h5>Registro de actividad</h5>
        <div class="log-filters">
          <select v-model="filtroNivel" class="filter-select">
            <option value="all">Todos los niveles</option>
            <option value="ERROR">Solo errores</option>
            <option value="WARN">Advertencias y errores</option>
            <option value="INFO">Info y superiores</option>
            <option value="DEBUG">Detallado (DEBUG)</option>
          </select>
          <button @click="actualizarLogs" class="btn-refresh">
            <i class="fas fa-sync"></i>
          </button>
        </div>
        <div class="log-entries">
          <div v-for="(log, index) in logsVisibles" :key="index" 
               class="log-entry" :class="'log-level-' + log.level.toLowerCase()">
            <div class="log-header">
              <span class="log-timestamp">{{ formatearTimestamp(log.timestamp) }}</span>
              <span class="log-level">{{ log.level }}</span>
              <span class="log-component">{{ log.component }}</span>
            </div>
            <div class="log-message">{{ log.message }}</div>
            <pre v-if="log.data" class="log-data">{{ JSON.stringify(log.data, null, 2) }}</pre>
          </div>
          <div v-if="logsVisibles.length === 0" class="no-logs">
            No hay registros que mostrar
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Logger from '@/utils/logger';
import SincronizacionService from '@/services/SincronizacionService';
import { useAuthStore } from '@/stores/auth';
import AutenticacionHelper from '@/utils/autenticacion-helper';

export default {
  name: 'DiagnosticoPanel',
  props: {
    embarqueId: {
      type: String,
      default: null
    },
    items: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      expandido: false,
      filtroNivel: 'WARN',
      logs: [],
      estadoOnline: navigator.onLine,
      ultimaSincronizacion: null,
      ultimaVerificacion: Date.now(),
      cacheSize: 0,
      usuariosActivos: {},
      online: navigator.onLine,
      usuarioActual: null,
      mensaje: '',
      tipoMensaje: 'info'
    };
  },
  computed: {
    estadoConexion() {
      if (!this.estadoOnline) {
        return 'Desconectado';
      }
      
      const ahora = Date.now();
      const ultimaSync = this.ultimaSincronizacion || 0;
      const tiempoTranscurrido = ahora - ultimaSync;
      
      if (ultimaSync === 0) {
        return 'Sin sincronizar';
      } else if (tiempoTranscurrido > 60000) {
        return 'Desactualizado';
      } else {
        return 'Conectado';
      }
    },
    indicadorClaseEstado() {
      if (!this.estadoOnline) {
        return 'status-offline';
      }
      
      const ahora = Date.now();
      const ultimaSync = this.ultimaSincronizacion || 0;
      const tiempoTranscurrido = ahora - ultimaSync;
      
      if (ultimaSync === 0) {
        return 'status-unknown';
      } else if (tiempoTranscurrido > 60000) {
        return 'status-warning';
      } else {
        return 'status-online';
      }
    },
    cantidadItems() {
      return this.items ? this.items.length : 0;
    },
    cacheDisponible() {
      if (!this.embarqueId) return false;
      
      try {
        const cacheKey = `rey_pez_app_embarque_${this.embarqueId}`;
        return !!localStorage.getItem(cacheKey);
      } catch (e) {
        return false;
      }
    },
    usuariosActivosCount() {
      return Object.keys(this.usuariosActivos).length;
    },
    logsVisibles() {
      if (!this.logs || this.logs.length === 0) {
        return [];
      }
      
      // Filtrar por nivel
      if (this.filtroNivel === 'all') {
        return this.logs.slice(0, 50); // Limitar a 50 entradas para rendimiento
      }
      
      const nivelIndice = {
        'DEBUG': 0,
        'INFO': 1,
        'WARN': 2,
        'ERROR': 3
      };
      
      const nivelMinimo = nivelIndice[this.filtroNivel] || 0;
      return this.logs
        .filter(log => nivelIndice[log.level] >= nivelMinimo)
        .slice(0, 50);
    }
  },
  mounted() {
    // Suscribirse a eventos de red
    window.addEventListener('online', this.actualizarEstadoOnline);
    window.addEventListener('offline', this.actualizarEstadoOnline);
    
    // Cargar logs iniciales
    this.actualizarLogs();
    
    // Configurar actualización periódica
    this.intervaloActualizacion = setInterval(() => {
      this.actualizarEstado();
    }, 5000);
    
    // Suscribirse a eventos de sincronización
    window.addEventListener('sincronizacion:online', this.onSincronizacionOnline);
    window.addEventListener('sincronizacion:offline', this.onSincronizacionOffline);
    
    // Inicializar estado
    this.online = navigator.onLine;
    
    // Obtener usuario actual
    const authStore = useAuthStore();
    this.usuarioActual = authStore.user;
  },
  beforeDestroy() {
    // Limpiar listeners
    window.removeEventListener('online', this.actualizarEstadoOnline);
    window.removeEventListener('offline', this.actualizarEstadoOnline);
    window.removeEventListener('sincronizacion:online', this.onSincronizacionOnline);
    window.removeEventListener('sincronizacion:offline', this.onSincronizacionOffline);
    
    // Detener intervalo
    if (this.intervaloActualizacion) {
      clearInterval(this.intervaloActualizacion);
    }
  },
  methods: {
    toggleExpansion() {
      this.expandido = !this.expandido;
      
      // Actualizar logs si se expande
      if (this.expandido) {
        this.actualizarLogs();
        this.actualizarEstado();
      }
    },
    actualizarEstadoOnline() {
      this.estadoOnline = navigator.onLine;
      this.actualizarEstado();
    },
    onSincronizacionOnline() {
      this.ultimaSincronizacion = Date.now();
      this.actualizarEstado();
    },
    onSincronizacionOffline() {
      this.actualizarEstado();
    },
    actualizarEstado() {
      // Actualizar timestamp de última verificación
      this.ultimaVerificacion = Date.now();
      
      // Obtener usuarios activos
      this.usuariosActivos = SincronizacionService.usuariosActivos || {};
      
      // Estimar tamaño de caché
      this.calcularTamanoCache();
      
      // Si ha pasado mucho tiempo desde la última sincronización, actualizar logs
      if (this.expandido && Date.now() - this.ultimaVerificacion > 30000) {
        this.actualizarLogs();
      }
    },
    actualizarLogs() {
      // Obtener logs del servicio
      this.logs = Logger.getLogHistory();
    },
    formatearTimestamp(timestamp) {
      if (!timestamp) return 'N/A';
      
      // Si es string de ISO, convertir a objeto Date
      let fecha;
      if (typeof timestamp === 'string') {
        fecha = new Date(timestamp);
      } else {
        fecha = new Date(timestamp);
      }
      
      // Obtener componentes
      const hora = fecha.getHours().toString().padStart(2, '0');
      const minutos = fecha.getMinutes().toString().padStart(2, '0');
      const segundos = fecha.getSeconds().toString().padStart(2, '0');
      
      return `${hora}:${minutos}:${segundos}`;
    },
    forzarRecarga() {
      // Emitir evento para forzar recarga
      this.$emit('forzar-recarga');
      
      Logger.info('DiagnosticoPanel', 'Forzando recarga de datos');
      
      // Si hay embarqueId, intentar recargar directamente
      if (this.embarqueId && SincronizacionService.recargarEmbarque) {
        SincronizacionService.recargarEmbarque(
          this.embarqueId, 
          data => {
            Logger.info('DiagnosticoPanel', 'Recarga manual completada', {
              itemsCount: data?.items?.length || 0
            });
            
            this.ultimaSincronizacion = Date.now();
            this.actualizarLogs();
          }
        );
      }
    },
    limpiarCache() {
      if (!confirm('¿Estás seguro de que quieres limpiar la caché? Esto puede causar pérdida de datos no sincronizados.')) {
        return;
      }
      
      Logger.info('DiagnosticoPanel', 'Limpiando caché local');
      
      try {
        // Limpiar caché específica del embarque
        if (this.embarqueId) {
          const cacheKey = `rey_pez_app_embarque_${this.embarqueId}`;
          localStorage.removeItem(cacheKey);
        }
        
        // Resetear caché en memoria
        if (SincronizacionService.ultimoEmbarqueValido) {
          SincronizacionService.ultimoEmbarqueValido = null;
        }
        
        Logger.info('DiagnosticoPanel', 'Caché limpiada correctamente');
        this.calcularTamanoCache();
        this.actualizarLogs();
      } catch (error) {
        Logger.error('DiagnosticoPanel', 'Error limpiando caché', { error: error.message });
      }
    },
    verificarConexion() {
      Logger.info('DiagnosticoPanel', 'Verificando conexión');
      
      // Actualizar estado inmediatamente
      this.actualizarEstadoOnline();
      this.actualizarLogs();
      
      // Intentar ping al servidor
      fetch('https://firestore.googleapis.com/v1/projects', { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      })
      .then(() => {
        Logger.info('DiagnosticoPanel', 'Conexión a Firebase verificada');
        this.actualizarLogs();
      })
      .catch(error => {
        Logger.error('DiagnosticoPanel', 'Error de conexión a Firebase', { error: error.message });
        this.actualizarLogs();
      });
    },
    descargarLogs() {
      Logger.info('DiagnosticoPanel', 'Descargando logs');
      Logger.downloadLogs();
    },
    calcularTamanoCache() {
      try {
        let size = 0;
        
        // Estimar tamaño de localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('rey_pez_app_')) {
            size += localStorage.getItem(key).length;
          }
        });
        
        // Convertir a KB
        this.cacheSize = Math.round(size / 1024);
      } catch (e) {
        this.cacheSize = 0;
      }
    },
    verificarAutenticacion() {
      const autenticado = AutenticacionHelper.verificarAutenticacion();
      
      if (autenticado) {
        const authStore = useAuthStore();
        this.usuarioActual = authStore.user;
        this.mostrarMensaje(`Autenticado como ${this.usuarioActual.username}`, 'info');
        
        // Reinicializar servicio de sincronización con usuario correcto
        SincronizacionService.init(authStore.userId, authStore.user);
      } else {
        this.mostrarMensaje('No se encontró una sesión válida', 'error');
      }
      
      this.actualizarLogs();
    },
    mostrarMensaje(texto, tipo = 'info') {
      this.mensaje = texto;
      this.tipoMensaje = tipo;
      
      // Ocultar automáticamente después de 5 segundos
      setTimeout(() => {
        this.mensaje = '';
      }, 5000);
    }
  }
};
</script>

<style scoped>
.diagnostico-panel {
  position: fixed;
  bottom: 0;
  right: 20px;
  width: 300px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;
}

.panel-expandido {
  width: 500px;
  max-height: 80vh;
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  background-color: #f1f3f5;
  border-bottom: 1px solid #dee2e6;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
}

.panel-header h4 {
  margin: 0;
  font-size: 16px;
  flex-grow: 1;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 10px;
}

.status-online {
  background-color: #28a745;
}

.status-warning {
  background-color: #ffc107;
}

.status-offline {
  background-color: #dc3545;
}

.status-unknown {
  background-color: #6c757d;
}

.expand-indicator {
  font-size: 12px;
  color: #6c757d;
}

.panel-content {
  padding: 15px;
  overflow-y: auto;
  max-height: calc(80vh - 43px);
}

.status-summary {
  margin-bottom: 15px;
  background-color: white;
  border-radius: 6px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.status-label {
  font-weight: 500;
  color: #495057;
}

.status-value {
  font-weight: 600;
}

.monospace {
  font-family: monospace;
  font-size: 12px;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 15px;
}

.btn-diagnostico {
  padding: 8px;
  border: none;
  background-color: #e9ecef;
  color: #495057;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-diagnostico:hover {
  background-color: #dee2e6;
}

.btn-diagnostico i {
  margin-right: 5px;
}

.log-container {
  background-color: white;
  border-radius: 6px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.log-container h5 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 14px;
  color: #495057;
}

.log-filters {
  display: flex;
  margin-bottom: 10px;
}

.filter-select {
  flex-grow: 1;
  padding: 6px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
}

.btn-refresh {
  margin-left: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background-color: #e9ecef;
  color: #495057;
  border-radius: 4px;
  cursor: pointer;
}

.log-entries {
  max-height: 300px;
  overflow-y: auto;
  font-size: 12px;
}

.log-entry {
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 4px;
  background-color: #f8f9fa;
  border-left: 3px solid #ced4da;
}

.log-level-error {
  background-color: #fff5f5;
  border-left-color: #dc3545;
}

.log-level-warn {
  background-color: #fff9db;
  border-left-color: #ffc107;
}

.log-level-info {
  background-color: #e7f5ff;
  border-left-color: #339af0;
}

.log-level-debug {
  background-color: #f8f9fa;
  border-left-color: #adb5bd;
}

.log-header {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  color: #6c757d;
}

.log-timestamp {
  font-family: monospace;
}

.log-level {
  font-weight: 600;
}

.log-component {
  color: #495057;
}

.log-message {
  margin-bottom: 4px;
  color: #212529;
}

.log-data {
  margin: 0;
  padding: 8px;
  background-color: #f1f3f5;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 11px;
  color: #495057;
}

.no-logs {
  color: #6c757d;
  text-align: center;
  padding: 20px;
  font-style: italic;
}

@media (max-width: 768px) {
  .diagnostico-panel {
    width: 100%;
    right: 0;
  }
  
  .panel-expandido {
    width: 100%;
  }
}
</style> 