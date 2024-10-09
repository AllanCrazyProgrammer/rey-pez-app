<template>
  <div class="nuevo-embarque">
    <h1>{{ modoEdicion ? 'Editar Embarque' : 'Nuevo Embarque' }}</h1>
    <div class="botones">
      <button @click="volverAListaEmbarques" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver a Lista de Embarques
      </button>
    </div>
    <div class="header">
      <div class="fecha-selector">
        <label for="fecha">Fecha de Embarque:</label>
        <input type="date" id="fecha" v-model="embarque.fecha" class="form-control" required>
      </div>
      <div class="botones-undo-redo">
        <button type="button" @click="undo" :disabled="undoStack.length <= 1" class="btn btn-secondary btn-sm">Deshacer</button>
        <button type="button" @click="redo" :disabled="redoStack.length === 0" class="btn btn-secondary btn-sm">Rehacer</button>
      </div>
    </div>
    <form @submit.prevent="guardarEmbarque">
      <div v-for="(clienteProductos, clienteId) in productosPorCliente" :key="clienteId" class="cliente-grupo">
        <div class="cliente-header" :data-cliente="obtenerNombreCliente(clienteId)">
          <h3>{{ obtenerNombreCliente(clienteId) }}</h3>
          <button type="button" @click="eliminarCliente(clienteId)" class="btn btn-danger btn-sm eliminar-cliente">Eliminar Cliente</button>
        </div>
        <div class="productos-container">
          <div v-for="(producto, index) in clienteProductos" :key="index" class="producto">
            <!-- Encabezado de la medida y selección -->
            <h2 class="encabezado-medida">
              {{ producto.medida || 'Sin Medida' }} - {{ obtenerTipoProducto(producto) }}
            </h2>
            <div class="producto-header">
              <input 
                type="text" 
                v-model="producto.medida" 
                class="form-control medida-input" 
                placeholder="Medida"                
                :size="producto.medida.length || 1"
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
              <button type="button" @click="eliminarProducto(producto)" class="btn btn-danger btn-sm eliminar-producto">X</button>
            </div>
            <div class="sumas-verticales">
              <div class="columna">
                <div class="taras-header">
                  <h5>Taras</h5>
                  <div class="checkbox-container">
                    <input type="checkbox" id="restarTaras" v-model="producto.restarTaras">
                    <label for="restarTaras">-3</label>
                  </div>
                </div>
                <div v-for="(tara, taraIndex) in producto.taras" :key="taraIndex" class="input-group">
                  <input 
            
                    v-model.number="producto.taras[taraIndex]" 
                    class="form-control tara-input" 
                    placeholder="Tara"
                    :size="String(producto.taras[taraIndex] || '').length || 1"
                    inputmode="numeric"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarTara(producto, taraIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <div v-for="(taraExtra, taraExtraIndex) in producto.tarasExtra" :key="'extra-' + taraExtraIndex" class="input-group">
                  <input 
                    v-model.number="producto.tarasExtra[taraExtraIndex]" 
                    class="form-control tara-input tara-extra-input" 
                    placeholder="Tara Extra"
                    :size="String(producto.tarasExtra[taraExtraIndex] || '').length || 1"
                    inputmode="numeric"
                    pattern="[0-9]*"
                  >
                  <button type="button" @click="eliminarTaraExtra(producto, taraExtraIndex)" class="btn btn-danger btn-sm">-</button>
                </div>
                <div class="botones-tara">
                  <button type="button" @click="agregarTara(producto)" class="btn btn-success btn-sm agregar-tara">+</button>
                  <button type="button" @click="agregarTaraExtra(producto)" class="btn btn-warning btn-sm agregar-tara-extra">+ Extra</button>
                </div>
                <div class="total">Total: {{ totalTaras(producto) }}</div>
              </div>
              <div class="columna">
                <h5>Kilos</h5>
                <div v-for="(kilo, kiloIndex) in producto.kilos" :key="kiloIndex" class="input-group">
                  <input 
                    v-model.number="producto.kilos[kiloIndex]" 
                    class="form-control kilo-input" 
                    placeholder="Kilos"
                    :size="String(producto.kilos[kiloIndex] || '').length || 1"
                    inputmode="numeric"
                    pattern="[0-9]*"
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
                    inputmode="numeric"
                  >
                  <button type="button" @click="eliminarReporteTara(producto, index)" class="btn btn-danger btn-sm">-</button>
                </div>
                <button type="button" @click="agregarReporteTara(producto)" class="btn btn-success btn-sm">+</button>
                <div class="total-taras-reporte" :class="{ 'coincide': coincideTaras(producto), 'no-coincide': !coincideTaras(producto) }">
                   Reportadas: {{ totalTarasReportadas(producto) }}
                </div>
              </div>
              <div class="reporte-item">
                <h5>Bolsas</h5>
                <div v-for="(bolsa, index) in producto.reporteBolsas" :key="index" class="input-group mb-2">
                  <input 
                    type="text" 
                    v-model="producto.reporteBolsas[index]" 
                    class="form-control reporte-input" 
                    inputmode="numeric"
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
      <div class="cliente-selector">
        <div class="row align-items-center">
          <div class="col-12 col-md-8">
            <select v-model="nuevoClienteId" class="form-control">
              <option value="">Seleccione un cliente</option>
              <option v-for="cliente in clientes" :key="cliente.id" :value="cliente.id">
                {{ cliente.nombre }}
              </option>
            </select>
          </div>
          <div class="col-12 col-md-4 mt-2 mt-md-0">
            <button type="button" @click="agregarClienteProducto" class="btn btn-primary btn-block agregar-cliente">Agregar Cliente</button>
          </div>
        </div>
      </div>
      <button type="submit" class="btn btn-success btn-block crear-embarque">{{ modoEdicion ? 'Actualizar Embarque' : 'Guardar Embarque' }}</button>
      <button type="button" @click="generarResumenPDF" class="btn btn-info btn-block generar-pdf">Generar Resumen PDF</button>
    </form>
    <div class="cambios">
      <h4>Cambios:</h4>
      <ul>
        <li v-for="(cambio, index) in cambios" :key="index">{{ cambio }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { debounce } from 'lodash';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default {
  name: 'NuevoEmbarque',
  data() {
    return {
      clientes: [
        { id: 1, nombre: 'Joselito' },
        { id: 2, nombre: 'Catarro' },
        { id: 3, nombre: 'Otilio' },
        { id: 4, nombre: 'Ozuna' },
      ],
      embarque: {
        fecha: '',
        productos: [],
      },
      nuevoClienteId: '',
      undoStack: [],
      redoStack: [],
      isUndoRedo: false,
      cambios: [],
      producto: {
        reporteTaras: [],
        reporteBolsas: []
      },
      embarqueId: null,
      modoEdicion: false,
      guardadoAutomaticoActivo: false,
    };
  },
  methods: {
    agregarProducto(clienteId) {
      this.embarque.productos.push({
        clienteId,
        medida: '',
        tipo: '',
        tipoPersonalizado: '',
        taras: [],
        kilos: [],
        reporteTaras: [],
        reporteBolsas: [],
        tarasExtra: [], // Añade esta línea
      });
    },
    eliminarProducto(producto) {
      const index = this.embarque.productos.indexOf(producto);
      if (index > -1) {
        this.embarque.productos.splice(index, 1);
      }
    },
    agregarClienteProducto() {
      if (this.nuevoClienteId) {
        this.agregarProducto(this.nuevoClienteId);
        this.nuevoClienteId = '';
      }
    },
    eliminarCliente(clienteId) {
      // Filtrar los productos para eliminar los del cliente seleccionado
      this.embarque.productos = this.embarque.productos.filter(p => p.clienteId !== clienteId);
      
      // Actualizar el estado para reflejar los cambios
      this.$forceUpdate();

      // Opcional: Agregar un mensaje a la lista de cambios
      this.cambios.push(`Cliente ${this.obtenerNombreCliente(clienteId)} eliminado`);
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
      const tarasNormales = producto.taras.reduce((sum, tara) => sum + (tara || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
      return tarasNormales + tarasExtra;
    },
    totalKilos(producto) {
      const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (kilo || 0), 0);
      const sumaTarasNormales = producto.taras.reduce((sum, tara) => sum + (tara || 0), 0);
      const descuentoTaras = producto.restarTaras ? 0 : sumaTarasNormales * 3;
      return Number((sumaKilos - descuentoTaras).toFixed(1));
    },
    obtenerNombreCliente(clienteId) {
      const cliente = this.clientes.find(c => c.id === parseInt(clienteId));
      return cliente ? cliente.nombre : 'Cliente Desconocido';
    },
    async cargarEmbarque(id) {
      if (id === 'nuevo') {
        this.resetearEmbarque();
        return;
      }

      const db = getFirestore();
      const embarqueRef = doc(db, "embarques", id);
      const embarqueDoc = await getDoc(embarqueRef);

      if (embarqueDoc.exists()) {
        const data = embarqueDoc.data();
        let fecha;
        if (data.fecha && typeof data.fecha.toDate === 'function') {
          // Es un Timestamp de Firestore
          fecha = data.fecha.toDate();
        } else if (data.fecha instanceof Date) {
          // Ya es un objeto Date
          fecha = data.fecha;
        } else if (typeof data.fecha === 'string') {
          // Es una cadena, intentamos convertirla a Date
          fecha = new Date(data.fecha);
        } else {
          // Si no podemos determinar el tipo, usamos la fecha actual
          console.warn('Formato de fecha no reconocido, usando la fecha actual');
          fecha = new Date();
        }

        this.embarque = {
          fecha: fecha.toISOString().split('T')[0],
          productos: data.clientes.flatMap(cliente =>
            cliente.productos.map(producto => ({
              ...producto,
              clienteId: cliente.id,
            }))
          ),
        };
        this.embarqueId = id;
        this.modoEdicion = true;
        this.guardadoAutomaticoActivo = true;
      } else {
        console.error("No se encontró el embarque");
        this.resetearEmbarque();
      }
    },
    resetearEmbarque() {
      this.embarque = {
        fecha: '',
        productos: [],
      };
      this.embarqueId = null;
      this.modoEdicion = false;
      this.guardadoAutomaticoActivo = false;
    },
    guardarCambiosEnTiempoReal: debounce(async function() {
      if (!this.guardadoAutomaticoActivo || !this.embarqueId) return;

      const embarqueData = this.prepararDatosEmbarque();
      const db = getFirestore();
      
      try {
        await updateDoc(doc(db, "embarques", this.embarqueId), embarqueData);
        console.log('Cambios guardados automáticamente:', new Date().toLocaleString());
        // Opcional: Mostrar una notificación al usuario
        this.$emit('guardado-automatico');
      } catch (error) {
        console.error("Error al guardar automáticamente:", error);
        // Opcional: Notificar al usuario sobre el error
      }
    }, 2000),

    async guardarEmbarque() {
      if (!this.embarque.fecha) {
        alert('Por favor, seleccione una fecha para el embarque.');
        return;
      }

      const embarqueData = this.prepararDatosEmbarque();
      const db = getFirestore();

      try {
        if (this.modoEdicion) {
          await updateDoc(doc(db, "embarques", this.embarqueId), embarqueData);
          alert('Embarque actualizado exitosamente.');
        } else {
          const docRef = await addDoc(collection(db, "embarques"), embarqueData);
          this.embarqueId = docRef.id;
          alert('Embarque creado exitosamente y guardado en la base de datos.');
          this.modoEdicion = true;
        }
        this.guardadoAutomaticoActivo = true;
        this.$router.push('/lista-embarques');
      } catch (error) {
        console.error("Error al guardar el embarque: ", error);
        alert('Hubo un error al guardar el embarque. Por favor, intente nuevamente.');
      }
    },
    prepararDatosEmbarque() {
      const embarqueData = {
        fecha: new Date(this.embarque.fecha),
        clientes: []
      };

      Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
        const clienteData = {
          id: clienteId,
          nombre: this.obtenerNombreCliente(clienteId),
          productos: productos.map(producto => ({
            medida: producto.medida,
            tipo: producto.tipo,
            tipoPersonalizado: producto.tipoPersonalizado,
            taras: producto.taras,
            kilos: producto.kilos,
            reporteTaras: producto.reporteTaras,
            reporteBolsas: producto.reporteBolsas,
            totalTaras: this.totalTaras(producto),
            totalKilos: this.totalKilos(producto)
          }))
        };
        embarqueData.clientes.push(clienteData);
      });

      return embarqueData;
    },
    onTipoChange(producto) {
      if (producto.tipo !== 'otro') {
        producto.tipoPersonalizado = '';
      }
    },
    undo() {
      if (this.undoStack.length > 1) { // Asegura que haya al menos un estado previo
        // Obtener el estado actual y moverlo al redoStack
        const estadoActual = this.undoStack.pop();
        this.redoStack.push(estadoActual);
        // Obtener el estado anterior del undoStack
        const estadoAnterior = this.undoStack[this.undoStack.length - 1];
        this.isUndoRedo = true; // Indicar que se está realizando una operación de Undo
        this.embarque = JSON.parse(estadoAnterior);
        console.log('Undo realizado. Estado actual restaurado.');
      } else {
        console.log('No hay más acciones para deshacer.');
      }
    },
    redo() {
      if (this.redoStack.length > 0) {
        // Obtener el último estado del redoStack
        const estadoRehacer = this.redoStack.pop();
        this.undoStack.push(estadoRehacer);
        this.isUndoRedo = true; // Indicar que se está realizando una operación de Redo
        this.embarque = JSON.parse(estadoRehacer);
        console.log('Redo realizado. Estado actual restaurado.');
      } else {
        console.log('No hay más acciones para rehacer.');
      }
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
    obtenerTipoProducto(producto) {
      if (producto.tipo === 'otro') {
        return producto.tipoPersonalizado || 'Otro';
      }
      return producto.tipo || 'Sin Tipo';
    },
    generarResumenPDF() {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;

      // Función para calcular la altura total del contenido
      const calcularAlturaTotal = () => {
        let altura = 30; // Aumentamos la altura inicial para el título y la fecha
        Object.entries(this.productosPorCliente).forEach(([clienteId, productos]) => {
          altura += 14; // Altura para el encabezado del cliente
          altura += Math.ceil(productos.length / 3) * 70; // Altura para los productos (3 por fila) + espacio entre filas
          altura += 5; // Espacio entre clientes
        });
        return altura;
      };

      // Calcular el factor de escala
      const alturaTotal = calcularAlturaTotal();
      const escala = Math.min(1, (pageHeight - 2 * margin) / alturaTotal);

      // Definir padding después de calcular escala
      const padding = 5 * escala; // Padding para cada producto

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text('Resumen de Embarque', 14, 15 * escala);

      // Agregar la fecha del embarque (corregida)
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      const fechaEmbarque = this.embarque.fecha ? new Date(this.embarque.fecha + 'T00:00:00') : null;
      const fechaFormateada = fechaEmbarque ? fechaEmbarque.toLocaleDateString() : 'Fecha no especificada';
      doc.text(`Fecha: ${fechaFormateada}`, 14, 25 * escala);

      let yPos = 35 * escala; // Ajustamos la posicin inicial para el contenido
      const productWidth = (pageWidth - 2 * margin) / 3; // 3 productos por fila

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
          
          // Dibujar el cuadro con padding
          doc.roundedRect(xPos, yPos, productWidth - 2, 55 * escala, 2, 2, 'FD');

          doc.setTextColor(0);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          const medida = producto.medida || 'Sin medida';
          const tipo = this.obtenerTipoProducto(producto);
          
          if (producto.tipo === 'c/h20') {
            doc.setTextColor(0, 0, 255); // Azul
          } else {
            doc.setTextColor(0); // Negro (por defecto)
          }
          
          // Centrar el contenido
          const centrarTexto = (texto, y) => {
            const textWidth = doc.getStringUnitWidth(texto) * doc.internal.getFontSize() / doc.internal.scaleFactor;
            const textX = xPos + (productWidth - textWidth) / 2;
            doc.text(texto, textX, y);
          };

          // Título del producto (medida y tipo)
          centrarTexto(`${medida}- ${tipo}`, yPos + padding + 6 * escala);

          // Taras y Kilos
          doc.setTextColor(0);
          doc.setFontSize(15);
          doc.setFont("helvetica", "normal");
          
          centrarTexto(`${this.totalTaras(producto)} - ${this.totalKilos(producto)}`, yPos + padding + 15 * escala + 0.5);

          // Reporte de Taras y Bolsas
          const tarasBolsasCombinadas = this.combinarTarasBolsas(producto.reporteTaras, producto.reporteBolsas);
          
          doc.setFontSize(14);
          const splitTarasBolsas = doc.splitTextToSize(tarasBolsasCombinadas, productWidth - 4 - padding * 2);
          
          // Centrar cada línea del reporte de taras y bolsas
          splitTarasBolsas.forEach((linea, idx) => {
            centrarTexto(linea, yPos + padding + 23 * escala + 0.5 + (idx * 5 * escala));
          });

          xPos += productWidth;
        });

        yPos += 65 * escala; // Espacio entre clientes
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
      return colores[nombreCliente] || '#95a5a6'; // Color por defecto
    },
    volverAListaEmbarques() {
      // Navegar de vuelta a la lista de embarques
      this.$router.push({ name: 'ListaEmbarques' });
    },
    combinarTarasBolsas(taras, bolsas) {
      const combinado = {};
      
      taras.forEach((tara, index) => {
        const bolsa = bolsas[index] || '';
        const [cantidad, medida] = tara.split('-');
        const key = medida ? `${medida}-${bolsa}` : bolsa;
        combinado[key] = (combinado[key] || 0) + parseInt(cantidad || 1);
      });

      return Object.entries(combinado)
        .map(([key, count]) => `(${count}-${key})`)
        .join(' ');
    },
    totalTarasReportadas(producto) {
      return producto.reporteTaras.reduce((total, tara) => {
        const [cantidad] = tara.split('-');
        return total + (parseInt(cantidad) || 0);
      }, 0);
    },

    coincideTaras(producto) {
      const totalReportadas = this.totalTarasReportadas(producto);
      const totalRegistradas = this.totalTaras(producto);
      return totalReportadas === totalRegistradas;
    },
    agregarTaraExtra(producto) {
      if (!Array.isArray(producto.tarasExtra)) {
        this.$set(producto, 'tarasExtra', []);
      }
      producto.tarasExtra.push(null);
    },
    eliminarTaraExtra(producto, index) {
      producto.tarasExtra.splice(index, 1);
    },
  },
  computed: {
    productosPorCliente() {
      return this.embarque.productos.reduce((acc, producto) => {
        if (!acc[producto.clienteId]) {
          acc[producto.clienteId] = [];
        }
        acc[producto.clienteId].push(producto);
        return acc;
      }, {});
    },
  },
  created() {
    const embarqueId = this.$route.params.id;
    this.cargarEmbarque(embarqueId);
    this.undoStack.push(JSON.stringify(this.embarque));
    console.log('Component mounted. Estado inicial cargado.');
  },
  watch: {
    embarque: {
      handler(nuevoValor) {
        if (this.isUndoRedo) {
          this.isUndoRedo = false;
          return;
        }
        localStorage.setItem('embarque', JSON.stringify(nuevoValor));
        this.undoStack.push(JSON.stringify(nuevoValor));
        this.redoStack = [];
        console.log('Embarque actualizado. Estado agregado al undoStack.');
        
        // Llamar al método de guardado automático
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.nuevo-embarque {
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

.botones-undo-redo {
  display: flex;
  gap: 10px;
}

.botones-undo-redo button {
  flex: 1;
  padding: 12px;
  font-size: 1rem;
  border-radius: 5px;
}

.botones-undo-redo button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.cliente-header[data-cliente="Joselito"] h3 {
  color: #ffffff;
}

.cliente-header[data-cliente="Catarro"] {
  background-color: #e74c3c;
}

.cliente-header[data-cliente="Catarro"] h3 {
  color: #ffffff;
}

.cliente-header[data-cliente="Otilio"] {
  background-color: #f1c40f;
}

.cliente-header[data-cliente="Otilio"] h3 {
  color: #34495e;
}

.cliente-header[data-cliente="Ozuna"] {
  background-color: #2ecc71;
}

.cliente-header[data-cliente="Ozuna"] h3 {
  color: #ffffff;
}

.eliminar-cliente {
  padding: 8px 12px;
  font-size: 0.9rem;
}

.productos-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.producto {
  background-color: #fefefe;
  border: 2px solid #000000; /* Borde negro */
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

.eliminar-producto {
  padding: 8px 12px;
  font-size: 0.9rem;
  background-color: #dc3545;
  border: none;
  border-radius: 5px;
  color: #fff;
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

.reporte-input {
  flex: 1;
  padding: 8px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.cambios {
  background-color: #fff;
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-top: 30px;
}

.cambios h4 {
  margin-bottom: 10px;
  color: #333;
}

.cambios ul {
  list-style-type: disc;
  padding-left: 20px;
  color: #555;
}

.cliente-selector {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.cliente-selector .btn-block {
  width: 100%;
}

.crear-embarque {
  background-color: #28a745;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
}

.crear-embarque:hover {
  background-color: #218838;
}

.btn {
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #007bff;
  border: none;
  color: #fff;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  border: none;
  color: #fff;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-danger {
  background-color: #dc3545;
  border: none;
  color: #fff;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-success {
  background-color: #28a745;
  border: none;
  color: #fff;
}

.btn-success:hover {
  background-color: #218838;
}

/* Media Queries para Responsividad en iPad */
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

/* Media Queries para Dispositivos Móviles */
@media (max-width: 767px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .botones-undo-redo {
    width: 100%;
    gap: 10px;
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

  .eliminar-cliente, .eliminar-producto {
    width: 100%;
    text-align: center;
  }

  .agregar-tara, .agregar-kilo, .agregar-producto, .crear-embarque {
    font-size: 1rem;
    padding: 12px;
  }
}

/* Añadir esta media query al final de la sección <style> */

@media (min-width: 1025px) {
  .productos-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 20px;
  }

  .producto {
    flex: 0 0 calc(25% - 15px); /* Cuatro por fila con espacio */
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
  font-size: 1.5rem; /* Tamaño de fuente grande */
  font-weight: bold;
  margin-bottom: 15px;
}

/* Opcional: Ajustes para dispositivos móviles */
@media (max-width: 767px) {
  .encabezado-medida {
    font-size: 1.2rem;
  }
}

.generar-pdf {
  background-color: #17a2b8;
  color: #fff;
  padding: 15px;
  font-size: 1.2rem;
  border: none;
  border-radius: 5px;
  margin-top: 20px;
  margin-bottom: 20px;
}

.generar-pdf:hover {
  background-color: #138496;
}

.btn-secondary {
  margin-right: 10px;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  margin-bottom: 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  text-decoration: none;
  transition: background-color 0.3s ease;
  cursor: pointer;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-volver i {
  margin-right: 10px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.checkbox-container input[type="checkbox"] {
  margin-right: 5px;
  width: 15px; /* Aumentamos el ancho */
  height: 15px; /* Aumentamos la altura */
  cursor: pointer; /* Añadimos cursor pointer para mejor interactividad */
}

.checkbox-container label {
  font-size: 0.9rem;
  color: #555;
  cursor: pointer; /* Añadimos cursor pointer también a la etiqueta */
}

.taras-header {
  display: flex;
  justify-content: center;
  align-items: center;
}

.total-taras-reporte {
  margin-top: 10px;
  font-weight: bold;
  padding: 5px;
  border-radius: 5px;
}

.total-taras-reporte.coincide {
  background-color: #d4edda;
  color: #155724;
}

.total-taras-reporte.no-coincide {
  background-color: #f8d7da;
  color: #721c24;
}

.agregar-tara-extra {
  background-color: #ffa500;
  color: #fff;
  margin-top: 1px; /* Ajuste del margen superior a 1px */
}

.agregar-tara-extra:hover {
  background-color: #ff8c00;
}

.tara-extra-input {
  border-color: #ffa500;
  border-width: 2px;
}

.tara-extra-input:focus {
  border-color: #ff8c00;
  box-shadow: 0 0 0 0.2rem rgba(255, 165, 0, 0.25);
}

.botones-tara {
  display: flex;
  gap: 5px;
  margin-top: auto; /* Empuja los botones hacia abajo */
  height: 38px; /* Altura fija para los botones */
}

.agregar-tara,
.agregar-tara-extra,
.agregar-kilo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px; /* Altura fija para todos los botones */
  font-size: 0.9rem;
  padding: 0 10px;
}

.agregar-tara,
.agregar-tara-extra {
  flex: 1;
}

.agregar-kilo {
  width: 100%;
  margin-top: 10px;
  align-self: flex-end; /* Alinea el botón al final de la columna */
}
</style>