<template>
  <div class="lista-embarques">
    <h1>Lista de Embarques</h1>
    
    <div class="opciones-lista">
      <button @click="$router.push('/nuevo-embarque')" class="btn-nuevo">
        <i class="fas fa-plus"></i> Nuevo Embarque
      </button>
      
      <button @click="cargarEmbarques" class="btn-recargar" :disabled="cargando">
        <i class="fas fa-sync"></i> Recargar Lista
      </button>
      
      <button @click="migrarDatos" class="btn-migrar" :disabled="cargando">
        <i class="fas fa-sync"></i> Migrar Datos
      </button>
      
      <button @click="$router.push('/embarques-menu')" class="btn-regresar">
        <i class="fas fa-arrow-left"></i> Regresar al Menú
      </button>
    </div>
 
    <div v-if="cargando" class="cargando">Cargando embarques...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div v-if="embarques.length === 0" class="sin-embarques">No hay embarques registrados.</div>
      
      <table v-else class="tabla-embarques">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Kilos Limpios</th>
            <th>Kilos Crudos</th>
            <th>Total Kilos</th>
            <th>Total Taras</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="embarque in embarques" :key="embarque.id" :class="{ 'fila-bloqueada': embarque.bloqueado || embarque.embarqueBloqueado }">
            <td>
              {{ formatearFecha(embarque.fecha) }}
              <span v-if="embarque.bloqueado || embarque.embarqueBloqueado" class="indicador-bloqueado" title="Este embarque está bloqueado">🔒</span>
              <span v-if="embarque.esEmbarques2" class="indicador-embarques2" title="Este embarque está en la nueva colección">🆕</span>
            </td>
            <td>{{ calcularKilosLimpios(embarque) }} kg</td>
            <td>{{ calcularKilosCrudos(embarque) }} kg</td>
            <td>{{ (Number(calcularKilosLimpios(embarque)) + Number(calcularKilosCrudos(embarque))).toFixed(1) }} kg</td>
            <td>{{ calcularTotalTaras(embarque) }}</td>
            <td>
              <button @click="editarEmbarque(embarque.id)" class="btn-detalles">Editar</button>
              <button 
                @click="(embarque.bloqueado || embarque.embarqueBloqueado) ? mostrarMensajeBloqueado() : eliminarEmbarque(embarque.id)" 
                class="btn-eliminar" 
                :class="{ 'btn-deshabilitado': embarque.bloqueado || embarque.embarqueBloqueado }"
                :title="(embarque.bloqueado || embarque.embarqueBloqueado) ? 'Este embarque está bloqueado y no puede ser eliminado' : ''"
              >Eliminar</button>
              <button @click="verDetallesEmbarque(embarque)" class="btn-info">
                <i class="fas fa-info-circle"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
 
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { adaptarTodosLosEmbarques, adaptarEmbarqueAntiguo } from '@/components/Embarques/EmbarqueAdapter';
import EmbarqueService from '@/services/EmbarqueService';

