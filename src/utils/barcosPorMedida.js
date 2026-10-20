import { formatearMedidaPedidoCrudo } from './medidasPedidoCrudo'

// Campo propio del pedido crudo. La clave es el texto impreso de la medida
// (formatearMedidaPedidoCrudo), por ejemplo "Med c/c" o "Med Ch c/c".
// No sustituye a barcosPorPedido, que sigue siendo el barco de cada cliente.
export const CAMPO_BARCOS_POR_MEDIDA = 'barcosPorMedida'

const ORDEN_CLIENTES = ['8a', 'catarro', 'otilio', 'ozuna', 'veronica']

export function claveBarcoPorMedida(columna) {
  return formatearMedidaPedidoCrudo(String(columna || ''))
}

function textoLimpio(valor) {
  if (valor == null) return ''
  return String(valor).trim()
}

export function sugerirBarcoPorMedida(columna, barcosPorPedido) {
  if (!barcosPorPedido || typeof barcosPorPedido !== 'object') return ''
  const claveMedida = String(columna || '').trim().toLowerCase()
  const entradas = Object.entries(barcosPorPedido)
    .filter(([, mapa]) => mapa && typeof mapa === 'object')
    .sort((a, b) => {
      const ia = ORDEN_CLIENTES.indexOf(a[0].toLowerCase())
      const ib = ORDEN_CLIENTES.indexOf(b[0].toLowerCase())
      const ra = ia === -1 ? ORDEN_CLIENTES.length : ia
      const rb = ib === -1 ? ORDEN_CLIENTES.length : ib
      if (ra !== rb) return ra - rb
      return a[0].localeCompare(b[0], 'es')
    })

  const vistos = new Set()
  const nombres = []
  entradas.forEach(([, mapa]) => {
    const texto = textoLimpio(mapa[claveMedida])
    if (!texto) return
    const firma = texto.toLowerCase()
    if (vistos.has(firma)) return
    vistos.add(firma)
    nombres.push(texto)
  })
  return nombres.join(' / ')
}

// null si esa medida no está en el mapa. Cadena vacía si está guardada en blanco.
export function textoGuardadoBarco(barcosPorMedida, columna) {
  if (!barcosPorMedida || typeof barcosPorMedida !== 'object') return null
  const clave = claveBarcoPorMedida(columna)
  if (!Object.prototype.hasOwnProperty.call(barcosPorMedida, clave)) return null
  return textoLimpio(barcosPorMedida[clave])
}

export function barcoInicial(columna, fuentes = {}) {
  const guardado = textoGuardadoBarco(fuentes.barcosPorMedida, columna)
  if (guardado) return guardado
  return sugerirBarcoPorMedida(columna, fuentes.barcosPorPedido)
}

export function cambioBarcoPorMedida(columna, valor) {
  return {
    campo: CAMPO_BARCOS_POR_MEDIDA,
    clave: claveBarcoPorMedida(columna),
    valor: textoLimpio(valor)
  }
}

export function debePersistirBarco({ editado, pedidoId, valor, ultimoGuardado }) {
  if (!editado || !pedidoId) return false
  return ultimoGuardado !== textoLimpio(valor)
}
