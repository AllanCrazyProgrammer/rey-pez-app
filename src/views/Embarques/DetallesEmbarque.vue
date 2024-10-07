<template>
  <div class="detalles-embarque">
    <h1>Detalles del Embarque</h1>
    <div v-if="cargando" class="cargando">Cargando detalles del embarque...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="contenido-embarque">
      <div class="header">
        <div class="fecha-selector">
          <label for="fecha">Fecha de Embarque:</label>
          <input type="date" id="fecha" v-model="embarque.fecha" class="form-control" required>
        </div>
      </div>
      <form @submit.prevent="guardarCambios">
        <div v-for="(clienteProductos, clienteId) in productosPorCliente" :key="clienteId" class="cliente-grupo">
          <div class="cliente-header" :data-cliente="obtenerNombreCliente(clienteId)">
            <h3>{{ obtenerNombreCliente(clienteId) }}</h3>
          </div>
          <div class="productos-container">
            <div v-for="(producto, index) in clienteProductos" :key="index" class="producto">
              <h2 class="encabezado-medida">
                {{ producto.medida || 'Sin Medida' }} - {{ obtenerTipoProducto(producto) }}
              </h2>
              <div class="producto-header">
                <input 
                  type="text" 
                  v-model="producto.medida" 
                  class="form-control medida-input" 
                  placeholder="Medida"
                >
                <select 
                  v-model="producto.tipo" 
                  class="form-control tipo-select" 
                  @change="onTipoChange(producto)"
                  :class="{
                    'tipo-azul': producto.tipo === 'c/h20',
                    'tipo-verde': producto.tipo === 's/h20'
                  }"
                >
                  <option value="">Seleccionar</option>
                  <option value="s/h20">S/H20</option>
                  <option value="c/h20">C/H20</option>
                  <option value="otro">Otro</option>
                </select>
                <input 
                  v-if="producto.tipo === 'otro'"
                  type="text" 
                  v-model="producto.tipoPersonalizado" 
                  class="form-control tipo-input" 
                  placeholder="Especificar"
                >
              </div>
              <div class="sumas-verticales">
                <div class="columna">
                  <h5>Taras</h5>
                  <div v-for="(tara, taraIndex) in producto.taras" :key="taraIndex" class="input-group">
                    <input 
                      type="number" 
                      v-model.number="producto.taras[taraIndex]" 
                      class="form-control tara-input" 
                      placeholder="Tara"
                    >
                    <button type="button" @click="eliminarTara(producto, taraIndex)" class="btn btn-danger btn-sm">-</button>
                  </div>
                  <button type="button" @click="agregarTara(producto)" class="btn btn-success btn-sm agregar-tara">+</button>
                  <div class="total">Total: {{ totalTaras(producto) }}</div>
                </div>
                <div class="columna">
                  <h5>Kilos</h5>
                  <div v-for="(kilo, kiloIndex) in producto.kilos" :key="kiloIndex" class="input-group">
                    <input 
                      type="number" 
                      v-model.number="producto.kilos[kiloIndex]" 
                      class="form-control kilo-input" 
                      placeholder="Kilos"
                    >
                    <button type="button" @click="eliminarKilo(producto, kiloIndex)" class="btn btn-danger btn-sm">-</button>
                  </div>
                  <button type="button" @click="agregarKilo(producto)" class="btn btn-success btn-sm agregar-kilo">+</button>
                  <div class="total">Total: {{ totalKilos(producto) }}</div>
                </div>
              </div>
              <div class="reporte-taras-bolsas">
                <div class="reporte-item">
                  <h5>Taras</h5>
                  <div v-for="(tara, index) in producto.reporteTaras" :key="index" class="input-group mb-2">
                    <input 
                      type="text" 
                      v-model="producto.reporteTaras[index]" 
                      class="form-control reporte-input" 
                      placeholder="ej: 20x50"
                    >
                    <button type="button" @click="eliminarReporteTara(producto, index)" class="btn btn-danger btn-sm">-</button>
                  </div>
                  <button type="button" @click="agregarReporteTara(producto)" class="btn btn-success btn-sm">+</button>
                </div>
                <div class="reporte-item">
                  <h5>Bolsas</h5>
                  <div v-for="(bolsa, index) in producto.reporteBolsas" :key="index" class="input-group mb-2">
                    <input 
                      type="text" 
                      v-model="producto.reporteBolsas[index]" 
                      class="form-control reporte-input" 
                      placeholder="ej: 100x50"
                    >
                    <button type="button" @click="eliminarReporteBolsa(producto, index)" class="btn btn-danger btn-sm">-</button>
                  </div>
                  <button type="button" @click="agregarReporteBolsa(producto)" class="btn btn-success btn-sm">+</button>
                </div>
              </div>
            </div>
          </div>
          <button type="button" @click="agregarProducto(clienteId)" class="btn btn-primary btn-sm agregar-producto">Agregar Producto</button>
        </div>
        <button type="submit" class="btn btn-success btn-block guardar-cambios">Guardar Cambios</button>
        <button type="button" @click="generarResumenPDF" class="btn btn-info btn-block generar-pdf">Generar Resumen PDF</button>
      </form>
    </div>
  </div>
