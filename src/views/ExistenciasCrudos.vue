<template>
  <div class="existencias-crudos-container">
    <h1>Existencias de Crudos</h1>
    
    <div class="actions-container">
      <router-link to="/existencias-crudos/new" class="action-button new-entrada-btn">
        Nueva Entrada/Salida
      </router-link>
      <button @click="showGestionarModal" class="action-button">
        Gestionar Proveedores y Medidas
      </button>
      <button @click="imprimirReporte" class="action-button">
        Imprimir Reporte
      </button>
    </div>

    <!-- Resumen de existencias actuales -->
    <div class="resumen-existencias">
      <h2>Resumen de Existencias Actuales</h2>
      <div v-if="isLoadingExistencias" class="loading">Cargando existencias...</div>
      <div v-else-if="Object.keys(existenciasPorProveedor).length === 0" class="no-existencias">
        No hay existencias registradas.
      </div>
      <div class="filters-cuarto" v-else>
        <label>
          Filtrar por cuarto:
          <select v-model="filtroCuarto">
            <option value="Todos los cuartos">Todos los cuartos</option>
            <option value="s/c">s/c</option>
            <option value="Cuarto 1">Cuarto 1</option>
            <option value="Cuarto 2">Cuarto 2</option>
            <option value="Cuarto 3">Cuarto 3</option>
            <option value="Cuarto 4">Cuarto 4</option>
            <option value="Cuarto 5">Cuarto 5</option>
          </select>
        </label>
      </div>

      <div v-if="!isLoadingExistencias && Object.keys(existenciasFiltradasPorCuarto).length > 0" class="existencias-grid">
        <div v-for="(productos, proveedor) in existenciasFiltradasPorCuarto" :key="proveedor" class="proveedor-card">
          <h3>{{ proveedor }}</h3>
          <table class="productos-table">
            <thead>
              <tr>
                <th>Medida</th>
                <th>Cuarto</th>
                <th>Kilos</th>
                <th>Taras</th>
                <th v-if="tienePreciosValidos(productos)">Precio</th>
                <th v-if="tienePreciosValidos(productos)">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="producto in productos" :key="producto.clave" v-if="producto.kilos > 0">
                <td>{{ producto.nombre }}</td>
                <td>{{ producto.cuarto }}</td>
                <td class="kilos-cell">{{ formatNumber(producto.kilos) }}</td>
                <td class="taras-cell">{{ (producto.kilos / 19).toFixed(1) }}</td>
                <td v-if="tienePreciosValidos(productos)" class="precio-cell">${{ formatearPrecio(producto.ultimoPrecio) }}</td>
                <td v-if="tienePreciosValidos(productos)" class="valor-cell">${{ formatearValor(producto.valor) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="total-proveedor">
            <div><strong>Total {{ proveedor }}: {{ formatNumber(calcularTotalProveedor(productos)) }} kg</strong></div>
            <div v-if="tienePreciosValidos(productos)"><strong>Valor Total: ${{ formatearValor(calcularTotalValorProveedor(productos)) }}</strong></div>
          </div>
        </div>
      </div>
      <div class="total-general">
        <h3>Total General: {{ formatNumber(totalGeneral) }} kg</h3>
        <h3 v-if="tieneAlgunPrecioValido">Valor Total General: ${{ formatearValor(valorTotalGeneral) }}</h3>
      </div>
    </div>

    <!-- Lista de registros recientes -->
    <div class="registros-list">
      <h2>Registros Recientes</h2>
      <div v-if="isLoadingRegistros" class="loading">Cargando registros...</div>
      <div v-else-if="registros.length === 0" class="no-records">
        No hay registros de crudos.
      </div>
      <ul v-else>
        <li v-for="registro in paginatedRegistros" :key="registro.id" class="registro-item">
          <div class="registro-content" @click="editRegistro(registro.id)">
            <span class="registro-date">{{ formatDate(registro.fecha) }}</span>
            <div class="registro-summary">
              <div class="registro-entry">
                <span class="registro-label">Entradas:</span>
                <span class="registro-value">{{ formatNumber(registro.totalEntradas) }} kg</span>
              </div>
              <div class="registro-entry">
                <span class="registro-label">Salidas:</span>
                <span class="registro-value">{{ formatNumber(registro.totalSalidas) }} kg</span>
              </div>
            </div>
          </div>
          <div class="registro-actions">
            <button @click.stop="deleteRegistro(registro.id)" class="delete-btn">Borrar</button>
          </div>
        </li>
      </ul>
      
      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">Anterior</button>
        <span>Página {{ currentPage }} de {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">Siguiente</button>
      </div>
    </div>

    <!-- Modal para gestionar proveedores y medidas -->
    <GestionProveedoresCrudos 
      :mostrar="showGestionModal" 
      @cerrar="closeGestionarModal"
      @actualizado="onProveedoresActualizados"
    />
  </div>
</template>

<script>
import { formatDate } from '@/utils/dateUtils';
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import moment from 'moment';
import GestionProveedoresCrudos from '@/components/GestionProveedoresCrudos.vue';

export default {
  name: 'ExistenciasCrudos',
  components: {
    GestionProveedoresCrudos
  },
  data() {
    return {
      registros: [],
      existenciasPorProveedor: {},
      isLoadingRegistros: true,
      isLoadingExistencias: true,
      currentPage: 1,
      itemsPerPage: 10,
      showGestionModal: false,
      filtroCuarto: 'Todos los cuartos'
    };
  },
  computed: {
    paginatedRegistros() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.registros.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.registros.length / this.itemsPerPage);
    },
    totalGeneral() {
      return Object.values(this.existenciasFiltradasPorCuarto)
        .flat()
        .reduce((total, producto) => total + producto.kilos, 0);
    },

    valorTotalGeneral() {
      return Object.values(this.existenciasFiltradasPorCuarto)
        .flat()
        .reduce((total, producto) => total + producto.valor, 0);
    },

    tieneAlgunPrecioValido() {
      return Object.values(this.existenciasPorProveedor).some(productos => 
        productos.some(producto => producto.ultimoPrecio > 0 || producto.valor > 0)
      );
    },
    existenciasFiltradasPorCuarto() {
      if (this.filtroCuarto === 'Todos los cuartos') {
        return this.existenciasPorProveedor;
      }
      const filtradas = {};
      Object.entries(this.existenciasPorProveedor).forEach(([prov, productos]) => {
        const lista = productos.filter(p => p.cuarto === this.filtroCuarto);
        if (lista.length) filtradas[prov] = lista;
      });
      return filtradas;
    }
  },
  methods: {
    async loadRegistros() {
      try {
        this.isLoadingRegistros = true;
        const registrosCollection = collection(db, 'existenciasCrudos');
        const q = query(registrosCollection, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        this.registros = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let fecha;
          if (data.fecha instanceof Date) {
            fecha = moment(data.fecha).toDate();
          } else if (data.fecha && typeof data.fecha.toDate === 'function') {
            fecha = moment(data.fecha.toDate()).toDate();
          } else {
            fecha = moment(data.fecha).toDate();
          }
          
          return {
            id: doc.id,
            ...data,
            fecha: fecha,
            totalEntradas: data.totalEntradas || 0,
            totalSalidas: data.totalSalidas || 0
          };
        });
      } catch (error) {
        console.error("Error al cargar registros de crudos: ", error);
        this.registros = [];
      } finally {
        this.isLoadingRegistros = false;
      }
    },

    async loadExistencias() {
      try {
        this.isLoadingExistencias = true;
        const registrosSnapshot = await getDocs(collection(db, 'existenciasCrudos'));
        const existencias = {};
        const normalizeCuarto = (c) => {
          const valor = (c && c.trim()) ? c.trim() : 's/c';
          return valor.toLowerCase() === 'sin cuarto designado' ? 's/c' : valor;
        };

        // Procesar todos los registros para calcular existencias actuales
        const registrosOrdenados = registrosSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const fechaA = a.fecha instanceof Date ? a.fecha : a.fecha.toDate();
            const fechaB = b.fecha instanceof Date ? b.fecha : b.fecha.toDate();
            return fechaA - fechaB;
          });

        registrosOrdenados.forEach(registro => {
          // Procesar entradas
          if (registro.entradas) {
            registro.entradas.forEach(entrada => {
              if (!existencias[entrada.proveedor]) {
                existencias[entrada.proveedor] = {};
              }
              
              // Crear clave única usando producto + precio (si existe)
              const precioKey = entrada.precio ? entrada.precio.toString() : 'sin_precio';
              const cuarto = normalizeCuarto(entrada.cuartoFrio);
              const claveProducto = `${entrada.producto}_${precioKey}_${cuarto}`;
              
              if (!existencias[entrada.proveedor][claveProducto]) {
                existencias[entrada.proveedor][claveProducto] = {
                  nombre: entrada.producto,
                  kilos: 0,
                  ultimoPrecio: entrada.precio || 0,
                  proveedor: entrada.proveedor,
                  producto: entrada.producto,
                  cuarto: cuarto
                };
              }
              existencias[entrada.proveedor][claveProducto].kilos += entrada.kilos;
              if (entrada.precio) {
                existencias[entrada.proveedor][claveProducto].ultimoPrecio = entrada.precio;
              }
            });
          }

          // Procesar salidas
          if (registro.salidas) {
            registro.salidas.forEach(salida => {
              if (!existencias[salida.proveedor]) {
                existencias[salida.proveedor] = {};
              }
              
              // Para las salidas, necesitamos encontrar de qué precio específico se está sacando
              // Por ahora, usaremos el enfoque FIFO (First In, First Out) para determinar el precio
              const productosConMismoNombre = Object.keys(existencias[salida.proveedor])
                .filter(key => {
                  const prod = existencias[salida.proveedor][key];
                  return prod.producto === salida.producto && prod.cuarto === normalizeCuarto(salida.cuartoFrio);
                })
                .sort((a, b) => {
                  const precioA = existencias[salida.proveedor][a].ultimoPrecio;
                  const precioB = existencias[salida.proveedor][b].ultimoPrecio;
                  return precioA - precioB;
                });

              let kilosRestantes = salida.kilos;
              
              // Distribuir la salida entre los diferentes precios usando FIFO
              for (const claveProducto of productosConMismoNombre) {
                if (kilosRestantes <= 0) break;
                
                const producto = existencias[salida.proveedor][claveProducto];
                if (producto.kilos > 0) {
                  const kilosARestar = Math.min(kilosRestantes, producto.kilos);
                  producto.kilos -= kilosARestar;
                  kilosRestantes -= kilosARestar;
                }
              }
            });
          }
        });

        // Obtener precios actuales del historial para productos sin precio
        await this.actualizarPreciosDelHistorial(existencias);

        // Convertir a formato para mostrar y filtrar productos con kilos <= 0
        const existenciasFiltradas = {};
        Object.keys(existencias).forEach(proveedor => {
          const productos = Object.values(existencias[proveedor])
            .filter(producto => producto.kilos > 0)
            .map(producto => ({
              ...producto,
              clave: `${producto.producto}_${producto.ultimoPrecio}_${producto.cuarto}`,
              valor: producto.kilos * producto.ultimoPrecio
            }));
          
          if (productos.length > 0) {
            existenciasFiltradas[proveedor] = productos;
          }
        });

        this.existenciasPorProveedor = existenciasFiltradas;
      } catch (error) {
        console.error("Error al cargar existencias de crudos: ", error);
        this.existenciasPorProveedor = {};
      } finally {
        this.isLoadingExistencias = false;
      }
    },

    async actualizarPreciosDelHistorial(existencias) {
      try {
        const historialSnapshot = await getDocs(collection(db, 'historialPreciosCrudos'));
        const historialPorProducto = {};

        // Agrupar historial por proveedor y producto
        historialSnapshot.docs.forEach(doc => {
          const historial = doc.data();
          const clave = `${historial.proveedor}_${historial.medida}`;
          
          if (!historialPorProducto[clave]) {
            historialPorProducto[clave] = [];
          }
          
          historialPorProducto[clave].push({
            precio: historial.precio,
            fecha: historial.fecha instanceof Date ? historial.fecha : historial.fecha.toDate()
          });
        });

        // Ordenar por fecha y obtener el precio más reciente
        Object.keys(historialPorProducto).forEach(clave => {
          historialPorProducto[clave].sort((a, b) => b.fecha - a.fecha);
        });

        // Actualizar precios de productos sin precio usando el historial
        Object.keys(existencias).forEach(proveedor => {
          Object.keys(existencias[proveedor]).forEach(claveProducto => {
            const producto = existencias[proveedor][claveProducto];
            
            if (producto.ultimoPrecio === 0) {
              const claveHistorial = `${proveedor}_${producto.producto}`;
              
              if (historialPorProducto[claveHistorial] && historialPorProducto[claveHistorial].length > 0) {
                producto.ultimoPrecio = historialPorProducto[claveHistorial][0].precio;
              }
            }
          });
        });

      } catch (error) {
        console.error("Error al actualizar precios del historial: ", error);
      }
    },

    formatDate(date) {
      return moment(date).format('DD [de] MMMM [de] YYYY');
    },

    formatNumber(value) {
      return (value || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    formatearPrecio(precio) {
      return precio ? precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    },

    formatearValor(valor) {
      return valor ? valor.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0';
    },

    calcularTotalProveedor(productos) {
      return productos.reduce((total, producto) => total + producto.kilos, 0);
    },

    calcularTotalValorProveedor(productos) {
      return productos.reduce((total, producto) => total + producto.valor, 0);
    },

    tienePreciosValidos(productos) {
      return productos.some(producto => producto.ultimoPrecio > 0 || producto.valor > 0);
    },

    editRegistro(id) {
      this.$router.push(`/existencias-crudos/${id}`);
    },

    async deleteRegistro(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de crudos?')) {
        try {
          await deleteDoc(doc(db, 'existenciasCrudos', id));
          this.registros = this.registros.filter(registro => registro.id !== id);
          await this.loadExistencias(); // Recargar existencias después de borrar
          alert('Registro de crudos borrado con éxito');
        } catch (error) {
          console.error("Error al borrar el registro de crudos: ", error);
          alert('Error al borrar el registro de crudos');
        }
      }
    },

    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
      }
    },

    showGestionarModal() {
      this.showGestionModal = true;
    },

    closeGestionarModal() {
      this.showGestionModal = false;
    },

    imprimirReporte() {
      const fechaActual = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const estilos = `
        <style>
          @page { 
            size: A4 landscape; 
            margin: 0.5cm 0.5cm;
            @bottom-right {
              content: "Página " counter(page) " de " counter(pages);
              font-size: 11pt;
            }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 16pt;
            line-height: 1.2;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .header {
            margin-bottom: 15px;
            padding-bottom: 8px;
            text-align: center;
          }
          h1 {
            color: #3760b0;
            font-size: 26pt;
            margin: 0;
            padding: 0;
          }
          .fecha-reporte {
            font-size: 18pt;
            color: #666;
            margin-top: 5px;
          }
          .existencias-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-top: 15px;
          }
          .proveedor-card {
            background-color: white;
            border: 2px solid #3760b0;
            border-radius: 8px;
            padding: 12px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .proveedor-card h2 {
            color: #3760b0;
            font-size: 20pt;
            margin: 0 0 8px 0;
            padding-bottom: 6px;
            border-bottom: 2px solid #3760b0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th {
            background-color: #3760b0;
            color: white;
            text-align: left;
            padding: 6px;
            font-size: 14pt;
            border: 1px solid #3760b0;
          }
          td {
            padding: 5px 6px;
            font-size: 14pt;
            border: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .kilos-cell, .taras-cell, .precio-cell, .valor-cell {
            text-align: right;
            font-weight: bold;
          }
          .taras-cell {
            color: #3760b0;
          }
          .precio-cell {
            color: #2c3e50;
          }
          .valor-cell {
            color: #27ae60;
          }
          .total-proveedor {
            text-align: right;
            font-size: 14pt;
            color: #3760b0;
            font-weight: bold;
            margin-top: 8px;
          }
          .total-general {
            margin-top: 20px;
            text-align: center;
            background-color: #f0f4f8;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #3760b0;
          }
          .total-general h2 {
            color: #3760b0;
            font-size: 22pt;
            margin: 0;
          }
          @media print {
            .existencias-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
            }
            .proveedor-card {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .total-general {
              break-before: avoid;
              page-break-before: avoid;
            }
          }
        </style>
      `;

      let contenidoHTML = `
        ${estilos}
        <div class="header">
          <h1>Reporte de Existencias de Crudos</h1>
          <div class="fecha-reporte">Fecha: ${fechaActual}</div>
        </div>
        <div class="existencias-grid">
      `;

      Object.keys(this.existenciasPorProveedor).forEach(proveedor => {
        const productos = this.existenciasPorProveedor[proveedor];
        const mostrarPrecios = this.tienePreciosValidos(productos);
        
        contenidoHTML += `
          <div class="proveedor-card">
            <h2>${proveedor}</h2>
            <table>
              <thead>
                <tr>
                  <th>Medida</th>
                  <th>Kilos</th>
                  <th>Taras</th>
                  ${mostrarPrecios ? '<th>Precio</th>' : ''}
                  ${mostrarPrecios ? '<th>Valor</th>' : ''}
                </tr>
              </thead>
              <tbody>
        `;
        
        productos.forEach(producto => {
          contenidoHTML += `
            <tr>
              <td>${producto.nombre}</td>
              <td class="kilos-cell">${this.formatNumber(producto.kilos)}</td>
              <td class="taras-cell">${(producto.kilos / 19).toFixed(1)}</td>
              ${mostrarPrecios ? `<td class="precio-cell">$${this.formatearPrecio(producto.ultimoPrecio)}</td>` : ''}
              ${mostrarPrecios ? `<td class="valor-cell">$${this.formatearValor(producto.valor)}</td>` : ''}
            </tr>
          `;
        });

        contenidoHTML += `
              </tbody>
            </table>
            <div class="total-proveedor">
              <div>Total ${proveedor}: ${this.formatNumber(this.calcularTotalProveedor(productos))} kg</div>
              ${mostrarPrecios ? `<div>Valor Total: $${this.formatearValor(this.calcularTotalValorProveedor(productos))}</div>` : ''}
            </div>
          </div>
        `;
      });

      const mostrarValorTotal = Object.values(this.existenciasPorProveedor).some(productos => 
        this.tienePreciosValidos(productos)
      );

      contenidoHTML += `
        </div>
        <div class="total-general">
          <h2>Total General: ${this.formatNumber(this.totalGeneral)} kg</h2>
          ${mostrarValorTotal ? `<h2>Valor Total General: $${this.formatearValor(this.valorTotalGeneral)}</h2>` : ''}
        </div>
      `;

      const ventanaImpresion = window.open('', '_blank');
      ventanaImpresion.document.write(contenidoHTML);
      ventanaImpresion.document.close();
      
      setTimeout(() => {
        ventanaImpresion.print();
        ventanaImpresion.close();
      }, 250);
    },

    async onProveedoresActualizados() {
      // Recargar existencias cuando se actualicen los proveedores
      await this.loadExistencias();
    }
  },

  async mounted() {
    await Promise.all([
      this.loadRegistros(),
      this.loadExistencias()
    ]);
  }
};
</script>