export default {
  name: 'ListaEmbarques',
  data() {
    return {
      embarques: [],
      cargando: true,
      error: null,
      modoCompatibilidad: true // Activar modo compatibilidad por defecto
    };
  },
  methods: {
    async cargarEmbarques() {
      try {
        this.cargando = true;
        console.log('Iniciando carga de embarques...');
        
        // Usar el adaptador para cargar todos los embarques de la colección original
        const embarquesAdaptados = await adaptarTodosLosEmbarques(false);
        console.log(`Embarques cargados de la colección original: ${embarquesAdaptados.length}`);
        
        // Cargar embarques de la nueva colección embarques2
        console.log('Cargando embarques de la colección embarques2...');
        const embarques2 = await EmbarqueService.obtenerTodosEmbarques2();
        console.log(`Embarques obtenidos de la colección embarques2: ${embarques2.length}`);
        
        if (embarques2.length > 0) {
          console.log('Primer embarque de embarques2:', embarques2[0]);
        }
        
        // Agregar prefijo a los IDs de embarques2 para identificarlos
        const embarques2Adaptados = embarques2.map(embarque => {
          console.log(`Procesando embarque de embarques2: ${embarque.id}`);
          return {
            ...embarque,
            id: `emb2_${embarque.id}`,
            esEmbarques2: true // Agregar un indicador para saber que es de la nueva colección
          };
        });
        
        // Combinar ambos arrays
        const todosLosEmbarques = [...embarquesAdaptados, ...embarques2Adaptados];
        
        // Ordenar por fecha
        this.embarques = todosLosEmbarques.sort((a, b) => {
          // Intentar obtener las fechas de diferentes formatos
          let fechaA, fechaB;
          
          if (a.fecha) {
            if (a.fecha.toDate && typeof a.fecha.toDate === 'function') {
              fechaA = a.fecha.toDate();
            } else if (typeof a.fecha === 'string') {
              fechaA = new Date(a.fecha);
            } else {
              fechaA = new Date();
            }
          } else {
            fechaA = new Date();
          }
          
          if (b.fecha) {
            if (b.fecha.toDate && typeof b.fecha.toDate === 'function') {
              fechaB = b.fecha.toDate();
            } else if (typeof b.fecha === 'string') {
              fechaB = new Date(b.fecha);
            } else {
              fechaB = new Date();
            }
          } else {
            fechaB = new Date();
          }
          
          return fechaB - fechaA; // Orden descendente
        });
        
        console.log(`Se cargaron ${embarquesAdaptados.length} embarques de la colección original`);
        console.log(`Se cargaron ${embarques2Adaptados.length} embarques de la colección embarques2`);
        console.log(`Total: ${this.embarques.length} embarques`);
        
        this.cargando = false;
      } catch (error) {
        console.error("Error al cargar los embarques:", error);
        this.error = "Hubo un error al cargar los embarques. Por favor, intente de nuevo más tarde.";
        this.cargando = false;
      }
    },
    formatearFecha(fecha) {
      if (!fecha) return 'Fecha no disponible';
      
      let fechaObj;
      
      try {
        // Manejar diferentes formatos de fecha
        if (fecha.toDate && typeof fecha.toDate === 'function') {
          // Es un timestamp de Firestore
          fechaObj = fecha.toDate();
        } else if (typeof fecha === 'string') {
          // Es una cadena de texto
          fechaObj = new Date(fecha);
        } else if (fecha instanceof Date) {
          // Es un objeto Date
          fechaObj = fecha;
        } else {
          // Formato desconocido
          return 'Formato de fecha desconocido';
        }
        
        // Verificar si la fecha es válida
        if (isNaN(fechaObj.getTime())) {
          return 'Fecha inválida';
        }
        
        // Formatear la fecha
        return fechaObj.toLocaleDateString('es-ES');
      } catch (error) {
        console.error('Error al formatear fecha:', error, fecha);
        return 'Error al formatear fecha';
      }
    },
    calcularKilosLimpios(embarque) {
      // Para el formato nuevo (usando items)
      if (embarque.items && Array.isArray(embarque.items)) {
        return embarque.items
          .filter(item => item.tipo === 'S/H20' || item.tipo.toLowerCase() === 's/h20')
          .reduce((total, item) => total + (Number(item.kilosTotales) || 0), 0)
          .toFixed(1);
      }
      
      // Para el formato antiguo (usando clientes)
      if (embarque.clientes) {
        let totalKilos = 0;

        embarque.clientes.forEach(cliente => {
          if (cliente.productos) {
            cliente.productos.forEach(producto => {
              if (producto.tipo && producto.tipo.toLowerCase() !== 'c/h20') {
                if (Array.isArray(producto.kilos)) {
                  const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
                  const sumaTaras = Array.isArray(producto.taras) 
                    ? producto.taras.reduce((sum, tara) => sum + (Number(tara) || 0), 0) 
                    : 0;
                  const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
                  totalKilos += sumaKilos - descuentoTaras;
                } else {
                  totalKilos += Number(producto.kilos) || 0;
                }
              }
            });
          }
        });

        return totalKilos.toFixed(1);
      }
      
      return "0.0";
    },
    calcularKilosCrudos(embarque) {
      // Para el formato nuevo (usando items)
      if (embarque.items && Array.isArray(embarque.items)) {
        return embarque.items
          .filter(item => item.tipo === 'crudo' || item.tipo === 'C/H20' || item.tipo.toLowerCase() === 'c/h20')
          .reduce((total, item) => total + (Number(item.kilosTotales) || 0), 0)
          .toFixed(1);
      }
      
      // Para el formato antiguo
      if (embarque.clientes) {
        let totalKilosCrudos = 0;
        
        // Sumar kilos de productos c/h20
        embarque.clientes.forEach(cliente => {
          if (cliente.productos) {
            cliente.productos.forEach(producto => {
              if (producto.tipo && producto.tipo.toLowerCase() === 'c/h20') {
                if (producto.reporteTaras && producto.reporteBolsas) {
                  let sumaTotalKilos = 0;
                  for (let i = 0; i < producto.reporteTaras.length; i++) {
                    const taras = parseInt(producto.reporteTaras[i]) || 0;
                    const bolsa = parseInt(producto.reporteBolsas[i]) || 0;
                    sumaTotalKilos += taras * bolsa;
                  }
                  const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
                  totalKilosCrudos += kilosReales;
                } else if (Array.isArray(producto.kilos)) {
                  totalKilosCrudos += producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
                }
              }
            });
          }
        });

        // Sumar kilos de crudos
        embarque.clientes.forEach(cliente => {
          if (cliente.crudos) {
            cliente.crudos.forEach(crudo => {
              if (crudo.items) {
                crudo.items.forEach(item => {
                  if (item.taras) {
                    const [cantidad, medida] = item.taras.split('-').map(Number);
                    totalKilosCrudos += (cantidad || 0) * (medida === 19 ? 20 : (medida || 0));
                  }
                  if (item.sobrante) {
                    const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
                    totalKilosCrudos += (cantidadSobrante || 0) * (medidaSobrante === 19 ? 20 : (medidaSobrante || 0));
                  }
                });
              }
            });
          }
        });

        return totalKilosCrudos.toFixed(1);
      }
      
      return "0.0";
    },
    calcularTotalTaras(embarque) {
      // Para el formato nuevo (usando items)
      if (embarque.items && Array.isArray(embarque.items)) {
        return embarque.items
          .reduce((total, item) => {
            if (item.tarasKilos && Array.isArray(item.tarasKilos)) {
              return total + item.tarasKilos.reduce((sum, tk) => sum + (Number(tk.tara) || 0), 0);
            }
            return total;
          }, 0);
      }
      
      // Para el formato antiguo
      if (embarque.clientes) {
        let totalTaras = 0;
        
        embarque.clientes.forEach(cliente => {
          // Sumar taras de productos normales
          if (cliente.productos) {
            cliente.productos.forEach(producto => {
              if (Array.isArray(producto.taras)) {
                totalTaras += producto.taras.reduce((sum, tara) => sum + (Number(tara) || 0), 0);
              } else if (producto.taras) {
                totalTaras += Number(producto.taras) || 0;
              }
              
              if (Array.isArray(producto.tarasExtra)) {
                totalTaras += producto.tarasExtra.reduce((sum, tara) => sum + (Number(tara) || 0), 0);
              }
              
              if (Array.isArray(producto.reporteTaras)) {
                totalTaras += producto.reporteTaras.reduce((sum, tara) => sum + (Number(tara) || 0), 0);
              }
            });
          }

          // Sumar taras de crudos
          if (cliente.crudos) {
            cliente.crudos.forEach(crudo => {
              if (crudo.items) {
                crudo.items.forEach(item => {
                  if (item.taras) {
                    const [cantidad] = item.taras.split('-').map(Number);
                    totalTaras += cantidad || 0;
                  }
                  if (item.sobrante) {
                    const [cantidadSobrante] = item.sobrante.split('-').map(Number);
                    totalTaras += cantidadSobrante || 0;
                  }
                });
              }
            });
          }
        });

        return totalTaras;
      }
      
      return 0;
    },
    editarEmbarque(embarqueId) {
      if (!embarqueId || embarqueId === 'undefined' || embarqueId === 'null') {
        console.error('Error: Se intentó editar un embarque con ID inválido:', embarqueId);
        alert('Error: No se puede editar el embarque. ID inválido.');
        return;
      }
      
      // Intentar limpiar la caché local para forzar una carga fresca
      try {
        localStorage.removeItem(`rey_pez_app_embarque_${embarqueId}`);
        console.log('Caché local limpiada para embarque:', embarqueId);
      } catch (error) {
        console.warn('No se pudo limpiar la caché local:', error);
      }
      
      // Verificar si el embarque es de la colección embarques2
      const esEmbarques2 = embarqueId.startsWith('emb2_');
      
      if (esEmbarques2) {
        console.log(`Editando embarque de la colección embarques2: ${embarqueId}`);
      } else {
        console.log(`Editando embarque de la colección original: ${embarqueId}`);
      }
      
      // Usar la ruta con nombre para asegurar que se pase correctamente el parámetro
      this.$router.push({
        name: 'EditarEmbarque',
        params: { id: embarqueId }
      });
    },
    
    async eliminarEmbarque(embarqueId) {
      // Encontrar el embarque por ID
      const embarque = this.embarques.find(e => e.id === embarqueId);
      
      // Verificar si el embarque está bloqueado
      if (embarque && (embarque.bloqueado || embarque.embarqueBloqueado)) {
        alert('Este embarque está bloqueado y no puede ser eliminado.');
        return;
      }
      
      if (confirm('¿Estás seguro de que quieres eliminar este embarque?')) {
        try {
          const db = getFirestore();
          
          // Verificar si el embarque es de la colección embarques2
          if (embarqueId.startsWith('emb2_')) {
            // Eliminar de la colección embarques2
            const idReal = embarqueId.replace('emb2_', '');
            console.log(`Intentando eliminar embarque de embarques2 con ID real: ${idReal}`);
            await deleteDoc(doc(db, 'embarques2', idReal));
            console.log(`Embarque eliminado de la colección embarques2: ${idReal}`);
          } else {
            // Eliminar de la colección original
            console.log(`Intentando eliminar embarque de la colección original: ${embarqueId}`);
            await deleteDoc(doc(db, 'embarques', embarqueId));
            console.log(`Embarque eliminado de la colección original: ${embarqueId}`);
          }
          
          // Actualizar la lista
          this.embarques = this.embarques.filter(e => e.id !== embarqueId);
          alert('Embarque eliminado con éxito');
          
          // Recargar la lista para asegurar que se actualice correctamente
          await this.cargarEmbarques();
        } catch (error) {
          console.error("Error al eliminar el embarque:", error);
          alert('Hubo un error al eliminar el embarque. Por favor, intente de nuevo.');
        }
      }
    },
    
    mostrarMensajeBloqueado() {
      alert('Este embarque está bloqueado y no puede ser eliminado.');
    },
    
    verDetallesEmbarque(embarque) {
      console.log('Detalles del embarque:', {
        id: embarque.id,
        esEmbarques2: embarque.esEmbarques2 || false,
        fecha: embarque.fecha,
        items: embarque.items?.length || 0,
        bloqueado: embarque.bloqueado || embarque.embarqueBloqueado || false,
        createdAt: embarque.createdAt,
        updatedAt: embarque.updatedAt
      });
      
      // Mostrar alerta con información básica
      alert(`
        ID: ${embarque.id}
        Colección: ${embarque.esEmbarques2 ? 'embarques2' : 'embarques'}
        Fecha: ${this.formatearFecha(embarque.fecha)}
        Items: ${embarque.items?.length || 0}
        Bloqueado: ${embarque.bloqueado || embarque.embarqueBloqueado || false}
      `);
    },
    
    migrarDatos() {
      if (confirm('¿Estás seguro de que quieres migrar TODOS los embarques al nuevo formato? Esta acción modificará la base de datos y no se puede deshacer.')) {
        this.cargando = true;
        
        // Ejecutar la migración con actualizarDB = true
        adaptarTodosLosEmbarques(true)
          .then(embarquesAdaptados => {
            this.embarques = embarquesAdaptados.sort((a, b) => {
              const fechaA = a.fecha ? (a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha)) : new Date();
              const fechaB = b.fecha ? (b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha)) : new Date();
              return fechaB - fechaA;
            });
            
            alert('¡Migración completada con éxito! Se adaptaron ' + embarquesAdaptados.length + ' embarques.');
            this.cargando = false;
          })
          .catch(error => {
            console.error('Error durante la migración:', error);
            alert('Error durante la migración: ' + error.message);
            this.cargando = false;
          });
      }
    }
  },
  mounted() {
    this.cargarEmbarques();
  },
  created() {
    // Log para depuración
    this.$nextTick(() => {
      setTimeout(() => {
        if (this.embarques.length > 0) {
          console.log('Verificando estado de bloqueo de embarques:');
          this.embarques.forEach(embarque => {
            console.log(`ID: ${embarque.id}, Bloqueado: ${embarque.bloqueado || embarque.embarqueBloqueado}, Formato: ${embarque.items ? 'Nuevo' : 'Antiguo'}`);
          });
        }
      }, 1000);
    });
  }
};
</script>

