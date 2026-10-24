function normalizarNombreMedida(nombre) {
  return typeof nombre === 'string' ? nombre.trim() : '';
}

// null indica que no hay cambio. Las claves siempre son las medidas originales
// (kilosCrudos, medidaOculta, etc. no se tocan). Volver al nombre original
// guarda la entrada con el mismo nombre en vez de borrarla, para que el
// guardado fusionado no conserve un alias viejo.
function renombrarMedidaRendimientos(mapa, medidaOriginal, nuevoNombre) {
  const base = mapa || {};
  const nombre = normalizarNombreMedida(nuevoNombre);
  const actual = base[medidaOriginal] || medidaOriginal;
  if (!nombre || nombre === actual) return null;
  return { ...base, [medidaOriginal]: nombre };
}

module.exports = { normalizarNombreMedida, renombrarMedidaRendimientos };
