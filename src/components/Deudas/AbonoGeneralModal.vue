<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content abono-general-modal" role="dialog" aria-modal="true" aria-labelledby="abono-general-title" @click.stop>
      <header class="modal-header">
        <div class="terminal-title">
          <span class="prompt">&gt;</span>
          <div><small>ABONO_GENERAL.exe</small><h2 id="abono-general-title">Distribuir abono general</h2></div>
        </div>
        <button @click="$emit('cerrar')" class="close-button" aria-label="Cerrar">×</button>
      </header>

      <div class="modal-body">
        <div v-if="!proveedor" class="error-no-proveedor">
          <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <h3>No hay proveedor seleccionado</h3>
          <p>Selecciona un proveedor en la consulta para continuar.</p>
        </div>

        <div v-else class="general-payment-layout">
          <section class="provider-summary">
            <div><span>PROVEEDOR</span><strong>{{ proveedor.nombre }}</strong></div>
            <div><span>NOTAS PENDIENTES</span><strong>{{ deudasPendientes.length }}</strong></div>
            <div><span>SALDO TOTAL</span><strong class="saldo-total">${{ formatNumber(saldoTotalPendiente) }}</strong></div>
          </section>

          <div v-if="cargando" class="loading-state"><span class="loader">▋</span> Cargando notas pendientes…</div>
          <template v-else>
            <section class="form-abono">
              <div class="section-label"><span>01</span><h3>Datos del pago</h3></div>
              <div class="form-grid">
                <div class="form-group"><label for="fechaAbono">Fecha del abono</label><input id="fechaAbono" type="date" v-model="nuevoAbono.fecha" required></div>
                <div class="form-group description-field"><label for="descripcionAbono">Descripción o referencia</label><input id="descripcionAbono" type="text" v-model.trim="nuevoAbono.descripcion" placeholder="Ej. Transferencia semanal" required></div>
                <div class="form-group amount-field"><label for="montoAbono">Monto total</label><div class="amount-input"><span>$</span><input id="montoAbono" type="number" v-model.number="nuevoAbono.monto" :max="saldoTotalPendiente" min="0.01" step="0.01" placeholder="0.00" required></div><small>Máximo: ${{ formatNumber(saldoTotalPendiente) }}</small></div>
              </div>
            </section>

            <section class="distribution-section">
              <div class="section-label"><span>02</span><div><h3>Vista previa de distribución</h3><small>La numeración indica la prioridad de aplicación.</small></div></div>
              <div v-if="!nuevoAbono.monto" class="preview-empty"><i class="fas fa-keyboard"></i><p>Captura un monto para ver cómo se repartirá.</p></div>
              <div v-else-if="nuevoAbono.monto > saldoTotalPendiente" class="preview-error"><i class="fas fa-exclamation-triangle"></i> El monto supera el saldo total pendiente.</div>
              <div v-else class="deudas-list">
                <article v-for="(distribucion, index) in distribucionCalculada" :key="distribucion.deudaId" class="deuda-distribucion">
                  <span class="priority-number">{{ String(index + 1).padStart(2, '0') }}</span>
                  <div class="deuda-info"><span class="fecha">Nota del {{ formatearFecha(distribucion.fecha) }}</span><span class="saldo-actual">Saldo antes: ${{ formatNumber(distribucion.saldoActual) }}</span></div>
                  <div class="distribution-arrow"><i class="fas fa-long-arrow-alt-right"></i></div>
                  <div class="abono-aplicado"><span class="monto-abono">-${{ formatNumber(distribucion.montoAbono) }}</span><span class="saldo-restante">Queda ${{ formatNumber(distribucion.saldoRestante) }}</span></div>
                  <span :class="['result-badge', { paid: distribucion.saldoRestante <= 0 }]">{{ distribucion.saldoRestante <= 0 ? 'Liquidada' : 'Parcial' }}</span>
                </article>
              </div>
            </section>

            <footer class="modal-actions">
              <div class="distribution-total"><span>Total a distribuir</span><strong>${{ formatNumber(totalDistribuido) }}</strong></div>
              <button @click="$emit('cerrar')" class="btn-cancelar">Cancelar</button>
              <button @click="aplicarAbonoGeneral" class="btn-aplicar" :disabled="!puedeAplicar || guardando"><i :class="guardando ? 'fas fa-circle-notch fa-spin' : 'fas fa-check'"></i>{{ guardando ? 'Aplicando…' : 'Confirmar distribución' }}</button>
            </footer>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { formatNumber, formatearFecha } from '@/utils/formatters';

