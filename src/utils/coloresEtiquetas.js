// Paleta para diferenciar visualmente los botones de etiqueta de los pedidos
// limpios. Soporta hasta 5 botones distintos; si se crean más, se reutilizan
// los colores en orden (módulo 5).
export const COLORES_ETIQUETAS = [
  { bg: '#16a085', text: '#ffffff', bgInactive: '#d4f0e9', textInactive: '#0e6c5b' },
  { bg: '#2980b9', text: '#ffffff', bgInactive: '#d6e8f5', textInactive: '#1f5d87' },
  { bg: '#e67e22', text: '#ffffff', bgInactive: '#fbe2cc', textInactive: '#a85a18' },
  { bg: '#8e44ad', text: '#ffffff', bgInactive: '#e5d3ee', textInactive: '#67307f' },
  { bg: '#c0392b', text: '#ffffff', bgInactive: '#f3cdc9', textInactive: '#8a291f' }
]

export function colorPorIndice(idx) {
  if (typeof idx !== 'number' || idx < 0) return COLORES_ETIQUETAS[0]
  return COLORES_ETIQUETAS[idx % COLORES_ETIQUETAS.length]
}

// Resuelve el color a usar para una etiqueta. Prioridad:
//   1) override explícito en `coloresPorEtiqueta` (mapa nombre → índice)
//   2) índice por posición en `etiquetasPedido`
export function colorParaEtiqueta(etiqueta, etiquetasPedido, coloresPorEtiqueta) {
  if (!etiqueta) return null
  if (coloresPorEtiqueta && typeof coloresPorEtiqueta[etiqueta] === 'number') {
    return colorPorIndice(coloresPorEtiqueta[etiqueta])
  }
  const idx = (etiquetasPedido || []).indexOf(etiqueta)
  return colorPorIndice(idx >= 0 ? idx : 0)
}