<style scoped>
.lista-embarques {
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  color: #333;
  margin-bottom: 20px;
}

.cargando, .error, .sin-embarques {
  text-align: center;
  padding: 20px;
  font-size: 18px;
}

.error {
  color: #d9534f;
}

.tabla-embarques {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.tabla-embarques th, .tabla-embarques td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.tabla-embarques th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.tabla-embarques tr:nth-child(even) {
  background-color: #f9f9f9;
}

.tabla-embarques tr:hover {
  background-color: #f5f5f5;
}

.btn-detalles {
  background-color: #5bc0de;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-detalles:hover {
  background-color: #46b8da;
}

.btn-lista-embarques {
  background-color: #5bc0de;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-lista-embarques:hover {
  background-color: #46b8da;
}

.botones {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.btn-regresar {
  background-color: #f0ad4e;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-regresar:hover {
  background-color: #ec971f;
}

.btn-eliminar {
  background-color: #d9534f;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-left: 5px;
}

.btn-eliminar:hover {
  background-color: #c9302c;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-left: 5px;
}

.btn-info:hover {
  background-color: #138496;
}

.btn-deshabilitado {
  opacity: 0.5;
  cursor: not-allowed;
}

.fila-bloqueada {
  background-color: rgba(255, 235, 235, 0.5) !important;
}

.fila-bloqueada:hover {
  background-color: rgba(255, 235, 235, 0.8) !important;
}

.indicador-bloqueado {
  margin-left: 5px;
  font-size: 14px;
  color: #d9534f;
}

.indicador-embarques2 {
  margin-left: 5px;
  font-size: 14px;
  color: #17a2b8;
}

/* Agregar estos estilos para mejorar la visualización de la tabla */
.tabla-embarques td {
  white-space: nowrap;
  padding: 12px 15px;
}

.tabla-embarques th {
  white-space: nowrap;
  padding: 12px 15px;
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
}

@media (max-width: 1200px) {
  .tabla-embarques {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  .tabla-embarques th:nth-child(4),
  .tabla-embarques td:nth-child(4) {
    display: none;
  }

  .tabla-embarques th,
  .tabla-embarques td {
    padding: 8px 6px;
    font-size: 14px;
  }

  /* Fecha */
  .tabla-embarques th:nth-child(1),
  .tabla-embarques td:nth-child(1) {
    width: 25%;
    min-width: 80px;
  }

  /* Kilos Limpios */
  .tabla-embarques th:nth-child(2),
  .tabla-embarques td:nth-child(2) {
    width: 20%;
    min-width: 70px;
  }

  /* Kilos Crudos */
  .tabla-embarques th:nth-child(3),
  .tabla-embarques td:nth-child(3) {
    width: 20%;
    min-width: 70px;
  }

  /* Total Taras */
  .tabla-embarques th:nth-child(5),
  .tabla-embarques td:nth-child(5) {
    width: 15%;
    min-width: 60px;
  }

  /* Columna de Acciones */
  .tabla-embarques th:nth-child(6),
  .tabla-embarques td:nth-child(6) {
    width: 20%;
    min-width: 120px;
  }

  .btn-detalles,
  .btn-eliminar {
    padding: 6px 8px;
    font-size: 13px;
    margin-left: 2px;
  }
}

.opciones-lista {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-nuevo, .btn-migrar, .btn-regresar {
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-nuevo {
  background-color: #28a745;
  color: white;
}

.btn-nuevo:hover {
  background-color: #218838;
}

.btn-recargar {
  background-color: #6610f2;
  color: white;
}

.btn-recargar:hover {
  background-color: #520dc2;
}

.btn-recargar:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-migrar {
  background-color: #17a2b8;
  color: white;
}

.btn-migrar:hover {
  background-color: #138496;
}

.btn-migrar:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-regresar {
  background-color: #6c757d;
  color: white;
  margin-left: auto;
}

.btn-regresar:hover {
  background-color: #5a6268;
}
</style>
