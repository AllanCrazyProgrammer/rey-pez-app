import { normalizarNombreProductoPrecio } from './preciosHistoricos';

/**
 * Lee las dos parejas de alias también desde cachés anteriores al cambio de
 * nombre. Conserva el orden de entrada en empates y nunca modifica los arrays.
 */
export const obtenerGrupoPreciosPorAlias = (catalogo, medida) => {
  const nombreCanonico = normalizarNombreProductoPrecio(medida);
  if (nombreCanonico !== 'Med-Esp c/c' && nombreCanonico !== 'Med-Gde c/c') return null;

  const grupos = Object.entries(catalogo).filter(([producto, precios]) =>
    normalizarNombreProductoPrecio(producto) === nombreCanonico && precios.length > 0
  );
  if (grupos.length === 0) return null;

  const precios = grupos.length === 1
    ? grupos[0][1]
    : grupos.flatMap(([, registros]) => registros)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return { medidaEncontrada: nombreCanonico, precios };
};
