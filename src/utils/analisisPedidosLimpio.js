import {
  calcularKilosItemPedidoLimpio,
  calcularTarasItemPedidoLimpio
} from '@/utils/calculosPedidoLimpio'

const CLIENTES_FIJOS = [
  { id: 'otilio', nombre: 'Otilio' },
  { id: 'catarro', nombre: 'Catarro' },
  { id: 'joselito', nombre: 'Joselito' },
  { id: 'lorena', nombre: 'Lorena' },
  { id: 'ozuna', nombre: 'Ozuna' }
]

const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales
  return Math.round((Number(valor) || 0) * factor) / factor
}

export const normalizarClaveMedida = (medida) => String(medida || '')
  .trim()
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/(\d)\s*-\s*(\d)/g, '$1/$2')
  .replace(/\s+/g, ' ')

const etiquetaMedida = (medida) => String(medida || '')
  .trim()
  .replace(/(\d)\s*-\s*(\d)/g, '$1/$2')
  .replace(/\s+/g, ' ')

const compararMedidas = (a, b) => {
  const numeroA = Number.parseFloat(a.nombre)
  const numeroB = Number.parseFloat(b.nombre)
  const ambosNumericos = Number.isFinite(numeroA) && Number.isFinite(numeroB)

  if (ambosNumericos && numeroA !== numeroB) return numeroA - numeroB
  if (Number.isFinite(numeroA) !== Number.isFinite(numeroB)) return Number.isFinite(numeroA) ? -1 : 1
  return a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' })
}

export const esMaquilaExcluidaDeVentaPedidoLimpio = fila => {
  const medida = normalizarClaveMedida(fila?.item?.medida)

  if (fila?.clienteId === 'joselito') {
    return medida === 'macuil' || medida === 'maquila'
  }
  if (fila?.clienteId !== 'ozuna') return false

  return fila?.item?.esMaquila === true ||
    medida === 'maquila'
}

/**
 * Convierte un documento de Pedido Limpio en filas homogéneas, incluyendo
 * clientes fijos y clientes temporales/legacy.
 */
export function extraerFilasPedidoLimpio(pedido) {
  if (!pedido || pedido.tipo !== 'limpio') return []

  const filas = []
  CLIENTES_FIJOS.forEach(cliente => {
    const items = Array.isArray(pedido[cliente.id]) ? pedido[cliente.id] : []
    items.forEach(item => {
      filas.push({
        pedidoId: pedido.id,
        fecha: pedido.fecha,
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        item
      })
    })
  })

  const temporales = pedido.clientesTemporales && typeof pedido.clientesTemporales === 'object'
    ? pedido.clientesTemporales
    : {}

  Object.entries(temporales).forEach(([id, cliente]) => {
    const items = Array.isArray(cliente) ? cliente : cliente?.pedidos
    const nombre = Array.isArray(cliente) ? id : (cliente?.nombre || id)
    if (!Array.isArray(items)) return

    items.forEach(item => filas.push({
      pedidoId: pedido.id,
      fecha: pedido.fecha,
      clienteId: 'temporal',
      clienteNombre: nombre,
      item
    }))
  })

  return filas
}

export function obtenerMedidasPedidosLimpio(pedidos, fechaInicio, fechaFin) {
  const medidas = new Map()

  ;(Array.isArray(pedidos) ? pedidos : [])
    .filter(pedido => pedido?.tipo === 'limpio')
    .filter(pedido => !fechaInicio || pedido.fecha >= fechaInicio)
    .filter(pedido => !fechaFin || pedido.fecha <= fechaFin)
    .forEach(pedido => {
      extraerFilasPedidoLimpio(pedido).forEach(fila => {
        if (esMaquilaExcluidaDeVentaPedidoLimpio(fila)) return
        const nombre = etiquetaMedida(fila.item?.medida)
        const clave = normalizarClaveMedida(nombre)
        const kilos = calcularKilosItemPedidoLimpio(fila.item)
        if (!clave || kilos <= 0 || medidas.has(clave)) return
        medidas.set(clave, { clave, nombre })
      })
    })

  return [...medidas.values()].sort(compararMedidas)
}

const crearAcumulador = (extra = {}) => ({
  ...extra,
  kilos: 0,
  taras: 0,
  filas: 0,
  pedidosIds: new Set(),
  fechas: new Set()
})

const finalizarAcumulador = acumulador => ({
  ...acumulador,
  kilos: redondear(acumulador.kilos),
  taras: redondear(acumulador.taras),
  pedidos: acumulador.pedidosIds.size,
  dias: acumulador.fechas.size,
  pedidosIds: undefined,
  fechas: undefined
})

