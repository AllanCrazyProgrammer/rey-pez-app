<template>
  <div class="lista-embarques">
    <!-- Header principal -->
    <div class="header-section">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-ship">🚢</i>
          Lista de Embarques
        </h1>
        <p class="subtitle">Gestiona todos tus embarques de manera eficiente</p>
      </div>
      <div class="header-actions">
        <button @click="cargarEmbarques" class="btn-refresh" title="Actualizar lista">
          <i class="icon">🔄</i>
          Actualizar
        </button>
      </div>
    </div>

    <!-- Estados de carga -->
    <div v-if="cargando" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando embarques...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <i class="icon-error">⚠️</i>
      <h3>Error al cargar</h3>
      <p>{{ error }}</p>
      <button @click="cargarEmbarques" class="btn-retry">Reintentar</button>
    </div>

    <!-- Lista de embarques -->
    <div v-else class="embarques-container">
      <div v-if="embarques.length > 0" class="embarques-grid">
        <div 
          v-for="embarque in embarques" 
          :key="embarque.id" 
          class="embarque-card"
          :class="{ 'card-blocked': embarque.embarqueBloqueado }"
        >
          <!-- Header de la card -->
          <div class="card-header">
            <div class="fecha-section">
              <i class="icon-calendar">📅</i>
              <div class="fecha-info">
                <span class="fecha-label">Fecha</span>
                <span class="fecha-value">{{ formatearFecha(embarque.fecha) }}</span>
              </div>
            </div>
            <div class="status-section">
              <span v-if="embarque.embarqueBloqueado" class="status-badge blocked">
                <i class="icon-lock">🔒</i>
                Bloqueado
              </span>
              <span v-else class="status-badge active">
                <i class="icon-check">✅</i>
                Activo
              </span>
            </div>
          </div>

          <!-- Contenido principal -->
          <div class="card-content">
            <!-- Estadísticas -->
            <div class="stats-grid">
              <div class="stat-item">
                <i class="icon-clean">🥤</i>
                <div class="stat-info">
                  <span class="stat-label">Kilos Limpios</span>
                  <span class="stat-value">{{ calcularKilosLimpios(embarque) }} kg</span>
                </div>
              </div>
              <div class="stat-item">
                <i class="icon-raw">🦐</i>
                <div class="stat-info">
                  <span class="stat-label">Kilos Crudos</span>
                  <span class="stat-value">{{ calcularKilosCrudos(embarque) }} kg</span>
                </div>
              </div>
              <div class="stat-item">
                <i class="icon-total">⚖️</i>
                <div class="stat-info">
                  <span class="stat-label">Total Kilos</span>
                  <span class="stat-value total">{{ (Number(calcularKilosLimpios(embarque)) + Number(calcularKilosCrudos(embarque))).toFixed(1) }} kg</span>
                </div>
              </div>
              <div class="stat-item">
                <i class="icon-taras">📦</i>
                <div class="stat-info">
                  <span class="stat-label">Total Taras</span>
                  <span class="stat-value">{{ calcularTotalTaras(embarque) }}</span>
                </div>
              </div>
            </div>

            <!-- Información adicional -->
            <div class="additional-info">
              <div class="info-item">
                <i class="icon-truck">🚚</i>
                <span class="info-label">Carga con:</span>
                <span class="info-value">{{ embarque.cargaCon || 'No especificado' }}</span>
              </div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="card-actions">
            <button 
              @click="editarEmbarque(embarque.id)" 
              class="btn-action btn-edit"
              title="Editar embarque"
            >
              <i class="icon">✏️</i>
              Editar
            </button>
            <button 
              @click="eliminarEmbarque(embarque.id)" 
              class="btn-action btn-delete"
              :class="{ 'btn-disabled': embarque.embarqueBloqueado }"
              :disabled="embarque.embarqueBloqueado"
              :title="embarque.embarqueBloqueado ? 'Este embarque está bloqueado' : 'Eliminar embarque'"
            >
              <i class="icon">🗑️</i>
              Eliminar
            </button>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div v-else class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No hay embarques registrados</h3>
        <p>Comienza creando tu primer embarque</p>
        <button @click="$router.push({ name: 'NuevoEmbarque', params: { id: 'nuevo' } })" class="btn-create">
          <i class="icon">➕</i>
          Crear Embarque
        </button>
      </div>
    </div>

    <!-- Notificaciones de respaldo -->
    <NotificacionRespaldo
      :visible="mostrarNotificacion"
      :tipo="tipoNotificacion"
      :titulo="tituloNotificacion"
      :mensaje="mensajeNotificacion"
      @close="cerrarNotificacion"
    />
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import BackupService from './BackupService.js';
import NotificacionRespaldo from './NotificacionRespaldo.vue';

