// Factor de producto neto para las medidas C/H20 ("agua").
// Por defecto el neto de una medida con agua es el 65% (0.65) del bruto.
// Cada fila del pedido puede sobreescribir este valor con la propiedad `item.agua`.
export const AGUA_DEFAULT = 0.65

// Devuelve el factor de agua a usar para un item.
// Si el item no tiene un valor válido (> 0) se usa el default 0.65.
export function factorAgua(item) {
  if (!item) return AGUA_DEFAULT
  const valor = Number(item.agua)
  return Number.isFinite(valor) && valor > 0 ? valor : AGUA_DEFAULT
}

// Formatea el factor para mostrarlo (ej. 0.65 -> ".65", 0.7 -> ".7").
export function formatearAgua(item) {
  const valor = factorAgua(item)
  const texto = valor.toString()
  return texto.startsWith('0.') ? texto.slice(1) : texto
}
