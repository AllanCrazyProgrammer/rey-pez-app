<template>
  <div class="recuperacion-emergencia">
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-emergency">🆘</i>
          Recuperación de Emergencia
        </h1>
        <p class="subtitle">Herramienta para buscar y recuperar embarques perdidos</p>
      </div>
      <div class="back-button">
        <button @click="$router.back()" class="btn-back">
          <i class="icon">⬅️</i>
          Volver
        </button>
      </div>
    </div>

    <!-- Búsqueda por fecha específica -->
    <div class="search-section">
      <div class="search-card">
        <h3>🔍 Buscar embarque perdido</h3>
        <div class="search-input-group">
          <label>Fecha del embarque perdido:</label>
          <input 
            type="date" 
            v-model="fechaBusqueda" 
            class="fecha-input"
          />
          <button @click="buscarEmbarque" class="btn-search" :disabled="buscando">
            <i class="icon">🔍</i>
            {{ buscando ? 'Buscando...' : 'Buscar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Resultados de búsqueda -->
    <div v-if="resultadosBusqueda.length > 0" class="resultados-section">
      <h3>📋 Embarques encontrados para {{ fechaBusqueda }}</h3>
      <div class="embarques-encontrados">
        <div 
          v-for="embarque in resultadosBusqueda" 
          :key="embarque.id"
          class="embarque-resultado"
          :class="{ 'embarque-vacio': esEmbarqueVacio(embarque) }"
        >
          <div class="embarque-header">
            <h4>{{ formatearFecha(embarque.fecha) }}</h4>
            <div class="embarque-status">
              <span v-if="esEmbarqueVacio(embarque)" class="status-vacio">⚠️ Vacío/Incompleto</span>
              <span v-else class="status-completo">✅ Con datos</span>
            </div>
          </div>
          
          <div class="embarque-details">
            <p><strong>ID:</strong> {{ embarque.id }}</p>
            <p><strong>Carga con:</strong> {{ embarque.cargaCon || 'No especificado' }}</p>
            <p><strong>Clientes:</strong> {{ embarque.clientes ? embarque.clientes.length : 0 }}</p>
            <p><strong>Total productos:</strong> {{ contarProductos(embarque) }}</p>
            <p><strong>Kilos limpios:</strong> {{ calcularKilosLimpios(embarque) }} kg</p>
            <p><strong>Kilos crudos:</strong> {{ calcularKilosCrudos(embarque) }} kg</p>
          </div>

          <div class="embarque-actions">
            <button @click="verEmbarque(embarque.id)" class="btn-ver">
              <i class="icon">👁️</i>
              Ver/Editar
            </button>
            <button 
              v-if="!esEmbarqueVacio(embarque)" 
              @click="usarComoRecuperacion(embarque)" 
              class="btn-recuperar"
            >
              <i class="icon">💾</i>
              Usar este
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Buscar en respaldos de emergencia -->
    <div class="respaldos-section">
      <div class="respaldos-card">
        <h3>💾 Buscar en respaldos de emergencia</h3>
        <p>Si no se encontró el embarque, buscar en respaldos automáticos</p>
        <button @click="buscarEnRespaldos" class="btn-search-respaldos" :disabled="buscandoRespaldos">
          <i class="icon">💾</i>
          {{ buscandoRespaldos ? 'Buscando respaldos...' : 'Buscar respaldos' }}
        </button>
      </div>
    </div>

    <!-- Resultados de respaldos -->
    <div v-if="respaldosEncontrados.length > 0" class="respaldos-resultados">
      <h3>💾 Respaldos encontrados</h3>
      <div class="respaldos-grid">
        <div v-for="respaldo in respaldosEncontrados" :key="respaldo.id" class="respaldo-card">
          <div class="respaldo-header">
            <h4>Respaldo del {{ formatearFecha(respaldo.fechaEmbarqueOriginal) }}</h4>
            <span class="respaldo-tipo">{{ respaldo.razonRespaldo }}</span>
          </div>
          <div class="respaldo-details">
            <p><strong>ID original:</strong> {{ respaldo.embarqueOriginalId }}</p>
            <p><strong>Clientes:</strong> {{ respaldo.cantidadClientes }}</p>
            <p><strong>Productos:</strong> {{ respaldo.totalProductos }}</p>
            <p><strong>Kilos limpios:</strong> {{ respaldo.kilosLimpiosAprox }} kg</p>
            <p><strong>Kilos crudos:</strong> {{ respaldo.kilosCrudosAprox }} kg</p>
            <p><strong>Respaldado:</strong> {{ formatearFecha(respaldo.fechaRespaldo) }}</p>
          </div>
          <div class="respaldo-actions">
            <button @click="recuperarDesdeRespaldo(respaldo.id)" class="btn-recuperar-respaldo">
              <i class="icon">🔄</i>
              Recuperar embarque
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Buscar todos los embarques duplicados -->
    <div class="duplicados-section">
      <div class="duplicados-card">
        <h3>🔍 Buscar todos los duplicados</h3>
        <p>Encuentra embarques que podrían haberse considerado duplicados</p>
        <button @click="buscarDuplicados" class="btn-search-duplicados" :disabled="buscandoDuplicados">
          <i class="icon">📊</i>
          {{ buscandoDuplicados ? 'Analizando...' : 'Analizar duplicados' }}
        </button>
      </div>
    </div>

    <!-- Resultados de duplicados -->
    <div v-if="duplicadosEncontrados.length > 0" class="duplicados-resultados">
      <h3>⚠️ Embarques duplicados encontrados</h3>
      <div v-for="(grupo, fecha) in embarquesPorFecha" :key="fecha" class="grupo-duplicados">
        <h4>{{ fecha }} ({{ grupo.length }} embarques)</h4>
        <div class="embarques-grupo">
          <div 
            v-for="embarque in grupo" 
            :key="embarque.id"
            class="embarque-mini"
            :class="{ 'embarque-vacio': esEmbarqueVacio(embarque) }"
          >
            <p><strong>ID:</strong> {{ embarque.id.substring(0, 8) }}...</p>
            <p><strong>Productos:</strong> {{ contarProductos(embarque) }}</p>
            <button @click="verEmbarque(embarque.id)" class="btn-mini">Ver</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado de carga -->
    <div v-if="buscando || buscandoDuplicados" class="loading-state">
      <div class="loading-spinner"></div>
      <p>{{ buscando ? 'Buscando embarques...' : 'Analizando duplicados...' }}</p>
    </div>

    <!-- Estado del sistema de respaldos -->
    <div class="sistema-respaldos">
      <div class="sistema-card">
        <h3>🛡️ Sistema de respaldos automáticos</h3>
        <div class="estado-respaldos">
          <div class="estado-item activo">
            <span class="estado-icon">✅</span>
            <span class="estado-text">Respaldos automáticos ACTIVADOS</span>
          </div>
          <div class="estado-item">
            <span class="estado-icon">🔄</span>
            <span class="estado-text">Se crean respaldos antes de eliminar duplicados</span>
          </div>
          <div class="estado-item">
            <span class="estado-icon">💾</span>
            <span class="estado-text">Los respaldos se guardan en Firebase permanentemente</span>
          </div>
        </div>
        <div class="algoritmo-info">
          <h4>🧠 Algoritmo inteligente activado:</h4>
          <ul>
            <li>Evalúa la "completitud" de cada embarque</li>
            <li>Solo elimina embarques claramente inferiores</li>
            <li>Siempre crea respaldo antes de eliminar</li>
            <li>Si no puede crear respaldo, NO elimina</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Mensaje de ayuda -->
    <div class="help-section">
      <div class="help-card">
        <h3>ℹ️ ¿Qué hacer si encuentro mi embarque?</h3>
        <ol>
          <li><strong>Si hay múltiples embarques:</strong> Elige el que tenga más datos</li>
          <li><strong>Si está vacío:</strong> Es posible que el algoritmo haya eliminado el embarque correcto</li>
          <li><strong>Para recuperar:</strong> Usa el botón "Ver/Editar" para revisar el embarque</li>
          <li><strong>Si no aparece nada:</strong> Busca en respaldos automáticos</li>
        </ol>
        <div class="emergency-contact">
          <p><strong>🆘 Si necesitas ayuda urgente:</strong></p>
          <p>Contacta al administrador del sistema inmediatamente</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import BackupService from './BackupService.js';

export default {
  name: 'RecuperacionEmergencia',
  data() {
    return {
      fechaBusqueda: '',
      buscando: false,
      buscandoDuplicados: false,
      buscandoRespaldos: false,
      resultadosBusqueda: [],
      duplicadosEncontrados: [],
      embarquesPorFecha: {},
      respaldosEncontrados: []
    };
  },
  mounted() {
    // Establecer fecha por defecto al 17 de julio de 2025
    this.fechaBusqueda = '2025-07-17';
  },
  methods: {
    async buscarEmbarque() {
      if (!this.fechaBusqueda) {
        alert('Por favor selecciona una fecha');
        return;
      }

      this.buscando = true;
      this.resultadosBusqueda = [];

      try {
        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const snapshot = await getDocs(embarquesRef);
        
        const fechaBuscada = new Date(this.fechaBusqueda);
        const fechaISO = fechaBuscada.toISOString().split('T')[0];
        
        const embarquesEncontrados = [];
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          let fechaEmbarque;
          
          // Manejar diferentes formatos de fecha
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fechaEmbarque = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fechaEmbarque = data.fecha;
          } else if (typeof data.fecha === 'string') {
            fechaEmbarque = new Date(data.fecha);
          } else {
            return;
          }
          
          const fechaEmbarqueISO = fechaEmbarque.toISOString().split('T')[0];
          
          if (fechaEmbarqueISO === fechaISO) {
            embarquesEncontrados.push({
              id: doc.id,
              fecha: fechaEmbarque,
              ...data
            });
          }
        });
        
        this.resultadosBusqueda = embarquesEncontrados.sort((a, b) => 
          this.contarProductos(b) - this.contarProductos(a)
        );
        
        if (embarquesEncontrados.length === 0) {
          alert(`No se encontraron embarques para la fecha ${this.fechaBusqueda}`);
        }
        
      } catch (error) {
        console.error('Error al buscar embarques:', error);
        alert('Error al buscar embarques. Revisa la consola.');
      } finally {
        this.buscando = false;
      }
    },

    async buscarDuplicados() {
      this.buscandoDuplicados = true;
      this.duplicadosEncontrados = [];
      this.embarquesPorFecha = {};

      try {
        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const snapshot = await getDocs(embarquesRef);
        
        const embarquesPorFecha = {};
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          let fechaEmbarque;
          
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fechaEmbarque = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fechaEmbarque = data.fecha;
          } else if (typeof data.fecha === 'string') {
            fechaEmbarque = new Date(data.fecha);
          } else {
            return;
          }
          
          const fechaISO = fechaEmbarque.toISOString().split('T')[0];
          
          if (!embarquesPorFecha[fechaISO]) {
            embarquesPorFecha[fechaISO] = [];
          }
          
          embarquesPorFecha[fechaISO].push({
            id: doc.id,
            fecha: fechaEmbarque,
            ...data
          });
        });
        
        // Filtrar solo fechas con múltiples embarques
        const duplicados = {};
        for (const fecha in embarquesPorFecha) {
          if (embarquesPorFecha[fecha].length > 1) {
            duplicados[fecha] = embarquesPorFecha[fecha];
          }
        }
        
        this.embarquesPorFecha = duplicados;
        this.duplicadosEncontrados = Object.keys(duplicados);
        
      } catch (error) {
        console.error('Error al buscar duplicados:', error);
        alert('Error al buscar duplicados. Revisa la consola.');
      } finally {
        this.buscandoDuplicados = false;
      }
    },

    async buscarEnRespaldos() {
      if (!this.fechaBusqueda) {
        alert('Por favor selecciona una fecha');
        return;
      }

      this.buscandoRespaldos = true;
      this.respaldosEncontrados = [];

      try {
        const respaldos = await BackupService.buscarRespaldosPorFecha(this.fechaBusqueda);
        
        this.respaldosEncontrados = respaldos;
        
        if (respaldos.length === 0) {
          alert(`No se encontraron respaldos para la fecha ${this.fechaBusqueda}`);
        } else {
          alert(`¡Encontrados ${respaldos.length} respaldos para el ${this.fechaBusqueda}!`);
        }
        
      } catch (error) {
        console.error('Error al buscar respaldos:', error);
        alert('Error al buscar respaldos. Revisa la consola.');
      } finally {
        this.buscandoRespaldos = false;
      }
    },

    async recuperarDesdeRespaldo(respaldoId) {
      if (!confirm('¿Estás seguro de que quieres recuperar este embarque desde el respaldo?\n\nEsto creará un nuevo embarque con los datos respaldados.')) {
        return;
      }

      try {
        const nuevoEmbarqueId = await BackupService.recuperarDesdeRespaldo(respaldoId);
        
        alert(`¡Embarque recuperado exitosamente!\n\nSe ha creado un nuevo embarque con ID: ${nuevoEmbarqueId}`);
        
        // Redirigir al embarque recuperado
        this.$router.push(`/embarques/${nuevoEmbarqueId}`);
        
      } catch (error) {
        console.error('Error al recuperar desde respaldo:', error);
        alert(`Error al recuperar embarque: ${error.message}`);
      }
    },

    esEmbarqueVacio(embarque) {
      const totalProductos = this.contarProductos(embarque);
      const kilosLimpios = this.calcularKilosLimpios(embarque);
      const kilosCrudos = this.calcularKilosCrudos(embarque);
      
      return totalProductos === 0 && kilosLimpios === 0 && kilosCrudos === 0;
    },

    contarProductos(embarque) {
      if (!embarque.clientes) return 0;
      
      return embarque.clientes.reduce((total, cliente) => {
        return total + (cliente.productos ? cliente.productos.length : 0);
      }, 0);
    },

    calcularKilosLimpios(embarque) {
      if (!embarque.clientes) return 0;
      
      let total = 0;
      embarque.clientes.forEach(cliente => {
        if (!cliente.productos) return;
        
        cliente.productos.forEach(producto => {
          if (producto.tipo === 'c/h20') {
            const reporteTaras = producto.reporteTaras || [];
            const reporteBolsas = producto.reporteBolsas || [];
            let sumaTotalBolsas = 0;

            for (let i = 0; i < reporteTaras.length; i++) {
              const taras = parseInt(reporteTaras[i]) || 0;
              const bolsa = parseInt(reporteBolsas[i]) || 0;
              sumaTotalBolsas += taras * bolsa;
            }
            total += sumaTotalBolsas * 0.45;
          }
        });
      });
      
      return total.toFixed(1);
    },

    calcularKilosCrudos(embarque) {
      if (!embarque.clientes) return 0;
      
      let total = 0;
      embarque.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            total += parseFloat(crudo.kilos) || 0;
          });
        }
      });
      
      return total.toFixed(1);
    },

    formatearFecha(fecha) {
      if (!fecha) return 'Fecha no disponible';
      
      let fechaObj;
      if (typeof fecha.toDate === 'function') {
        fechaObj = fecha.toDate();
      } else if (fecha instanceof Date) {
        fechaObj = fecha;
      } else {
        fechaObj = new Date(fecha);
      }
      
      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    verEmbarque(embarqueId) {
      this.$router.push(`/embarques/${embarqueId}`);
    },

    usarComoRecuperacion(embarque) {
      if (confirm(`¿Estás seguro de que quieres usar este embarque como recuperación?\n\nEsto te llevará al editor para verificar y ajustar los datos.`)) {
        this.verEmbarque(embarque.id);
      }
    }
  }
};
</script>

