/**
 * Kilos disponibles por FIFO de lotes (mismo criterio que Existencias y que la
 * lista de medidas de Salidas). Lógica pura, sin Firestore.
 *
 * Cada medida+precio+cuarto tiene su propia cola de lotes: una entrada agrega un
 * lote y una salida consume los lotes más antiguos de SU cuarto. Una salida que
 * excede los lotes de ese momento no deja saldo negativo (igual que Existencias).
 * Por eso restar totales (entradas - salidas) puede dar menos que Existencias.
 *
 * movimientos: [{ tipo: 'entrada'|'salida', kilos, cuarto }] en orden cronológico.
 * Devuelve los kilos restantes de los cuartos que cumplan `incluirCuarto`.
 */
function kilosDisponiblesFifo(movimientos, incluirCuarto = () => true) {
  const lotesPorCuarto = new Map()
  movimientos.forEach(({ tipo, kilos, cuarto }) => {
    const valor = Number(kilos) || 0
    if (!lotesPorCuarto.has(cuarto)) lotesPorCuarto.set(cuarto, [])
    const lotes = lotesPorCuarto.get(cuarto)
    if (tipo === 'entrada') {
      lotes.push(valor)
      return
    }
    let pendiente = valor
    for (let i = 0; i < lotes.length && pendiente > 0; i += 1) {
      const tomado = Math.min(lotes[i], pendiente)
      lotes[i] -= tomado
      pendiente -= tomado
    }
    lotesPorCuarto.set(cuarto, lotes.filter(k => k > 0))
  })
  let total = 0
  lotesPorCuarto.forEach((lotes, cuarto) => {
    if (incluirCuarto(cuarto)) total += lotes.reduce((s, k) => s + k, 0)
  })
  return Number(total.toFixed(1))
}

// Compara nombres de proveedor sin distinguir mayúsculas ni espacios sobrantes
// ("Rey mar" == "Rey Mar ").
function mismoProveedor(a, b) {
  return String(a == null ? '' : a).trim().toLowerCase() === String(b == null ? '' : b).trim().toLowerCase()
}

module.exports = { kilosDisponiblesFifo, mismoProveedor }