const finalizarCliente = cliente => {
  const dias = [...cliente.diasMap.values()]
    .map(dia => ({
      ...finalizarAcumulador(dia),
      medidas: [...dia.medidasMap.values()]
        .map(finalizarAcumulador)
        .sort((a, b) => b.kilos - a.kilos || compararMedidas(a, b)),
      medidasMap: undefined
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  return {
    ...finalizarAcumulador(cliente),
    dias,
    diasMap: undefined
  }
}

const acumularFila = (acumuladores, kilos, taras, pedidoId, fechaPedido) => {
  acumuladores.forEach(acumulador => {
    acumulador.kilos += kilos
    acumulador.taras += taras
    acumulador.filas += 1
    acumulador.pedidosIds.add(pedidoId)
    acumulador.fechas.add(fechaPedido)
  })
}

export function construirAnalisisPedidosLimpio(
  pedidos,
  { fechaInicio = '', fechaFin = '', medidasSeleccionadas = null } = {}
) {
  const limitarMedidas = Array.isArray(medidasSeleccionadas)
  const seleccion = new Set(medidasSeleccionadas || [])
  const porMedida = new Map()
  const porFecha = new Map()
  const porCliente = new Map()
  const pedidosIncluidos = new Set()

  ;(Array.isArray(pedidos) ? pedidos : [])
    .filter(pedido => pedido?.tipo === 'limpio')
    .filter(pedido => !fechaInicio || pedido.fecha >= fechaInicio)
    .filter(pedido => !fechaFin || pedido.fecha <= fechaFin)
    .forEach(pedido => {
      extraerFilasPedidoLimpio(pedido).forEach(fila => {
        const medidaNombre = etiquetaMedida(fila.item?.medida)
        const medidaClave = normalizarClaveMedida(medidaNombre)
        const kilos = calcularKilosItemPedidoLimpio(fila.item)
        const taras = calcularTarasItemPedidoLimpio(fila.item, fila.clienteId)
        if (!medidaClave || kilos <= 0) return

        const pedidoId = fila.pedidoId || `${fila.fecha}-${fila.clienteNombre}`
        const clienteClave = normalizarClaveMedida(fila.clienteNombre)
        if (!porCliente.has(clienteClave)) {
          porCliente.set(clienteClave, crearAcumulador({
            nombre: fila.clienteNombre,
            diasMap: new Map()
          }))
        }

        const cliente = porCliente.get(clienteClave)
        if (!cliente.diasMap.has(fila.fecha)) {
          cliente.diasMap.set(fila.fecha, crearAcumulador({
            fecha: fila.fecha,
            medidasMap: new Map()
          }))
        }
        const diaCliente = cliente.diasMap.get(fila.fecha)
        if (!diaCliente.medidasMap.has(medidaClave)) {
          diaCliente.medidasMap.set(medidaClave, crearAcumulador({
            clave: medidaClave,
            nombre: medidaNombre
          }))
        }

        acumularFila([
          cliente,
          diaCliente,
          diaCliente.medidasMap.get(medidaClave)
        ], kilos, taras, pedidoId, fila.fecha)

        // Los totales por cliente siempre muestran el pedido completo del rango.
        // La selección de medidas y la exclusión de maquila solo afectan las
        // estadísticas generales, las gráficas y la participación por medida.
        if (
          esMaquilaExcluidaDeVentaPedidoLimpio(fila) ||
          (limitarMedidas && !seleccion.has(medidaClave))
        ) return

        pedidosIncluidos.add(pedidoId)
        if (!porMedida.has(medidaClave)) {
          porMedida.set(medidaClave, crearAcumulador({
            clave: medidaClave,
            nombre: medidaNombre
          }))
        }
        if (!porFecha.has(fila.fecha)) {
          porFecha.set(fila.fecha, crearAcumulador({ fecha: fila.fecha }))
        }

        acumularFila([
          porMedida.get(medidaClave),
          porFecha.get(fila.fecha)
        ], kilos, taras, pedidoId, fila.fecha)
      })
    })

  const medidas = [...porMedida.values()]
    .map(finalizarAcumulador)
    .sort((a, b) => b.kilos - a.kilos || compararMedidas(a, b))
  const fechas = [...porFecha.values()]
    .map(finalizarAcumulador)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const clientes = [...porCliente.values()]
    .map(finalizarCliente)
    .sort((a, b) => b.kilos - a.kilos || a.nombre.localeCompare(b.nombre, 'es'))

  const kilosTotal = redondear(medidas.reduce((total, medida) => total + medida.kilos, 0))
  const tarasTotal = redondear(medidas.reduce((total, medida) => total + medida.taras, 0))
  const diasConPedido = fechas.length
  const medidaPrincipal = medidas[0] || null
  const diaPico = fechas.reduce(
    (mayor, dia) => (!mayor || dia.kilos > mayor.kilos ? dia : mayor),
    null
  )

  medidas.forEach(medida => {
    medida.porcentaje = kilosTotal > 0 ? redondear((medida.kilos / kilosTotal) * 100, 1) : 0
  })

  return {
    rango: { fechaInicio, fechaFin },
    resumen: {
      kilosTotal,
      tarasTotal,
      pedidos: pedidosIncluidos.size,
      diasConPedido,
      promedioDiario: diasConPedido ? redondear(kilosTotal / diasConPedido) : 0,
      medidaPrincipal,
      diaPico
    },
    porMedida: medidas,
    porFecha: fechas,
    porCliente: clientes
  }
}