export default {
  name: 'ListaEmbarques',
  components: {
    NotificacionRespaldo
  },
  data() {
    return {
      embarques: [],
      cargando: true,
      error: null,
      // Notificaciones de respaldo
      mostrarNotificacion: false,
      tipoNotificacion: 'success',
      tituloNotificacion: '',
      mensajeNotificacion: ''
    };
  },
  methods: {
    async cargarEmbarques() {
      try {
        this.cargando = true;
        this.error = null;
        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const snapshot = await getDocs(embarquesRef);
        
        // Agrupar embarques por fecha para detectar duplicados
        const embarquesPorFecha = {};
        
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
            // Si no se puede determinar la fecha, usar el ID como clave
            embarquesPorFecha[doc.id] = [{ id: doc.id, data: data }];
            return;
          }
          
          const fechaISO = fechaEmbarque.toISOString().split('T')[0];
          
          if (!embarquesPorFecha[fechaISO]) {
            embarquesPorFecha[fechaISO] = [];
          }
          
          embarquesPorFecha[fechaISO].push({
            id: doc.id,
            data: data,
            fecha: fechaEmbarque
          });
        });
        
        // Eliminar embarques duplicados CON RESPALDO AUTOMÁTICO
        const embarquesParaEliminar = [];
        
        // NUEVO ALGORITMO INTELIGENTE CON RESPALDOS AUTOMÁTICOS
        for (const fecha in embarquesPorFecha) {
          if (embarquesPorFecha[fecha].length > 1) {
            console.log(`[DUPLICADOS] Encontrados ${embarquesPorFecha[fecha].length} embarques para ${fecha}`);
            
            // Ordenar por el más completo (más clientes o productos)
            embarquesPorFecha[fecha].sort((a, b) => {
              const productosA = a.data.clientes ? a.data.clientes.reduce((sum, cliente) => 
                sum + (cliente.productos ? cliente.productos.length : 0), 0) : 0;
              
              const productosB = b.data.clientes ? b.data.clientes.reduce((sum, cliente) => 
                sum + (cliente.productos ? cliente.productos.length : 0), 0) : 0;
              
              // Considerar también si tiene datos de crudos
              const crudosA = a.data.clientes ? a.data.clientes.reduce((sum, cliente) => 
                sum + (cliente.crudos ? cliente.crudos.length : 0), 0) : 0;
              
              const crudosB = b.data.clientes ? b.data.clientes.reduce((sum, cliente) => 
                sum + (cliente.crudos ? cliente.crudos.length : 0), 0) : 0;
              
              // Calcular "puntaje de completitud"
              const puntajeA = productosA + (crudosA * 2); // Los crudos pesan más
              const puntajeB = productosB + (crudosB * 2);
              
              return puntajeB - puntajeA; // Ordenar de mayor a menor completitud
            });
            
            // Solo marcar para eliminación si el primero tiene claramente más datos
            const principal = embarquesPorFecha[fecha][0];
            const puntajePrincipal = this.calcularPuntajeCompletitud(principal.data);
            
            for (let i = 1; i < embarquesPorFecha[fecha].length; i++) {
              const candidato = embarquesPorFecha[fecha][i];
              const puntajeCandidato = this.calcularPuntajeCompletitud(candidato.data);
              
              // Solo eliminar si hay una diferencia significativa
              if (puntajePrincipal > puntajeCandidato || puntajeCandidato === 0) {
                embarquesParaEliminar.push({
                  id: candidato.id,
                  data: candidato.data,
                  razon: `duplicado_inferior_${fecha}`,
                  puntajePrincipal,
                  puntajeCandidato
                });
              }
            }
          }
        }
        
        // Crear respaldos antes de eliminar
        if (embarquesParaEliminar.length > 0) {
          console.log(`[RESPALDOS] Creando respaldos para ${embarquesParaEliminar.length} embarques antes de eliminar`);
          
          for (const embarqueAEliminar of embarquesParaEliminar) {
            try {
              // CREAR RESPALDO AUTOMÁTICO antes de eliminar
              await BackupService.crearRespaldoEmergencia(
                embarqueAEliminar.id, 
                embarqueAEliminar.razon
              );
              console.log(`[RESPALDO] Respaldo creado para embarque ${embarqueAEliminar.id}`);
            } catch (error) {
              console.error(`[RESPALDO] Error al crear respaldo para ${embarqueAEliminar.id}:`, error);
              // NO eliminar si no se pudo crear el respaldo
              continue;
            }
          }
          
          // Solo AHORA eliminar los embarques (después de respaldar)
          for (const embarqueAEliminar of embarquesParaEliminar) {
            try {
              await deleteDoc(doc(db, 'embarques', embarqueAEliminar.id));
              console.log(`[ELIMINACIÓN] Embarque ${embarqueAEliminar.id} eliminado (respaldado)`);
            } catch (error) {
              console.error(`[ELIMINACIÓN] Error al eliminar embarque ${embarqueAEliminar.id}:`, error);
            }
          }
          
          // Después de eliminar, volver a cargar los embarques
          if (embarquesParaEliminar.length > 0) {
            console.log(`[LIMPIEZA] Recargando lista después de eliminar ${embarquesParaEliminar.length} duplicados`);
            return this.cargarEmbarques();
          }
        }
        
        // Procesar los embarques (uno por fecha)
        const embarquesFiltrados = [];
        
        for (const fecha in embarquesPorFecha) {
          const embarque = embarquesPorFecha[fecha][0]; // Tomar el primer embarque (el más completo)
          
          embarquesFiltrados.push({
            id: embarque.id,
            fecha: embarque.fecha,
            embarqueBloqueado: embarque.data.embarqueBloqueado || false,
            clientes: embarque.data.clientes || [],
            cargaCon: embarque.data.cargaCon || 'No especificado'
          });
        }
        
        this.embarques = embarquesFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      } catch (error) {
        console.error('Error al cargar embarques:', error);
        this.error = 'Error al cargar los embarques. Por favor, intenta nuevamente.';
      } finally {
        this.cargando = false;
      }
    },

    calcularKilosLimpios(embarque) {
      if (!embarque.clientes) return '0.0';
      
      let totalKilos = 0;
      
      embarque.clientes.forEach(cliente => {
        if (!cliente.productos) return;
        
        cliente.productos.forEach(producto => {
          if (producto.tipo === 'c/h20') {
            // Para productos c/h20, calcular con el valor neto
            const reporteTaras = producto.reporteTaras || [];
            const reporteBolsas = producto.reporteBolsas || [];
            let sumaTotalBolsas = 0;

            for (let i = 0; i < reporteTaras.length; i++) {
              const taras = parseInt(reporteTaras[i]) || 0;
              const bolsa = parseInt(reporteBolsas[i]) || 0;
              sumaTotalBolsas += taras * bolsa;
            }

            // Multiplicar por el valor neto (0.65 por defecto)
            const kilosReales = sumaTotalBolsas * (producto.camaronNeto || 0.65);
            totalKilos += kilosReales;
          } else {
            // Para otros productos, usar el cálculo estándar
            const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
            const descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
            totalKilos += (sumaKilos - descuentoTaras);
          }
        });
      });
      
      return totalKilos.toFixed(1);
    },

    calcularKilosCrudos(embarque) {
      if (!embarque.clientes) return '0.0';
      
      let totalKilosCrudos = 0;
      
      embarque.clientes.forEach(cliente => {
        if (!cliente.crudos || !Array.isArray(cliente.crudos)) return;
        
        cliente.crudos.forEach(crudo => {
          if (!crudo || !crudo.items || !Array.isArray(crudo.items)) return;
          
          crudo.items.forEach(item => {
            let kilosItem = 0;
            
            // Procesar taras principales
            if (item.taras) {
              const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
              if (formatoGuion) {
                const cantidad = parseInt(formatoGuion[1]) || 0;
                let medida = parseInt(formatoGuion[2]) || 0;
                
                // Si la medida es 19, sustituirla por 20 para el cálculo de ventas
                if (medida === 19) {
                  medida = 20;
                }
                
                kilosItem += cantidad * medida;
              } else {
                // Formato original si no coincide con el patrón
                const [cantidad, medida] = item.taras.split('-').map(Number);
                kilosItem += (cantidad || 0) * (medida || 0);
              }
            }
            
            // Procesar sobrantes
            if (item.sobrante) {
              const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
              if (formatoGuion) {
                const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                let medidaSobrante = parseInt(formatoGuion[2]) || 0;
                
                // Si la medida es 19, sustituirla por 20 para el cálculo de ventas
                if (medidaSobrante === 19) {
                  medidaSobrante = 20;
                }
                
                kilosItem += cantidadSobrante * medidaSobrante;
              } else {
                // Formato original si no coincide con el patrón
                const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
                kilosItem += (cantidadSobrante || 0) * (medidaSobrante || 0);
              }
            }
            
            totalKilosCrudos += kilosItem;
          });
        });
      });
      
      return totalKilosCrudos.toFixed(1);
    },

    calcularTotalTaras(embarque) {
      if (!embarque.clientes) return 0;
      
      let totalTaras = 0;
      
      // Calcular taras de productos limpios
      embarque.clientes.forEach(cliente => {
        if (cliente.productos) {
          cliente.productos.forEach(producto => {
            const taras = Array.isArray(producto.taras) ? producto.taras : [];
            const tarasExtra = Array.isArray(producto.tarasExtra) ? producto.tarasExtra : [];
            const todasLasTaras = [...taras, ...tarasExtra];
            
            totalTaras += todasLasTaras.reduce((sum, tara) => {
              return sum + (parseInt(tara) || 0);
            }, 0);
          });
        }
        
        // Calcular taras de crudos
        if (cliente.crudos) {
          cliente.crudos.forEach(crudo => {
            if (crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.taras) {
                  const [cantidad] = item.taras.split('-');
                  totalTaras += parseInt(cantidad) || 0;
                }
                if (item.sobrante) {
                  const [cantidadSobrante] = item.sobrante.split('-');
                  totalTaras += parseInt(cantidadSobrante) || 0;
                }
              });
            }
          });
        }
      });
      
      return totalTaras;
    },

    formatearFecha(fecha) {
      if (!fecha) return 'Fecha no disponible';
      
      let fechaObj;
      if (fecha.toDate && typeof fecha.toDate === 'function') {
        fechaObj = fecha.toDate();
      } else if (fecha instanceof Date) {
        fechaObj = fecha;
      } else if (typeof fecha === 'string') {
        fechaObj = new Date(fecha);
      } else {
        return 'Fecha inválida';
      }
      
      // Ajustar para mostrar la fecha correcta (compensar diferencia horaria)
      const fechaAjustada = new Date(fechaObj.getTime() + fechaObj.getTimezoneOffset() * 60000);
      
      return fechaAjustada.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    editarEmbarque(embarqueId) {
      this.$router.push({ name: 'NuevoEmbarque', params: { id: embarqueId } });
    },

    regresarAMenu() {
      this.$router.push({ name: 'EmbarquesMenu' });
    },
    
    async eliminarEmbarque(embarqueId) {
      // Encontrar el embarque por ID
      const embarque = this.embarques.find(e => e.id === embarqueId);
      
      // Verificar si el embarque está bloqueado
      if (embarque && embarque.embarqueBloqueado) {
        alert('Este embarque está bloqueado y no puede ser eliminado.');
        return;
      }
      
      if (confirm('¿Estás seguro de que quieres eliminar este embarque?\n\nSe creará un respaldo automático antes de eliminarlo.')) {
        try {
          console.log(`[ELIMINACIÓN MANUAL] Iniciando eliminación con respaldo para embarque ${embarqueId}`);
          
          // PASO 1: Crear respaldo automático ANTES de eliminar
          try {
            await BackupService.crearRespaldoEmergencia(embarqueId, 'eliminacion_manual_usuario');
            console.log(`[RESPALDO MANUAL] Respaldo creado exitosamente para embarque ${embarqueId}`);
            
            // Mostrar notificación de respaldo exitoso
            this.mostrarNotificacionRespaldo(
              'success', 
              '💾 Respaldo creado', 
              'Se ha creado un respaldo de seguridad antes de eliminar el embarque'
            );
            
          } catch (respaldoError) {
            console.error(`[RESPALDO MANUAL] Error al crear respaldo:`, respaldoError);
            
            // Mostrar notificación de error en respaldo
            this.mostrarNotificacionRespaldo(
              'error', 
              '❌ Error en respaldo', 
              'No se pudo crear el respaldo de seguridad. El embarque NO será eliminado por seguridad.'
            );
            
            return; // NO eliminar si no se pudo respaldar
          }
          
          // PASO 2: Solo ahora eliminar el embarque (ya respaldado)
          const db = getFirestore();
          await deleteDoc(doc(db, 'embarques', embarqueId));
          
          console.log(`[ELIMINACIÓN MANUAL] Embarque ${embarqueId} eliminado exitosamente`);
          
          // Mostrar notificación de eliminación exitosa
          this.mostrarNotificacionRespaldo(
            'success', 
            '✅ Embarque eliminado', 
            'El embarque fue eliminado exitosamente. Puedes recuperarlo desde la herramienta de emergencia si es necesario.'
          );
          
          await this.cargarEmbarques(); // Volver a cargar los embarques para reflejar la eliminación
          
        } catch (error) {
          console.error("[ELIMINACIÓN MANUAL] Error al eliminar el embarque:", error);
          
          // Mostrar notificación de error en eliminación
          this.mostrarNotificacionRespaldo(
            'error', 
            '❌ Error al eliminar', 
            'Hubo un error al eliminar el embarque. El respaldo fue creado exitosamente.'
          );
        }
      }
    },

    // Método para calcular el puntaje de completitud de un embarque
    calcularPuntajeCompletitud(embarqueData) {
      if (!embarqueData.clientes) return 0;
      
      let puntaje = 0;
      
      embarqueData.clientes.forEach(cliente => {
        // Puntos por productos
        if (cliente.productos && Array.isArray(cliente.productos)) {
          cliente.productos.forEach(producto => {
            // Producto básico vale 1 punto
            puntaje += 1;
            
            // Si tiene datos de taras/bolsas, vale más
            if (producto.reporteTaras && producto.reporteTaras.length > 0) {
              puntaje += 2;
            }
            
            // Si tiene reportes de bolsas, vale más
            if (producto.reporteBolsas && producto.reporteBolsas.length > 0) {
              puntaje += 2;
            }
            
            // Si tiene medida definida, vale más
            if (producto.medida && producto.medida.trim() !== '') {
              puntaje += 1;
            }
          });
        }
        
        // Puntos por crudos (valen más porque son más críticos)
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            puntaje += 3; // Los crudos valen más
            
            // Si tiene kilos definidos, vale extra
            if (crudo.kilos && parseFloat(crudo.kilos) > 0) {
              puntaje += 2;
            }
          });
        }
      });
      
      // Puntos extra por tener información general
      if (embarqueData.cargaCon && embarqueData.cargaCon.trim() !== '') {
        puntaje += 1;
      }
      
      console.log(`[PUNTAJE] Embarque calculado con puntaje: ${puntaje}`);
      return puntaje;
    },

    // Métodos para notificaciones de respaldo
    mostrarNotificacionRespaldo(tipo, titulo, mensaje) {
      this.tipoNotificacion = tipo;
      this.tituloNotificacion = titulo;
      this.mensajeNotificacion = mensaje;
      this.mostrarNotificacion = true;
    },

    cerrarNotificacion() {
      this.mostrarNotificacion = false;
    }
  },

  async mounted() {
    await this.cargarEmbarques();
  }
};
</script>

