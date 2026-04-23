<template>
  <div v-if="mostrar" class="modal-overlay" @click.self="$emit('cerrar')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Entradas por proveedor</h3>
        <button class="close-button" @click="$emit('cerrar')">&times;</button>
      </div>

      <div class="modal-body">
        <div class="filtros">
          <div class="filtro-item">
            <label for="proveedores-select">Proveedores (seleccion multiple):</label>
            <select id="proveedores-select" v-model="proveedoresSeleccionados" multiple>
              <option
                v-for="proveedor in proveedoresOrdenados"
                :key="proveedor"
                :value="proveedor"
              >
                {{ proveedor }}
              </option>
            </select>
            <small>Mantén presionada la tecla Cmd/Ctrl para seleccionar varios.</small>
          </div>

          <div class="filtro-item">
            <label for="fecha-inicio">Desde:</label>
            <input id="fecha-inicio" v-model="fechaInicio" type="date">
          </div>

          <div class="filtro-item">
            <label for="fecha-fin">Hasta:</label>
            <input id="fecha-fin" v-model="fechaFin" type="date">
          </div>
        </div>

        <div v-if="!proveedoresSeleccionados.length" class="empty-state">
          Selecciona uno o varios proveedores para ver sus entradas.
        </div>

        <div v-else-if="entradasFiltradas.length === 0" class="empty-state">
          No hay entradas para los filtros seleccionados.
        </div>

        <div v-else class="tabla-wrapper">
          <table class="entradas-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Producto</th>
                <th>Kilos</th>
                <th>Cuarto</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entrada in entradasFiltradas" :key="entrada.key">
                <td>{{ formatDateTime(entrada.fecha) }}</td>
                <td>{{ entrada.proveedor }}</td>
                <td>{{ entrada.producto }}</td>
                <td class="numeric">{{ formatNumber(entrada.kilos, 0) }}</td>
                <td>{{ entrada.cuarto }}</td>
                <td class="numeric">
                  {{ entrada.precio > 0 ? `$${formatPrice(entrada.precio)}` : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-actions">
        <button class="secondary-button" @click="$emit('cerrar')">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment';
import { formatNumber } from '@/utils/formatters';

export default {
  name: 'EntradasPorProveedorModal',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    proveedores: {
      type: Array,
      default: () => []
    },
    registros: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      proveedoresSeleccionados: [],
      fechaInicio: '',
      fechaFin: ''
    };
  },
  computed: {
    proveedoresOrdenados() {
      return [...this.proveedores].sort((a, b) => a.localeCompare(b));
    },
    entradasFiltradas() {
      const fechaInicio = this.fechaInicio ? new Date(`${this.fechaInicio}T00:00:00`) : null;
      const fechaFin = this.fechaFin ? new Date(`${this.fechaFin}T23:59:59`) : null;
      const entradas = [];

      this.registros.forEach(registro => {
        const fechaRegistro = registro.fecha instanceof Date ? registro.fecha : new Date(registro.fecha);
        if (fechaInicio && fechaRegistro < fechaInicio) return;
        if (fechaFin && fechaRegistro > fechaFin) return;

        if (Array.isArray(registro.entradas)) {
          registro.entradas.forEach((entrada, idx) => {
            if (!this.proveedoresSeleccionados.includes(entrada.proveedor)) return;
            entradas.push({
              key: `${registro.id}-entrada-${idx}`,
              fecha: fechaRegistro,
              proveedor: entrada.proveedor || '-',
              producto: entrada.producto || '-',
              kilos: Number(entrada.kilos) || 0,
              cuarto: this.normalizeCuarto(entrada.cuartoFrio),
              precio: Number(entrada.precio) || 0
            });
          });
        }
      });

      return entradas.sort((a, b) => b.fecha - a.fecha);
    }
  },
  watch: {
    mostrar(valor) {
      if (valor && this.proveedoresOrdenados.length > 0 && this.proveedoresSeleccionados.length === 0) {
        this.proveedoresSeleccionados = [...this.proveedoresOrdenados];
      }
      if (!valor) {
        this.fechaInicio = '';
        this.fechaFin = '';
      }
    }
  },
  methods: {
    formatNumber,
    normalizeCuarto(cuarto) {
      const valor = (cuarto && cuarto.trim()) ? cuarto.trim() : 's/c';
      return valor.toLowerCase() === 'sin cuarto designado' ? 's/c' : valor;
    },
    formatDateTime(date) {
      return moment(date).format('DD/MM/YYYY HH:mm');
    },
    formatPrice(value) {
      return (value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }
};
</script>

<style scoped>
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
  z-index: 2100;
}

.modal-content {
  background-color: #fff;
  border-radius: 8px;
  width: 95%;
  max-width: 1000px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
}

.filtros {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.filtro-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

select,
input[type="date"] {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 8px;
}

select[multiple] {
  min-height: 140px;
}

.filtro-item small {
  color: #666;
  font-size: 12px;
}

.tabla-wrapper {
  overflow-x: auto;
}

.entradas-table {
  width: 100%;
  border-collapse: collapse;
}

.entradas-table th,
.entradas-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  white-space: nowrap;
}

.entradas-table th {
  background-color: #3760b0;
  color: #fff;
}

.numeric {
  text-align: right;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 16px 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px 18px;
}

.secondary-button {
  background-color: #f0f4f8;
  color: #3760b0;
  border: 1px solid #3760b0;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .filtros {
    grid-template-columns: 1fr;
  }
}
</style>