<style scoped>
.recuperacion-emergencia {
  min-height: 100vh;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  padding: 30px;
  color: white;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.main-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  gap: 15px;
}

.subtitle {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
}

.btn-back {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.search-section, .duplicados-section {
  margin-bottom: 40px;
}

.search-card, .duplicados-card, .help-card {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.search-input-group {
  display: flex;
  gap: 15px;
  align-items: end;
  flex-wrap: wrap;
}

.fecha-input {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  flex: 1;
  min-width: 200px;
}

.btn-search, .btn-search-duplicados {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-search:hover, .btn-search-duplicados:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-search:disabled, .btn-search-duplicados:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.resultados-section, .duplicados-resultados {
  margin-bottom: 40px;
}

.embarques-encontrados {
  display: grid;
  gap: 20px;
  margin-top: 20px;
}

.embarque-resultado {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #4CAF50;
}

.embarque-vacio {
  border-left-color: #ff6b6b;
  background: rgba(255, 235, 235, 0.95);
}

.embarque-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
}

.status-vacio {
  background: #ff6b6b;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.status-completo {
  background: #4CAF50;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.embarque-details {
  margin: 15px 0;
}

.embarque-details p {
  margin: 8px 0;
  font-size: 0.95rem;
}

.embarque-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-ver, .btn-recuperar {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-ver {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.btn-recuperar {
  background: linear-gradient(45deg, #4CAF50, #388E3C);
  color: white;
}

.btn-ver:hover, .btn-recuperar:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.grupo-duplicados {
  margin-bottom: 30px;
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-radius: 15px;
  padding: 20px;
}

.embarques-grupo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.embarque-mini {
  background: #f8f9fa;
  border: 2px solid #ddd;
  border-radius: 10px;
  padding: 15px;
  text-align: center;
}

.embarque-mini.embarque-vacio {
  border-color: #ff6b6b;
  background: #ffebee;
}

.btn-mini {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}

.loading-state {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid white;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.sistema-respaldos {
  margin-bottom: 40px;
}

.sistema-card {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #4CAF50;
}

.estado-respaldos {
  margin: 20px 0;
}

.estado-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1px solid #e9ecef;
}

.estado-item.activo {
  background: #e8f5e8;
  border-color: #4CAF50;
}

.estado-icon {
  font-size: 1.2rem;
  min-width: 24px;
}

.estado-text {
  font-weight: 500;
}

.algoritmo-info {
  margin-top: 25px;
  padding: 20px;
  background: #f0f7ff;
  border-radius: 12px;
  border-left: 4px solid #2196F3;
}

.algoritmo-info h4 {
  margin: 0 0 15px 0;
  color: #1976D2;
}

.algoritmo-info ul {
  margin: 0;
  padding-left: 20px;
}

.algoritmo-info li {
  margin: 8px 0;
  color: #333;
}

.help-section {
  margin-top: 40px;
}

.emergency-contact {
  background: #ffebee;
  border: 1px solid #ff6b6b;
  border-radius: 10px;
  padding: 15px;
  margin-top: 20px;
  color: #d32f2f;
}

/* Estilos para respaldos */
.respaldos-section {
  margin-bottom: 40px;
}

.respaldos-card {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #2196F3;
}

.btn-search-respaldos {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-search-respaldos:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(33, 150, 243, 0.3);
}

.btn-search-respaldos:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.respaldos-resultados {
  margin-bottom: 40px;
}

.respaldos-grid {
  display: grid;
  gap: 20px;
  margin-top: 20px;
}

.respaldo-card {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #2196F3;
}

.respaldo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
}

.respaldo-tipo {
  background: #2196F3;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.respaldo-details {
  margin: 15px 0;
}

.respaldo-details p {
  margin: 8px 0;
  font-size: 0.95rem;
}

.respaldo-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-recuperar-respaldo {
  background: linear-gradient(45deg, #4CAF50, #388E3C);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-recuperar-respaldo:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .recuperacion-emergencia {
    padding: 15px;
  }
  
  .header-section {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .search-input-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .embarque-actions {
    flex-direction: column;
  }
  
  .embarques-grupo {
    grid-template-columns: 1fr;
  }
}
</style> 