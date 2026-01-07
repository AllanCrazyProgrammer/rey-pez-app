<template>
    <div class="modal-overlay" v-if="mostrar" @click.self="cerrar">
        <div class="modal-contenido" @click.stop>
            <div class="modal-header">
                <h3>{{ titulo }}</h3>
                <button @click.stop="cerrar" class="btn-cerrar-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <slot></slot>
            </div>
            <div class="modal-footer">
                <button @click.stop="cerrar" class="btn btn-secondary">Cancelar</button>
                <button 
                    @click.stop="confirmar" 
                    class="btn btn-primary" 
                    :disabled="deshabilitarConfirmar"
                >
                    {{ textoBotonConfirmar }}
                </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'BaseModal',
    props: {
        mostrar: {
            type: Boolean,
            required: true
        },
        titulo: {
            type: String,
            default: 'Modal'
        },
        textoBotonConfirmar: {
            type: String,
            default: 'Guardar'
        },
        deshabilitarConfirmar: {
            type: Boolean,
            default: false
        }
    },
    methods: {
        cerrar() {
            this.$emit('cerrar');
        },
        confirmar() {
            this.$emit('confirmar');
        }
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.65);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-contenido {
    background: radial-gradient(circle at 20% 20%, rgba(0, 255, 65, 0.12), rgba(0, 255, 65, 0)) ,
                linear-gradient(135deg, #041c0a 0%, #0a2c15 50%, #021408 100%);
    border: 1px solid rgba(0, 255, 65, 0.35);
    box-shadow:
        0 12px 30px rgba(0, 0, 0, 0.25),
        0 0 25px rgba(0, 255, 65, 0.25),
        inset 0 0 20px rgba(0, 255, 65, 0.08);
    padding: 26px;
    border-radius: 12px;
    width: min(720px, 95vw);
    position: relative;
    z-index: 1001;
    font-size: 1.12rem;
    line-height: 1.7;
    color: #e8ffe6;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    gap: 12px;
}

.modal-header h3 {
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #00ff41;
    text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
}

.btn-cerrar-modal {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #7cf7a8;
    transition: color 0.2s ease;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 22px;
}

.btn {
    cursor: pointer;
    transition: background-color 0.3s, transform 0.1s ease;
    border: none;
    padding: 10px 18px;
    border-radius: 6px;
    font-size: 1.08rem;
    font-weight: 600;
}

.btn-primary {
    background: linear-gradient(135deg, #00c853, #00e676);
    color: #00220f;
    box-shadow: 0 0 14px rgba(0, 255, 65, 0.35);
}

.btn:hover {
    transform: translateY(-1px);
}

.btn:disabled,
.btn[disabled] {
    opacity: 0.65;
    cursor: not-allowed;
}

.btn-secondary {
    background: #2c3532;
    color: #e8ffe6;
    border: 1px solid rgba(0, 255, 65, 0.2);
}
</style>