<style scoped>
.lista-embarques {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Header Section */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 25px 30px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.main-title {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 15px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.icon-ship {
  font-size: 2.2rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.subtitle {
  margin: 8px 0 0 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
}

.header-actions {
  display: flex;
  gap: 15px;
}

.btn-refresh {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 15px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.btn-refresh:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

/* Estados de carga y error */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  color: white;
  text-align: center;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-left: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  color: white;
  text-align: center;
}

.icon-error {
  font-size: 4rem;
  margin-bottom: 20px;
}

.btn-retry {
  background: linear-gradient(45deg, #ff6b6b, #ee5a52);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 15px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 20px;
  transition: all 0.3s ease;
}

.btn-retry:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

/* Container principal */
.embarques-container {
  max-width: 1400px;
  margin: 0 auto;
}

.embarques-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 25px;
  padding: 10px;
}

/* Cards de embarques */
.embarque-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.embarque-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.embarque-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
}

.card-blocked {
  background: rgba(255, 235, 235, 0.95);
  border-left: 5px solid #ff6b6b;
}

/* Header de la card */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.fecha-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-calendar {
  font-size: 1.5rem;
}

.fecha-info {
  display: flex;
  flex-direction: column;
}

.fecha-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.fecha-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
}

.status-section {
  display: flex;
  align-items: center;
}

.status-badge {
  padding: 8px 15px;
  border-radius: 25px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-badge.active {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.status-badge.blocked {
  background: linear-gradient(45deg, #ff6b6b, #ee5a52);
  color: white;
}

/* Contenido principal */
.card-content {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background: linear-gradient(135deg, #f8f9ff, #e8ecff);
  border-radius: 15px;
  border: 1px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
}

.stat-item i {
  font-size: 1.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
}

.stat-value.total {
  color: #667eea;
  font-size: 1.2rem;
}

.additional-info {
  padding: 15px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-label {
  font-weight: 600;
  color: #666;
}

.info-value {
  color: #333;
  font-weight: 500;
}

/* Acciones */
.card-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 15px;
  border-top: 2px solid rgba(0, 0, 0, 0.05);
}

.btn-action {
  padding: 10px 18px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  min-width: 100px;
  justify-content: center;
}

.btn-edit {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-edit:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-delete {
  background: linear-gradient(45deg, #ff6b6b, #ee5a52);
  color: white;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
}

.btn-delete:hover:not(.btn-disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.btn-disabled {
  background: #cccccc !important;
  cursor: not-allowed !important;
  opacity: 0.6;
  box-shadow: none !important;
}

.btn-disabled:hover {
  transform: none !important;
}

/* Estado vacío */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  color: white;
  text-align: center;
}

.empty-icon {
  font-size: 5rem;
  margin-bottom: 25px;
  opacity: 0.8;
}

.empty-state h3 {
  font-size: 1.8rem;
  margin-bottom: 10px;
  font-weight: 600;
}

.empty-state p {
  font-size: 1.1rem;
  margin-bottom: 30px;
  opacity: 0.8;
}

.btn-create {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 15px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
}

.btn-create:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .lista-embarques {
    padding: 15px;
  }

  .header-section {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .main-title {
    font-size: 2rem;
  }

  .embarques-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .embarque-card {
    padding: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .card-actions {
    flex-direction: column;
  }

  .btn-action {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .embarque-card {
    padding: 15px;
  }

  .main-title {
    font-size: 1.5rem;
  }

  .card-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
}
</style>
