<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lista-medidas-title"
    >
      <div class="modal-header">
        <div>
          <p class="eyebrow">Planeacion de sacada</p>
          <h3 id="lista-medidas-title">Lista de medidas a sacar</h3>
        </div>
        <button class="close-btn" type="button" aria-label="Cerrar modal" @click="$emit('close')">×</button>
      </div>

      <div class="modal-subtitle">
        <span class="fecha-pill">{{ fechaSacada }}</span>
        <span>Define cuantas cajas o kilos sacar por medida.</span>
      </div>

      <div class="top-measure-actions">
        <button class="quick-measure-btn" type="button" @click="openQuickMeasureModal('pedido')">
          + Nueva medida
        </button>
        <button class="quick-measure-btn quick-measure-btn--proveedor" type="button" @click="openQuickMeasureModal('proveedor')">
          + Nuevo proveedor
        </button>
        <span class="top-measure-help">
          Las medidas apareceran en sus desplegables solo despues de crearlas aqui.
        </span>
      </div>

      <div v-if="grupos.length > 0" class="totales-globales">
        <div class="totales-globales-header">
          <div>
            <span class="totales-globales-title">Resumen total</span>
            <span class="totales-globales-caption">Calculado con las cantidades capturadas</span>
          </div>
          <span class="groups-count">{{ grupos.length }} {{ grupos.length === 1 ? 'pedido' : 'pedidos' }}</span>
        </div>
        <div class="totales-globales-grid">
          <div class="total-card">
            <span class="total-card-label">Total cajas</span>
            <strong>{{ totalCajasGlobal }} cajas</strong>
          </div>
          <div class="total-card">
            <span class="total-card-label">Kilos a granel</span>
            <strong>{{ totalKilosDirectosGlobal }} kg</strong>
          </div>
          <div class="total-card">
            <span class="total-card-label">Total kilos</span>
            <strong>{{ totalKilosDesdeCajasGlobal }} kg</strong>
          </div>
          <div class="total-card total-card--highlight">
            <span class="total-card-label">Kilos limpios</span>
            <strong>{{ totalKilosLimpiosGlobalFormatted }} kg</strong>
          </div>
        </div>
        <span v-if="totalCajasGlobal === 0 && totalKilosDirectosGlobal === 0" class="totales-globales-vacio">
          Agrega cantidades en las medidas para ver el resumen.
        </span>
      </div>

      <div v-if="grupos.length === 0" class="empty-state">
        Aun no hay medidas agregadas.
      </div>

      <div class="groups-grid">
        <div
          v-for="(grupo, groupIndex) in grupos"
          :key="grupo.id"
          class="grupo-card"
          :class="{ 'grupo-card--ozuna': grupo.ozuna }"
        >
          <div class="grupo-header">
            <label class="field-label" :for="`pedido-${grupo.id}`">Medida del pedido</label>
            <button class="remove-btn" type="button" @click="removeGroup(groupIndex)">Eliminar</button>
          </div>

          <div class="pedido-input-row">
            <div class="pedido-combobox">
              <input
                :id="`pedido-${grupo.id}`"
                v-model.trim="grupo.medidaPedido"
                type="text"
                class="text-input"
                placeholder="Escribe o selecciona medida"
                autocomplete="off"
                @focus="openPedidoDropdown(grupo.id)"
                @click="openPedidoDropdown(grupo.id)"
                @blur="scheduleClosePedidoDropdown"
              />
              <div
                v-if="activePedidoDropdownId === grupo.id"
                class="pedido-options-menu"
              >
                <button
                  v-for="medida in getPedidoOptionsFor(grupo.medidaPedido)"
                  :key="`pedido-option-${grupo.id}-${medida}`"
                  type="button"
                  class="pedido-option"
                  @mousedown.prevent="selectPedidoOption(grupo, medida)"
                >
                  {{ medida }}
                </button>
                <p v-if="getPedidoOptionsFor(grupo.medidaPedido).length === 0" class="pedido-options-empty">
                  No hay medidas registradas.
                </p>
              </div>
            </div>
            <label class="ozuna-label" :title="grupo.ozuna ? 'Ozuna' : 'Marcar como Ozuna'">
              <input type="checkbox" v-model="grupo.ozuna" class="ozuna-checkbox" />
              <span class="ozuna-text">Ozuna</span>
            </label>
          </div>

          <div class="rows-title">Proveedor</div>

          <div
            v-for="(item, itemIndex) in grupo.items"
            :key="item.id"
            class="item-row"
          >
            <div class="medida-combobox">
              <input
                v-model.trim="item.medida"
                type="text"
                class="text-input"
                placeholder="Medida proveedor (ej. 67/90)"
                autocomplete="off"
                @focus="openProveedorDropdown(item.id)"
                @click="openProveedorDropdown(item.id)"
                @blur="scheduleCloseProveedorDropdown"
              />
              <div
                v-if="activeProveedorDropdownId === item.id"
                class="medida-options-menu"
              >
                <button
                  v-for="medida in getProveedorOptionsFor(item.medida)"
                  :key="`proveedor-option-${item.id}-${medida}`"
                  type="button"
                  class="medida-option"
                  @mousedown.prevent="selectProveedorOption(item, medida)"
                >
                  {{ medida }}
                </button>
                <p v-if="getProveedorOptionsFor(item.medida).length === 0" class="medida-options-empty">
                  No hay medidas proveedor disponibles.
                </p>
              </div>
            </div>
            <div class="cantidad-col">
              <input
                v-model.number="item.cajas"
                type="number"
                min="0"
                :step="item.esKilos ? 0.1 : 1"
                class="number-input"
                :placeholder="item.esKilos ? 'Kilos' : 'Cajas'"
              />
              <label class="kilos-label" :title="item.esKilos ? 'Kilos' : 'Cajas'">
                <input type="checkbox" v-model="item.esKilos" class="kilos-checkbox" />
                <span class="kilos-text">{{ item.esKilos ? 'kg' : 'caj' }}</span>
              </label>
            </div>
            <button
              class="remove-item-btn"
              type="button"
              aria-label="Eliminar medida"
              @click="removeItem(groupIndex, itemIndex)"
            >
              ×
            </button>
          </div>

          <button class="add-item-btn" type="button" @click="addItem(groupIndex)">+ Agregar medida</button>

          <div class="grupo-total">
            <span v-if="grupo.items.some(i => !i.esKilos)">
              Total cajas: <strong class="grupo-total-strong">{{ totalCajasGrupo(grupo) }} cajas</strong>
              <span class="total-sep"> · </span>
              Total kilos: <strong class="grupo-total-strong">{{ totalKilosDesdeCajas(grupo) }} kg</strong>
            </span>
            <span v-if="grupo.items.some(i => !i.esKilos) && grupo.items.some(i => i.esKilos)" class="total-sep"> · </span>
            <span v-if="grupo.items.some(i => i.esKilos)">
              Kilos directos: <strong class="grupo-total-strong">{{ grupo.items.filter(i => i.esKilos).reduce((s, i) => s + (Number(i.cajas) || 0), 0) }} kg</strong>
            </span>
          </div>

          <div class="grupo-rendimiento">
            <label class="rendimiento-label" :for="`rendimiento-${grupo.id}`">Rendimiento:</label>
            <input
              :id="`rendimiento-${grupo.id}`"
              v-model.number="grupo.rendimiento"
              type="number"
              min="0"
              step="0.01"
              class="number-input rendimiento-input"
              placeholder="ej. 1,20"
            />
            <span
              v-if="textoResultadoRendimiento(grupo)"
              class="rendimiento-resultado texto-destacado-azul"
            >
              <strong>{{ textoResultadoRendimiento(grupo) }} Limpios</strong>
            </span>
          </div>
        </div>
        <div
          v-for="placeholder in gridPlaceholders"
          :key="`grid-placeholder-${placeholder}`"
          class="grupo-card-placeholder"
          aria-hidden="true"
        ></div>
      </div>

      <button class="add-group-btn" type="button" @click="addGroup">+ Agregar medida del pedido</button>

      <div v-if="isQuickMeasureModalOpen" class="quick-modal-overlay" @click.self="closeQuickMeasureModal">
        <div class="quick-modal-content" role="dialog" aria-modal="true" aria-labelledby="quick-medida-title">
          <div class="quick-modal-header">
            <div>
              <p class="eyebrow">Catalogo de medidas</p>
              <h4 id="quick-medida-title">Registrar nueva medida {{ quickMeasure.tipo === 'proveedor' ? 'proveedor' : 'del pedido' }}</h4>
            </div>
            <button class="close-btn close-btn--small" type="button" aria-label="Cerrar registro de medida" @click="closeQuickMeasureModal">×</button>
          </div>

          <label class="quick-field-label" for="quick-medida-nombre">Medida</label>
          <input
            id="quick-medida-nombre"
            v-model.trim="quickMeasure.nombre"
            type="text"
            class="text-input"
            placeholder="Ej. 71/90"
            @keyup.enter="saveQuickMeasure"
          />
          <p class="quick-helper">
            Se guardara y quedara disponible en el desplegable de {{ quickMeasure.tipo === 'proveedor' ? 'proveedor' : 'medidas del pedido' }}.
          </p>

          <div class="registered-measures">
            <h5>Medidas registradas {{ quickMeasure.tipo === 'proveedor' ? 'proveedor' : 'del pedido' }}</h5>
            <p v-if="quickRegisteredMeasures.length === 0" class="registered-empty">
              Aun no hay medidas registradas para {{ quickMeasure.tipo === 'proveedor' ? 'proveedor' : 'pedidos' }}.
            </p>
            <ul v-else class="registered-measures-list">
              <li v-for="medida in quickRegisteredMeasures" :key="medida.id || medida.nombre">
                <button
                  class="registered-measure-name"
                  type="button"
                  @click="selectQuickMeasure(medida.nombre)"
                >
                  {{ medida.nombre }}
                </button>
                <button
                  class="registered-delete-btn"
                  type="button"
                  :disabled="isSavingQuickMeasure"
                  :aria-label="`Eliminar medida ${medida.nombre}`"
                  @click="deleteQuickMeasure(medida)"
                >
                  ×
                </button>
              </li>
            </ul>
          </div>

          <div class="quick-modal-actions">
            <button class="secondary-btn" type="button" @click="closeQuickMeasureModal">Cancelar</button>
            <button class="primary-btn" type="button" :disabled="isSavingQuickMeasure" @click="saveQuickMeasure">
              {{ isSavingQuickMeasure ? 'Guardando...' : 'Guardar medida' }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="pdf-btn" type="button" :disabled="isGeneratingPdf" @click="generarPdfResumen">
          {{ isGeneratingPdf ? 'Generando PDF...' : 'PDF resumido' }}
        </button>
        <button class="secondary-btn" type="button" @click="$emit('close')">Cancelar</button>
        <button class="primary-btn" type="button" :disabled="isSaving" @click="save">
          {{ isSaving ? 'Guardando...' : 'Guardar lista' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { generarResumenMedidasSacadaPDF } from '@/utils/pdf/sacadas';


export default {
  name: 'ListaMedidasPedidoModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    isSaving: {
      type: Boolean,
      default: false
    },
    sacada: {
      type: Object,
      default: null
    },
    medidas: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      grupos: [],
      isGeneratingPdf: false,
      medidasLocales: [],
      isQuickMeasureModalOpen: false,
      isSavingQuickMeasure: false,
      activePedidoDropdownId: null,
      closePedidoDropdownTimer: null,
      activeProveedorDropdownId: null,
      closeProveedorDropdownTimer: null,
      quickMeasure: {
        nombre: '',
        targetGroupId: null,
        targetItemId: null,
        tipo: 'pedido'
      }
    };
  },
  computed: {
    fechaSacada() {
      return this.sacada?.fechaTexto || 'Sin fecha';
    },
    medidaPedidoOptions() {
      return this.medidasPedidoRegistradas.map((medida) => medida.nombre);
    },
    medidasPedidoRegistradas() {
      const medidas = [
        ...this.medidas.filter((medida) => medida?.createdFromListaMedidasPedido),
        ...this.medidasLocales
      ]
        .map((medida) => ({
          id: medida?.id || null,
          nombre: medida?.nombre || medida?.medida || medida?.descripcion || ''
        }))
        .filter((medida) => medida.nombre);

      const porNombre = new Map();
      medidas.forEach((medida) => {
        const key = medida.nombre.trim().toLowerCase();
        if (!porNombre.has(key)) {
          porNombre.set(key, medida);
        }
      });

      return Array.from(porNombre.values())
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
    },
    medidaProveedorOptions() {
      const opciones = [
        ...this.medidas.filter((medida) => medida?.createdFromListaMedidasProveedor),
        ...this.medidasLocales.filter((medida) => medida?.createdFromListaMedidasProveedor),
        ...this.todosLosItems.map((item) => ({ nombre: item.medida }))
      ]
        .map((medida) => medida?.nombre || medida?.medida || medida?.descripcion || '')
        .filter(Boolean);

      return [...new Set(opciones)].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    },
    medidasProveedorRegistradas() {
      const medidas = [
        ...this.medidas.filter((medida) => medida?.createdFromListaMedidasProveedor),
        ...this.medidasLocales.filter((medida) => medida?.createdFromListaMedidasProveedor)
      ]
        .map((medida) => ({
          id: medida?.id || null,
          nombre: medida?.nombre || medida?.medida || medida?.descripcion || ''
        }))
        .filter((medida) => medida.nombre);

      const porNombre = new Map();
      medidas.forEach((medida) => {
        const key = medida.nombre.trim().toLowerCase();
        if (!porNombre.has(key)) {
          porNombre.set(key, medida);
        }
      });

      return Array.from(porNombre.values())
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
    },
    quickRegisteredMeasures() {
      return this.quickMeasure.tipo === 'proveedor'
        ? this.medidasProveedorRegistradas
        : this.medidasPedidoRegistradas;
    },
    gridPlaceholders() {
      const desktopColumns = 4;
      const remainder = this.grupos.length % desktopColumns;
      const count = remainder === 0 ? 0 : desktopColumns - remainder;
      return Array.from({ length: count }, (_, index) => index + 1);
    },
    todosLosItems() {
      return this.grupos.flatMap((g) => g.items || []);
    },
    totalCajasGlobal() {
      return this.todosLosItems
        .filter((i) => !i.esKilos)
        .reduce((s, i) => s + (Number(i.cajas) || 0), 0);
    },
    totalKilosDirectosGlobal() {
      return this.todosLosItems
        .filter((i) => i.esKilos)
        .reduce((s, i) => s + (Number(i.cajas) || 0), 0);
    },
    totalKilosDesdeCajasGlobal() {
      return this.totalCajasGlobal * 20;
    },
    totalKilosLimpiosGlobal() {
      return this.grupos.reduce((sum, g) => {
        if (!this.valorRendimientoValido(g)) return sum;
        const kg = this.totalKilosGrupo(g);
        if (kg <= 0) return sum;
        return sum + Math.round(kg / Number(g.rendimiento));
      }, 0);
    },
    totalKilosLimpiosGlobalFormatted() {
      return this.totalKilosLimpiosGlobal.toLocaleString('es-MX', { maximumFractionDigits: 0 });
    }
  },
  watch: {
    isOpen(value) {
      if (value) {
        this.loadFromSacada();
      }
    }
  },
  methods: {
    openPedidoDropdown(groupId) {
      if (this.closePedidoDropdownTimer) {
        clearTimeout(this.closePedidoDropdownTimer);
        this.closePedidoDropdownTimer = null;
      }
      this.activePedidoDropdownId = groupId;
    },
    scheduleClosePedidoDropdown() {
      this.closePedidoDropdownTimer = setTimeout(() => {
        this.activePedidoDropdownId = null;
        this.closePedidoDropdownTimer = null;
      }, 120);
    },
    getPedidoOptionsFor(query) {
      return this.getAutocompleteOptions(this.medidaPedidoOptions, query);
    },
    selectPedidoOption(grupo, medida) {
      grupo.medidaPedido = medida;
      this.activePedidoDropdownId = null;
    },
    openProveedorDropdown(itemId) {
      if (this.closeProveedorDropdownTimer) {
        clearTimeout(this.closeProveedorDropdownTimer);
        this.closeProveedorDropdownTimer = null;
      }
      this.activeProveedorDropdownId = itemId;
    },
    scheduleCloseProveedorDropdown() {
      this.closeProveedorDropdownTimer = setTimeout(() => {
        this.activeProveedorDropdownId = null;
        this.closeProveedorDropdownTimer = null;
      }, 120);
    },
    getProveedorOptionsFor(query) {
      return this.getAutocompleteOptions(this.medidaProveedorOptions, query, true);
    },
    selectProveedorOption(item, medida) {
      item.medida = this.mergeAutocompleteSelection(item.medida, medida);
      this.activeProveedorDropdownId = null;
    },
    getAutocompleteOptions(options, query, includeAll = false) {
      const value = this.normalizeAutocompleteText(query);
      if (!value) {
        return options;
      }

      const queryTokens = this.getAutocompleteTokens(value);

      return options
        .map((option) => ({
          option,
          score: this.scoreAutocompleteOption(option, value, queryTokens)
        }))
        .filter((item) => includeAll || item.score > 0)
        .sort((a, b) => b.score - a.score || a.option.localeCompare(b.option, 'es', { numeric: true }))
        .map((item) => item.option);
    },
    mergeAutocompleteSelection(currentValue, selectedValue) {
      const current = (currentValue || '').trim();
      const selected = (selectedValue || '').trim();

      if (!current) return selected;
      if (!selected) return current;

      const normalizedCurrent = this.normalizeAutocompleteText(current);
      const normalizedSelected = this.normalizeAutocompleteText(selected);

      if (normalizedSelected.includes(normalizedCurrent)) {
        return selected;
      }

      if (normalizedCurrent.includes(normalizedSelected)) {
        return current;
      }

      const currentTokens = new Set(this.getAutocompleteTokens(current));
      const selectedParts = selected.split(/\s+/);
      const partsToAppend = [...selectedParts];

      while (
        partsToAppend.length > 0 &&
        currentTokens.has(this.normalizeAutocompleteText(partsToAppend[0]))
      ) {
        partsToAppend.shift();
      }

      const suffix = partsToAppend.join(' ').trim();
      return suffix ? `${current} ${suffix}` : current;
    },
    scoreAutocompleteOption(option, normalizedQuery, queryTokens) {
      const normalizedOption = this.normalizeAutocompleteText(option);
      if (!normalizedOption) return 0;
      if (normalizedOption === normalizedQuery) return 100;
      if (normalizedOption.startsWith(normalizedQuery)) return 90;
      if (normalizedOption.includes(normalizedQuery)) return 80;

      const optionTokens = this.getAutocompleteTokens(normalizedOption);
      const sharedTokens = queryTokens.filter((token) => optionTokens.includes(token));
      const sharedImportantTokens = sharedTokens.filter((token) => /[a-z]/.test(token) || token.length > 2);

      if (sharedImportantTokens.length > 0) {
        return 50 + sharedImportantTokens.length * 10;
      }

      return 0;
    },
    normalizeAutocompleteText(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/(\d+)\s*(?:-|–|—|a)\s*(\d+)/gi, '$1/$2')
        .replace(/\s*\/\s*/g, '/')
        .replace(/[^\w/.\s]/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
    },
    getAutocompleteTokens(value) {
      return this.normalizeAutocompleteText(value)
        .split(/\s+/)
        .filter(Boolean);
    },
    openQuickMeasureModal(tipo = 'pedido', target = null) {
      this.quickMeasure = {
        nombre: tipo === 'proveedor' ? target?.medida || '' : target?.medidaPedido || '',
        targetGroupId: tipo === 'pedido' ? target?.id || null : null,
        targetItemId: tipo === 'proveedor' ? target?.id || null : null,
        tipo
      };
      this.isQuickMeasureModalOpen = true;

      this.$nextTick(() => {
        const input = this.$el.querySelector('#quick-medida-nombre');
        if (input) input.focus();
      });
    },
    closeQuickMeasureModal() {
      if (this.isSavingQuickMeasure) return;
      this.isQuickMeasureModalOpen = false;
      this.quickMeasure = {
        nombre: '',
        targetGroupId: null,
        targetItemId: null,
        tipo: 'pedido'
      };
    },
    async saveQuickMeasure() {
      const nombre = (this.quickMeasure.nombre || '').trim();

      if (!nombre) {
        alert('Escribe la medida que quieres registrar');
        return;
      }

      const opcionesExistentes = this.quickMeasure.tipo === 'proveedor'
        ? this.medidaProveedorOptions
        : this.medidaPedidoOptions;
      const yaExiste = opcionesExistentes.some(
        (medida) => medida.toLowerCase() === nombre.toLowerCase()
      );

      if (yaExiste) {
        this.selectQuickMeasure(nombre);
        this.closeQuickMeasureModal();
        return;
      }

      this.isSavingQuickMeasure = true;
      try {
        const flagTipo = this.quickMeasure.tipo === 'proveedor'
          ? { createdFromListaMedidasProveedor: true }
          : { createdFromListaMedidasPedido: true };
        const docRef = await addDoc(collection(db, 'medidas'), {
          nombre,
          tipo: 'general',
          proveedorId: null,
          maquilaId: null,
          ...flagTipo
        });

        const medidaCreada = {
          id: docRef.id,
          nombre,
          tipo: 'general',
          proveedorId: null,
          maquilaId: null,
          ...flagTipo
        };

        this.medidasLocales.push(medidaCreada);
        this.selectQuickMeasure(nombre);
        this.$emit('medida-created', medidaCreada);
        this.isSavingQuickMeasure = false;
        this.closeQuickMeasureModal();
      } catch (error) {
        console.error('Error al registrar medida:', error);
        alert('No se pudo registrar la medida');
      } finally {
        this.isSavingQuickMeasure = false;
      }
    },
    selectQuickMeasure(nombre) {
      if (this.quickMeasure.tipo === 'proveedor') {
        const itemId = this.quickMeasure.targetItemId;
        const item = this.todosLosItems.find((i) => i.id === itemId)
          || this.todosLosItems.find((i) => !i.medida);
        if (item) {
          item.medida = nombre;
        }
        return;
      }

      const groupId = this.quickMeasure.targetGroupId;
      const grupo = this.grupos.find((g) => g.id === groupId)
        || this.grupos.find((g) => !g.medidaPedido);
      if (grupo) {
        grupo.medidaPedido = nombre;
      }
    },
    async deleteQuickMeasure(medida) {
      if (!medida?.nombre) return;

      const confirmar = confirm(`¿Eliminar la medida "${medida.nombre}"?`);
      if (!confirmar) return;

      this.isSavingQuickMeasure = true;
      try {
        if (medida.id) {
          await deleteDoc(doc(db, 'medidas', medida.id));
        }

        this.medidasLocales = this.medidasLocales.filter((item) => {
          const nombre = item?.nombre || item?.medida || item?.descripcion || '';
          return nombre.trim().toLowerCase() !== medida.nombre.trim().toLowerCase();
        });

        this.grupos.forEach((grupo) => {
          if ((grupo.medidaPedido || '').trim().toLowerCase() === medida.nombre.trim().toLowerCase()) {
            grupo.medidaPedido = '';
          }
          (grupo.items || []).forEach((item) => {
            if ((item.medida || '').trim().toLowerCase() === medida.nombre.trim().toLowerCase()) {
              item.medida = '';
            }
          });
        });

        this.$emit('medida-deleted', medida);
      } catch (error) {
        console.error('Error al eliminar medida:', error);
        alert('No se pudo eliminar la medida');
      } finally {
        this.isSavingQuickMeasure = false;
      }
    },
    createEmptyItem() {
      return {
        id: this.generateId(),
        medida: '',
        cajas: null,
        esKilos: false
      };
    },
    createEmptyGroup() {
      return {
        id: this.generateId(),
        medidaPedido: '',
        ozuna: false,
        rendimiento: null,
        items: [this.createEmptyItem()]
      };
    },
    generateId() {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    },
    loadFromSacada() {
      const existing = this.sacada?.listaMedidasPedido || [];

      if (!Array.isArray(existing) || existing.length === 0) {
        this.grupos = [this.createEmptyGroup()];
        return;
      }

      this.grupos = existing.map((group) => ({
        id: this.generateId(),
        medidaPedido: group?.medidaPedido || '',
        ozuna: group?.ozuna || false,
        rendimiento: Number.isFinite(group?.rendimiento) && group.rendimiento > 0 ? group.rendimiento : null,
        items: Array.isArray(group?.items) && group.items.length > 0
          ? group.items.map((item) => ({
              id: this.generateId(),
              medida: item?.medida || '',
              cajas: Number.isFinite(item?.cajas) ? item.cajas : null,
              esKilos: item?.esKilos || false
            }))
          : [this.createEmptyItem()]
      }));
    },
    addGroup() {
      this.grupos.push(this.createEmptyGroup());
    },
    removeGroup(groupIndex) {
      this.grupos.splice(groupIndex, 1);
      if (this.grupos.length === 0) {
        this.grupos.push(this.createEmptyGroup());
      }
    },
    addItem(groupIndex) {
      this.grupos[groupIndex].items.push(this.createEmptyItem());
    },
    removeItem(groupIndex, itemIndex) {
      const group = this.grupos[groupIndex];
      group.items.splice(itemIndex, 1);
      if (group.items.length === 0) {
        group.items.push(this.createEmptyItem());
      }
    },
    totalCajasGrupo(grupo) {
      return grupo.items
        .filter((i) => !i.esKilos)
        .reduce((s, i) => s + (Number(i.cajas) || 0), 0);
    },
    totalKilosDesdeCajas(grupo) {
      return this.totalCajasGrupo(grupo) * 20;
    },
    totalKilosGrupo(grupo) {
      const desdeCajas = this.totalKilosDesdeCajas(grupo);
      const directos = (grupo.items || [])
        .filter((i) => i.esKilos)
        .reduce((s, i) => s + (Number(i.cajas) || 0), 0);
      return desdeCajas + directos;
    },
    valorRendimientoValido(grupo) {
      const r = Number(grupo?.rendimiento);
      return Number.isFinite(r) && r > 0;
    },
    textoResultadoRendimiento(grupo) {
      if (!this.valorRendimientoValido(grupo)) return '';
      const kg = this.totalKilosGrupo(grupo);
      if (kg <= 0) return '';
      const r = Number(grupo.rendimiento);
      const resultado = Math.round(kg / r);
      return resultado.toLocaleString('es-MX', { maximumFractionDigits: 0 });
    },
    normalizeGroups() {
      return this.grupos
        .map((group) => {
          const base = {
            medidaPedido: (group.medidaPedido || '').trim(),
            ozuna: group.ozuna || false,
            items: (group.items || [])
            .map((item) => ({
              medida: (item.medida || '').trim(),
              cajas: Number(item.cajas),
              esKilos: item.esKilos || false
            }))
            .filter((item) => item.medida && Number.isFinite(item.cajas) && item.cajas > 0)
          };
          const rend = Number(group.rendimiento);
          if (Number.isFinite(rend) && rend > 0) {
            base.rendimiento = rend;
          }
          return base;
        })
        .filter((group) => group.medidaPedido && group.items.length > 0);
    },
    save() {
      const payload = this.normalizeGroups();
      this.$emit('save', payload);
    },
    async generarPdfResumen() {
      const payload = this.normalizeGroups();

      if (payload.length === 0) {
        alert('Agrega al menos una medida con cajas para generar el PDF');
        return;
      }

      this.isGeneratingPdf = true;
      try {
        await generarResumenMedidasSacadaPDF({
          fecha: this.fechaSacada,
          grupos: payload
        });
      } catch (error) {
        console.error('Error al generar PDF de resumen:', error);
        alert('No se pudo generar el PDF');
      } finally {
        this.isGeneratingPdf = false;
      }
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.58);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 3000;
  padding: 28px 16px;
  overflow-y: auto;
}

.modal-content {
  width: min(96vw, 1560px);
  max-height: calc(100vh - 56px);
  overflow-y: auto;
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 34%),
    #fff;
  border: 1px solid rgba(55, 96, 176, 0.16);
  border-radius: 18px;
  padding: 22px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5ecf8;
}

