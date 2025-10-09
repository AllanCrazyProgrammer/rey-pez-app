<template>
  <div>
    <button @click="abrirModal" class="btn-resumen-ventas">
      <i class="fas fa-chart-bar"></i> Resumen de Ventas
    </button>

    <div v-if="showModal" class="modal-overlay" @click.self="cerrarModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Resumen de Ventas a Veronica</h2>
          <button @click="cerrarModal" class="btn-cerrar-modal">×</button>
        </div>

        <div v-if="isLoading" class="loading">
          Cargando datos...
        </div>

        <div v-else class="resumen-container">
          <!-- Filtro de fechas -->
          <div class="filtro-fechas">
            <div class="fecha-group">
              <label>Desde:</label>
              <input type="date" v-model="fechaDesde" @change="cargarDatos">
            </div>
            <div class="fecha-group">
              <label>Hasta:</label>
              <input type="date" v-model="fechaHasta" @change="cargarDatos">
            </div>
            <button @click="limpiarFiltros" class="btn-limpiar">Limpiar Filtros</button>
          </div>

          <!-- Resumen de Camarón Limpio -->
          <div class="seccion-resumen">
            <h3 class="titulo-seccion limpio">Camarón Limpio</h3>
            <div v-if="Object.keys(resumenLimpio).length === 0" class="no-data">
              No hay ventas de camarón limpio en este período
            </div>
            <table v-else class="tabla-resumen">
              <thead>
                <tr>
                  <th>Medida</th>
                  <th>Kilos Vendidos</th>
                  <th>Total Vendido</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(datos, medida) in resumenLimpio" :key="medida">
                  <td class="medida-cell">{{ medida }}</td>
                  <td class="kilos-cell">{{ formatNumber(datos.kilos) }} kg</td>
                  <td class="monto-cell">${{ formatNumber(datos.total) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>Total Limpio</strong></td>
                  <td><strong>{{ formatNumber(totalKilosLimpio) }} kg</strong></td>
                  <td><strong>${{ formatNumber(totalMontoLimpio) }}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Resumen de Camarón Crudo -->
          <div class="seccion-resumen">
            <h3 class="titulo-seccion crudo">Camarón Crudo</h3>
            <div v-if="Object.keys(resumenCrudo).length === 0" class="no-data">
              No hay ventas de camarón crudo en este período
            </div>
            <table v-else class="tabla-resumen">
              <thead>
                <tr>
                  <th>Medida</th>
                  <th>Kilos Vendidos</th>
                  <th>Total Vendido</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(datos, medida) in resumenCrudo" :key="medida">
                  <td class="medida-cell">{{ medida }}</td>
                  <td class="kilos-cell">{{ formatNumber(datos.kilos) }} kg</td>
                  <td class="monto-cell">${{ formatNumber(datos.total) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td><strong>Total Crudo</strong></td>
                  <td><strong>{{ formatNumber(totalKilosCrudo) }} kg</strong></td>
                  <td><strong>${{ formatNumber(totalMontoCrudo) }}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Total General -->
          <div class="total-general">
            <div class="total-item">
              <span class="total-label">Total de Kilos:</span>
              <span class="total-value">{{ formatNumber(totalKilosGeneral) }} kg</span>
            </div>
            <div class="total-item">
              <span class="total-label">Total Vendido:</span>
              <span class="total-value destacado">${{ formatNumber(totalMontoGeneral) }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="imprimirResumen" class="btn-imprimir">
            <i class="fas fa-print"></i> Imprimir
          </button>
          <button @click="cerrarModal" class="btn-cerrar">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';

export default {
  name: 'ResumenVentasVeronicaModal',
  data() {
    return {
      showModal: false,
      isLoading: false,
      resumenLimpio: {},
      resumenCrudo: {},
      fechaDesde: '',
      fechaHasta: '',
    };
  },
  computed: {
    totalKilosLimpio() {
      return Object.values(this.resumenLimpio).reduce((sum, item) => sum + item.kilos, 0);
    },
    totalMontoLimpio() {
      return Object.values(this.resumenLimpio).reduce((sum, item) => sum + item.total, 0);
    },
    totalKilosCrudo() {
      return Object.values(this.resumenCrudo).reduce((sum, item) => sum + item.kilos, 0);
    },
    totalMontoCrudo() {
      return Object.values(this.resumenCrudo).reduce((sum, item) => sum + item.total, 0);
    },
    totalKilosGeneral() {
      return this.totalKilosLimpio + this.totalKilosCrudo;
    },
    totalMontoGeneral() {
      return this.totalMontoLimpio + this.totalMontoCrudo;
    }
  },
  methods: {
    async abrirModal() {
      this.showModal = true;
      await this.cargarDatos();
    },
    cerrarModal() {
      this.showModal = false;
    },
    limpiarFiltros() {
      this.fechaDesde = '';
      this.fechaHasta = '';
      this.cargarDatos();
    },
    async cargarDatos() {
      this.isLoading = true;
      this.resumenLimpio = {};
      this.resumenCrudo = {};

      try {
        const cuentasRef = collection(db, 'cuentasVeronica');
        let q = query(cuentasRef, orderBy('fecha', 'asc'));

        // Aplicar filtros de fecha si existen
        if (this.fechaDesde && this.fechaHasta) {
          q = query(cuentasRef, 
            where('fecha', '>=', this.fechaDesde),
            where('fecha', '<=', this.fechaHasta),
            orderBy('fecha', 'asc')
          );
        } else if (this.fechaDesde) {
          q = query(cuentasRef, 
            where('fecha', '>=', this.fechaDesde),
            orderBy('fecha', 'asc')
          );
        } else if (this.fechaHasta) {
          q = query(cuentasRef, 
            where('fecha', '<=', this.fechaHasta),
            orderBy('fecha', 'asc')
          );
        }

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const itemsVenta = data.itemsVenta || [];

          itemsVenta.forEach((item) => {
            const medidaOriginal = (item.medida || '').trim();
            const kilos = parseFloat(item.kilosVenta) || 0;
            const total = parseFloat(item.totalVenta) || 0;

            if (!medidaOriginal || kilos === 0) return;

            // Normalizar la medida (eliminar palabras como plus, premium, etc.)
            const medida = this.normalizarMedida(medidaOriginal);

            // Determinar si es limpio o crudo
            const esCrudo = this.esCamaronCrudo(medida);

            if (esCrudo) {
              // Agregar a resumen de crudos
              if (!this.resumenCrudo[medida]) {
                this.resumenCrudo[medida] = { kilos: 0, total: 0 };
              }
              this.resumenCrudo[medida].kilos += kilos;
              this.resumenCrudo[medida].total += total;
            } else {
              // Agregar a resumen de limpios
              if (!this.resumenLimpio[medida]) {
                this.resumenLimpio[medida] = { kilos: 0, total: 0 };
              }
              this.resumenLimpio[medida].kilos += kilos;
              this.resumenLimpio[medida].total += total;
            }
          });
        });

      } catch (error) {
        console.error('Error al cargar datos de ventas:', error);
        alert('Error al cargar los datos. Por favor, intente nuevamente.');
      } finally {
        this.isLoading = false;
      }
    },
    normalizarMedida(medida) {
      // Eliminar palabras descriptivas y normalizar
      let medidaNormalizada = medida.toLowerCase().trim();
      
      // Lista de palabras a eliminar
      const palabrasEliminar = ['plus', 'premium', 'extra', 'especial', 'select'];
      
      // Eliminar cada palabra de la lista
      palabrasEliminar.forEach(palabra => {
        const regex = new RegExp(`\\s*${palabra}\\s*`, 'gi');
        medidaNormalizada = medidaNormalizada.replace(regex, ' ');
      });
      
      // Limpiar espacios extras y convertir a formato consistente
      medidaNormalizada = medidaNormalizada.trim().replace(/\s+/g, ' ');
      
      // Mantener el formato original de la medida base (ej: 41/50, 51/60)
      // pero con la primera letra en mayúscula si es texto
      return medidaNormalizada
        .split(' ')
        .map(word => {
          // Si es un formato de medida numérica (41/50), mantenerlo como está
          if (/^\d+\/\d+$/.test(word)) {
            return word;
          }
          // Si es texto, capitalizar primera letra
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ')
        .trim();
    },
    esCamaronCrudo(medida) {
      const medidaLower = medida.toLowerCase();
      // Verificar si contiene palabras clave de crudo
      const palabrasClaveCrudo = ['crudo', 'c/c', 'cc', 'cabeza'];
      return palabrasClaveCrudo.some(palabra => medidaLower.includes(palabra)) ||
             /^\d+-\d+$/.test(medida); // Formato "5-19" típico de crudos
    },
    formatNumber(value) {
      if (value === null || value === undefined) return '0';
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    },
    imprimirResumen() {
      const contenidoImprimir = `
        <html>
          <head>
            <title>Resumen de Ventas a Veronica</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 12pt;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              h1 {
                color: #ff8c00;
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                color: #ff8c00;
                margin-top: 25px;
                margin-bottom: 10px;
                border-bottom: 2px solid #ff8c00;
                padding-bottom: 5px;
              }
              .periodo {
                text-align: center;
                color: #666;
                margin-bottom: 20px;
                font-style: italic;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 10px;
                text-align: left;
              }
              th {
                background-color: #ff8c00;
                color: white;
                font-weight: bold;
              }
              .total-row {
                background-color: #fff8f0;
                font-weight: bold;
              }
              .total-general {
                background-color: #ff8c00;
                color: white;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                text-align: center;
              }
              .total-general div {
                margin: 10px 0;
                font-size: 14pt;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>Resumen de Ventas a Veronica</h1>
            ${this.fechaDesde || this.fechaHasta ? `
              <p class="periodo">
                Período: ${this.fechaDesde ? this.formatDate(this.fechaDesde) : 'Inicio'} - ${this.fechaHasta ? this.formatDate(this.fechaHasta) : 'Hoy'}
              </p>
            ` : ''}
            
            <h2>Camarón Limpio</h2>
            ${Object.keys(this.resumenLimpio).length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Medida</th>
                    <th>Kilos Vendidos</th>
                    <th>Total Vendido</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(this.resumenLimpio).map(([medida, datos]) => `
                    <tr>
                      <td>${medida}</td>
                      <td>${this.formatNumber(datos.kilos)} kg</td>
                      <td>$${this.formatNumber(datos.total)}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td><strong>Total Limpio</strong></td>
                    <td><strong>${this.formatNumber(this.totalKilosLimpio)} kg</strong></td>
                    <td><strong>$${this.formatNumber(this.totalMontoLimpio)}</strong></td>
                  </tr>
                </tbody>
              </table>
            ` : '<p>No hay ventas de camarón limpio en este período</p>'}

            <h2>Camarón Crudo</h2>
            ${Object.keys(this.resumenCrudo).length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Medida</th>
                    <th>Kilos Vendidos</th>
                    <th>Total Vendido</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(this.resumenCrudo).map(([medida, datos]) => `
                    <tr>
                      <td>${medida}</td>
                      <td>${this.formatNumber(datos.kilos)} kg</td>
                      <td>$${this.formatNumber(datos.total)}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td><strong>Total Crudo</strong></td>
                    <td><strong>${this.formatNumber(this.totalKilosCrudo)} kg</strong></td>
                    <td><strong>$${this.formatNumber(this.totalMontoCrudo)}</strong></td>
                  </tr>
                </tbody>
              </table>
            ` : '<p>No hay ventas de camarón crudo en este período</p>'}

            <div class="total-general">
              <div><strong>Total de Kilos:</strong> ${this.formatNumber(this.totalKilosGeneral)} kg</div>
              <div><strong>Total Vendido:</strong> $${this.formatNumber(this.totalMontoGeneral)}</div>
            </div>
          </body>
        </html>
      `;

      const ventanaImprimir = window.open('', '_blank');
      ventanaImprimir.document.write(contenidoImprimir);
      ventanaImprimir.document.close();
      ventanaImprimir.print();
    },
    formatDate(dateString) {
      const fecha = new Date(dateString + 'T00:00:00');
      return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }
};
</script>

<style scoped>
.btn-resumen-ventas {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.3s ease;
}

.btn-resumen-ventas:hover {
  background-color: #1976D2;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  width: 95%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 2px solid #ff8c00;
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 10;
}

.modal-header h2 {
  color: #ff8c00;
  margin: 0;
}

.btn-cerrar-modal {
  background: none;
  border: none;
  font-size: 32px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.btn-cerrar-modal:hover {
  background-color: #f44336;
  color: white;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #ff8c00;
  font-size: 18px;
}

.resumen-container {
  padding: 20px;
}

.filtro-fechas {
  display: flex;
  gap: 15px;
  margin-bottom: 25px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.fecha-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.fecha-group label {
  font-weight: bold;
  color: #666;
  font-size: 14px;
}

.fecha-group input[type="date"] {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.btn-limpiar {
  background-color: #666;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-limpiar:hover {
  background-color: #555;
}

.seccion-resumen {
  margin-bottom: 30px;
}

.titulo-seccion {
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 15px;
  color: white;
}

.titulo-seccion.limpio {
  background-color: #4CAF50;
}

.titulo-seccion.crudo {
  background-color: #FF9800;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #999;
  font-style: italic;
}

.tabla-resumen {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tabla-resumen th,
.tabla-resumen td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.tabla-resumen th {
  background-color: #ff8c00;
  color: white;
  font-weight: bold;
}

.tabla-resumen tbody tr:hover {
  background-color: #fff8f0;
}

.medida-cell {
  font-weight: bold;
  color: #333;
}

.kilos-cell {
  color: #2196F3;
  font-weight: 500;
}

.monto-cell {
  color: #4CAF50;
  font-weight: 500;
}

.total-row {
  background-color: #fff8f0;
  font-weight: bold;
}

.total-row td {
  border-top: 2px solid #ff8c00;
  padding-top: 15px;
}

.total-general {
  background: linear-gradient(135deg, #ff8c00, #ff6f00);
  color: white;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
  font-size: 18px;
}

.total-label {
  font-weight: 500;
}

.total-value {
  font-weight: bold;
  font-size: 20px;
}

.total-value.destacado {
  font-size: 24px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #ddd;
  position: sticky;
  bottom: 0;
  background-color: white;
}

.btn-imprimir,
.btn-cerrar {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-imprimir {
  background-color: #2196F3;
  color: white;
}

.btn-imprimir:hover {
  background-color: #1976D2;
}

.btn-cerrar {
  background-color: #666;
  color: white;
}

.btn-cerrar:hover {
  background-color: #555;
}

@media (max-width: 768px) {
  .modal-content {
    width: 100%;
    max-height: 95vh;
    margin: 10px;
  }

  .filtro-fechas {
    flex-direction: column;
    align-items: stretch;
  }

  .fecha-group {
    width: 100%;
  }

  .fecha-group input[type="date"] {
    width: 100%;
  }

  .btn-limpiar {
    width: 100%;
  }

  .tabla-resumen {
    font-size: 14px;
  }

  .tabla-resumen th,
  .tabla-resumen td {
    padding: 8px 10px;
  }

  .total-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn-imprimir,
  .btn-cerrar {
    width: 100%;
    justify-content: center;
  }
}
</style>

