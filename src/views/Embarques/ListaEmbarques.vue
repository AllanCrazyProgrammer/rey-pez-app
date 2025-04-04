<template>
  <div class="lista-embarques">
 
    <div v-if="cargando" class="cargando">Cargando embarques...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <table v-if="embarques.length > 0" class="tabla-embarques">
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
          <tr v-for="embarque in embarques" :key="embarque.id" :class="{ 'fila-bloqueada': embarque.embarqueBloqueado }">
            <td>
              {{ formatearFecha(embarque.fecha) }}
              <span v-if="embarque.embarqueBloqueado" class="indicador-bloqueado" title="Este embarque está bloqueado">🔒</span>
            </td>
            <td>{{ calcularKilosLimpios(embarque) }} kg</td>
            <td>{{ calcularKilosCrudos(embarque) }} kg</td>
            <td>{{ (Number(calcularKilosLimpios(embarque)) + Number(calcularKilosCrudos(embarque))).toFixed(1) }} kg</td>
            <td>{{ calcularTotalTaras(embarque) }}</td>
            <td>
              <button @click="editarEmbarque(embarque.id)" class="btn-detalles">Editar</button>
              <button 
                @click="embarque.embarqueBloqueado ? mostrarMensajeBloqueado() : eliminarEmbarque(embarque.id)" 
                class="btn-eliminar" 
                :class="{ 'btn-deshabilitado': embarque.embarqueBloqueado }"
                :title="embarque.embarqueBloqueado ? 'Este embarque está bloqueado y no puede ser eliminado' : ''"
              >Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="sin-embarques">No hay embarques registrados.</div>
    </div>
 
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

