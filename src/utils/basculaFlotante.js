// Dónde poner el peso flotante de la báscula respecto al campo de kilos enfocado.
// Todo en coordenadas de ventana (position: fixed), así no lo recorta el overflow de las tarjetas.
//
//   campo:   { left, top, right, bottom }  caja del campo (getBoundingClientRect)
//   tamano:  { ancho, alto }               caja del peso flotante
//   ventana: { ancho, alto }               zona visible
//
// Prefiere ir a la derecha del campo. Si ahí no cabe (tarjetas del borde derecho, celulares),
// va arriba alineado al borde derecho del campo y, si tampoco cabe, abajo. Siempre queda
// dentro de la ventana. Devuelve { left, top, lado }.
export function posicionarFlotante(campo, tamano, ventana, margen = 6) {
  const alto = campo.bottom - campo.top;
  let left;
  let top;
  let lado;
  if (campo.right + margen + tamano.ancho <= ventana.ancho - margen) {
    lado = 'derecha';
    left = campo.right + margen;
    top = campo.top + (alto - tamano.alto) / 2;
  } else if (campo.top - margen - tamano.alto >= margen) {
    lado = 'arriba';
    left = campo.right - tamano.ancho;
    top = campo.top - margen - tamano.alto;
  } else {
    lado = 'abajo';
    left = campo.right - tamano.ancho;
    top = campo.bottom + margen;
  }
  left = Math.min(Math.max(left, margen), Math.max(margen, ventana.ancho - tamano.ancho - margen));
  top = Math.min(Math.max(top, margen), Math.max(margen, ventana.alto - tamano.alto - margen));
  return { left: Math.round(left), top: Math.round(top), lado };
}

// ¿El campo se ve en la ventana? Si se desplazó fuera, el peso flotante se esconde.
export function campoVisible(campo, ventana) {
  return campo.bottom > 0 && campo.top < ventana.alto && campo.right > 0 && campo.left < ventana.ancho;
}

// Campos de kilos de las medidas del embarque que aceptan el peso de la báscula.
export const SELECTOR_KILOS = '.producto .kilo-input[data-pesada]';

export function esCampoKilos(elemento) {
  return Boolean(
    elemento &&
    typeof elemento.matches === 'function' &&
    elemento.matches(SELECTOR_KILOS) &&
    !elemento.disabled &&
    !elemento.readOnly
  );
}

// Con la báscula conectada, el campo de kilos no abre el teclado del teléfono: el peso se pone con
// "Registrar". inputmode="none" lo esconde sin bloquear el campo (se puede seguir escribiendo con
// un teclado físico). Se guarda el valor anterior para devolverlo tal cual.
const PREVIO = 'data-bascula-inputmode';

export function quitarTeclado(campo) {
  if (!campo || campo.hasAttribute(PREVIO)) return;
  campo.setAttribute(PREVIO, campo.getAttribute('inputmode') || '');
  campo.setAttribute('inputmode', 'none');
}

export function devolverTeclado(campo) {
  if (!campo || !campo.hasAttribute(PREVIO)) return;
  const previo = campo.getAttribute(PREVIO);
  campo.removeAttribute(PREVIO);
  if (previo) campo.setAttribute('inputmode', previo);
  else campo.removeAttribute('inputmode');
}

// Decimales del peso de la báscula según el cliente de la medida: Ozuna, Lorena (Verónica) y
// Joselito pesan con un decimal; Catarro, Otilio y los clientes agregados, con dos.
const CLIENTES_UN_DECIMAL = ['ozuna', 'lorena', 'veronica', 'verónica', 'joselito'];

export function decimalesPorCliente(nombreCliente) {
  return CLIENTES_UN_DECIMAL.includes(String(nombreCliente || '').trim().toLowerCase()) ? 1 : 2;
}

// Lo que dice el campo (data-bascula-decimales); si no dice nada, dos decimales.
export function decimalesDeCampo(campo) {
  const valor = campo && campo.getAttribute && Number(campo.getAttribute('data-bascula-decimales'));
  return valor === 1 || valor === 2 ? valor : 2;
}

// Redondea al decimal que toca (1.95 -> 2.0 con un decimal, sin el error de toFixed con flotantes).
export function redondearKilos(kilos, decimales) {
  const factor = 10 ** decimales;
  return Math.round((kilos + Math.sign(kilos) * Number.EPSILON) * factor) / factor;
}

// Web y escritorio (no la APK): Enter en un campo de kilos registra el peso de la báscula conectada,
// igual que el botón Registrar. Solo si hay un peso que registrar y no se escribió a mano en el
// campo desde que se seleccionó (si se tecleó un número, Enter hace lo de siempre).
export function enterRegistraBascula({ tecla, componiendo = false, nativo = false, puedeRegistrar = false, escritoAMano = false }) {
  return tecla === 'Enter' && !componiendo && !nativo && puedeRegistrar && !escritoAMano;
}
