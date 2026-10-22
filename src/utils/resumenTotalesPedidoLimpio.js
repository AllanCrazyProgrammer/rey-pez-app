import { calcularKilosItemPedidoLimpio } from '@/utils/calculosPedidoLimpio'
import {
  extraerFilasPedidoLimpio,
  esMaquilaExcluidaDeVentaPedidoLimpio,
  normalizarClaveMedida
} from '@/utils/analisisPedidosLimpio'

function esMaquila(fila) {
  const operacion = normalizarClaveMedida(fila.item?.tipoOperacion)
  if (operacion === 'maquila') return true
  if (operacion === 'venta') return false
  return fila.item?.esMaquila === true || esMaquilaExcluidaDeVentaPedidoLimpio(fila)
}

function redondearCentesimas(kilos) {
  const centesimas = kilos * 100
  // Compensa la precisión binaria de conversiones como 12.7 × 0.65.
  return Math.round(centesimas + Number.EPSILON * Math.max(1, Math.abs(centesimas)))
}

// El desglose no cambia las medidas ni las claves de rendimiento de las tarjetas.
export function resumirTotalesPedidoLimpio(pedido) {
  let venta = 0
  let maquila = 0
  extraerFilasPedidoLimpio(pedido).forEach(fila => {
    const medida = normalizarClaveMedida(fila.item?.medida)
    if (!medida || medida === 'robalo') return

    const kilos = calcularKilosItemPedidoLimpio(fila.item, fila.clienteId)
    if (esMaquila(fila)) maquila += kilos
    else venta += kilos
  })

  // Sumar las cantidades mostradas evita diferencias por redondear el total aparte.
  const ventaCentesimas = redondearCentesimas(venta)
  const maquilaCentesimas = redondearCentesimas(maquila)
  return {
    venta: ventaCentesimas / 100,
    maquila: maquilaCentesimas / 100,
    total: (ventaCentesimas + maquilaCentesimas) / 100,
    tieneMaquila: maquilaCentesimas > 0
  }
}
