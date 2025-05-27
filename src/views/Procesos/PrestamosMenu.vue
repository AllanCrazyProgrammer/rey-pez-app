<template>
  <div class="prestamos-menu-container">
    <div class="back-button-container">
      <BackButton to="/procesos" />
    </div>
    
    <h1 class="menu-title">Gestión de Préstamos</h1>
    
    <div class="menu-description">
      <p>Administra los préstamos otorgados a despicadoras y trabajadores</p>
    </div>
    
    <div class="actions-container">
      <router-link to="/procesos/prestamos/despicadoras" class="action-button despicadoras">
        <div class="button-content">
          <i class="fas fa-industry"></i>
          <div class="button-text">
            <h3>Préstamos a Despicadoras</h3>
            <p>Gestiona préstamos otorgados a las despicadoras</p>
          </div>
        </div>
        <i class="fas fa-arrow-right"></i>
      </router-link>
      
      <router-link to="/procesos/prestamos/trabajadores" class="action-button trabajadores">
        <div class="button-content">
          <i class="fas fa-users"></i>
          <div class="button-text">
            <h3>Préstamos a Trabajadores</h3>
            <p>Gestiona préstamos otorgados a empleados</p>
          </div>
        </div>
        <i class="fas fa-arrow-right"></i>
      </router-link>
    </div>
    
    <div class="resumen-container">
      <div class="resumen-card">
        <h3>Resumen General</h3>
        <div class="resumen-stats">
          <div class="stat-item">
            <span class="stat-label">Total Préstamos Activos:</span>
            <span class="stat-value">{{ totalPrestamosActivos }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Monto Total Pendiente:</span>
            <span class="stat-value">${{ formatNumber(montoTotalPendiente) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';

export default {
  name: 'PrestamosMenu',
  components: {
    BackButton
  },
  data() {
    return {
      totalPrestamosActivos: 0,
      montoTotalPendiente: 0
    };
  },
  methods: {
    formatNumber(number) {
      return number ? number.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    },
    
    async cargarResumen() {
      try {
        // Cargar préstamos de despicadoras
        const prestamosDesQuery = query(
          collection(db, 'prestamosDespicadoras'),
          where('estado', '==', 'activo')
        );
        const prestamosDesSnapshot = await getDocs(prestamosDesQuery);
        
        // Cargar préstamos de trabajadores
        const prestamosTrabQuery = query(
          collection(db, 'prestamosTrabajadores'),
          where('estado', '==', 'activo')
        );
        const prestamosTrabSnapshot = await getDocs(prestamosTrabQuery);
        
        this.totalPrestamosActivos = prestamosDesSnapshot.size + prestamosTrabSnapshot.size;
        
        let montoTotal = 0;
        prestamosDesSnapshot.forEach(doc => {
          const data = doc.data();
          montoTotal += data.saldoPendiente || 0;
        });
        
        prestamosTrabSnapshot.forEach(doc => {
          const data = doc.data();
          montoTotal += data.saldoPendiente || 0;
        });
        
        this.montoTotalPendiente = montoTotal;
      } catch (error) {
        console.error("Error al cargar resumen de préstamos: ", error);
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