<template>
    <BaseModal 
        :mostrar="mostrar" 
        titulo="Nueva Medida" 
        @cerrar="$emit('cerrar')" 
        @confirmar="guardarMedida"
        textoBotonConfirmar="Siguiente"
    >
        <div class="form-group">
            <label for="medidaInput">Nombre de la Medida:</label>
            <input 
                type="text" 
                id="medidaInput" 
                v-model="medidaLocal" 
                class="form-control"
                placeholder="Ej: 16/20, 21/25, 26/30, etc." 
                @keyup.enter="guardarMedida" 
                ref="medidaInput"
            >
        </div>
        
        <div class="ejemplos-medidas">
            <p><strong>Ejemplos:</strong></p>
            <div class="ejemplos-lista">
                <span class="ejemplo-tag" @click="seleccionarEjemplo('16/20')">16/20</span>
                <span class="ejemplo-tag" @click="seleccionarEjemplo('21/25')">21/25</span>
                <span class="ejemplo-tag" @click="seleccionarEjemplo('26/30')">26/30</span>
                <span class="ejemplo-tag" @click="seleccionarEjemplo('31/35')">31/35</span>
                <span class="ejemplo-tag" @click="seleccionarEjemplo('36/40')">36/40</span>
                <span class="ejemplo-tag" @click="seleccionarEjemplo('41/50')">41/50</span>
                <span class="ejemplo-tag" @click="seleccionarEjemplo('51/60')">51/60</span>
                <span class="ejemplo-tag" @click="seleccionarEjemplo('61/70')">61/70</span>
            </div>
        </div>
    </BaseModal>
</template>

<script>
import BaseModal from '@/views/Embarques/components/BaseModal.vue';

export default {
    name: 'MedidaModal',
    components: {
        BaseModal
    },
    props: {
        mostrar: {
            type: Boolean,
            required: true
        },
        medida: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            medidaLocal: ''
        };
    },
    watch: {
        mostrar(newVal) {
            if (newVal) {
                this.medidaLocal = this.medida;
                this.$nextTick(() => {
                    this.$refs.medidaInput?.focus();
                });
            }
        },
        medida(newVal) {
            this.medidaLocal = newVal;
        }
    },
    methods: {
        guardarMedida() {
            const medida = this.medidaLocal.trim();
            if (medida) {
                this.$emit('guardar', medida);
            } else {
                alert('Por favor ingrese el nombre de la medida');
            }
        },
        seleccionarEjemplo(medida) {
            this.medidaLocal = medida;
            this.$refs.medidaInput?.focus();
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
    transition: border-color 0.3s ease;
}

.form-control:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.ejemplos-medidas {
    margin-top: 15px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 5px;
    border-left: 4px solid #2ecc71;
}

.ejemplos-medidas p {
    margin: 0 0 10px 0;
    font-size: 0.9em;
    color: #2c3e50;
}

.ejemplos-lista {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.ejemplo-tag {
    background-color: #3498db;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.ejemplo-tag:hover {
    background-color: #2980b9;
}
</style> 