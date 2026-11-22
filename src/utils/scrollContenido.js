// Scroll fluido de la tabla de pesadas hacia la página: cuando la tabla ya llegó hasta arriba (o
// hasta abajo) y el gesto sigue, el mismo gesto mueve la página de corrido, sin tener que soltar y
// volver a empezar. El navegador por sí solo "se queda pegado" a la tabla durante todo el gesto
// (y con `overscroll-behavior: contain` nunca pasa a la página).

// ¿El movimiento (dy > 0 = hacia abajo en el contenido) choca con el borde? Solo cuando el gesto
// es más vertical que horizontal, para no estorbar el scroll a los lados.
export function chocaConBorde({ scrollTop, scrollHeight, clientHeight }, dx, dy) {
  if (!dy || Math.abs(dy) < Math.abs(dx)) return false;
  if (dy < 0) return scrollTop <= 0;
  return scrollTop + clientHeight >= scrollHeight - 1;
}

// deltaY de la rueda en píxeles (deltaMode 1 = líneas, 2 = páginas).
export function deltaEnPixeles(event, altoPagina = 800) {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * altoPagina;
  return event.deltaY;
}

// Al bajar, ¿cuánto falta mover la página para que la tabla quede pegada arriba (debajo de la
// barra)? 0 si ya está ahí o si la página ya no puede bajar más.
export function faltaParaArriba(topTabla, margenSuperior, puedeBajarPagina) {
  const falta = topTabla - margenSuperior;
  return falta > 0.5 && puedeBajarPagina > 0.5 ? Math.min(falta, puedeBajarPagina) : 0;
}

// Alto de la tabla para que quepa entre la barra de arriba y lo que hay debajo de ella (el pie de
// totales). Así, aun con la página hasta el fondo, la tabla no se mete debajo de la barra y sus
// filas fijas (Columna, Medida) siempre se ven.
export function altoParaPantalla(ventana, barra, debajo, minimo = 230) {
  return Math.max(minimo, Math.floor(ventana - barra - Math.max(0, debajo)));
}

// Mantiene `el.style.maxHeight` con altoParaPantalla mientras cambie el tamaño de la pantalla o del
// contenido. `barra()` da el alto de la barra fija. Devuelve la función para dejar de hacerlo.
export function ajustarAltoAPantalla(el, barra) {
  if (!el || typeof window === 'undefined') return () => {};
  const raiz = document.scrollingElement || document.documentElement;
  let cuadro = 0;
  const ajustar = () => {
    cuadro = 0;
    const debajo = raiz.scrollHeight - (el.getBoundingClientRect().bottom + window.scrollY);
    const alto = `${altoParaPantalla(window.innerHeight, barra(), debajo)}px`;
    if (el.style.maxHeight !== alto) el.style.maxHeight = alto;
  };
  const pedir = () => { if (!cuadro) cuadro = requestAnimationFrame(ajustar); };
  const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(pedir) : null;
  if (observador) observador.observe(document.body);
  window.addEventListener('resize', pedir);
  ajustar();
  return () => {
    if (cuadro) cancelAnimationFrame(cuadro);
    if (observador) observador.disconnect();
    window.removeEventListener('resize', pedir);
  };
}