<style scoped>
.existencias-crudos-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1, h2, h3 {
  color: #3760b0;
}

.actions-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  gap: 10px;
}

.action-button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  transition: background-color 0.3s;
}

.action-button:hover {
  background-color: #2a4a87;
}

.new-entrada-btn {
  background-color: #28a745;
}

.new-entrada-btn:hover {
  background-color: #218838;
}

.resumen-existencias {
  background-color: #f0f4f8;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.existencias-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.filters-cuarto {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.filters-cuarto select {
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.proveedor-card {
  background-color: white;
  border: 2px solid #3760b0;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.proveedor-card h3 {
  color: #3760b0;
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 12px;
  border-bottom: 2px solid #3760b0;
  padding-bottom: 8px;
}

.productos-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.productos-table th,
.productos-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.productos-table th {
  background-color: #3760b0;
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.productos-table tr:nth-child(even) {
  background-color: #f8f9fa;
}

.kilos-cell,
.taras-cell,
.precio-cell,
.valor-cell {
  text-align: right;
  font-weight: bold;
}

.taras-cell {
  color: #3760b0;
}

.precio-cell {
  color: #2c3e50;
}

.valor-cell {
  color: #27ae60;
}

.total-proveedor {
  text-align: right;
  color: #3760b0;
  font-size: 14px;
  font-weight: bold;
  margin-top: 10px;
}

.total-general {
  text-align: center;
  background-color: #f0f4f8;
  padding: 20px;
  border-radius: 8px;
  border: 2px solid #3760b0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.total-general h3 {
  color: #3760b0;
  font-size: 20px;
  margin: 5px 0;
}

.registros-list {
  background-color: #f0f4f8;
  border-radius: 8px;
  padding: 20px;
  flex-grow: 1;
}

.loading,
.no-records,
.no-existencias {
  text-align: center;
  color: #666;
  padding: 20px;
}

.registro-item {
  background-color: white;
  border-radius: 6px;
  margin-bottom: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.registro-content {
  flex-grow: 1;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.registro-date {
  color: #3760b0;
  font-weight: bold;
  font-size: 1.1em;
}

.registro-summary {
  display: flex;
  gap: 20px;
}

.registro-entry {
  display: flex;
  align-items: center;
  gap: 5px;
}

.registro-label {
  font-weight: bold;
  color: #3760b0;
}

.registro-value {
  font-weight: bold;
}

.registro-actions {
  display: flex;
  align-items: center;
}

.delete-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin-left: 15px;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.pagination button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin: 0 10px;
}

.pagination button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.pagination span {
  font-weight: bold;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 0;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #000;
}

.modal-body {
  padding: 20px;
}

@media (max-width: 1200px) {
  .existencias-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .existencias-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .actions-container {
    flex-direction: column;
  }

  .action-button {
    width: 100%;
    margin-bottom: 10px;
  }

  .existencias-grid {
    grid-template-columns: 1fr;
  }

  .registro-item {
    flex-direction: column;
    align-items: stretch;
    padding: 15px;
  }

  .registro-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .registro-summary {
    width: 100%;
    justify-content: space-between;
  }

  .registro-actions {
    margin-top: 15px;
    justify-content: flex-end;
  }
}
</style> 