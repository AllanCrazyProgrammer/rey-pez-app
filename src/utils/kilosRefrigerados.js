const redondearUnDecimal = (valor) => Math.round((Number(valor) || 0) * 10) / 10

export const normalizarClaveMedida = (valor) => (valor || '')
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[()]/g, ' ')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ')

const crearIndiceMedidasPedido = (medidasPedido = []) => {
  const porClave = new Map()

  medidasPedido.forEach((item) => {
    const medida = (item?.medida || '').toString().trim()
    const clave = normalizarClaveMedida(medida)
    if (clave) porClave.set(clave, medida)
  })

  return porClave
}

const resolverMedidaPedido = (indice, medida, detalle = '') => {
  const claveMedida = normalizarClaveMedida(medida)
  const claveConDetalle = normalizarClaveMedida(`${medida || ''} ${detalle || ''}`)

  if (claveConDetalle && indice.has(claveConDetalle)) return indice.get(claveConDetalle)
  if (claveMedida && indice.has(claveMedida)) return indice.get(claveMedida)

  // Algunos embarques guardan la etiqueta o el proveedor dentro del nombre de
  // la medida. Si no existe coincidencia exacta, solo usamos una coincidencia
  // por prefijo cuando es inequívoca.
  const candidatasFuente = [claveConDetalle, claveMedida].filter(Boolean)
  for (const claveFuente of candidatasFuente) {
    const contenidas = Array.from(indice.entries())
      .filter(([clave]) => claveFuente.startsWith(`${clave} `))
      .sort((a, b) => b[0].length - a[0].length)
    if (contenidas.length) return contenidas[0][1]
  }

  if (claveMedida) {
    const variantes = Array.from(indice.entries())
      .filter(([clave]) => clave.startsWith(`${claveMedida} `))
    if (variantes.length === 1) return variantes[0][1]
  }

  return null
}

export const calcularKilosProductoEmbarque = (producto = {}) => {
  if (producto.noSumarKilos) return 0

  const kilosCapturados = (Array.isArray(producto.kilos) ? producto.kilos : [])
    .reduce((total, kilo) => total + (Number(kilo) || 0), 0)
  const tarasNormales = (Array.isArray(producto.taras) ? producto.taras : [])
    .reduce((total, tara) => total + (Number(tara) || 0), 0)

  if ((producto.tipo || '').toString().trim().toLowerCase() === 'c/h20') {
    const reporteTaras = Array.isArray(producto.reporteTaras) ? producto.reporteTaras : []
    const reporteBolsas = Array.isArray(producto.reporteBolsas) ? producto.reporteBolsas : []
    const kilosReporte = reporteTaras.reduce((total, taras, index) => {
      return total + (Number(taras) || 0) * (Number(reporteBolsas[index]) || 0)
    }, 0)
    const kilosBase = kilosReporte > 0 ? kilosReporte : kilosCapturados
    return Math.max(0, redondearUnDecimal(kilosBase * (Number(producto.camaronNeto) || 0.65)))
  }

  const descuentoTaras = producto.restarTaras ? tarasNormales * 3 : 0
  return Math.max(0, redondearUnDecimal(kilosCapturados - descuentoTaras))
}

const obtenerProductosRefri = (embarque = {}) => {
  const clientes = Array.isArray(embarque.clientes) ? embarque.clientes : []
  const clientesRefri = clientes.filter(
    (cliente) => normalizarClaveMedida(cliente?.nombre) === 'refri'
  )

  if (clientesRefri.length) {
    return clientesRefri.flatMap((cliente) => (
      Array.isArray(cliente.productos) ? cliente.productos : []
    ))
  }

  // Compatibilidad con embarques antiguos que guardaban los productos en un
  // arreglo plano y el catálogo de clientes por separado.
  const idsRefri = new Set(
    (Array.isArray(embarque.clientesPersonalizados) ? embarque.clientesPersonalizados : [])
      .filter((cliente) => normalizarClaveMedida(cliente?.nombre) === 'refri')
      .map((cliente) => (cliente?.id ?? '').toString())
  )

  return (Array.isArray(embarque.productos) ? embarque.productos : []).filter((producto) => {
    const nombreEsRefri = normalizarClaveMedida(producto?.nombreCliente) === 'refri'
    const idEsRefri = idsRefri.has((producto?.clienteId ?? '').toString())
    return nombreEsRefri || idEsRefri
  })
}

export const sumarKilosRefriPorMedida = (embarques = [], medidasPedido = []) => {
  const indice = crearIndiceMedidasPedido(medidasPedido)
  const kilosPorMedida = {}

  embarques.forEach((embarque) => {
    obtenerProductosRefri(embarque).forEach((producto) => {
      const medidaFuente = producto?.nombreAlternativoPDF || producto?.medida
      const medidaPedido = resolverMedidaPedido(indice, medidaFuente)
      if (!medidaPedido) return

      kilosPorMedida[medidaPedido] = (kilosPorMedida[medidaPedido] || 0)
        + calcularKilosProductoEmbarque(producto)
    })
  })

  Object.keys(kilosPorMedida).forEach((medida) => {
    kilosPorMedida[medida] = redondearUnDecimal(kilosPorMedida[medida])
  })

  return kilosPorMedida
}

export const sumarLimpiosResumenDiaPorMedida = ({
  resumen = {},
  rendimientosClientes = {},
  rendimientosMaquilas = {},
  medidasPedido = []
} = {}) => {
  const indice = crearIndiceMedidasPedido(medidasPedido)
  const kilosPorMedida = {}
  let filasSinRendimiento = 0

  const agregarFila = (fila, rendimiento, detalle = '') => {
    const rendimientoNumero = Number(rendimiento)
    const total = Number(fila?.total)
    if (!(rendimientoNumero > 0) || !(total > 0)) {
      if (total > 0 && !(rendimientoNumero > 0)) filasSinRendimiento += 1
      return
    }

    const medidaPedido = resolverMedidaPedido(indice, fila?.medida, detalle)
    if (!medidaPedido) return

    kilosPorMedida[medidaPedido] = (kilosPorMedida[medidaPedido] || 0)
      + (total / rendimientoNumero)
  }

  ;(Array.isArray(resumen.salidasClientes) ? resumen.salidasClientes : [])
    .forEach((fila) => agregarFila(fila, rendimientosClientes[fila.key], fila.proveedor))

  ;(Array.isArray(resumen.salidasMaquilas) ? resumen.salidasMaquilas : [])
    .forEach((fila) => agregarFila(fila, rendimientosMaquilas[fila.key], fila.maquila))

  Object.keys(kilosPorMedida).forEach((medida) => {
    kilosPorMedida[medida] = redondearUnDecimal(kilosPorMedida[medida])
  })

  return { kilosPorMedida, filasSinRendimiento }
}

export const combinarKilosRefrigerados = (medidasPedido = [], ...fuentes) => {
  const resultado = {}

  medidasPedido.forEach((item) => {
    const medida = item?.medida
    if (!medida) return
    const total = fuentes.reduce((suma, fuente) => suma + (Number(fuente?.[medida]) || 0), 0)
    if (total > 0) resultado[medida] = redondearUnDecimal(total)
  })

  return resultado
}