// Instala los listeners en `el`; devuelve la función para quitarlos.
// `margenSuperior()` (opcional): alto de la barra fija de arriba. Si se da, al bajar primero se
// mueve la página hasta que la tabla quede pegada debajo de esa barra y luego la tabla.
export function encadenarScroll(el, { pagina = typeof window !== 'undefined' ? window : null, margenSuperior = null } = {}) {
  if (!el || !pagina) return () => {};
  let ultimo = null; // { x, y, t } del dedo
  let velocidad = 0; // px/ms con la que se movía la página con el dedo
  let moviendoPagina = false;
  let inercia = 0;

  // 'instant': la página usa scroll-behavior: smooth y cada paso se animaría (y no avanzaría).
  const moverPagina = dy => pagina.scrollBy({ top: dy, behavior: 'instant' });
  const pararInercia = () => { if (inercia) cancelAnimationFrame(inercia); inercia = 0; };
  const falta = () => {
    if (!margenSuperior) return 0;
    const raiz = document.scrollingElement || document.documentElement;
    return faltaParaArriba(el.getBoundingClientRect().top, margenSuperior(), raiz.scrollHeight - pagina.innerHeight - pagina.scrollY);
  };
  // dy > 0 (bajando) mientras la tabla no ha llegado arriba: se mueve la página, sin pasarse.
  const acomodar = dy => {
    if (dy <= 0) return false;
    const resta = falta();
    if (!resta) return false;
    moverPagina(Math.min(dy, resta));
    return true;
  };

  const alGirar = event => {
    if (event.ctrlKey) return; // pellizco para zoom
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && event.cancelable && acomodar(deltaEnPixeles(event, pagina.innerHeight))) {
      event.preventDefault();
      return;
    }
    if (!chocaConBorde(el, event.deltaX, event.deltaY) || !event.cancelable) return;
    event.preventDefault();
    moverPagina(deltaEnPixeles(event, pagina.innerHeight));
  };
  const alTocar = event => {
    pararInercia();
    moviendoPagina = false;
    velocidad = 0;
    ultimo = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY, t: Date.now() } : null;
  };
  const alMover = event => {
    if (!ultimo || event.touches.length !== 1) return;
    const { clientX: x, clientY: y } = event.touches[0];
    const ahora = Date.now();
    // Con el dedo, arrastrar hacia abajo mueve el contenido hacia arriba.
    const dx = ultimo.x - x;
    const dy = ultimo.y - y;
    const dt = Math.max(1, ahora - ultimo.t);
    ultimo = { x, y, t: ahora };
    if (Math.abs(dy) > Math.abs(dx) && event.cancelable && acomodar(dy)) {
      event.preventDefault();
      moviendoPagina = true;
      velocidad = 0.8 * (dy / dt) + 0.2 * velocidad;
      return;
    }
    if (!chocaConBorde(el, dx, dy) || !event.cancelable) { moviendoPagina = false; return; }
    event.preventDefault();
    moviendoPagina = true;
    velocidad = 0.8 * (dy / dt) + 0.2 * velocidad;
    moverPagina(dy);
  };
  // Al soltar el dedo mientras se movía la página, sigue con el impulso y frena poco a poco.
  const alSoltar = () => {
    ultimo = null;
    if (!moviendoPagina || Math.abs(velocidad) < 0.05) return;
    let v = velocidad;
    let antes = performance.now();
    const paso = ahora => {
      const dt = ahora - antes;
      antes = ahora;
      const delta = v * dt;
      // Bajando con impulso: frena justo cuando la tabla queda pegada arriba.
      if (delta > 0 && margenSuperior) {
        const resta = falta();
        if (resta < delta) { moverPagina(resta); inercia = 0; return; }
      }
      moverPagina(delta);
      v *= Math.pow(0.95, dt / 16);
      inercia = Math.abs(v) > 0.02 ? requestAnimationFrame(paso) : 0;
    };
    inercia = requestAnimationFrame(paso);
  };

  el.addEventListener('wheel', alGirar, { passive: false });
  el.addEventListener('touchstart', alTocar, { passive: true });
  el.addEventListener('touchmove', alMover, { passive: false });
  el.addEventListener('touchend', alSoltar, { passive: true });
  el.addEventListener('touchcancel', alSoltar, { passive: true });
  return () => {
    pararInercia();
    el.removeEventListener('wheel', alGirar);
    el.removeEventListener('touchstart', alTocar);
    el.removeEventListener('touchmove', alMover);
    el.removeEventListener('touchend', alSoltar);
    el.removeEventListener('touchcancel', alSoltar);
  };
}
