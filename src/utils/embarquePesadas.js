// Los inputs y las copias antiguas pueden contener texto. Interpretarlo para
// calcular, sin reescribir la captura compartida ni su historial.
function numeroDeCaptura(valor) {
  if (valor == null || (typeof valor === 'string' && !valor.trim())) return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  const texto = valor.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(texto)) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

export function calcularTotalesPesadas(producto) {
  const invalidos = { kilos: [], taras: [], tarasExtra: [] };
  const sumar = campo => (producto[campo] || []).reduce((total, valor, indice) => {
    const numero = numeroDeCaptura(valor);
    if (numero === null) { invalidos[campo].push(indice); return total; }
    return total + numero;
  }, 0);
  const kilos = sumar('kilos');
  const taras = sumar('taras');
  const tarasExtra = sumar('tarasExtra');
  return {
    totalTaras: taras + tarasExtra,
    // Las taras extra cuentan como taras, pero no descuentan peso.
    totalKilos: Number((kilos - (producto.restarTaras ? taras * 3 : 0)).toFixed(1)),
    invalidos,
    hayValoresInvalidos: Object.values(invalidos).some(indices => indices.length > 0),
  };
}
