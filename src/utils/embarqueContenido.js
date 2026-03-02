const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : NaN;
};

const arrayHasPositiveNumber = (arr) => {
  if (!Array.isArray(arr)) return false;
  return arr.some((v) => {
    const n = toNumber(v);
    return Number.isFinite(n) && n > 0;
  });
};

const stringHasContent = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Determina si un embarque (docData) tiene datos operativos reales.
 *
 * Importante: NO considera como "contenido" el simple hecho de que existan
 * productos vacíos; requiere kilos/taras/crudos/cargaCon con información.
 */
export function embarqueTieneContenidoOperativoDoc(data) {
  if (!data) return false;

  if (stringHasContent(data.cargaCon)) {
    return true;
  }

  const clientes = Array.isArray(data.clientes) ? data.clientes : [];

  for (const cliente of clientes) {
    const productos = Array.isArray(cliente?.productos) ? cliente.productos : [];
    for (const producto of productos) {
      if (
        arrayHasPositiveNumber(producto?.kilos) ||
        arrayHasPositiveNumber(producto?.taras) ||
        arrayHasPositiveNumber(producto?.tarasExtra) ||
        arrayHasPositiveNumber(producto?.reporteTaras) ||
        arrayHasPositiveNumber(producto?.reporteBolsas)
      ) {
        return true;
      }
    }

    const crudos = Array.isArray(cliente?.crudos) ? cliente.crudos : [];
    for (const crudo of crudos) {
      const items = Array.isArray(crudo?.items) ? crudo.items : [];
      for (const item of items) {
        if (stringHasContent(item?.taras) || stringHasContent(item?.sobrante)) return true;
        const kilos = toNumber(item?.kilos);
        if (Number.isFinite(kilos) && kilos > 0) return true;
      }
    }
  }

  return false;
}

/**
 * Determina si el estado actual de edición (productos + clienteCrudos) tiene datos reales.
 * Útil para evitar mutaciones/side-effects de prepararDatosEmbarque().
 */
export function embarqueTieneContenidoOperativoEstado({ cargaCon, productos, clienteCrudos }) {
  if (stringHasContent(cargaCon)) return true;

  const productosList = Array.isArray(productos) ? productos : [];
  for (const producto of productosList) {
    if (
      arrayHasPositiveNumber(producto?.kilos) ||
      arrayHasPositiveNumber(producto?.taras) ||
      arrayHasPositiveNumber(producto?.tarasExtra) ||
      arrayHasPositiveNumber(producto?.reporteTaras) ||
      arrayHasPositiveNumber(producto?.reporteBolsas)
    ) {
      return true;
    }
  }

  const crudosMap = clienteCrudos && typeof clienteCrudos === 'object' ? clienteCrudos : {};
  for (const listaCrudos of Object.values(crudosMap)) {
    if (!Array.isArray(listaCrudos)) continue;
    for (const crudo of listaCrudos) {
      const items = Array.isArray(crudo?.items) ? crudo.items : [];
      for (const item of items) {
        if (stringHasContent(item?.taras) || stringHasContent(item?.sobrante)) return true;
        const kilos = toNumber(item?.kilos);
        if (Number.isFinite(kilos) && kilos > 0) return true;
      }
    }
  }

  return false;
}

