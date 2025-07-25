<template>
  <div class="resumen-mensual-barcos">
    <div class="back-button-container">
      <BackButton to="/barcos" />
    </div>
    
    <!-- Header -->
    <div class="header-section" :style="{ background: gradientePrimario }">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-chart">📊</i>
          Reporte Mensual de Barcos
        </h1>
        <p class="subtitle">Resumen detallado de actividades y gastos mensuales</p>
      </div>
    </div>

    <!-- Navegación de Mes -->
    <div class="navegacion-mes-card">
      <div class="mes-navegacion">
        <button @click="mesAnterior" class="btn-nav">
          <i class="nav-icon">⬅️</i>
          Anterior
        </button>
        
        <div class="mes-actual">
          <h2>{{ mesActualFormatted }}</h2>
          <p>{{ añoActual }}</p>
        </div>
        
        <button @click="mesSiguiente" class="btn-nav" :disabled="esMesFuturo">
          <i class="nav-icon">➡️</i>
          Siguiente
        </button>
      </div>
      
      <div class="acceso-rapido">
        <button @click="irAMesActual" class="btn-hoy">
          <i class="icon">📅</i>
          Mes Actual
        </button>
        
        <select v-model="mesSeleccionadoRapido" @change="irAMesSeleccionado" class="selector-mes-rapido">
          <option value="">Ir a mes específico...</option>
          <option v-for="opcion in opcionesMeses" :key="opcion.value" :value="opcion.value">
            {{ opcion.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">⏳</div>
      <p>Cargando datos del mes...</p>
    </div>

    <!-- Resumen General del Mes -->
    <div v-if="!loading" class="resumen-general-card">
      <h3 class="section-title">
        <i class="icon-summary">📈</i>
        Resumen General - {{ mesActualFormatted }} {{ añoActual }}
      </h3>
      
      <div class="metricas-generales">
        <div class="metrica-card">
          <i class="metrica-icon">💰</i>
          <div class="metrica-content">
            <h4>${{ formatNumber(resumenGeneral.totalGastado) }}</h4>
            <p>Total Gastado</p>
          </div>
        </div>
        
        <div class="metrica-card">
          <i class="metrica-icon">📝</i>
          <div class="metrica-content">
            <h4>{{ resumenGeneral.totalDeudas }}</h4>
            <p>Deudas Registradas</p>
          </div>
        </div>
        
        <div class="metrica-card">
          <i class="metrica-icon">⏳</i>
          <div class="metrica-content">
            <h4>${{ formatNumber(resumenGeneral.saldoPendiente) }}</h4>
            <p>Saldo Pendiente</p>
          </div>
        </div>
        
        <div class="metrica-card">
          <i class="metrica-icon">🏭</i>
          <div class="metrica-content">
            <h4>{{ resumenGeneral.proveedoresActivos }}</h4>
            <p>Proveedores Activos</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Resumen por Barco -->
    <div v-if="!loading" class="barcos-resumen-container">
      <div v-for="barco in barcosConDatos" :key="barco.id" class="barco-resumen-card" :style="{ borderTopColor: getBarcoColors(barco.id).primary }">
        <div class="barco-header" :style="{ background: getBarcoColors(barco.id).gradient }">
          <div class="barco-info">
            <i class="barco-icon">{{ barco.id === 'galileo' ? '🚢' : '🛥️' }}</i>
            <div class="barco-details">
              <h3>{{ barco.nombre }}</h3>
              <p>{{ barco.resumen.deudas }} deudas en el mes</p>
            </div>
          </div>
          
          <div class="barco-totales">
            <div class="total-item">
              <span class="label">Total:</span>
              <span class="value">${{ formatNumber(barco.resumen.total) }}</span>
            </div>
            <div class="total-item">
              <span class="label">Pendiente:</span>
              <span class="value pendiente">${{ formatNumber(barco.resumen.pendiente) }}</span>
            </div>
          </div>
        </div>

        <!-- Desglose por Proveedor -->
        <div class="proveedores-desglose">
          <h4 class="desglose-title">
            <i class="icon">🏭</i>
            Desglose por Proveedor
          </h4>
          
          <div class="proveedores-lista">
            <div v-for="proveedor in barco.proveedores" :key="proveedor.id" class="proveedor-item">
              <div class="proveedor-info">
                <div 
                  class="proveedor-color" 
                  :style="{ backgroundColor: proveedor.color }"
                ></div>
                <div class="proveedor-nombre">{{ proveedor.nombre }}</div>
              </div>
              
              <div class="proveedor-montos">
                <div class="monto-item">
                  <span class="label">Deudas:</span>
                  <span class="value">{{ proveedor.cantidadDeudas }}</span>
                </div>
                <div class="monto-item">
                  <span class="label">Total:</span>
                  <span class="value">${{ formatNumber(proveedor.total) }}</span>
                </div>
                <div class="monto-item">
                  <span class="label">Pendiente:</span>
                  <span class="value pendiente">${{ formatNumber(proveedor.pendiente) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Gráfico de barras simple -->
        <div class="grafico-barras">
          <h4 class="desglose-title">
            <i class="icon">📊</i>
            Distribución de Gastos
          </h4>
          <div class="barras-container">
            <div v-for="proveedor in barco.proveedores" :key="'chart-' + proveedor.id" class="barra-item">
              <div class="barra-info">
                <span class="barra-label">{{ proveedor.nombre }}</span>
                <span class="barra-value">${{ formatNumber(proveedor.total) }}</span>
              </div>
              <div class="barra-visual">
                <div 
                  class="barra-fill" 
                  :style="{ 
                    width: calcularPorcentaje(proveedor.total, barco.resumen.total) + '%',
                    backgroundColor: proveedor.color 
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Botones de Exportación -->
    <div v-if="!loading && (resumenGeneral.totalDeudas > 0)" class="acciones-exportacion">
      <button @click="exportarPDF" class="btn-exportar pdf">
        <i class="icon">📄</i>
        Exportar PDF
      </button>
      
      <button @click="compartirReporte" class="btn-exportar compartir">
        <i class="icon">📤</i>
        Compartir
      </button>
    </div>

    <!-- Mensaje cuando no hay datos -->
    <div v-if="!loading && resumenGeneral.totalDeudas === 0" class="no-datos-container">
      <div class="no-datos-content">
        <i class="no-datos-icon">📅</i>
        <h3>No hay actividad registrada</h3>
        <p>No se encontraron deudas para {{ mesActualFormatted }} {{ añoActual }}</p>
        <router-link to="/barcos/deudas/nueva" class="btn-crear-deuda">
          <i class="icon">➕</i>
          Registrar Nueva Deuda
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default {
  name: 'ResumenMensualBarcos',
  components: {
    BackButton
  },
  data() {
    return {
      loading: true,
      mesActual: new Date().getMonth(),
      añoActual: new Date().getFullYear(),
      deudas: [],
      proveedores: [],
      resumenGeneral: {
        totalGastado: 0,
        totalDeudas: 0,
        saldoPendiente: 0,
        proveedoresActivos: 0
      },
      mesesDelAño: [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ],
      mesSeleccionadoRapido: ''
    };
  },
  computed: {
    // Colores dinámicos (por ahora generales, se pueden personalizar por barco específico)
    colorPrimario() {
      return '#3498db';  // Azul por defecto
    },
    colorSecundario() {
      return '#2980b9';  // Azul oscuro por defecto
    },
    gradientePrimario() {
      return 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
    },
    // Función para obtener colores específicos por barco
    getBarcoColors() {
      return (barcoId) => {
        if (barcoId === 'maria-guadalupe') {
          return {
            primary: '#27ae60',
            secondary: '#2ecc71',
            gradient: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
            shadowColor: 'rgba(39, 174, 96, 0.3)'
          };
        } else {
          return {
            primary: '#3498db',
            secondary: '#2980b9', 
            gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            shadowColor: 'rgba(52, 152, 219, 0.3)'
          };
        }
      };
    },
    mesActualFormatted() {
      return this.mesesDelAño[this.mesActual];
    },
    esMesFuturo() {
      const ahora = new Date();
      const mesNavegacion = new Date(this.añoActual, this.mesActual);
      const mesActualReal = new Date(ahora.getFullYear(), ahora.getMonth());
      return mesNavegacion > mesActualReal;
    },
    opcionesMeses() {
      const opciones = [];
      const ahora = new Date();
      
      // Generar opciones para los últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i);
        opciones.push({
          value: `${fecha.getFullYear()}-${fecha.getMonth()}`,
          label: `${this.nombresMeses[fecha.getMonth()]} ${fecha.getFullYear()}`
        });
      }
      
      return opciones;
    }
  },
  async mounted() {
    await this.cargarProveedores();
    await this.cargarDatosMes();
    
    // Si no hay datos en el mes actual y estamos en un mes futuro, ir al mes actual
    if (this.deudas.length === 0 && this.esMesFuturo) {
      console.log('No hay datos en mes futuro, navegando al mes actual');
      this.irAMesActual();
    }
  },
  methods: {
    async cargarProveedores() {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedoresBarcos'));
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
      }
    },
    
    async cargarDatosMes() {
      this.loading = true;
      try {
        console.log('Cargando datos para:', this.mesActualFormatted, this.añoActual);
        
        // Cargar todas las deudas y filtrar localmente
        // Esto es más compatible con diferentes formatos de fecha
        const querySnapshot = await getDocs(collection(db, 'deudasBarcos'));
        const todasLasDeudas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Total de deudas encontradas:', todasLasDeudas.length);

        // Filtrar deudas por mes y año
        const añoMes = `${this.añoActual}-${(this.mesActual + 1).toString().padStart(2, '0')}`;
        
        this.deudas = todasLasDeudas.filter(deuda => {
          if (!deuda.fecha) return false;
          
          // Manejar diferentes formatos de fecha
          let fechaDeuda;
          if (typeof deuda.fecha === 'string') {
            // Formato string "YYYY-MM-DD"
            fechaDeuda = deuda.fecha;
          } else if (deuda.fecha && deuda.fecha.toDate) {
            // Timestamp de Firebase
            fechaDeuda = deuda.fecha.toDate().toISOString().split('T')[0];
          } else if (deuda.fecha instanceof Date) {
            // Objeto Date
            fechaDeuda = deuda.fecha.toISOString().split('T')[0];
          } else {
            console.warn('Formato de fecha no reconocido:', deuda.fecha);
            return false;
          }
          
          // Verificar si la fecha pertenece al mes seleccionado
          const perteneceAlMes = fechaDeuda.startsWith(añoMes);
          
          if (perteneceAlMes) {
            console.log('Deuda del mes encontrada:', {
              id: deuda.id,
              fecha: fechaDeuda,
              total: deuda.totalDeuda || deuda.total,
              proveedor: deuda.nombreProveedor
            });
          }
          
          return perteneceAlMes;
        });

        console.log('Deudas filtradas para el mes:', this.deudas.length);
        this.calcularResumenes();
      } catch (error) {
        console.error('Error al cargar datos del mes:', error);
        alert('Error al cargar los datos del mes: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    
    calcularResumenes() {
      console.log('Calculando resúmenes con', this.deudas.length, 'deudas');
      
      // Resetear resúmenes
      this.resumenGeneral = {
        totalGastado: 0,
        totalDeudas: this.deudas.length,
        saldoPendiente: 0,
        proveedoresActivos: 0
      };
      
      const barcosData = {
        galileo: { id: 'galileo', nombre: 'El Galileo', deudas: [], proveedores: {} },
        'maria-guadalupe': { id: 'maria-guadalupe', nombre: 'María Guadalupe', deudas: [], proveedores: {} }
      };
      
      const proveedoresActivos = new Set();

      // Procesar cada deuda
      this.deudas.forEach(deuda => {
        console.log('Procesando deuda:', deuda);
        
        const barcoId = deuda.barco || 'galileo';
        
        // Manejar diferentes nombres de campos para el total
        const total = deuda.totalDeuda || deuda.total || 0;
        const abonado = deuda.totalAbonado || 0;
        const pendiente = total - abonado;
        
        console.log('Valores calculados:', { total, abonado, pendiente });
        
        // Actualizar resumen general
        this.resumenGeneral.totalGastado += total;
        this.resumenGeneral.saldoPendiente += pendiente;
        
        // Manejar diferentes nombres de campos para el proveedor
        const proveedorId = deuda.proveedorId || deuda.proveedor || 'sin-proveedor';
        if (proveedorId !== 'sin-proveedor') {
          proveedoresActivos.add(proveedorId);
        }
        
        // Agregar a datos del barco
        if (barcosData[barcoId]) {
          barcosData[barcoId].deudas.push(deuda);
          
          // Agrupar por proveedor
          if (!barcosData[barcoId].proveedores[proveedorId]) {
            const proveedor = this.proveedores.find(p => p.id === proveedorId);
            barcosData[barcoId].proveedores[proveedorId] = {
              id: proveedorId,
              nombre: deuda.nombreProveedor || proveedor?.nombre || 'Sin proveedor',
              color: proveedor?.color || '#6c757d',
              cantidadDeudas: 0,
              total: 0,
              pendiente: 0
            };
          }
          
          barcosData[barcoId].proveedores[proveedorId].cantidadDeudas++;
          barcosData[barcoId].proveedores[proveedorId].total += total;
          barcosData[barcoId].proveedores[proveedorId].pendiente += pendiente;
        }
      });
      
      this.resumenGeneral.proveedoresActivos = proveedoresActivos.size;
      
      console.log('Resumen general calculado:', this.resumenGeneral);
      
      // Convertir a array y calcular resúmenes por barco
      this.barcosConDatos = Object.values(barcosData)
        .filter(barco => barco.deudas.length > 0)
        .map(barco => ({
          ...barco,
          resumen: {
            deudas: barco.deudas.length,
            total: barco.deudas.reduce((sum, d) => sum + (d.totalDeuda || d.total || 0), 0),
            pendiente: barco.deudas.reduce((sum, d) => sum + ((d.totalDeuda || d.total || 0) - (d.totalAbonado || 0)), 0)
          },
          proveedores: Object.values(barco.proveedores).sort((a, b) => b.total - a.total)
        }));
        
      console.log('Barcos con datos:', this.barcosConDatos);
    },
    
    mesAnterior() {
      if (this.mesActual === 0) {
        this.mesActual = 11;
        this.añoActual--;
      } else {
        this.mesActual--;
      }
      this.cargarDatosMes();
    },
    
    mesSiguiente() {
      if (!this.esMesFuturo) {
        if (this.mesActual === 11) {
          this.mesActual = 0;
          this.añoActual++;
        } else {
          this.mesActual++;
        }
        this.cargarDatosMes();
      }
    },
    
    irAMesActual() {
      const ahora = new Date();
      this.mesActual = ahora.getMonth();
      this.añoActual = ahora.getFullYear();
      this.cargarDatosMes();
    },
    
    irAMesSeleccionado() {
      if (this.mesSeleccionadoRapido) {
        const [año, mes] = this.mesSeleccionadoRapido.split('-');
        this.añoActual = parseInt(año);
        this.mesActual = parseInt(mes);
        this.mesSeleccionadoRapido = '';
        this.cargarDatosMes();
      }
    },
    
    calcularPorcentaje(valor, total) {
      return total > 0 ? Math.round((valor / total) * 100) : 0;
    },
    
    formatNumber(num) {
      return new Intl.NumberFormat('es-MX', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }).format(num || 0);
    },
    
    async exportarPDF() {
      try {
        const doc = new jsPDF();
        
        // Configuración de fuentes y colores
        const primaryColor = [102, 126, 234]; // #667eea
        const textColor = [44, 62, 80]; // #2c3e50
        const grayColor = [127, 140, 141]; // #7f8c8d
        
        let yPosition = 20;
        
        // ===== HEADER =====
        doc.setFontSize(20);
        doc.setTextColor(...primaryColor);
        doc.text('REPORTE MENSUAL DE BARCOS', 20, yPosition);
        
        yPosition += 10;
        doc.setFontSize(14);
        doc.setTextColor(...grayColor);
        doc.text(`${this.mesActualFormatted} ${this.añoActual}`, 20, yPosition);
        
        // Fecha de generación
        doc.setFontSize(10);
        const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        doc.text(`Generado el: ${fechaGeneracion}`, 150, yPosition);
        
        yPosition += 20;
        
        // ===== RESUMEN GENERAL =====
        doc.setFontSize(14);
        doc.setTextColor(...textColor);
        doc.text('RESUMEN GENERAL', 20, yPosition);
        
        yPosition += 10;
        
        // Tabla de resumen general
        const datosResumenGeneral = [
          ['Total Gastado', `$${this.formatNumber(this.resumenGeneral.totalGastado)}`],
          ['Deudas Registradas', this.resumenGeneral.totalDeudas.toString()],
          ['Saldo Pendiente', `$${this.formatNumber(this.resumenGeneral.saldoPendiente)}`],
          ['Proveedores Activos', this.resumenGeneral.proveedoresActivos.toString()]
        ];
        
        doc.autoTable({
          startY: yPosition,
          head: [['Concepto', 'Valor']],
          body: datosResumenGeneral,
          theme: 'grid',
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontSize: 11,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 10,
            textColor: textColor
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: 20, right: 20 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
        
        // ===== ANÁLISIS POR BARCO =====
        if (this.barcosConDatos.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(...textColor);
          doc.text('ANALISIS POR BARCO', 20, yPosition);
          
          yPosition += 10;
          
          // Preparar datos para la tabla por barcos
          const datosBarcos = [];
          
          this.barcosConDatos.forEach((barco, barcoIndex) => {
            // Fila principal del barco (solo nombre)
            const nombreBarco = barco.id === 'galileo' ? 'El Galileo' : 'Maria Guadalupe';
            datosBarcos.push([
              `${nombreBarco}`,
              '',
              '',
              ''
            ]);
            
            // Proveedores del barco (máximo 5 principales para más detalle)
            const proveedoresPrincipales = barco.proveedores.slice(0, 5);
            proveedoresPrincipales.forEach(proveedor => {
              datosBarcos.push([
                `   > ${proveedor.nombre}`,
                proveedor.cantidadDeudas.toString(),
                `$${this.formatNumber(proveedor.total)}`,
                `$${this.formatNumber(proveedor.pendiente)}`
              ]);
            });
            
            // Si hay más proveedores, agregar línea de "otros"
            if (barco.proveedores.length > 5) {
              const otrosProveedores = barco.proveedores.slice(5);
              const totalOtros = otrosProveedores.reduce((sum, p) => sum + p.total, 0);
              const pendienteOtros = otrosProveedores.reduce((sum, p) => sum + p.pendiente, 0);
              const deudasOtros = otrosProveedores.reduce((sum, p) => sum + p.cantidadDeudas, 0);
              
              datosBarcos.push([
                `   > Otros (${otrosProveedores.length})`,
                deudasOtros.toString(),
                `$${this.formatNumber(totalOtros)}`,
                `$${this.formatNumber(pendienteOtros)}`
              ]);
            }
            
            // TOTAL POR BARCO
            datosBarcos.push([
              `--- TOTAL ${nombreBarco.toUpperCase()} ---`,
              barco.resumen.deudas.toString(),
              `$${this.formatNumber(barco.resumen.total)}`,
              `$${this.formatNumber(barco.resumen.pendiente)}`
            ]);
            
            // Línea separadora si no es el último barco
            if (barcoIndex < this.barcosConDatos.length - 1) {
              datosBarcos.push([
                '',
                '',
                '',
                ''
              ]);
            }
          });
          
          // Agregar total general al final
          if (this.barcosConDatos.length > 1) {
            datosBarcos.push([
              '',
              '',
              '',
              ''
            ]);
            datosBarcos.push([
              '=== TOTAL GENERAL ===',
              this.resumenGeneral.totalDeudas.toString(),
              `$${this.formatNumber(this.resumenGeneral.totalGastado)}`,
              `$${this.formatNumber(this.resumenGeneral.saldoPendiente)}`
            ]);
          }
          
          doc.autoTable({
            startY: yPosition,
            head: [['Barco / Proveedor', 'Deudas', 'Total', 'Pendiente']],
            body: datosBarcos,
            theme: 'striped',
            headStyles: {
              fillColor: [52, 152, 219], // Azul para barcos
              textColor: [255, 255, 255],
              fontSize: 11,
              fontStyle: 'bold'
            },
            bodyStyles: {
              fontSize: 9,
              textColor: textColor
            },
            columnStyles: {
              0: { cellWidth: 70 },
              1: { cellWidth: 25, halign: 'center' },
              2: { cellWidth: 40, halign: 'right' },
              3: { cellWidth: 40, halign: 'right' }
            },
            margin: { left: 20, right: 20 },
            didParseCell: function(data) {
              // Destacar el total general
              if (data.cell.raw && data.cell.raw.includes('=== TOTAL GENERAL ===')) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [102, 126, 234]; // Morado principal
                data.cell.styles.textColor = [255, 255, 255]; // Texto blanco
                data.cell.styles.fontSize = 11;
              }
              // Destacar las filas de totales por barco
              else if (data.cell.raw && data.cell.raw.includes('--- TOTAL')) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [52, 152, 219]; // Azul
                data.cell.styles.textColor = [255, 255, 255]; // Texto blanco
                data.cell.styles.fontSize = 10;
              }
              // Destacar las filas principales de barcos (solo nombres)
              else if (data.cell.raw && 
                  (data.cell.raw.includes('El Galileo') || data.cell.raw.includes('Maria Guadalupe')) &&
                  !data.cell.raw.includes('>') && !data.cell.raw.includes('---') && !data.cell.raw.includes('===')) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [236, 240, 241]; // Gris claro
                data.cell.styles.fontSize = 11;
              }
              // Estilo para proveedores
              else if (data.cell.raw && data.cell.raw.includes('>')) {
                data.cell.styles.fontSize = 9;
                data.cell.styles.textColor = [52, 73, 94]; // Gris oscuro
              }
            }
          });
          
          yPosition = doc.lastAutoTable.finalY + 10;
        }
        
        // ===== PIE DE PÁGINA =====
        if (yPosition < 250) { // Si hay espacio
          doc.setFontSize(8);
          doc.setTextColor(...grayColor);
          doc.text('Sistema de Gestión Rey Pez - Reporte generado automáticamente', 20, 280);
          doc.text(`Total de páginas: 1`, 150, 280);
        }
        
        // ===== GUARDAR PDF =====
        const nombreArchivo = `Reporte_Barcos_${this.mesActualFormatted}_${this.añoActual}.pdf`;
        doc.save(nombreArchivo);
        
        // Mostrar mensaje de éxito
        alert(`✅ Reporte PDF generado exitosamente: ${nombreArchivo}`);
        
      } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('❌ Error al generar el reporte PDF. Por favor, inténtalo de nuevo.');
      }
    },
    

    
    async compartirReporte() {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Reporte Mensual de Barcos - ${this.mesActualFormatted} ${this.añoActual}`,
            text: `Resumen mensual: $${this.formatNumber(this.resumenGeneral.totalGastado)} gastados en ${this.resumenGeneral.totalDeudas} deudas`,
            url: window.location.href
          });
        } catch (error) {
          console.log('Error al compartir:', error);
        }
      } else {
        // Fallback para navegadores que no soportan Web Share API
        const texto = `Reporte Mensual de Barcos - ${this.mesActualFormatted} ${this.añoActual}\nTotal gastado: $${this.formatNumber(this.resumenGeneral.totalGastado)}\nDeudas: ${this.resumenGeneral.totalDeudas}`;
        navigator.clipboard.writeText(texto);
        alert('Resumen copiado al portapapeles');
      }
    }
  }
};
</script>

<style scoped>
.resumen-mensual-barcos {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.back-button-container {
  margin-bottom: 30px;
}

/* Header */
.header-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.header-content {
  text-align: center;
  color: white;
}

.main-title {
  font-size: 2.5em;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.subtitle {
  font-size: 1.2em;
  opacity: 0.9;
  margin: 0;
}

/* Navegación de Mes */
.navegacion-mes-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.mes-navegacion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.btn-nav {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  border: none;
  padding: 15px 25px;
  border-radius: 10px;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-nav:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
}

.btn-nav:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
}

.mes-actual {
  text-align: center;
}

.mes-actual h2 {
  margin: 0;
  font-size: 2em;
  color: #2c3e50;
}

.mes-actual p {
  margin: 5px 0 0 0;
  color: #7f8c8d;
  font-size: 1.1em;
}

.acceso-rapido {
  display: flex;
  gap: 15px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-hoy {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-hoy:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 184, 148, 0.3);
}

.selector-mes-rapido {
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1em;
  background: white;
}

/* Loading */
.loading-container {
  text-align: center;
  padding: 60px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  font-size: 3em;
  margin-bottom: 20px;
}

/* Resumen General */
.resumen-general-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.3em;
  margin-bottom: 25px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.metricas-generales {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.metrica-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
}

.metrica-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metrica-icon {
  font-size: 2.5em;
}

.metrica-content h4 {
  margin: 0;
  font-size: 1.8em;
  color: #2c3e50;
}

.metrica-content p {
  margin: 5px 0 0 0;
  color: #7f8c8d;
}

/* Resumen por Barco */
.barcos-resumen-container {
  display: grid;
  gap: 30px;
}

.barco-resumen-card {
  background: white;
  border-radius: 15px;
  padding: 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-top: 5px solid #667eea;
  overflow: hidden;
  transition: all 0.3s ease;
}

.barco-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: 30px;
  border-bottom: none;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: all 0.3s ease;
}

.barco-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.barco-icon {
  font-size: 3em;
}

.barco-details h3 {
  margin: 0;
  font-size: 1.8em;
  color: #2c3e50;
}

.barco-details p {
  margin: 5px 0 0 0;
  color: #7f8c8d;
}

.barco-totales {
  display: flex;
  gap: 30px;
}

.total-item {
  text-align: center;
}

.total-item .label {
  display: block;
  color: #7f8c8d;
  margin-bottom: 5px;
}

.total-item .value {
  display: block;
  font-size: 1.5em;
  font-weight: 600;
  color: #2c3e50;
}

.total-item .value.pendiente {
  color: #e74c3c;
}

/* Desglose por Proveedor */
.proveedores-desglose {
  margin-bottom: 30px;
  padding: 30px;
}

.desglose-title {
  font-size: 1.2em;
  color: #2c3e50;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.proveedores-lista {
  display: grid;
  gap: 15px;
}

.proveedor-item {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.proveedor-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.proveedor-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.proveedor-nombre {
  font-weight: 600;
  color: #2c3e50;
}

.proveedor-montos {
  display: flex;
  gap: 20px;
}

.monto-item {
  text-align: center;
}

.monto-item .label {
  display: block;
  font-size: 0.9em;
  color: #7f8c8d;
  margin-bottom: 3px;
}

.monto-item .value {
  display: block;
  font-weight: 600;
  color: #2c3e50;
}

.monto-item .value.pendiente {
  color: #e74c3c;
}

/* Gráfico de Barras */
.grafico-barras {
  margin-top: 20px;
}

.barras-container {
  display: grid;
  gap: 15px;
}

.barra-item {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 15px;
}

.barra-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.barra-label {
  font-weight: 600;
  color: #2c3e50;
}

.barra-value {
  font-weight: 600;
  color: #7f8c8d;
}

.barra-visual {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.barra-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

/* Acciones de Exportación */
.acciones-exportacion {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
  flex-wrap: wrap;
}

.btn-exportar {
  padding: 15px 25px;
  border: none;
  border-radius: 10px;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
}

.btn-exportar.pdf {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}



.btn-exportar.compartir {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
}

.btn-exportar:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* No Datos */
.no-datos-container {
  text-align: center;
  padding: 60px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.no-datos-content {
  max-width: 400px;
  margin: 0 auto;
}

.no-datos-icon {
  font-size: 4em;
  margin-bottom: 20px;
}

.no-datos-content h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.no-datos-content p {
  margin: 0 0 30px 0;
  color: #7f8c8d;
}

.btn-crear-deuda {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  text-decoration: none;
  padding: 15px 25px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.btn-crear-deuda:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .resumen-mensual-barcos {
    padding: 15px;
  }
  
  .header-section {
    padding: 25px;
  }
  
  .main-title {
    font-size: 2em;
  }
  
  .mes-navegacion {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .barco-header {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .barco-totales {
    justify-content: center;
  }
  
  .proveedor-item {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .acciones-exportacion {
    flex-direction: column;
    align-items: center;
  }
  
  .btn-exportar {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }
}
</style> 