.modal-header h3 {
  margin: 0;
  color: #173b7a;
  font-size: clamp(1.25rem, 1vw + 1rem, 1.75rem);
  line-height: 1.15;
}

.eyebrow {
  margin: 0 0 4px;
  color: #5f76a5;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f1f5fb;
  border: 1px solid #d9e4f5;
  border-radius: 999px;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  color: #486486;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.close-btn:hover {
  background: #e7eefb;
  color: #173b7a;
  transform: translateY(-1px);
}

.modal-subtitle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 14px 0;
  color: #53657d;
  font-size: 0.95rem;
}

.fecha-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 5px 10px;
  background: #e8f0ff;
  border: 1px solid #c8d8f5;
  border-radius: 999px;
  color: #254f96;
  font-size: 0.86rem;
  font-weight: 800;
}

.top-measure-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
  padding: 12px 14px;
  background: #f8fbff;
  border: 1px dashed #b9cbea;
  border-radius: 14px;
}

.top-measure-help {
  color: #667085;
  font-size: 0.88rem;
  line-height: 1.35;
}

.totales-globales {
  margin: 0 0 18px;
  padding: 16px;
  background: linear-gradient(135deg, #eef5ff 0%, #f8fbff 100%);
  border: 1px solid #c8d7ef;
  border-radius: 16px;
  color: #1d3a66;
}

.totales-globales-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.totales-globales-title,
.totales-globales-caption {
  display: block;
}

.totales-globales-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1f4f9c;
}

