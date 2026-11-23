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
