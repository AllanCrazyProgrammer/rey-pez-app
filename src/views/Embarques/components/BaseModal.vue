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

/* Modal integrado con la cabina de embarque */
.modal-overlay {
    padding: 20px;
    background:
        radial-gradient(circle at 50% 30%, rgba(56,217,255,.1), transparent 34rem),
        rgba(2, 6, 14, .8);
    backdrop-filter: blur(12px);
    animation: modal-fade .22s ease-out;
}

.modal-contenido {
    overflow: hidden;
    padding: 0;
    color: #dce7f6;
    border: 1px solid rgba(148,163,184,.2);
    border-radius: 22px;
    background: linear-gradient(145deg, rgba(17,29,49,.98), rgba(7,14,27,.98));
    box-shadow: 0 34px 90px rgba(0,0,0,.55), 0 0 35px rgba(56,217,255,.08), inset 0 1px rgba(255,255,255,.07);
    font-size: 1rem;
    line-height: 1.55;
    animation: modal-rise .34s cubic-bezier(.22,1,.36,1);
}

.modal-contenido::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #38d9ff, #8b5cf6, transparent);
    box-shadow: 0 0 18px rgba(56,217,255,.55);
}

.modal-header {
    margin: 0;
    padding: 21px 24px;
    border-bottom: 1px solid rgba(148,163,184,.12);
    background: rgba(255,255,255,.025);
}

.modal-header h3 {
    color: #f4f8ff;
    font-size: 1.35rem;
    font-weight: 780;
    letter-spacing: -.02em;
    text-shadow: none;
}

.btn-cerrar-modal {
    display: grid;
    width: 36px;
    height: 36px;
    padding: 0;
    place-items: center;
    color: #91a2bc;
    border: 1px solid rgba(148,163,184,.16);
    border-radius: 11px;
    background: rgba(255,255,255,.035);
    font-size: 1rem;
}

.btn-cerrar-modal:hover {
    color: #fb7185;
    border-color: rgba(251,113,133,.35);
    background: rgba(251,113,133,.08);
}

.modal-body {
    max-height: min(70vh, 720px);
    overflow-y: auto;
    padding: 24px;
}

.modal-footer {
    margin: 0;
    padding: 17px 24px;
    border-top: 1px solid rgba(148,163,184,.12);
    background: rgba(2,7,16,.26);
}

.modal-footer .btn {
    min-height: 40px;
    padding: 9px 16px;
    border: 1px solid rgba(148,163,184,.16);
    border-radius: 11px;
    font-size: .88rem;
}

.modal-footer .btn-primary {
    color: #06101c;
    border-color: #38d9ff;
    background: linear-gradient(135deg, #b8f4ff, #38d9ff);
    box-shadow: 0 0 22px rgba(56,217,255,.2);
}

.modal-footer .btn-secondary {
    color: #c7d3e4;
    background: rgba(255,255,255,.04);
}

@keyframes modal-fade { from { opacity: 0; } }
@keyframes modal-rise {
    from { opacity: 0; transform: translateY(18px) scale(.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
