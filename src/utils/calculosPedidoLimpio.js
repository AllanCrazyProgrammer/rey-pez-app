import { factorAgua, kilosPorTara } from '@/utils/factorAgua'

const FACTORES_POR_TIPO = {
  '1.35 y .15': 1.35,
  '1.3 y .2': 1.3,
  '1.5 y .3': 1.5,
  '.7 y .3': 0.7,
  '.9 y .1': 0.9,
  '.9': 0.9
}

const CLIENTES_CON_TARA_DE_27 = new Set(['otilio', 'catarro', 'ozuna', 'temporal'])
const CLIENTES_FIJOS = ['otilio', 'catarro', 'joselito', 'lorena', 'ozuna']

function numeroPositivo(valor) {
  const numero = Number(valor)
  return Number.isFinite(numero) && numero > 0 ? numero : 0
}

function normalizarCliente(clienteId) {
  const cliente = String(clienteId || 'temporal').trim().toLowerCase()
  return CLIENTES_FIJOS.includes(cliente) ? cliente : 'temporal'
}

function factorPorTipo(item) {
  const tipo = String(item?.tipo || '').trim()
  if (tipo === 'C/H20') return factorAgua(item)
  return FACTORES_POR_TIPO[tipo] || 1
}

export function calcularKilosItemPedidoLimpio(item) {
  const cantidad = numeroPositivo(item?.kilos)
  if (!cantidad) return 0

  if (item?.esTara) {
    const kilosBase = cantidad * kilosPorTara(item)
    return item.tipo === 'C/H20' ? kilosBase * factorAgua(item) : kilosBase
  }

  return cantidad * factorPorTipo(item)
}

export function calcularTarasItemPedidoLimpio(item, clienteId = 'temporal') {
  const cantidad = numeroPositivo(item?.kilos)
  if (!cantidad) return 0
  if (item?.esTara) return cantidad

  const tipo = String(item?.tipo || '').trim()
  if (tipo === 'C/H20') return 0

  if (tipo === 'S/H20' || !tipo) {
    const cliente = normalizarCliente(clienteId)
    const kilosPorTaraSinAgua = CLIENTES_CON_TARA_DE_27.has(cliente) ? 27 : 25
    return cantidad / kilosPorTaraSinAgua
  }

  return cantidad / 25
}

export function calcularTotalesClientePedidoLimpio(items, clienteId = 'temporal') {
  const filas = Array.isArray(items) ? items : []
  const kilos = filas.reduce((total, item) => total + calcularKilosItemPedidoLimpio(item), 0)
  const taras = filas.reduce(
    (total, item) => total + calcularTarasItemPedidoLimpio(item, clienteId),
    0
  )

  return {
    kilosTotal: Math.round(kilos),
    tarasTotal: Math.round(taras)
  }
}

export function calcularTotalesPedidoLimpio(pedido) {
  if (!pedido || typeof pedido !== 'object') return { kilosTotal: 0, tarasTotal: 0 }

  const grupos = CLIENTES_FIJOS.map(clienteId => ({
    clienteId,
    items: pedido[clienteId]
  }))

  const temporales = pedido.clientesTemporales && typeof pedido.clientesTemporales === 'object'
    ? Object.values(pedido.clientesTemporales).map(cliente => ({
      clienteId: 'temporal',
      items: Array.isArray(cliente) ? cliente : cliente?.pedidos
    }))
    : []

  return [...grupos, ...temporales].reduce((acumulado, grupo) => {
    const totales = calcularTotalesClientePedidoLimpio(grupo.items, grupo.clienteId)
    acumulado.kilosTotal += totales.kilosTotal
    acumulado.tarasTotal += totales.tarasTotal
    return acumulado
  }, { kilosTotal: 0, tarasTotal: 0 })
}
