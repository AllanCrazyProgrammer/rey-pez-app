export function formatearMedidaPedidoCrudo(medida) {
  const nombre = medida.trim()
  return /[cs]\s*\/\s*c$/i.test(nombre) ? nombre : `${nombre} c/c`
}
