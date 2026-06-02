<template>
  <div class="entrada-producto-barco">
    <div class="back-button-container">
      <BackButton v-if="currentView === 'lista'" to="/barcos" />
      <button v-else class="btn-back" @click="volverALista">Atrás</button>
    </div>

    <!-- Header -->
    <div class="header-section" :style="{ background: gradientePrimario }">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-box">📦</i>
          Entrada de Producto - {{ nombreBarco }}
        </h1>
        <p class="subtitle">Registra y visualiza la entrada de producto por descarga</p>
      </div>
    </div>

    <!-- ============ VISTA LISTA (por descarga) ============ -->
    <template v-if="currentView === 'lista'">
      <div class="resumen-cards">
        <div class="resumen-card barco-card" :style="{ background: gradientePrimario }">
          <i class="card-icon">{{ barcoSeleccionado === 'galileo' ? '🚢' : '🛥️' }}</i>
          <div class="card-content">
            <h3>{{ nombreBarco }}</h3>
            <p>Barco seleccionado</p>
          </div>
        </div>

        <div class="resumen-card">
          <i class="card-icon">🚚</i>
          <div class="card-content">
            <h3>{{ descargas.length }}</h3>
            <p>Descargas registradas</p>
          </div>
        </div>

        <div class="resumen-card">
          <i class="card-icon">⚖️</i>
          <div class="card-content">
            <h3>{{ formatNumber(totalKilosGlobal) }} kg</h3>
            <p>Total kilos acumulado</p>
          </div>
        </div>

        <div class="resumen-card resumen-card-action" @click="nuevaDescarga">
          <i class="card-icon">➕</i>
          <div class="card-content">
            <h3>Nueva Descarga</h3>
            <p>Registrar entrada</p>
          </div>
        </div>
      </div>

      <!-- Cargando -->
      <div v-if="cargando" class="estado-mensaje">
        <p>Cargando descargas...</p>
      </div>

      <!-- Sin descargas -->
      <div v-else-if="descargas.length === 0" class="empty-state">
        <i class="empty-icon">📭</i>
        <h3>No hay descargas registradas</h3>
        <p>Crea una nueva descarga para registrar la entrada de producto.</p>
        <button class="btn-primary" @click="nuevaDescarga">
          <i class="btn-icon">➕</i> Nueva Descarga
        </button>
      </div>

      <!-- Lista de descargas -->
      <div v-else class="descargas-grid">
        <div
          v-for="descarga in descargas"
          :key="descarga.id"
          class="descarga-card"
        >
          <div class="descarga-card-header" :style="{ background: gradientePrimario }">
            <div class="descarga-fecha">
              <i class="icon-calendar">📅</i>
              <span>{{ formatearFecha(descarga.fecha) }}</span>
            </div>
            <div class="descarga-actions">
              <button class="icon-btn" title="Editar" @click="editarDescarga(descarga)">✏️</button>
              <button class="icon-btn" title="Eliminar" @click="eliminarDescarga(descarga)">🗑️</button>
            </div>
          </div>

          <div class="descarga-card-body">
            <div class="descarga-totales">
              <div class="descarga-total-item">
                <span class="footer-label">Total taras:</span>
                <span class="footer-total-taras">{{ formatNumber(totalTarasDescarga(descarga), 0) }}</span>
              </div>
              <div class="descarga-total-item">
                <span class="footer-label">Total kilos:</span>
                <span class="footer-total">{{ formatNumber(totalKilosDescarga(descarga)) }} kg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ VISTA EDITOR (registrar / editar) ============ -->
    <template v-else>
      <div class="editor-toolbar">
        <button class="btn-secondary" @click="volverALista">← Volver</button>
        <h2 class="editor-title">
          {{ editandoId ? 'Editar descarga' : 'Nueva descarga' }}
        </h2>
      </div>

      <!-- Fecha de la descarga -->
      <div class="fecha-card">
        <h3 class="section-title">
          <i class="icon-calendar">📅</i>
          Fecha de la Descarga
        </h3>
        <div class="fecha-container">
          <input type="date" v-model="form.fecha" class="modern-input">
          <span class="fecha-display">{{ fechaFormateadaForm }}</span>
        </div>
      </div>

      <!-- Pestañas de medidas -->
      <div v-if="form.medidas.length > 0" class="medidas-tabs">
        <button
          v-for="(medida, mIndex) in form.medidas"
          :key="mIndex"
          class="medida-tab"
          :class="{ 'active': medidaActivaIndex === mIndex }"
          @click="medidaActivaIndex = mIndex"
        >
          <span class="medida-tab-nombre">{{ medida.nombre || `Medida ${mIndex + 1}` }}</span>
        </button>
        <button
          class="medida-tab medida-tab-add"
          title="Agregar otra medida"
          @click="agregarMedida"
        >
          ➕
        </button>
      </div>

      <!-- Tabla de la medida activa -->
      <div
        v-if="medidaActiva"
        class="medida-card"
      >
        <div class="medida-card-header">
          <div class="medida-titulo">
            <i class="icon-ruler">📏</i>
            <input
              v-model="medidaActiva.nombre"
              type="text"
              placeholder="Medida (ej. 51/60, U-15, etc.)"
              class="medida-input"
            >
          </div>
          <button
            class="btn-delete-medida"
            title="Eliminar esta medida"
            @click="eliminarMedida(medidaActivaIndex)"
          >
            🗑️
          </button>
        </div>

        <div class="tabla-wrapper" :class="{ 'tabla-scrollable': medidaActiva.filas.length > 9 }">
          <table class="tabla-medida">
            <thead>
              <tr>
                <th>Taras</th>
                <th>Kilos</th>
                <th>Neto</th>
                <th class="col-accion"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(fila, fIndex) in medidaActiva.filas" :key="fIndex">
                <td>
                  <input
                    v-model.number="fila.taras"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    class="celda-input"
                  >
                </td>
                <td>
                  <input
                    v-model.number="fila.kilos"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    class="celda-input"
                  >
                </td>
                <td class="neto-cell">{{ formatNumber(netoFila(fila)) }}</td>
                <td class="col-accion">
                  <button
                    class="btn-delete-fila"
                    title="Eliminar fila"
                    @click="eliminarFila(medidaActiva, fIndex)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td class="total-cell">{{ formatNumber(sumaTaras(medidaActiva), 0) }}</td>
                <td class="total-cell">{{ formatNumber(sumaKilosBruto(medidaActiva)) }}</td>
                <td class="total-cell">{{ formatNumber(sumaKilos(medidaActiva)) }}</td>
                <td class="col-accion"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button class="btn-add-fila" @click="agregarFila(medidaActiva)">
          <i class="btn-icon">➕</i> Agregar fila
        </button>
      </div>

      <!-- Resumen total -->
      <div class="resumen-total-card">
        <h3 class="section-title">
          <i class="icon-summary">📊</i>
          Resumen
        </h3>
        <div class="tabla-wrapper">
          <table class="tabla-resumen">
            <thead>
              <tr>
                <th>Medida</th>
                <th>Taras</th>
                <th>Kilos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(medida, mIndex) in form.medidas" :key="mIndex">
                <td class="medida-col" data-label="Medida">{{ medida.nombre || `Medida ${mIndex + 1}` }}</td>
                <td data-label="Taras">{{ formatNumber(sumaTaras(medida), 0) }}</td>
                <td data-label="Kilos">{{ formatNumber(sumaKilos(medida)) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td class="medida-col" data-label="Medida">Total</td>
                <td data-label="Taras">{{ formatNumber(totalTarasForm, 0) }}</td>
                <td data-label="Kilos">{{ formatNumber(totalKilosForm) }} kg</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Guardar -->
      <div class="button-container">
        <button class="save-button" :disabled="guardando" @click="guardarDescarga">
          {{ guardando ? 'Guardando...' : (editandoId ? 'Actualizar Descarga' : 'Guardar Descarga') }}
        </button>
        <transition name="fade">
          <div v-if="mostrarExito" class="exito-mensaje">
            ✓ Guardado correctamente
          </div>
        </transition>
      </div>
    </template>
  </div>
</template>

<script>
import { db } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import { formatNumber } from '@/utils/formatters';

const COLECCION = 'entradasProductoBarcos';

export default {
  name: 'EntradaProductoBarco',
  components: {
    BackButton
  },
  data() {
    return {
      barcoSeleccionado: '',
      currentView: 'lista',
      descargas: [],
      cargando: false,
      guardando: false,
      editandoId: null,
      medidaActivaIndex: 0,
      mostrarExito: false,
      form: {
        fecha: new Date().toISOString().split('T')[0],
        medidas: []
      }
    };
  },
  computed: {
    gradientePrimario() {
      return this.barcoSeleccionado === 'maria-guadalupe'
        ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'
        : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
    },
    nombreBarco() {
      return this.barcoSeleccionado === 'galileo' ? 'El Galileo' : 'María Guadalupe';
    },
    fechaFormateadaForm() {
      return this.formatearFecha(this.form.fecha);
    },
    totalKilosGlobal() {
      return this.descargas.reduce((sum, d) => sum + this.totalKilosDescarga(d), 0);
    },
    totalTarasForm() {
      return this.form.medidas.reduce((sum, m) => sum + this.sumaTaras(m), 0);
    },
    totalKilosForm() {
      return this.form.medidas.reduce((sum, m) => sum + this.sumaKilos(m), 0);
    },
    medidaActiva() {
      return this.form.medidas[this.medidaActivaIndex] || null;
    }
  },
  mounted() {
    const urlParams = new URLSearchParams(window.location.search);
    this.barcoSeleccionado = urlParams.get('barco') || localStorage.getItem('barcoSeleccionado') || 'galileo';
    this.cargarDescargas();
  },
  methods: {
    formatNumber,
    formatearFecha(fechaISO) {
      if (!fechaISO) return '';
      const fecha = new Date(fechaISO + 'T00:00:00');
      if (isNaN(fecha.getTime())) return fechaISO;
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    sumaTaras(medida) {
      return (medida.filas || []).reduce((s, f) => s + (parseFloat(f.taras) || 0), 0);
    },
    sumaKilosBruto(medida) {
      return (medida.filas || []).reduce((s, f) => s + (parseFloat(f.kilos) || 0), 0);
    },
    sumaKilos(medida) {
      const neto = this.sumaKilosBruto(medida) - this.sumaTaras(medida) * 3;
      return neto > 0 ? neto : 0;
    },
    netoFila(fila) {
      const taras = parseFloat(fila.taras) || 0;
      const kilos = parseFloat(fila.kilos) || 0;
      const neto = kilos - taras * 3;
      return neto > 0 ? neto : 0;
    },
    totalKilosDescarga(descarga) {
      return (descarga.medidas || []).reduce((s, m) => s + this.sumaKilos(m), 0);
    },
    totalTarasDescarga(descarga) {
      return (descarga.medidas || []).reduce((s, m) => s + this.sumaTaras(m), 0);
    },
    async cargarDescargas() {
      this.cargando = true;
      try {
        const q = query(
          collection(db, COLECCION),
          where('barco', '==', this.barcoSeleccionado),
          orderBy('fecha', 'desc')
        );
        const snapshot = await getDocs(q);
        this.descargas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (error) {
        console.error('Error al cargar descargas:', error);
        // Fallback sin orderBy por si falta el índice
        try {
          const q2 = query(collection(db, COLECCION), where('barco', '==', this.barcoSeleccionado));
          const snapshot2 = await getDocs(q2);
          this.descargas = snapshot2.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
        } catch (error2) {
          console.error('Error en fallback al cargar descargas:', error2);
          alert('Error al cargar las descargas');
        }
      } finally {
        this.cargando = false;
      }
    },
    crearMedidaVacia() {
      return {
        nombre: '',
        filas: [{ taras: null, kilos: null }]
      };
    },
    nuevaDescarga() {
      this.editandoId = null;
      this.form = {
        fecha: new Date().toISOString().split('T')[0],
        medidas: [this.crearMedidaVacia()]
      };
      this.medidaActivaIndex = 0;
      this.currentView = 'editor';
    },
    editarDescarga(descarga) {
      this.editandoId = descarga.id;
      this.form = {
        fecha: descarga.fecha || new Date().toISOString().split('T')[0],
        medidas: (descarga.medidas || []).map(m => ({
          nombre: m.nombre || '',
          filas: (m.filas && m.filas.length > 0)
            ? m.filas.map(f => ({ taras: f.taras, kilos: f.kilos }))
            : [{ taras: null, kilos: null }]
        }))
      };
      if (this.form.medidas.length === 0) {
        this.form.medidas.push(this.crearMedidaVacia());
      }
      this.medidaActivaIndex = 0;
      this.currentView = 'editor';
    },
    volverALista() {
      this.currentView = 'lista';
      this.editandoId = null;
      this.mostrarExito = false;
    },
    agregarMedida() {
      this.form.medidas.push(this.crearMedidaVacia());
      this.medidaActivaIndex = this.form.medidas.length - 1;
    },
    eliminarMedida(index) {
      if (this.form.medidas.length === 1) {
        alert('Debe existir al menos una tabla de medida.');
        return;
      }
      if (confirm('¿Eliminar esta tabla de medida?')) {
        this.form.medidas.splice(index, 1);
        if (this.medidaActivaIndex >= this.form.medidas.length) {
          this.medidaActivaIndex = this.form.medidas.length - 1;
        }
      }
    },
    agregarFila(medida) {
      medida.filas.push({ taras: null, kilos: null });
      this.autoGuardar();
    },
    eliminarFila(medida, index) {
      if (medida.filas.length === 1) {
        medida.filas.splice(0, 1, { taras: null, kilos: null });
        return;
      }
      medida.filas.splice(index, 1);
    },
    prepararMedidasParaGuardar() {
      return this.form.medidas.map(m => ({
        nombre: (m.nombre || '').trim(),
        filas: m.filas
          .filter(f => f.taras !== null && f.taras !== '' || f.kilos !== null && f.kilos !== '')
          .map(f => ({
            taras: parseFloat(f.taras) || 0,
            kilos: parseFloat(f.kilos) || 0
          })),
        totalTaras: this.sumaTaras(m),
        totalKilos: this.sumaKilos(m)
      }));
    },
    async autoGuardar() {
      if (this.guardando) return;

      const medidas = this.prepararMedidasParaGuardar();
      const tieneDatos = medidas.some(m => m.filas.length > 0);
      if (!tieneDatos) return;

      this.guardando = true;
      try {
        const data = {
          barco: this.barcoSeleccionado,
          nombreBarco: this.nombreBarco,
          fecha: this.form.fecha,
          medidas,
          totalTaras: medidas.reduce((s, m) => s + m.totalTaras, 0),
          totalKilos: medidas.reduce((s, m) => s + m.totalKilos, 0),
          updatedAt: new Date()
        };

        if (this.editandoId) {
          await updateDoc(doc(db, COLECCION, this.editandoId), data);
        } else {
          data.createdAt = new Date();
          const docRef = await addDoc(collection(db, COLECCION), data);
          this.editandoId = docRef.id;
        }
      } catch (error) {
        console.error('Error al auto-guardar la descarga:', error);
      } finally {
        this.guardando = false;
      }
    },
    async guardarDescarga() {
      if (this.guardando) return;

      const medidas = this.prepararMedidasParaGuardar();
      const tieneDatos = medidas.some(m => m.filas.length > 0);
      if (!tieneDatos) {
        alert('Agrega al menos una fila con taras o kilos antes de guardar.');
        return;
      }

      this.guardando = true;
      try {
        const data = {
          barco: this.barcoSeleccionado,
          nombreBarco: this.nombreBarco,
          fecha: this.form.fecha,
          medidas,
          totalTaras: medidas.reduce((s, m) => s + m.totalTaras, 0),
          totalKilos: medidas.reduce((s, m) => s + m.totalKilos, 0),
          updatedAt: new Date()
        };

        if (this.editandoId) {
          await updateDoc(doc(db, COLECCION, this.editandoId), data);
        } else {
          data.createdAt = new Date();
          const docRef = await addDoc(collection(db, COLECCION), data);
          this.editandoId = docRef.id;
        }

        await this.cargarDescargas();
        this.mostrarExito = true;
        setTimeout(() => { this.mostrarExito = false; }, 2500);
      } catch (error) {
        console.error('Error al guardar la descarga:', error);
        alert('Error al guardar la descarga');
      } finally {
        this.guardando = false;
      }
    },
    async eliminarDescarga(descarga) {
      if (!confirm(`¿Eliminar la descarga del ${this.formatearFecha(descarga.fecha)}?`)) return;
      try {
        await deleteDoc(doc(db, COLECCION, descarga.id));
        await this.cargarDescargas();
      } catch (error) {
        console.error('Error al eliminar la descarga:', error);
        alert('Error al eliminar la descarga');
      }
    }
  }
};
</script>

<style scoped>
.entrada-producto-barco {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.back-button-container {
  margin-bottom: 30px;
}

/* Header */
.header-section {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(52, 152, 219, 0.3);
}

.header-content {
  text-align: center;
  color: white;
}

.main-title {
  font-size: 2.3em;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.subtitle {
  font-size: 1.1em;
  opacity: 0.9;
  margin: 0;
}

/* Resumen cards */
.resumen-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.resumen-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.barco-card {
  color: white;
}

.card-icon {
  font-size: 2.5em;
}

.card-content h3 {
  margin: 0;
  font-size: 1.5em;
  color: inherit;
}

.barco-card .card-content h3 {
  color: white;
}

.card-content p {
  margin: 5px 0 0 0;
  color: #7f8c8d;
}

.barco-card .card-content p {
  color: rgba(255, 255, 255, 0.85);
}

.resumen-card-action {
  cursor: pointer;
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  transition: all 0.3s ease;
}

.resumen-card-action .card-content h3,
.resumen-card-action .card-content p {
  color: white;
}

.resumen-card-action:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 184, 148, 0.3);
}

/* Estado / Empty */
.estado-mensaje,
.empty-state {
  background: white;
  border-radius: 15px;
  padding: 50px 30px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  color: #7f8c8d;
}

.empty-icon {
  font-size: 4em;
  display: block;
  margin-bottom: 15px;
}

.empty-state h3 {
  color: #2c3e50;
  margin: 0 0 10px 0;
}

.btn-primary {
  margin-top: 20px;
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border: none;
  padding: 14px 30px;
  border-radius: 10px;
  font-size: 1.05em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);
}

/* Descargas grid */
.descargas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 25px;
}

.descarga-card {
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.descarga-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.descarga-card-header {
  padding: 18px 20px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.descarga-fecha {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 1.05em;
}

.descarga-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.descarga-card-body {
  padding: 20px;
}

.descarga-totales {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.descarga-total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed #ecf0f1;
}

.descarga-total-item:last-child {
  border-bottom: none;
}

.footer-total-taras {
  font-size: 1.2em;
  font-weight: 700;
  color: #2c3e50;
}

.medidas-resumen {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.medida-resumen-item {
  border: 1px solid #ecf0f1;
  border-radius: 10px;
  overflow: hidden;
}

.medida-resumen-header {
  background: #f8f9fa;
  padding: 10px 14px;
  font-weight: 600;
  color: #2c3e50;
}

.tabla-medida-resumen {
  width: 100%;
  border-collapse: collapse;
}

.tabla-medida-resumen th,
.tabla-medida-resumen td {
  padding: 8px 14px;
  text-align: right;
  border-bottom: 1px solid #f0f0f0;
}

.tabla-medida-resumen th {
  background: #fbfcfd;
  color: #7f8c8d;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tabla-medida-resumen tfoot td {
  font-weight: 700;
  color: #2c3e50;
  background: #f8f9fa;
  border-top: 2px solid #e0e0e0;
}

.descarga-card-footer {
  margin-top: 18px;
  padding-top: 15px;
  border-top: 2px dashed #ecf0f1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-label {
  color: #7f8c8d;
  font-weight: 600;
}

.footer-total {
  font-size: 1.2em;
  font-weight: 700;
  color: #27ae60;
}

/* Editor */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
}

.editor-title {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5em;
}

.btn-secondary {
  background: #ecf0f1;
  color: #2c3e50;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #dfe6e9;
}

.fecha-card,
.medida-card {
  background: white;
  border-radius: 15px;
  padding: 25px 30px;
  margin-bottom: 25px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.2em;
  margin: 0 0 20px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.fecha-container {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.modern-input {
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1em;
  transition: all 0.3s ease;
}

.modern-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.fecha-display {
  font-size: 1.05em;
  color: #34495e;
}

/* Medida card */
.medida-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.medida-titulo {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.icon-ruler {
  font-size: 1.5em;
}

.medida-input {
  flex: 1;
  max-width: 350px;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1.1em;
  font-weight: 600;
  transition: all 0.3s ease;
}

.medida-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.btn-delete-medida {
  background: #ff6b6b;
  color: white;
  border: none;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1.1em;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.btn-delete-medida:hover {
  background: #ee5a24;
  transform: scale(1.05);
}

.tabla-wrapper {
  overflow-x: auto;
}

.tabla-wrapper.tabla-scrollable {
  max-height: 540px;
  overflow-y: auto;
  border: 1px solid #ecf0f1;
  border-radius: 10px;
}

.tabla-wrapper.tabla-scrollable .tabla-medida thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8f9fa;
}

.tabla-wrapper.tabla-scrollable .tabla-medida tfoot td {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #f8f9fa;
}

.tabla-medida {
  width: 100%;
  border-collapse: collapse;
}

.tabla-medida th {
  background: #f8f9fa;
  padding: 14px 15px;
  text-align: center;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e0e0e0;
}

.tabla-medida td {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  text-align: center;
}

.col-accion {
  width: 50px;
}

.celda-input {
  width: 100%;
  max-width: 160px;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1em;
  text-align: right;
  transition: all 0.3s ease;
}

.celda-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.neto-cell {
  font-weight: 600;
  color: #27ae60;
  text-align: right;
  padding-right: 22px;
}

.btn-delete-fila {
  background: transparent;
  color: #ff6b6b;
  border: 1px solid #ff6b6b;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s ease;
}

.btn-delete-fila:hover {
  background: #ff6b6b;
  color: white;
}

.total-row .total-cell {
  font-weight: 700;
  color: #2c3e50;
  background: #f8f9fa;
  border-top: 2px solid #e0e0e0;
  text-align: right;
  padding-right: 22px;
}

.btn-add-fila {
  margin-top: 15px;
  background: #f0f7ff;
  color: #2980b9;
  border: 2px dashed #3498db;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-add-fila:hover {
  background: #e1f0ff;
}

/* Pestañas de medidas */
.medidas-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
  padding: 10px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
}

.medida-tab {
  background: #f0f3f7;
  color: #2c3e50;
  border: 2px solid transparent;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.medida-tab:hover {
  background: #e1e7ee;
}

.medida-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.medida-tab-nombre {
  white-space: nowrap;
}

.medida-tab-add {
  background: #e8f4ff;
  color: #2980b9;
  border: 2px dashed #3498db;
  font-size: 1em;
}

.medida-tab-add:hover {
  background: #d4ecff;
}

/* Resumen total */
.resumen-total-card {
  background: white;
  border-radius: 15px;
  padding: 25px 30px;
  margin-bottom: 25px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.tabla-resumen {
  width: 100%;
  border-collapse: collapse;
}

.tabla-resumen th {
  background: #f8f9fa;
  padding: 12px 15px;
  text-align: right;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e0e0e0;
  font-size: 0.95em;
}

.tabla-resumen th:first-child,
.tabla-resumen td.medida-col {
  text-align: left;
}

.tabla-resumen td {
  padding: 12px 15px;
  text-align: right;
  border-bottom: 1px solid #f0f0f0;
  color: #34495e;
  font-size: 1em;
}

.tabla-resumen td.medida-col {
  font-weight: 600;
  color: #2c3e50;
}

.tabla-resumen tfoot .total-row td {
  font-weight: 700;
  background: #f8f9fa;
  border-top: 2px solid #e0e0e0;
  border-bottom: none;
  color: #2c3e50;
  font-size: 1.1em;
  padding: 15px;
}

.tabla-resumen tfoot .total-row td:last-child {
  color: #27ae60;
}

/* Guardar */
.button-container {
  text-align: center;
  margin-bottom: 50px;
}

.save-button {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border: none;
  padding: 18px 50px;
  border-radius: 12px;
  font-size: 1.2em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);
}

.save-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 184, 148, 0.4);
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.exito-mensaje {
  margin-top: 15px;
  display: inline-block;
  background: #d4edda;
  color: #155724;
  padding: 10px 22px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1em;
  border: 1px solid #c3e6cb;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .header-section {
    padding: 25px;
  }

  .main-title {
    font-size: 1.8em;
  }

  .descargas-grid {
    grid-template-columns: 1fr;
  }

  .medida-card,
  .fecha-card {
    padding: 20px;
  }

  .medida-input {
    max-width: none;
  }
}

@media (max-width: 640px) {
  .resumen-total-card {
    padding: 18px 14px;
  }

  .tabla-resumen th,
  .tabla-resumen td {
    padding: 10px 6px;
    font-size: 0.9em;
  }

  .tabla-resumen tfoot .total-row td {
    padding: 12px 6px;
    font-size: 1em;
  }
}

@media (max-width: 400px) {
  .resumen-total-card {
    padding: 14px 10px;
  }

  .tabla-resumen th,
  .tabla-resumen td {
    padding: 8px 4px;
    font-size: 0.82em;
  }

  .tabla-resumen tfoot .total-row td {
    padding: 10px 4px;
    font-size: 0.95em;
  }
}

/* Galaxy Fold 6 cerrado y otros dispositivos muy angostos */
@media (max-width: 380px) {
  .entrada-producto-barco {
    padding: 10px;
  }

  .resumen-total-card {
    padding: 12px 8px;
  }

  .resumen-total-card .section-title {
    font-size: 1em;
    margin-bottom: 12px;
  }

  .tabla-resumen th,
  .tabla-resumen td {
    padding: 6px 3px;
    font-size: 0.75em;
  }

  .tabla-resumen tfoot .total-row td {
    padding: 8px 3px;
    font-size: 0.85em;
  }
}

@media (max-width: 340px) {
  .tabla-resumen th,
  .tabla-resumen td {
    padding: 5px 2px;
    font-size: 0.7em;
  }

  .tabla-resumen tfoot .total-row td {
    padding: 7px 2px;
    font-size: 0.78em;
  }
}
</style>
