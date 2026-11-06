// Actualizaciones de la app de escritorio: la descarga la hace el proceso principal de Electron
// (electron/actualizaciones.js); aquí solo se consulta el estado y se pide aplicarla.
export function fuenteActualizacionEscritorio(desktop = window.desktop) {
  const api = desktop && desktop.actualizacion;
  if (!api) return null; // instaladores anteriores a 0.3.20
  return {
    estado: () => api.estado(),
    alCambiar: handler => api.alCambiar(handler),
    aplicar: () => api.aplicar()
  };
}
