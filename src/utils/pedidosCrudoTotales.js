// Las claves de medida siguen el formato en minúsculas de pedidos[cliente].
function calcularTotalesPedidosCrudo(pedidos = {}, columnas = []) {
  const totales = {}
  columnas.forEach(columna => {
    const clave = columna.toLowerCase()
    const taras = Object.values(pedidos || {}).reduce((suma, fila) => {
      const valor = fila && fila[clave]
      const numero = typeof valor === 'number' || typeof valor === 'string' ? Number(valor) : 0
      return suma + (Number.isFinite(numero) ? numero : 0)
    }, 0)
    totales[clave] = { taras, kilos: taras * 19 }
  })
  return totales
}

module.exports = { calcularTotalesPedidosCrudo }
