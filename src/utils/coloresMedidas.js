// Fondos con contraste alto sobre negro y separación perceptual entre tonos.
const PALETA = ['#70C0F0', '#F0D040', '#F070E0', '#40F0A0', '#F09080', '#B0C090', '#90D040', '#F0C0F0', '#40F0F0', '#B090F0', '#F09040', '#F080B0', '#E0E0E0', '#C0A050', '#60B0A0', '#70B060', '#C0A090', '#90F0C0', '#D0E080', '#A0A0C0', '#40C050', '#A0F090', '#F0C090', '#80A0F0']
const MEDIDAS_BASE = ['26/30', '31/35', '36/40', '41/50', '51/60', '61/70', '71/90', '91/110', 'cristal', 'golfo', 'granja desc', 'piojo', 'robalo', 'saladero', 'salmu', 'salmureado', 'roca']
export const DISTANCIA_MINIMA_COLORES = 20
const esColor = color => /^#[0-9a-f]{6}$/i.test(color || '')
const canales = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
const hex = rgb => '#' + rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()
const lineal = c => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const luminancia = rgb => rgb.map(lineal).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)

export function normalizarNombreMedida(nombre) {
  return String(nombre || '').trim().toLocaleLowerCase('es').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ')
}

export function fondoDeColor(color) {
  const rgb = canales(esColor(color) ? color : '#FFFFFF')
  // Aclarar solo cuando sea necesario: contraste mínimo 7:1 con texto negro.
  let fondo = rgb
  for (let mezcla = 0.01; luminancia(fondo) < 0.30 && mezcla <= 1; mezcla += 0.01) {
    fondo = rgb.map(c => Math.ceil(c + (255 - c) * mezcla))
  }
  return hex(fondo)
}

const labs = new Map()
function lab(color) {
  const fondo = fondoDeColor(color)
  if (labs.has(fondo)) return labs.get(fondo)
  const [r, g, b] = canales(fondo).map(lineal)
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116
  const x = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047)
  const y = f(0.2126729 * r + 0.7151522 * g + 0.0721750 * b)
  const z = f((0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883)
  const result = [116 * y - 16, 500 * (x - y), 200 * (y - z)]
  labs.set(fondo, result)
  return result
}

// Comparar el fondo imprimible, no solo el hexadecimal elegido en el selector.
export function distanciaColores(a, b) {
  const aa = lab(a), bb = lab(b)
  return Math.hypot(...aa.map((c, i) => c - bb[i]))
}

function preferido(nombre) {
  const indice = MEDIDAS_BASE.indexOf(nombre)
  if (indice >= 0) return PALETA[indice]
  let hash = 0
  for (const letra of nombre) hash = (hash * 31 + letra.charCodeAt(0)) >>> 0
  return PALETA[hash % PALETA.length]
}

let candidatosExtra
function elegirLibre(preferencia, usados) {
  const distancia = color => usados.length ? Math.min(...usados.map(otro => distanciaColores(color, otro))) : Infinity
  if (distancia(preferencia) >= DISTANCIA_MINIMA_COLORES) return preferencia
  let mejor = PALETA[0], mayor = -1
  for (const color of PALETA) {
    const d = distancia(color)
    if (d > mayor) { mejor = color; mayor = d }
  }
  if (mayor >= DISTANCIA_MINIMA_COLORES) return mejor
  // Ampliar la selección si el catálogo crece más allá de la paleta inicial.
  if (!candidatosExtra) {
    candidatosExtra = []
    for (let r = 64; r <= 255; r += 32) for (let g = 64; g <= 255; g += 32) for (let b = 64; b <= 255; b += 32) {
      candidatosExtra.push(fondoDeColor(hex([r, g, b])))
    }
  }
  for (const color of candidatosExtra) {
    const d = distancia(color)
    if (d > mayor) { mejor = color; mayor = d }
  }
  return mejor
}

let ultimaClave = '', ultimaAsignacion = new Map()
export function asignarColoresMedidas(catalogo) {
  const registros = catalogo.map(m => ({ nombre: normalizarNombreMedida(m.nombre), color: esColor(m.colorPdf) ? m.colorPdf.toUpperCase() : '' }))
    .filter(m => m.nombre)
    .sort((a, b) => Number(!!b.color) - Number(!!a.color) ||
      (MEDIDAS_BASE.indexOf(a.nombre) < 0 ? 999 : MEDIDAS_BASE.indexOf(a.nombre)) - (MEDIDAS_BASE.indexOf(b.nombre) < 0 ? 999 : MEDIDAS_BASE.indexOf(b.nombre)) ||
      a.nombre.localeCompare(b.nombre) || a.color.localeCompare(b.color))
  const clave = JSON.stringify(registros)
  if (clave === ultimaClave) return ultimaAsignacion
  const colores = new Map(), usados = []
  for (const medida of registros) {
    if (colores.has(medida.nombre)) continue
    // Respetar los colores guardados, incluso si se repiten o son similares.
    const color = medida.color || elegirLibre(preferido(medida.nombre), usados)
    colores.set(medida.nombre, color)
    usados.push(color)
  }
  ultimaClave = clave
  ultimaAsignacion = colores
  return colores
}

export function colorBaseMedida(medida, catalogo = []) {
  const nombre = normalizarNombreMedida(medida?.nombre)
  if (!nombre) return '#FFFFFF'
  const asignados = asignarColoresMedidas(catalogo)
  if (asignados.has(nombre)) return asignados.get(nombre)
  if (esColor(medida?.colorPdf)) return medida.colorPdf.toUpperCase()
  return elegirLibre(preferido(nombre), [...asignados.values()])
}

export function fondoMedida(medida, catalogo = []) {
  return fondoDeColor(colorBaseMedida(medida, catalogo))
}

export function fondoMedidaPorNombre(nombre, catalogo = []) {
  return fondoMedida({ nombre }, catalogo)
}

export function medidaConColorSimilar(color, nombre, catalogo) {
  const clave = normalizarNombreMedida(nombre)
  const asignados = asignarColoresMedidas(catalogo)
  return catalogo.find(m => normalizarNombreMedida(m.nombre) !== clave &&
    distanciaColores(color, asignados.get(normalizarNombreMedida(m.nombre)) || '#FFFFFF') < DISTANCIA_MINIMA_COLORES)
}