.totales-globales-caption {
  margin-top: 2px;
  color: #667085;
  font-size: 0.86rem;
}

.groups-count {
  flex-shrink: 0;
  padding: 5px 10px;
  background: #fff;
  border: 1px solid #d9e4f5;
  border-radius: 999px;
  color: #254f96;
  font-size: 0.82rem;
  font-weight: 800;
}

.totales-globales-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.total-card {
  min-width: 0;
  padding: 12px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid #dbe6f6;
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(54, 90, 148, 0.07);
}

.total-card-label {
  display: block;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.total-card strong {
  color: #0f172a;
  font-size: 1.12rem;
  line-height: 1.2;
}

.total-card--highlight {
  background: linear-gradient(135deg, #dff7ec 0%, #f4fff9 100%);
  border-color: #a8e6c5;
}

.total-card--highlight strong {
  color: #087443;
}

.totales-globales-vacio {
  display: block;
  margin-top: 10px;
  color: #64748b;
  font-size: 0.92rem;
}

.empty-state {
  background: #f8fafc;
  border: 1px dashed #b9c8dc;
  border-radius: 12px;
  padding: 14px;
  color: #555;
  margin-bottom: 14px;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.grupo-card-placeholder {
  min-height: 1px;
  visibility: hidden;
  pointer-events: none;
}

.grupo-card {
  border: 1px solid #dbe4f5;
  border-radius: 14px;
  padding: 14px;
  background: rgba(249, 251, 255, 0.92);
  box-shadow: 0 10px 24px rgba(42, 72, 116, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.grupo-card:hover {
  border-color: #b9cbea;
  box-shadow: 0 14px 30px rgba(42, 72, 116, 0.12);
  transform: translateY(-1px);
}

.grupo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.field-label {
  color: #3760b0;
  font-size: 0.88rem;
  font-weight: 800;
}

.rows-title {
  margin: 14px 0 8px;
  color: #1f2937;
  font-size: 0.88rem;
  font-weight: 800;
}

.text-input,
.number-input {
  width: 100%;
  border: 1px solid #cbd6e8;
  border-radius: 9px;
  padding: 9px 10px;
  font-size: 0.95rem;
  box-sizing: border-box;
  color: #172033;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.text-input:focus,
.number-input:focus {
  outline: none;
  border-color: #3760b0;
  box-shadow: 0 0 0 3px rgba(55, 96, 176, 0.14);
}

.select-input {
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, #3760b0 50%),
    linear-gradient(135deg, #3760b0 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 50%,
    calc(100% - 12px) 50%;
  background-size:
    6px 6px,
    6px 6px;
  background-repeat: no-repeat;
  padding-right: 34px;
}

.grupo-card--ozuna {
  background: linear-gradient(180deg, #ecfdf5 0%, #f8fffb 100%);
  border-color: #86efac;
}

.pedido-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pedido-input-row .text-input {
  flex: 1;
}

.pedido-combobox,
.medida-combobox {
  position: relative;
  flex: 1;
  min-width: 0;
}

.pedido-options-menu,
.medida-options-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  max-height: 220px;
  overflow-y: auto;
  padding: 6px;
  background: #fff;
  border: 1px solid #cbd6e8;
  border-radius: 12px;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.18);
}

.pedido-option,
.medida-option {
  display: block;
  width: 100%;
  padding: 9px 10px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #173b7a;
  cursor: pointer;
  font-weight: 700;
  text-align: left;
  box-shadow: none;
}

.pedido-option:hover,
.medida-option:hover {
  background: #e8f0ff;
  transform: none;
  box-shadow: none;
}

.pedido-options-empty,
.medida-options-empty {
  margin: 0;
  padding: 8px 10px;
  color: #667085;
  font-size: 0.9rem;
}

.quick-measure-btn {
  flex-shrink: 0;
  background: #dff7ec;
  border: 1px solid #a8e6c5;
  color: #087443;
  white-space: nowrap;
}

.ozuna-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 9px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.ozuna-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #059669;
}

.ozuna-text {
  font-size: 0.72rem;
  color: #065f46;
  font-weight: 600;
  line-height: 1;
}

.item-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  border: 1px solid #edf2f9;
  border-radius: 10px;
  padding: 7px;
  background: rgba(255, 255, 255, 0.7);
}

.cantidad-col {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cantidad-col .number-input {
  width: 80px;
}

.kilos-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.kilos-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #b45309;
}

.kilos-text {
  font-size: 0.7rem;
  font-weight: 700;
  color: #92400e;
  line-height: 1;
}

.remove-item-btn {
  min-width: 36px;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 1.25rem;
  line-height: 1;
}

.grupo-rendimiento {
  margin-top: 10px;
  padding: 10px;
  border-top: 1px dashed #dbe4f5;
  background: #f8fafc;
  border-radius: 10px;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px 8px;
  font-size: 0.92rem;
  color: #374151;
  min-width: 0;
}

.rendimiento-label {
  font-weight: 700;
  color: #101828;
  font-size: 0.88rem;
  flex-shrink: 0;
}

.rendimiento-input {
  width: 88px;
  min-width: 0;
  flex: 0 0 auto;
  padding: 7px 8px;
  font-size: 0.9rem;
}

.rendimiento-resultado {
  flex: 0 0 auto;
  min-width: 0;
  line-height: 1.2;
}

.texto-destacado-azul {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1f4f9c;
}

.texto-destacado-azul strong {
  font-weight: 700;
  color: #1f4f9c;
}

@media (max-width: 380px) {
  .grupo-rendimiento {
    flex-wrap: wrap;
  }

  .rendimiento-input {
    width: min(88px, 100%);
  }
}

.grupo-total {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #e3eaf6;
  border-radius: 10px;
  background: #fff;
  text-align: right;
  font-size: 0.95rem;
  color: #344054;
}

.grupo-total-strong {
  color: #101828;
  font-weight: 700;
}

.remove-btn,
.remove-item-btn,
.quick-measure-btn,
.add-item-btn,
.add-group-btn,
.pdf-btn,
.secondary-btn,
.primary-btn {
  border: none;
  border-radius: 9px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  transition: filter 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.remove-btn:hover,
.remove-item-btn:hover,
.quick-measure-btn:hover,
.add-item-btn:hover,
.add-group-btn:hover,
.pdf-btn:hover,
.secondary-btn:hover,
.primary-btn:hover {
  filter: brightness(0.98);
  transform: translateY(-1px);
}

.remove-btn,
.remove-item-btn {
  background: #f8d7da;
  color: #8a1f2d;
}

.add-item-btn,
.add-group-btn {
  background: #e6efff;
  color: #24457f;
}

.add-group-btn {
  width: 100%;
  margin-top: 14px;
  padding: 11px 14px;
  border: 1px dashed #9db7e8;
}

.modal-actions {
  position: sticky;
  bottom: -22px;
  margin: 18px -22px -22px;
  padding: 14px 22px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: rgba(255, 255, 255, 0.92);
  border-top: 1px solid #e5ecf8;
  backdrop-filter: blur(8px);
}

.quick-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 3100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.54);
}

.quick-modal-content {
  width: min(100%, 460px);
  padding: 18px;
  background: #fff;
  border: 1px solid #d9e4f5;
  border-radius: 16px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.26);
}

.quick-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.quick-modal-header h4 {
  margin: 0;
  color: #173b7a;
  font-size: 1.2rem;
}

.close-btn--small {
  width: 34px;
  height: 34px;
  font-size: 22px;
}

.quick-field-label {
  display: block;
  margin-bottom: 6px;
  color: #3760b0;
  font-size: 0.9rem;
  font-weight: 800;
}

.quick-helper {
  margin: 8px 0 0;
  color: #667085;
  font-size: 0.88rem;
  line-height: 1.4;
}

.registered-measures {
  margin-top: 16px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e3eaf6;
  border-radius: 12px;
}

.registered-measures h5 {
  margin: 0 0 8px;
  color: #173b7a;
  font-size: 0.95rem;
}

.registered-empty {
  margin: 0;
  color: #667085;
  font-size: 0.9rem;
}

.registered-measures-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.registered-measures-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #dbe6f6;
  border-radius: 10px;
}

.registered-measure-name {
  padding: 0;
  background: transparent;
  border: none;
  color: #173b7a;
  cursor: pointer;
  font-weight: 800;
  text-align: left;
  box-shadow: none;
}

.registered-delete-btn {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  background: #f8d7da;
  border: none;
  border-radius: 999px;
  color: #8a1f2d;
  cursor: pointer;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1;
}

.quick-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.secondary-btn {
  background: #eceff4;
  color: #333;
}

.pdf-btn {
  background: #148452;
  color: #fff;
}

.pdf-btn:disabled {
  background: #91bfa8;
  cursor: not-allowed;
}

.primary-btn {
  background: linear-gradient(135deg, #3760b0, #244d9a);
  color: white;
  box-shadow: 0 10px 18px rgba(55, 96, 176, 0.18);
}

.primary-btn:disabled {
  background: #8ea3d3;
  cursor: not-allowed;
}

@media (max-width: 560px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-content {
    width: 100vw;
    max-height: 100vh;
    min-height: 100vh;
    padding: 16px;
    border-radius: 0;
  }

  .modal-header {
    align-items: flex-start;
  }

  .totales-globales-grid,
  .groups-grid {
    grid-template-columns: 1fr;
  }

  .grupo-card-placeholder {
    display: none;
  }

  .item-row {
    grid-template-columns: 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }

  .cantidad-col,
  .cantidad-col .number-input {
    width: 100%;
  }

  .pedido-input-row {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .pedido-input-row .text-input {
    flex: 1 1 100%;
  }

  .pedido-combobox {
    flex: 1 1 100%;
  }

  .medida-combobox {
    width: 100%;
  }

  .ozuna-label {
    flex: 1 1 100%;
  }

  .remove-item-btn {
    justify-self: stretch;
    width: 100%;
  }

  .modal-actions {
    bottom: -16px;
    margin: 18px -16px -16px;
    padding: 12px 16px;
    flex-direction: column-reverse;
  }

  .secondary-btn,
  .pdf-btn,
  .primary-btn {
    width: 100%;
  }

  .quick-modal-actions {
    flex-direction: column-reverse;
  }

  .quick-modal-actions .secondary-btn,
  .quick-modal-actions .primary-btn {
    width: 100%;
  }
}

@media (min-width: 561px) and (max-width: 900px) {
  .totales-globales-grid,
  .groups-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grupo-card-placeholder {
    display: none;
  }
}
</style>
