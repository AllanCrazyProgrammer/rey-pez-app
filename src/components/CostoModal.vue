<template>
    <BaseModal 
        :mostrar="mostrar" 
        :titulo="titulo" 
        @cerrar="$emit('cerrar')" 
        @confirmar="guardarCosto"
        :textoBotonConfirmar="textoBoton"
    >
        <div class="form-group">
            <label for="costoInput">{{ etiquetaCosto }}:</label>
            <input 
                type="number" 
                id="costoInput" 
                v-model="costoLocal" 
                class="form-control"
                :placeholder="placeholder" 
                @keyup.enter="guardarCosto" 
                ref="costoInput"
                step="0.01"
                min="0"
            >
        </div>
        
        <div v-if="mostrarInfo" class="info-adicional">
            <p v-if="costoAnterior !== null" class="costo-anterior">
                <strong>Costo anterior:</strong> ${{ costoAnterior.toFixed(2) }}
            </p>
            <p v-if="fechaUltimaActualizacion" class="fecha-anterior">
                <strong>Última actualización:</strong> {{ fechaUltimaActualizacion }}
            </p>
        </div>
    </BaseModal>
</template>

<script>
import BaseModal from '@/views/Embarques/components/BaseModal.vue';

export default {
    name: 'CostoModal',
    components: {
        BaseModal
    },
    props: {
        mostrar: {
            type: Boolean,
            required: true
        },
        costo: {
            type: [Number, String],
            default: ''
        },
        medida: {
            type: String,
            default: ''
        },
        esNuevo: {
            type: Boolean,
            default: false
        },
        costoAnterior: {
            type: Number,
            default: null
        },
        fechaUltimaActualizacion: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            costoLocal: ''
        };
    },
    computed: {
        titulo() {
            return this.esNuevo ? 'Registrar Nueva Medida' : `Actualizar Costo - ${this.medida}`;
        },
        etiquetaCosto() {
            return this.esNuevo ? 'Costo Base' : 'Nuevo Costo';
        },
        placeholder() {
            return this.esNuevo ? 'Ingrese el costo base' : 'Ingrese el nuevo costo';
        },
        textoBoton() {
            return this.esNuevo ? 'Registrar' : 'Actualizar';
        },
        mostrarInfo() {
            return !this.esNuevo && (this.costoAnterior !== null || this.fechaUltimaActualizacion);
        }
    },
    watch: {
        mostrar(newVal) {
            if (newVal) {
                this.costoLocal = this.costo;
                this.$nextTick(() => {
                    this.$refs.costoInput?.focus();
                });
            }
        },
        costo(newVal) {
            this.costoLocal = newVal;
        }
    },
    methods: {
        guardarCosto() {
            const costo = parseFloat(this.costoLocal);
            if (!isNaN(costo) && costo >= 0) {
                this.$emit('guardar', costo);
            } else if (this.costoLocal === '') {
                // Si está vacío, permitir borrar el costo
                this.$emit('guardar', null);
            } else {
                // Mostrar error si el costo no es válido
                alert('Por favor ingrese un costo válido (mayor o igual a 0)');
            }
        }
    }
}
</script>

<style scoped>
.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #2c3e50;
}

.form-control {
    width: 100%;
    padding: 10px;
    font-size: 1rem;
    border-radius: 5px;
    border: 1px solid #ccc;
    text-align: right;
    transition: border-color 0.3s ease;
}

.form-control:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
}

.info-adicional {
    margin-top: 15px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 5px;
    border-left: 4px solid #3498db;
}

.info-adicional p {
    margin: 5px 0;
    font-size: 0.9em;
}

.costo-anterior {
    color: #e74c3c;
}

.fecha-anterior {
    color: #666;
}
</style> 