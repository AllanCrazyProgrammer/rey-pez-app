import { normalizarNombreProductoPrecio } from './preciosHistoricos'

// Solo las equivalencias de crudos con cabeza del catálogo de embarques.
// No inferir c/c para tallas personalizadas, PacSC ni productos sin cabeza.
const MEDIDAS_CON_CABEZA = Object.freeze({
  chico: 'Chico c/c', med: 'Med c/c',
  'med-esp': 'Med-Esp c/c', 'med esp': 'Med-Esp c/c',
  'med-gde': 'Med-Gde c/c', 'med gde': 'Med-Gde c/c',
  gde: 'Gde c/c', 'gde c/ extra': 'Gde c/ Extra c/c',
  extra: 'Extra c/c', jumbo: 'Jumbo c/c', 'lag gde': 'Lag gde c/c'
})

export function normalizarMedidaCrudoEmbarque(medida) {
  const nombre = (medida || '').toString().trim()
  const clave = nombre.toLowerCase().replace(/\s+/g, ' ')
  return Object.prototype.hasOwnProperty.call(MEDIDAS_CON_CABEZA, clave)
    ? MEDIDAS_CON_CABEZA[clave]
    : normalizarNombreProductoPrecio(nombre)
}

export function formatearMedidaPedidoCrudo(medida) {
  const nombre = medida.trim()
  return /[cs]\s*\/\s*c$/i.test(nombre) ? nombre : `${nombre} c/c`
}
