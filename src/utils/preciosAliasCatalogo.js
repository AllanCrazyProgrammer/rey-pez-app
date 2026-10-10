import { normalizarNombreProductoPrecio } from './preciosHistoricos';

/**
 * Compara el nombre completo sin distinguir mayúsculas y conserva los alias
 * históricos también en cachés anteriores al cambio de nombre. Conserva el orden de entrada en empates y nunca modifica los arrays.
 */
export const obtenerGrupoPreciosPorNombre = (catalogo, medida) => {
  const nombreCanonico = normalizarNombreProductoPrecio(medida);
  if (!nombreCanonico) return null;
  const clave = nombreCanonico.toLowerCase().trim();

  const grupos = Object.entries(catalogo).filter(([producto, precios]) =>
    normalizarNombreProductoPrecio(producto).toLowerCase().trim() === clave && precios.length > 0
  );
  if (grupos.length === 0) return null;

  const precios = grupos.length === 1
    ? grupos[0][1]
    : grupos.flatMap(([, registros]) => registros)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return { medidaEncontrada: nombreCanonico, precios };
};

// Compatibilidad para consumidores que solo necesitan los dos alias históricos.
export const obtenerGrupoPreciosPorAlias = (catalogo, medida) => {
  const nombre = normalizarNombreProductoPrecio(medida);
  return nombre === 'Med-Esp c/c' || nombre === 'Med-Gde c/c'
    ? obtenerGrupoPreciosPorNombre(catalogo, medida)
    : null;
};