</template>

<script>
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default {
  name: 'DetallesEmbarque',
  data() {
    return {
      embarque: null,
      cargando: true,
      error: null,
      clientes: [
        { id: 1, nombre: 'Joselito' },
        { id: 2, nombre: 'Catarro' },
        { id: 3, nombre: 'Otilio' },
        { id: 4, nombre: 'Ozuna' },
      ],
    };
  },
  computed: {
    productosPorCliente() {
      if (!this.embarque || !this.embarque.clientes) return {};
      return this.embarque.clientes.reduce((acc, cliente) => {
        acc[cliente.id] = cliente.productos;
        return acc;
      }, {});
    },
  },
  methods: {
    async cargarEmbarque() {
      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', this.$route.params.id);
        const docSnap = await getDoc(embarqueRef);
        
        if (docSnap.exists()) {
          this.embarque = { id: docSnap.id, ...docSnap.data() };
          this.embarque.fecha = this.formatearFechaParaInput(this.embarque.fecha);
        } else {
          this.error = "No se encontró el embarque especificado.";
        }
        this.cargando = false;
      } catch (error) {
        console.error("Error al cargar los detalles del embarque:", error);
        this.error = "Hubo un error al cargar los detalles. Por favor, intente de nuevo más tarde.";
        this.cargando = false;
      }
    },
    formatearFechaParaInput(fecha) {
      if (!fecha) return '';
      const fechaObj = fecha.toDate ? fecha.toDate() : new Date(fecha);
      return fechaObj.toISOString().split('T')[0];
    },
    async guardarCambios() {
      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', this.embarque.id);
        await updateDoc(embarqueRef, this.embarque);
        alert("Cambios guardados con éxito");
      } catch (error) {
        console.error("Error al guardar los cambios:", error);
        alert("Hubo un error al guardar los cambios. Por favor, intente de nuevo.");
      }
    },
    obtenerNombreCliente(clienteId) {
      const cliente = this.clientes.find(c => c.id === parseInt(clienteId));
      return cliente ? cliente.nombre : 'Cliente Desconocido';
    },
    obtenerTipoProducto(producto) {
      if (producto.tipo === 'otro') {
        return producto.tipoPersonalizado || 'Otro';
      }
      return producto.tipo || 'Sin Tipo';
    },
    onTipoChange(producto) {
      if (producto.tipo !== 'otro') {
        producto.tipoPersonalizado = '';
      }
    },
    agregarProducto(clienteId) {
      const clienteIndex = this.embarque.clientes.findIndex(c => c.id === clienteId);
      if (clienteIndex !== -1) {
        this.embarque.clientes[clienteIndex].productos.push({
          medida: '',
          tipo: '',
          tipoPersonalizado: '',
          taras: [],
          kilos: [],
          reporteTaras: [],
          reporteBolsas: [],
        });
      }
    },
    agregarTara(producto) {
      producto.taras.push(null);
    },
    eliminarTara(producto, index) {
      producto.taras.splice(index, 1);
    },
    agregarKilo(producto) {
      producto.kilos.push(null);
    },
    eliminarKilo(producto, index) {
      producto.kilos.splice(index, 1);
    },
    totalTaras(producto) {
      return producto.taras.reduce((sum, tara) => sum + (tara || 0), 0);
    },
    totalKilos(producto) {
      const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (kilo || 0), 0);
      const sumaTaras = this.totalTaras(producto);
      const descuentoTaras = sumaTaras * 3;
      return sumaKilos - descuentoTaras;
    },
    agregarReporteTara(producto) {
      if (!Array.isArray(producto.reporteTaras)) {
        producto.reporteTaras = [];
      }
      producto.reporteTaras.push('');
    },
    eliminarReporteTara(producto, index) {
      producto.reporteTaras.splice(index, 1);
    },
    agregarReporteBolsa(producto) {
      if (!Array.isArray(producto.reporteBolsas)) {
        producto.reporteBolsas = [];
      }
      producto.reporteBolsas.push('');
    },
    eliminarReporteBolsa(producto, index) {
      producto.reporteBolsas.splice(index, 1);
    },
    generarResumenPDF() {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;

      const calcularAlturaTotal = () => {
        let altura = 30;
        Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
          altura += 14;
          altura += Math.ceil(productos.length / 3) * 70;
          altura += 5;
        });
        return altura;
      };

      const alturaTotal = calcularAlturaTotal();
      const escala = Math.min(1, (pageHeight - 2 * margin) / alturaTotal);
      const padding = 5 * escala;

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text('Resumen de Embarque', 14, 15 * escala);

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      const fechaEmbarque = this.embarque.fecha ? new Date(this.embarque.fecha) : null;
      const fechaFormateada = fechaEmbarque ? fechaEmbarque.toLocaleDateString() : 'Fecha no especificada';
      doc.text(`Fecha: ${fechaFormateada}`, 14, 25 * escala);

      let yPos = 35 * escala;
      const productWidth = (pageWidth - 2 * margin) / 3;

      Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
        const nombreCliente = this.obtenerNombreCliente(clienteId);
        const clienteColor = this.getClienteColor(nombreCliente);
        doc.setFillColor(clienteColor);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 10 * escala, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Cliente: ${nombreCliente}`, margin + 2, yPos + 7 * escala);
        yPos += 14 * escala;

        let xPos = margin;
        productos.forEach((producto, index) => {
          if (index > 0 && index % 3 === 0) {
            xPos = margin;
            yPos += 60 * escala;
          }

          doc.setDrawColor(0);
          doc.setFillColor(240, 240, 240);
          doc.roundedRect(xPos, yPos, productWidth - 2, 55 * escala, 2, 2, 'FD');

          doc.setTextColor(0);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          const medida = producto.medida || 'Sin medida';
          const tipo = this.obtenerTipoProducto(producto);
          
          if (producto.tipo === 'c/h20') {
            doc.setTextColor(0, 0, 255);
          } else {
            doc.setTextColor(0);
          }
          
          doc.text(`${medida} - ${tipo}`, xPos + padding, yPos + padding + 6 * escala);

          doc.setTextColor(0);
          doc.setFontSize(15);
          doc.setFont("helvetica", "normal");
          doc.text(`Taras: ${this.totalTaras(producto)} | Kilos: ${this.totalKilos(producto)}`, xPos + padding, yPos + padding + 15 * escala);

          const tarasBolsas = producto.reporteTaras.map((tara, i) => {
            const bolsa = producto.reporteBolsas[i] || '';
            return `(${tara}-${bolsa})`;
          }).join(' ');
          doc.setFontSize(14);
          const splitTarasBolsas = doc.splitTextToSize(tarasBolsas, productWidth - 4 - padding * 2);
          doc.text(splitTarasBolsas, xPos + padding, yPos + padding + 23 * escala);

          xPos += productWidth;
        });

        yPos += 65 * escala;
      });

      doc.save('resumen-embarque.pdf');
    },
    getClienteColor(nombreCliente) {
      const colores = {
        'Joselito': '#3498db',
        'Catarro': '#e74c3c',
        'Otilio': '#f1c40f',
        'Ozuna': '#2ecc71'
      };
      return colores[nombreCliente] || '#95a5a6';
    },
  },
  mounted() {
    this.cargarEmbarque();
  }
};
</script>

<style scoped>
.detalles-embarque {
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f9f9f9;
  min-height: 100vh;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.fecha-selector {
  display: flex;
  flex-direction: column;
}

.fecha-selector label {
  margin-bottom: 5px;
  font-weight: bold;
}

.form-control {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.cliente-grupo {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.cliente-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 10px;
}

.cliente-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
}

.cliente-header[data-cliente="Joselito"] {
  background-color: #3498db;
}

.cliente-header[data-cliente="Catarro"] {
  background-color: #e74c3c;
}

.cliente-header[data-cliente="Otilio"] {
  background-color: #f1c40f;
}

.cliente-header[data-cliente="Ozuna"] {
  background-color: #2ecc71;
}

.cliente-header[data-cliente="Joselito"] h3,
.cliente-header[data-cliente="Catarro"] h3,
.cliente-header[data-cliente="Ozuna"] h3 {
  color: #ffffff;
}

.cliente-header[data-cliente="Otilio"] h3 {
  color: #34495e;
}

.productos-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.producto {
  background-color: #fefefe;
  border: 2px solid #000000;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.producto:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.producto-header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
}

.medida-input {
  flex: 1;
  min-width: 80px;
  padding: 8px;
  font-size: 1rem;
  font-weight: bold;
  border: 2px solid #007bff;
  border-radius: 5px;
  background-color: #eceef1;
}

.tipo-select {
  flex: 2;
  min-width: 120px;
  padding: 8px;
  font-size: 1rem;
  font-weight: bold;
  border: 2px solid #28a745;
  border-radius: 5px;
  background-color: #e8f5e9;
  transition: border-color 0.3s, background-color 0.3s;
}

.tipo-select.tipo-azul {
  background-color: #d0e7ff;
  border-color: #0056b3;
}

.tipo-select.tipo-verde {
  background-color: #e8f5e9;
  border-color: #28a745;
}

.tipo-select:focus {
  outline: none;
  border-color: #0056b3;
  background-color: #d0e7ff;
}

.tipo-input {
  flex: 2;
  min-width: 120px;
  max-width: 200px;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.sumas-verticales {
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
  margin-bottom: 20px;
}

.columna {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.columna h5 {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #333;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tara-input, .kilo-input, .reporte-input {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.input-group button {
  padding: 8px 12px;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
}

.agregar-tara, .agregar-kilo, .agregar-producto {
  width: 100%;
  padding: 10px;
  font-size: 1rem;
  border-radius: 5px;
}

.agregar-tara, .agregar-kilo {
  background-color: #28a745;
  color: #fff;
}

.agregar-tara:hover, .agregar-kilo:hover {
  background-color: #218838;
}

.agregar-producto {
  background-color: #007bff;
  color: #fff;
}

.agregar-producto:hover {
  background-color: #0056b3;
}

.total {
  font-weight: bold;
  margin-top: 10px;
  border-top: 2px solid #ddd;
  padding-top: 5px;
  color: #333;
}

.reporte-taras-bolsas {
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
  margin-bottom: 20px;
}

.reporte-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.reporte-item h5 {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #333;
}

.guardar-cambios {
  background-color: #28a745;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
  margin-top: 20px;
}

.guardar-cambios:hover {
  background-color: #218838;
}

.generar-pdf {
  background-color: #17a2b8;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
  margin-top: 20px;
}

.generar-pdf:hover {
  background-color: #138496;
}

@media (min-width: 768px) and (max-width: 1024px) {
  .productos-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .producto {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }

  .reporte-taras-bolsas {
    flex-direction: row;
  }

  .reporte-item {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

@media (max-width: 767px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .productos-container {
    flex-direction: column;
  }

  .producto {
    width: 100%;
  }

  .sumas-verticales {
    flex-direction: column;
    gap: 15px;
  }

  .reporte-taras-bolsas {
    flex-direction: column;
    gap: 15px;
  }

  .reporte-item {
    width: 100%;
  }

  .cliente-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .agregar-tara, .agregar-kilo, .agregar-producto, .guardar-cambios, .generar-pdf {
    font-size: 1rem;
  }
}

@media (min-width: 1025px) {
  .productos-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .producto {
    flex: 0 0 calc(25% - 15px);
    max-width: calc(25% - 15px);
  }

  .reporte-taras-bolsas {
    flex-direction: row;
  }

  .reporte-item {
    flex: 0 0 calc(50% - 10px);
    max-width: calc(50% - 10px);
  }
}

.encabezado-medida {
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
}

@media (max-width: 767px) {
  .encabezado-medida {
    font-size: 1.2rem;
  }
}

.cargando, .error {
  text-align: center;
  padding: 20px;
  font-size: 18px;
  color: #333;
}

.error {
  color: #d9534f;
}
</style>