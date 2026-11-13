// Aplica sola una actualización de Android ya descargada, sin pulsar "Actualizar".
//
// La fuente (actualizacionAndroid.js) descarga la versión nueva en segundo plano
// y avisa con estado.lista. Antes, la única forma de aplicarla era pulsar el
// botón del aviso. Ahora se aplica sola en los dos momentos en los que no
// interrumpe nada:
//
// 1. Al arrancar: si la versión lista aparece en los primeros segundos
//    (ventanaInicioMs), se aplica de inmediato, antes de que Allan empiece
//    a trabajar. Es lo que pasa la mañana siguiente a una publicación.
// 2. Al mandar la app a segundo plano: si hay una versión lista, se aplica
//    al ocultarse la app; al volver, ya trae la versión nueva.
//
// Con la app abierta y en uso NO se recarga: la descarga queda lista y el
// aviso sigue ahí por si quiere aplicarla en ese momento con el botón.
//
// `antesDeAplicar` guarda lo que haya abierto (el embarque, por ejemplo)
// antes de recargar, igual que hace el botón de Actualizar. Si guardar falla,
// no se aplica y se reintenta en el siguiente momento seguro.
export function crearAutoAplicador({
  fuente,
  antesDeAplicar,
  documento = typeof document !== 'undefined' ? document : null,
  ahora = () => Date.now(),
  inicio = Date.now(),
  ventanaInicioMs = 20000,
}) {
  let lista = false;
  let aplicando = false;
  let activo = false;
  let quitar = null;
  // Cada aviso de la fuente sube la revisión: el estado inicial que se lee
  // al iniciar puede llegar tarde y no debe pisar un aviso más nuevo.
  let revision = 0;

  async function intentar(origen) {
    if (!lista || aplicando) return false;
    aplicando = true;
    try {
      if (antesDeAplicar) await antesDeAplicar();
      const aplicado = await fuente.aplicar();
      if (aplicado) lista = false;
      return aplicado;
    } catch (error) {
      console.warn(`[auto-aplicar] No se pudo aplicar la actualización (${origen}):`, error?.message || error);
      return false;
    } finally {
      aplicando = false;
    }
  }

  function alCambiar(estado) {
    revision += 1;
    lista = Boolean(estado?.lista);
    // Al arrancar: la primera revisión corre a los 5 s de abrir la app.
    if (lista && ahora() - inicio <= ventanaInicioMs) intentar('inicio');
  }

  function alVisibilidad() {
    if (documento?.hidden) intentar('fondo');
  }

  return {
    iniciar() {
      if (activo) return;
      activo = true;
      quitar = fuente.alCambiar(alCambiar);
      // La versión puede estar lista antes de suscribirse (la revisión
      // corre al arrancar, y la fuente se carga de forma diferida). Solo vale
      // si ningún aviso llegó en el ínterin: un estado viejo no debe borrar
      // una versión lista que ya se anunció.
      const revisionAlIniciar = revision;
      fuente.estado().then(estado => { if (revision === revisionAlIniciar) alCambiar(estado); }).catch(() => {});
      documento?.addEventListener?.('visibilitychange', alVisibilidad);
    },
    detener() {
      activo = false;
      lista = false;
      if (quitar) { quitar(); quitar = null; }
      documento?.removeEventListener?.('visibilitychange', alVisibilidad);
    },
  };
}
