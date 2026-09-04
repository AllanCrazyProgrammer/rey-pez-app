import { crearSonidosTerminal } from '@/utils/sonidosTerminal';

const PREFERENCIA = 'embarque:sonidos-terminal';
const BOTONES = 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]';

function esCampoEditable(elemento) {
  if (!elemento || elemento.disabled || elemento.readOnly || elemento.matches(':disabled')) return false;
  return elemento.isContentEditable || elemento.matches(
    'textarea, input:not([type]), input[type="text"], input[type="number"], input[type="search"], input[type="tel"], input[type="email"], input[type="url"], input[type="password"]'
  );
}

export const embarqueSonidosMixin = {
  data() {
    let sonidosActivados = true;
    try {
      sonidosActivados = localStorage.getItem(PREFERENCIA) !== 'false';
    } catch (error) {
      // Con almacenamiento bloqueado, la preferencia dura esta sesión.
    }
    return { sonidosActivados };
  },
  mounted() {
    this._sonidosTerminal = crearSonidosTerminal();
    this._sonidosTerminal.habilitar(this.sonidosActivados);
    // Captura también botones con .stop y modales que se trasladan al body.
    document.addEventListener('click', this.sonarBotonEmbarque, true);
    document.addEventListener('input', this.sonarEscrituraEmbarque, true);
    document.addEventListener('keydown', this.prepararTecladoEmbarque, true);
    document.addEventListener('pointerdown', this.prepararAudioEmbarque, true);
  },
  beforeDestroy() {
    document.removeEventListener('click', this.sonarBotonEmbarque, true);
    document.removeEventListener('input', this.sonarEscrituraEmbarque, true);
    document.removeEventListener('keydown', this.prepararTecladoEmbarque, true);
    document.removeEventListener('pointerdown', this.prepararAudioEmbarque, true);
    if (this._sonidosTerminal) this._sonidosTerminal.cerrar();
  },
  methods: {
    alternarSonidosEmbarque() {
      this.sonidosActivados = !this.sonidosActivados;
      this._sonidosTerminal.habilitar(this.sonidosActivados);
      try {
        localStorage.setItem(PREFERENCIA, String(this.sonidosActivados));
      } catch (error) {
        // Silenciar también funciona si localStorage no está disponible.
      }
      if (this.sonidosActivados) this._sonidosTerminal.reproducir('boton');
    },
    prepararAudioEmbarque(evento) {
      if (evento.isTrusted && this.sonidosActivados) this._sonidosTerminal.preparar();
    },
    sonarBotonEmbarque(evento) {
      if (!evento.isTrusted || !this.sonidosActivados) return;
      const boton = evento.target.closest(BOTONES);
      if (!boton || boton.matches(':disabled, [aria-disabled="true"], [data-toggle-sonidos]')) return;
      const sonidosEspeciales = ['explosion', 'mision-cumplida'];
      const sonido = sonidosEspeciales.includes(boton.dataset.sonido) ? boton.dataset.sonido : 'boton';
      this._sonidosTerminal.reproducir(sonido);
    },
    sonarEscrituraEmbarque(evento) {
      // input cubre escritura, borrado y teclados de teléfonos sin duplicar keydown.
      if (!evento.isTrusted || !this.sonidosActivados || !esCampoEditable(evento.target)) return;
      if (evento.inputType === 'insertLineBreak' || evento.inputType === 'insertParagraph') return;
      const esBorrado = evento.inputType && evento.inputType.startsWith('delete');
      this._sonidosTerminal.reproducir(esBorrado ? 'borrar' : 'tecla');
    },
    prepararTecladoEmbarque(evento) {
      if (!evento.isTrusted || !this.sonidosActivados || !esCampoEditable(evento.target)) return;
      this._sonidosTerminal.preparar();
      // Enter tiene sonido incluso en los formularios que impiden el envío.
      if (evento.key === 'Enter' && !evento.isComposing && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
        this._sonidosTerminal.reproducir('boton');
      }
    }
  }
};
