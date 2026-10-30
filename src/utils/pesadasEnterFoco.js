// Navegación con Enter en el editor de pesadas (Taras/Kilos).
// Enter en Tara N → Kilo N. Enter en Kilo N → Tara N+1 si existe; si no, null.
export function destinoEnterPesada(campo, indice, totalFilas) {
    if (campo === 'tara') return indice < totalFilas ? { campo: 'kilo', indice } : null;
    if (campo === 'kilo') return indice + 1 < totalFilas ? { campo: 'tara', indice: indice + 1 } : null;
    return null;
}

// Teclados Android mandan Enter de varias formas: keydown key=Enter/keyCode 13,
// keydown 229 (sin tecla) seguido de keyup Enter, o beforeinput insertLineBreak.
export function esEnterPesada(event) {
    if (!event) return false;
    if (event.type === 'beforeinput') return event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph';
    return event.key === 'Enter' || event.keyCode === 13 || event.which === 13;
}

// Busca el input destino en el DOM de la misma tarjeta (no en $refs: en Vue 2 el
// orden de los refs de un v-for no sigue al DOM tras re-renders/sincronización).
export function inputDestinoEnter(contenedor, campo, inputActual) {
    if (!contenedor || !inputActual) return null;
    const taras = Array.from(contenedor.querySelectorAll('.tara-input[data-pesada]'));
    const kilos = Array.from(contenedor.querySelectorAll('.kilo-input[data-pesada]'));
    const indice = (campo === 'tara' ? taras : kilos).indexOf(inputActual);
    if (indice < 0) return null;
    const destino = destinoEnterPesada(campo, indice, taras.length);
    if (!destino) return null;
    return (destino.campo === 'kilo' ? kilos : taras)[destino.indice] || null;
}

// Android: la tecla "siguiente" (→|) del teclado numérico la resuelve Chrome sin mandar
// ningún evento de tecla: solo mueve el foco al siguiente campo editable. Si el foco sale
// de una Tara (o Kilo) hacia otro campo sin que el usuario haya tocado/clicado ni usado
// Tab/Enter, se trata como "siguiente" y se corrige al destino de la misma fila.
export const VENTANA_INTERACCION_MS = 400;

export function destinoSiguienteNativo({ contenedor, campo, inputActual, relacionado, msDesdeInteraccion }) {
    if (!relacionado || !(msDesdeInteraccion > VENTANA_INTERACCION_MS)) return null;
    if (typeof relacionado.matches !== 'function' || !relacionado.matches('input, textarea')) return null;
    const destino = inputDestinoEnter(contenedor, campo, inputActual);
    return destino && destino !== relacionado ? destino : null;
}

// Teclas que mueven el foco a propósito (no cuentan teclas de escritura ni 229).
export function esTeclaNavegacion(event) {
    if (!event) return false;
    return event.key === 'Tab' || esEnterPesada(event) || event.key === 'Escape' ||
        event.key === 'Clear' || event.key === 'NumLock' || [9, 12, 27, 144].includes(event.keyCode);
}