export default {
  name: 'AbonoGeneralModal',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    proveedor: {
      type: Object,
      required: false,
      default: null
    }
  },
  emits: ['cerrar', 'abono-aplicado'],
  data() {
    return {
      deudasPendientes: [],
      cargando: false,
      guardando: false,
      nuevoAbono: {
        fecha: this.obtenerFechaActual(),
        descripcion: 'Pago',
        monto: null
      }
    };
  },
  computed: {
    saldoTotalPendiente() {
      return this.deudasPendientes.reduce((sum, deuda) => sum + deuda.saldoPendiente, 0);
    },
    
    puedeAplicar() {
      return this.nuevoAbono.fecha && 
             this.nuevoAbono.descripcion && 
             this.nuevoAbono.monto > 0 && 
             this.nuevoAbono.monto <= this.saldoTotalPendiente &&
             this.deudasPendientes.length > 0 &&
             !this.cargando;
    },
    
    distribucionCalculada() {
      if (!this.nuevoAbono.monto || this.deudasPendientes.length === 0) return [];
      
      let montoRestante = this.nuevoAbono.monto;
      const distribucion = [];
      
      // Ordenar deudas por fecha (más antiguas primero)
      const deudasOrdenadas = [...this.deudasPendientes].sort(this.compararDeudasFIFO);
      
      for (const deuda of deudasOrdenadas) {
        if (montoRestante <= 0) break;
        
        const montoAbono = Math.min(montoRestante, deuda.saldoPendiente);
        const saldoRestante = deuda.saldoPendiente - montoAbono;
        
        distribucion.push({
          deudaId: deuda.id,
          fecha: deuda.fecha,
          saldoActual: deuda.saldoPendiente,
          montoAbono: montoAbono,
          saldoRestante: saldoRestante
        });
        
        montoRestante -= montoAbono;
      }
      
      return distribucion;
    },
    
    totalDistribuido() {
      return this.distribucionCalculada.reduce((sum, dist) => sum + dist.montoAbono, 0);
    },
    
    montoSobrante() {
      return Math.max(0, (Number(this.nuevoAbono.monto) || 0) - this.totalDistribuido);
    }
  },
  methods: {
    formatNumber,
    formatearFecha,
    obtenerFechaActual() {
      const fecha = new Date();
      // Usar la zona horaria local para evitar problemas de UTC
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // getMonth() retorna 0-11
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    },
    
    cerrarModal(event) {
      if (event.target === event.currentTarget) {
        this.$emit('cerrar');
      }
    },

    fechaEnMilisegundos(valor) {
      if (!valor) return Number.MAX_SAFE_INTEGER;
      if (typeof valor.toDate === 'function') return valor.toDate().getTime();
      const fecha = new Date(valor);
      return Number.isNaN(fecha.getTime()) ? Number.MAX_SAFE_INTEGER : fecha.getTime();
    },

    compararDeudasFIFO(a, b) {
      const porFecha = this.fechaEnMilisegundos(a.fecha) - this.fechaEnMilisegundos(b.fecha);
      if (porFecha !== 0) return porFecha;

      const porCreacion = this.fechaEnMilisegundos(a.fechaCreacion) - this.fechaEnMilisegundos(b.fechaCreacion);
      if (porCreacion !== 0) return porCreacion;

      return String(a.id).localeCompare(String(b.id));
    },
    
    async cargarDeudasPendientes() {
      if (!this.proveedor?.id) {
        console.warn('No se puede cargar deudas: proveedor no seleccionado');
        this.deudasPendientes = [];
        return;
      }
      
      try {
        this.cargando = true;
        // Consulta sin orderBy para evitar el error de índice
        const deudasQuery = query(
          collection(db, 'deudas'),
          where('proveedorId', '==', this.proveedor.id),
          where('estado', '==', 'pendiente')
        );
        
        const querySnapshot = await getDocs(deudasQuery);
        let deudas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ordenar manualmente por fecha para evitar problema de índice
        deudas.sort(this.compararDeudasFIFO);
        
        this.deudasPendientes = deudas;
        
      } catch (error) {
        console.error('Error al cargar deudas pendientes:', error);
        this.deudasPendientes = [];
        // Mostrar error específico según el tipo
        if (error.code === 'failed-precondition') {
          alert('Error de base de datos: Se requiere configurar un índice. Contacte al administrador.');
        } else {
          alert('Error al cargar las deudas pendientes. Por favor, intente de nuevo.');
        }
      } finally {
        this.cargando = false;
      }
    },
    
    async aplicarAbonoGeneral() {
      if (!this.puedeAplicar) return;
      
      try {
        this.guardando = true;
        const batch = writeBatch(db);
        const fechaCreacion = new Date();
        const abonoGeneralId = doc(collection(db, 'abonosGenerales')).id;

        // La distribución ya está ordenada FIFO. Todas las escrituras se confirman juntas.
        for (const distribucion of this.distribucionCalculada) {
          if (distribucion.montoAbono > 0) {
            const abonoRef = doc(collection(db, 'deudas', distribucion.deudaId, 'abonos'));
            batch.set(abonoRef, {
              descripcion: `${this.nuevoAbono.descripcion} (Abono General)`,
              monto: distribucion.montoAbono,
              fecha: this.nuevoAbono.fecha,
              fechaCreacion,
              esAbonoGeneral: true,
              abonoGeneralId
            });

            const nuevoSaldoPendiente = distribucion.saldoRestante;
            const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'pendiente';
            batch.update(doc(db, 'deudas', distribucion.deudaId), {
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoEstado
            });
          }
        }

        await batch.commit();

        alert(`Abono general de $${this.formatNumber(this.nuevoAbono.monto)} aplicado correctamente`);
        this.$emit('abono-aplicado');
        this.$emit('cerrar');
        
      } catch (error) {
        console.error('Error al aplicar abono general:', error);
        alert('Error al aplicar el abono general: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
  },
  
  watch: {
    mostrar(newVal) {
      if (newVal && this.proveedor) {
        this.cargarDeudasPendientes();
        // Resetear formulario
        this.nuevoAbono = {
          fecha: this.obtenerFechaActual(),
          descripcion: 'Pago',
          monto: null
        };
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.abono-general-modal {
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 2px solid #e9ecef;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border-radius: 15px 15px 0 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: white;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 25px;
}

.error-no-proveedor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #dc2626;
}

.error-no-proveedor .error-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.error-no-proveedor h3 {
  margin: 0 0 15px 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.error-no-proveedor p {
  margin: 0;
  font-size: 1.1rem;
  color: #6b7280;
  max-width: 400px;
}

.proveedor-info {
  margin-bottom: 25px;
}

.info-card {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 10px;
  padding: 20px;
  border-left: 4px solid #3498db;
}

.info-card h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-weight: 600;
}

.resumen-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: 500;
  color: #5a6c7d;
}

.valor {
  font-weight: 600;
  color: #2c3e50;
}

.saldo-total {
  color: #e74c3c;
  font-size: 1.2em;
}

.form-abono {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-abono h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.distribucion-preview {
  margin-top: 25px;
  padding: 20px;
  background: white;
  border-radius: 10px;
  border: 2px solid #e9ecef;
}

.distribucion-preview h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-weight: 600;
}

.deudas-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.deuda-distribucion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 4px solid #3498db;
}

.deuda-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fecha {
  font-weight: 500;
  color: #2c3e50;
}

.saldo-actual {
  font-size: 0.9em;
  color: #7f8c8d;
}

.abono-aplicado {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.monto-abono {
  font-weight: 600;
  color: #27ae60;
  font-size: 1.1em;
}

.saldo-restante {
  font-size: 0.9em;
  color: #7f8c8d;
}

.resumen-distribucion {
  padding: 15px;
  background: linear-gradient(135deg, #e8f6f3, #d5f4e6);
  border-radius: 8px;
  border-left: 4px solid #27ae60;
}

.total-distribuido {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
}

.monto-sobrante {
  color: #f39c12;
  font-weight: 500;
  font-size: 0.9em;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 2px solid #e9ecef;
}

.btn-cancelar, .btn-aplicar {
  padding: 12px 25px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
}

.btn-cancelar {
  background: #bdc3c7;
  color: #2c3e50;
}

.btn-cancelar:hover {
  background: #95a5a6;
}

.btn-aplicar {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
}

.btn-aplicar:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
}

.btn-aplicar:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .abono-general-modal {
    width: 95%;
    margin: 10px;
  }
  
  .resumen-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .deuda-distribucion {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .abono-aplicado {
    align-items: flex-start;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
/* Terminal CRT modal */
.modal-overlay { padding: 18px; box-sizing: border-box; background: rgba(0,5,3,.88); backdrop-filter: blur(7px); }
.abono-general-modal { --green:#00ff88; --amber:#ffb000; --cyan:#22d3ee; --red:#ff5f56; width:min(920px,100%); max-width:920px; max-height:94vh; border:1px solid rgba(0,255,136,.38); border-radius:0; background:repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0,rgba(255,255,255,.015) 1px,transparent 1px,transparent 4px),#050d09; box-shadow:0 0 42px rgba(0,255,136,.13); color:#d8ffe9; font-family:'Share Tech Mono',monospace; }
.modal-header { padding:14px 18px; border:0; border-bottom:1px solid rgba(0,255,136,.3); border-radius:0; background:#091710; }
.terminal-title { display:flex; align-items:center; gap:12px; }
.terminal-title .prompt { color:var(--amber); font:2rem 'VT323',monospace; }
.terminal-title small { color:#668a74; font-size:.62rem; letter-spacing:.1em; }
.terminal-title h2 { color:var(--green); font:1.65rem 'VT323',monospace; letter-spacing:.04em; text-shadow:0 0 8px rgba(0,255,136,.4); }
.close-button { border:1px solid rgba(255,95,86,.4); border-radius:0; color:var(--red); font:1.3rem 'Share Tech Mono',monospace; }
.close-button:hover { background:rgba(255,95,86,.12); }
.modal-body { padding:18px; }
.general-payment-layout { display:grid; gap:14px; }
.provider-summary { display:grid; grid-template-columns:1.5fr 1fr 1fr; border:1px solid rgba(0,255,136,.24); background:#07110c; }
.provider-summary > div { display:flex; flex-direction:column; gap:6px; padding:14px 16px; border-right:1px solid rgba(0,255,136,.18); }
.provider-summary > div:last-child { border:0; }
.provider-summary span { color:#668a74; font-size:.62rem; letter-spacing:.08em; }
.provider-summary strong { color:#d8ffe9; font-size:.95rem; }
.provider-summary .saldo-total { color:var(--amber); }
.loading-state { padding:32px; border:1px dashed rgba(0,255,136,.28); color:#85ab92; text-align:center; }
.loader { color:var(--green); animation:crtBlink .8s steps(1) infinite; }
@keyframes crtBlink { 50%{opacity:0;} }
.form-abono,.distribution-section { margin:0; padding:0; border:1px solid rgba(0,255,136,.22); border-radius:0; background:#06100b; }
.section-label { display:flex; align-items:center; gap:10px; padding:11px 14px; border-bottom:1px solid rgba(0,255,136,.22); background:#091710; }
.section-label > span { color:var(--green); font:1.15rem 'VT323',monospace; }
.section-label h3 { margin:0; color:#cfeadb; font-size:.78rem; letter-spacing:.06em; text-transform:uppercase; }
.section-label small { color:#668a74; font-size:.61rem; }
.form-grid { display:grid; grid-template-columns:170px minmax(220px,1fr) 190px; gap:12px; padding:15px; }
.form-group { margin:0; }
.form-group label { margin-bottom:7px; color:#89aa96; font-size:.68rem; text-transform:uppercase; }
.form-group input { box-sizing:border-box; border:1px solid #26503a; border-radius:0; background:#020805; color:#e3ffec; font:.78rem 'Share Tech Mono',monospace; color-scheme:dark; }
.form-group input:focus { border-color:var(--green); box-shadow:0 0 0 2px rgba(0,255,136,.1); }
.amount-input { position:relative; }
.amount-input span { position:absolute; top:50%; left:12px; color:var(--amber); transform:translateY(-50%); }
.amount-input input { padding-left:28px; }
.amount-field small { display:block; margin-top:5px; color:#657f70; font-size:.6rem; }
.preview-empty,.preview-error { display:flex; align-items:center; justify-content:center; gap:9px; min-height:90px; color:#627d6d; font-size:.72rem; }
.preview-empty p { margin:0; }
.preview-error { color:#ff8a83; }
.deudas-list { max-height:290px; margin:0; padding:10px; }
.deuda-distribucion { display:grid; grid-template-columns:38px minmax(160px,1fr) auto minmax(140px,.8fr) auto; align-items:center; gap:11px; margin:0 0 7px; padding:11px; border:1px solid rgba(0,255,136,.14); border-left:1px solid rgba(0,255,136,.14); border-radius:0; background:#040b07; }
.priority-number { display:grid; place-items:center; width:32px; height:32px; border:1px solid var(--green); color:var(--green); font:1rem 'VT323',monospace; }
.deuda-info,.abono-aplicado { gap:3px; }
.fecha { color:#cdebd7; font-size:.72rem; }
.saldo-actual,.saldo-restante { color:#6e8878; font-size:.62rem; }
.distribution-arrow { color:#4a6655; }
.abono-aplicado { align-items:flex-start; }
.monto-abono { color:var(--cyan); font-size:.8rem; }
.result-badge { padding:4px 6px; border:1px solid var(--amber); color:var(--amber); font-size:.58rem; text-transform:uppercase; }
.result-badge.paid { border-color:var(--green); color:var(--green); }
.modal-actions { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:10px; padding:14px; border:1px solid rgba(0,255,136,.22); background:#07110c; }
.distribution-total { display:flex; flex-direction:column; gap:3px; }
.distribution-total span { color:#668a74; font-size:.6rem; text-transform:uppercase; }
.distribution-total strong { color:var(--amber); font-size:1rem; }
.btn-cancelar,.btn-aplicar { min-width:0; padding:10px 14px; border-radius:0; font:.7rem 'Share Tech Mono',monospace; text-transform:uppercase; }
.btn-cancelar { border:1px solid #41604d; background:transparent; color:#9ab7a4; }
.btn-aplicar { display:flex; align-items:center; gap:7px; border:1px solid var(--green); background:var(--green); color:#021008; }
.btn-aplicar:hover:not(:disabled) { box-shadow:0 0 15px rgba(0,255,136,.2); transform:none; }
.btn-aplicar:disabled { border-color:#355143; background:#1b2b22; color:#597064; }

@media(max-width:720px){ .modal-overlay{padding:8px;} .abono-general-modal{width:100%;max-height:97vh;} .provider-summary,.form-grid{grid-template-columns:1fr;} .provider-summary>div{border-right:0;border-bottom:1px solid rgba(0,255,136,.18);} .deuda-distribucion{grid-template-columns:34px 1fr auto;} .distribution-arrow{display:none;} .abono-aplicado{grid-column:2;} .result-badge{grid-column:3;grid-row:1;} .modal-actions{grid-template-columns:1fr 1fr;} .distribution-total{grid-column:1/-1;} }
</style>