export default {
  name: 'ListaEmbarques',
  data() {
    return {
      embarques: [],
      cargando: true,
      error: null
    };
  },
  methods: {
    async cargarEmbarques() {
      try {
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
        
        // Eliminar embarques duplicados (mantener solo el más reciente)
        const embarquesParaEliminar = [];
        
        for (const fecha in embarquesPorFecha) {
          if (embarquesPorFecha[fecha].length > 1) {
            console.warn(`Se encontraron ${embarquesPorFecha[fecha].length} embarques con la fecha ${fecha}`);
            
            // Ordenar por el más completo (más clientes o productos)
            embarquesPorFecha[fecha].sort((a, b) => {
              const productosA = a.data.clientes ? a.data.clientes.reduce((sum, cliente) => 
                sum + (cliente.productos ? cliente.productos.length : 0), 0) : 0;
              
              const productosB = b.data.clientes ? b.data.clientes.reduce((sum, cliente) => 
                sum + (cliente.productos ? cliente.productos.length : 0), 0) : 0;
              
              return productosB - productosA; // Ordenar de mayor a menor cantidad de productos
            });
            
            // Mantener el primer embarque (el más completo) y marcar los demás para eliminación
            for (let i = 1; i < embarquesPorFecha[fecha].length; i++) {
              embarquesParaEliminar.push(embarquesPorFecha[fecha][i].id);
            }
          }
        }
        
        // Eliminar los embarques duplicados
        if (embarquesParaEliminar.length > 0) {
          console.warn(`Se eliminarán ${embarquesParaEliminar.length} embarques duplicados`);
          
          for (const id of embarquesParaEliminar) {
            try {
              await deleteDoc(doc(db, 'embarques', id));
              console.log(`Embarque duplicado con ID ${id} eliminado correctamente`);
            } catch (error) {
              console.error(`Error al eliminar embarque duplicado con ID ${id}:`, error);
            }
          }
          
          // Después de eliminar, volver a cargar los embarques
          if (embarquesParaEliminar.length > 0) {
            return this.cargarEmbarques();
          }
        }
        
        // Procesar los embarques (uno por fecha)
        const embarquesFiltrados = [];
        
        for (const fecha in embarquesPorFecha) {
          if (embarquesPorFecha[fecha].length > 0) {
            const embarque = embarquesPorFecha[fecha][0];
            
            // Procesar la propiedad embarqueBloqueado
            let embarqueBloqueado = false;
            
            if (embarque.data.embarqueBloqueado !== undefined) {
              // Si es booleano, usar directamente
              if (typeof embarque.data.embarqueBloqueado === 'boolean') {
                embarqueBloqueado = embarque.data.embarqueBloqueado;
              } 
              // Si es string, verificar si es 'true', '1', 'si', etc.
              else if (typeof embarque.data.embarqueBloqueado === 'string') {
                embarqueBloqueado = ['true', '1', 'si', 'yes', 'verdadero'].includes(embarque.data.embarqueBloqueado.toLowerCase());
              } 
              // Si es número, verificar si es diferente de 0
              else if (typeof embarque.data.embarqueBloqueado === 'number') {
                embarqueBloqueado = embarque.data.embarqueBloqueado !== 0;
              }
            }
            
            embarquesFiltrados.push({
              id: embarque.id,
              ...embarque.data,
              embarqueBloqueado: embarqueBloqueado
            });
          }
        }
        
        this.embarques = embarquesFiltrados.sort((a, b) => {
          const fechaA = a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha);
          const fechaB = b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha);
          return fechaB - fechaA; // Orden descendente
        });
        
        this.cargando = false;
      } catch (error) {
        console.error("Error al cargar los embarques:", error);
        this.error = "Hubo un error al cargar los embarques. Por favor, intente de nuevo más tarde.";
        this.cargando = false;
      }
    },
    formatearFecha(fecha) {
      if (!fecha) return 'Fecha no disponible';
      const fechaObj = fecha.toDate ? fecha.toDate() : new Date(fecha);
      // Ajustamos la fecha sumando un día
      fechaObj.setDate(fechaObj.getDate() + 1);
      return fechaObj.toLocaleDateString('es-ES');
    },
    calcularTotalKilos(embarque) {
      let totalKilos = 0;

      embarque.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.tipo === 'c/h20') {
            // Para productos c/h20, calcular la suma de (taras * bolsa) para cada grupo
            const reporteTaras = producto.reporteTaras || [];
            const reporteBolsas = producto.reporteBolsas || [];
            let sumaTotalKilos = 0;

            for (let i = 0; i < reporteTaras.length; i++) {
              const taras = parseInt(reporteTaras[i]) || 0;
              const bolsa = parseInt(reporteBolsas[i]) || 0;
              sumaTotalKilos += taras * bolsa;
            }

            // Multiplicar por el valor neto (0.65 por defecto)
            const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
            totalKilos += kilosReales;
          } else {
            // Para otros productos
            const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            const sumaTaras = this.calcularTotalTarasProducto(producto);
            const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
            totalKilos += sumaKilos - descuentoTaras;
          }
        });
      });

      return totalKilos.toFixed(1);
    },
    calcularTotalTaras(embarque) {
      let totalTaras = 0;
      const clientesPredefinidos = ['OTILIO', 'JOSELITO', 'CATARRO', 'OZUNA', 'CANELO'];

      embarque.clientes.forEach(cliente => {
        // Solo procesar si el cliente está en la lista de predefinidos
        if (clientesPredefinidos.includes(cliente.nombre.toUpperCase())) {
          // Sumar taras de productos normales
          cliente.productos.forEach(producto => {
            totalTaras += this.calcularTotalTarasProducto(producto);
          });

          // Sumar taras de crudos
          if (cliente.crudos && Array.isArray(cliente.crudos)) {
            cliente.crudos.forEach(crudo => {
              if (crudo && crudo.items && Array.isArray(crudo.items)) {
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
        }
      });

      return totalTaras;
    },
    calcularTotalTarasProducto(producto) {
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      return tarasNormales + tarasExtra;
    },
    verDetalles(embarqueId) {
      console.log('Navegando a detalles del embarque:', embarqueId);
      this.$router.push({ name: 'DetallesEmbarque', params: { id: embarqueId } });
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
      
      if (confirm('¿Estás seguro de que quieres eliminar este embarque?')) {
        try {
          const db = getFirestore();
          await deleteDoc(doc(db, 'embarques', embarqueId));
          this.embarques = this.embarques.filter(e => e.id !== embarqueId);
          alert('Embarque eliminado con éxito');
        } catch (error) {
          console.error("Error al eliminar el embarque:", error);
          alert('Hubo un error al eliminar el embarque. Por favor, intente de nuevo.');
        }
      }
    },

    calcularKilosLimpios(embarque) {
      let totalKilos = 0;

      embarque.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.tipo === 'c/h20') {
            // Para productos c/h20, calcular la suma de (taras * bolsa) para cada grupo
            const reporteTaras = producto.reporteTaras || [];
            const reporteBolsas = producto.reporteBolsas || [];
            let sumaTotalKilos = 0;

            for (let i = 0; i < reporteTaras.length; i++) {
              const taras = parseInt(reporteTaras[i]) || 0;
              const bolsa = parseInt(reporteBolsas[i]) || 0;
              sumaTotalKilos += taras * bolsa;
            }

            // Multiplicar por el valor neto (0.65 por defecto)
            const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
            totalKilos += kilosReales;
          } else {
            // Para otros productos
            const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            const sumaTaras = this.calcularTotalTarasProducto(producto);
            const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
            totalKilos += sumaKilos - descuentoTaras;
          }
        });
      });

      return totalKilos.toFixed(1);
    },

    calcularKilosCrudos(embarque) {
      let totalKilosCrudos = 0;

      embarque.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.taras) {
                  // Verificar si la tara tiene formato "5-19" o similar
                  const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                  if (formatoGuion) {
                    const cantidad = parseInt(formatoGuion[1]) || 0;
                    let medida = parseInt(formatoGuion[2]) || 0;
                    
                    // Si la medida es 19, sustituirla por 20
                    if (medida === 19) {
                      medida = 20;
                    }
                    
                    totalKilosCrudos += (cantidad || 0) * (medida || 0);
                  } else {
                    // Formato original si no coincide con el patrón
                    const [cantidad, medida] = item.taras.split('-').map(Number);
                    totalKilosCrudos += (cantidad || 0) * (medida || 0);
                  }
                }
                if (item.sobrante) {
                  // Verificar si el sobrante tiene formato "5-19" o similar
                  const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
                  if (formatoGuion) {
                    const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                    let medidaSobrante = parseInt(formatoGuion[2]) || 0;
                    
                    // Si la medida es 19, sustituirla por 20
                    if (medidaSobrante === 19) {
                      medidaSobrante = 20;
                    }
                    
                    totalKilosCrudos += (cantidadSobrante || 0) * (medidaSobrante || 0);
                  } else {
                    // Formato original si no coincide con el patrón
                    const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
                    totalKilosCrudos += (cantidadSobrante || 0) * (medidaSobrante || 0);
                  }
                }
              });
            }
          });
        }
      });

      return totalKilosCrudos.toFixed(1);
    },
    
    mostrarMensajeBloqueado() {
      alert('Este embarque está bloqueado y no puede ser eliminado.');
    }
  },
  mounted() {
    this.cargarEmbarques();
  },
  created() {
    // Verificar el estado de la propiedad embarqueBloqueado en cada embarque después de cargar los datos
    this.$nextTick(() => {
      setTimeout(() => {
        // Eliminar todo el bloque de console.log
      }, 1000); // Esperar 1 segundo para asegurarse de que los datos estén cargados
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

.btn-deshabilitado {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-deshabilitado:hover {
  background-color: #d9534f;
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
</style>
