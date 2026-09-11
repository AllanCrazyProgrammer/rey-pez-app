<template>
  <div class="prestamos-menu-container">
    <div class="back-button-container">
      <BackButton to="/procesos" />
    </div>
    
    <span class="eyebrow">ADMINISTRACIÓN · REY PEZ</span>
    <h1 class="menu-title">Gestión de préstamos</h1>
    
    <div class="menu-description">
      <p>Todos los préstamos, cada abono y los saldos por cobrar en un solo lugar.</p>
    </div>
    
    <div class="actions-container">
      <router-link to="/procesos/prestamos/despicadoras" class="action-button despicadoras">
        <div class="button-content">
          <i class="fas fa-industry"></i>
          <div class="button-text">
            <h3>Préstamos a Despicadoras</h3>
            <p>Consulta cuentas y registra préstamos o abonos.</p>
            <span class="category-cta">Ver cuentas de despicadoras →</span>
          </div>
        </div>
        <i class="fas fa-arrow-right"></i>
      </router-link>
      
      <router-link to="/procesos/prestamos/trabajadores" class="action-button trabajadores">
        <div class="button-content">
          <i class="fas fa-users"></i>
          <div class="button-text">
            <h3>Préstamos a Trabajadores</h3>
            <p>Consulta cuentas y registra préstamos o abonos.</p>
            <span class="category-cta">Ver cuentas de trabajadores →</span>
          </div>
        </div>
        <i class="fas fa-arrow-right"></i>
      </router-link>
    </div>
    
    <div class="resumen-container">
      <div class="resumen-card">
        <h3>Resumen de cuentas</h3>
        <p v-if="errorCarga" role="alert">{{ errorCarga }} <button @click="cargarResumen">Reintentar</button></p>
        <div class="resumen-stats">
          <div class="stat-item">
            <span class="stat-label">Cuentas con saldo pendiente:</span>
            <span class="stat-value">{{ cargando ? '…' : errorCarga ? '—' : totalPrestamosActivos }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Monto Total Pendiente:</span>
            <span class="stat-value">{{ cargando ? '…' : errorCarga ? '—' : '$' + formatNumber(montoTotalPendiente) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { cargarCuentasPrestamos } from '@/services/prestamosService';
import { resumirSaldos } from '@/utils/prestamos';
import BackButton from '@/components/BackButton.vue';
import { formatNumber } from '@/utils/formatters';

export default {
  name: 'PrestamosMenu',
  components: {
    BackButton
  },
  data() {
    return {
      totalPrestamosActivos: 0,
      cargando: true,
      errorCarga: '',
      montoTotalPendiente: 0
    };
  },
  methods: {
    formatNumber,
    async cargarResumen() {
      this.cargando = true;
      this.errorCarga = '';
      try {
        const [despicadoras, trabajadores] = await Promise.all([
          cargarCuentasPrestamos('prestamosDespicadoras', 'despicadora'),
          cargarCuentasPrestamos('prestamosTrabajadores', 'trabajador')
        ]);
        const resumen = resumirSaldos([
          ...despicadoras.map(c => ({ ...c, cuentaId: 'despicadora:' + c.despicadoraId })),
          ...trabajadores.map(c => ({ ...c, cuentaId: 'trabajador:' + c.trabajadorId }))
        ]);
        this.totalPrestamosActivos = resumen.cuentasConDeuda;
        this.montoTotalPendiente = resumen.totalPendiente;
      } catch (error) {
        console.error("Error al cargar resumen de préstamos: ", error);
        this.errorCarga = 'No se pudo cargar el resumen.';
      } finally {
        this.cargando = false;
      }
    }
  },
  
  async mounted() {
    await this.cargarResumen();
  }
};
</script>

<style scoped>
.prestamos-menu-container {
  max-width: 1000px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
}

.menu-title {
  color: #2c3e50;
  font-size: 2.5em;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 600;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
}

.menu-description {
  text-align: center;
  margin-bottom: 40px;
  color: #7f8c8d;
  font-size: 1.1em;
}

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 25px;
  margin-bottom: 40px;
}

.action-button {
  background: white;
  color: #2c3e50;
  padding: 25px 30px;
  text-decoration: none;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 5px solid transparent;
}

.action-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  color: #2c3e50;
}

.action-button.despicadoras {
  border-left-color: #e74c3c;
}

.action-button.despicadoras:hover {
  background: linear-gradient(135deg, #fff, #fdf2f2);
}

.action-button.trabajadores {
  border-left-color: #2ecc71;
}

.action-button.trabajadores:hover {
  background: linear-gradient(135deg, #fff, #f2fdf5);
}

.button-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.button-content i {
  font-size: 2.5em;
  color: #3498db;
}

.action-button.despicadoras .button-content i {
  color: #e74c3c;
}

.action-button.trabajadores .button-content i {
  color: #2ecc71;
}

.button-text h3 {
  margin: 0 0 5px 0;
  font-size: 1.3em;
  font-weight: 600;
}

.button-text p {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.95em;
}

.resumen-container {
  margin-top: 40px;
}

.resumen-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #3498db;
}

.resumen-card h3 {
  color: #2c3e50;
  margin: 0 0 20px 0;
  font-size: 1.4em;
  text-align: center;
}

.resumen-stats {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #ecf0f1;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: #7f8c8d;
  font-weight: 500;
}

.stat-value {
  color: #3498db;
  font-weight: bold;
  font-size: 1.1em;
}

@media (max-width: 768px) {
  .menu-title {
    font-size: 2em;
  }
  
  .button-content {
    gap: 15px;
  }
  
  .button-content i {
    font-size: 2em;
  }
  
  .button-text h3 {
    font-size: 1.1em;
  }
  
  .button-text p {
    font-size: 0.9em;
  }
  
  .resumen-stats {
    gap: 10px;
  }
  
  .stat-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>

<style scoped>
.prestamos-menu-container { max-width: 1160px; padding: 28px 20px 60px; background: #f8faf8; border-radius: 16px; margin-top: 20px; }
.eyebrow { display: block; margin-top: 28px; font-size: 11px; letter-spacing: .15em; font-weight: 700; color: #397267; }
.menu-title { text-align: left; border: 0; margin: 10px 0; padding: 0; color: #183d40; font-size: clamp(28px, 4vw, 42px); }
.menu-description { text-align: left; color: #687a75; margin-bottom: 32px; }
.actions-container { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.action-button { border: 1px solid #dce7e2; border-top: 4px solid #2f8470; box-shadow: 0 4px 12px #173f3a05; padding: 28px; align-items: start; }
.action-button.despicadoras { border-left-color: #dce7e2; }
.action-button.trabajadores { border-left-color: #dce7e2; border-top-color: #5183a0; }
.button-content { flex-direction: column; align-items: start; gap: 22px; }
.action-button.despicadoras .button-content i { color: #2f8470; }
.action-button.trabajadores .button-content i { color: #5183a0; }
.button-text h3 { font-size: 21px; color: #254c44; }
.button-text p { margin: 10px 0 24px; line-height: 1.6; }
.category-cta { color: #216652; font-size: 13px; font-weight: 600; }
.resumen-card { border: 1px solid #dce7e2; background: #f1f6f3; box-shadow: none; }
.resumen-card h3 { text-align: left; font-size: 17px; color: #365a4b; }
.resumen-stats { flex-direction: row; gap: 40px; flex-wrap: wrap; }
.stat-item { border: 0; flex: 1; min-width: 200px; }
@media (max-width: 650px) { .actions-container { grid-template-columns: 1fr; } .prestamos-menu-container { padding: 18px 12px; } }
</style>
