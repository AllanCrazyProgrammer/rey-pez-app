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
 * Serialización estable (llaves ordenadas recursivamente) para comparar
 * objetos que dieron una vuelta por Firestore, donde el orden de llaves no
 * está garantizado. `undefined` se trata como null.
 */
export function serializarEstable(valor) {
  if (valor === undefined || valor === null) return 'null';
  if (Array.isArray(valor)) {
    return '[' + valor.map(serializarEstable).join(',') + ']';
  }
  if (typeof valor === 'object') {
    return '{' + Object.keys(valor).sort()
      .map((k) => JSON.stringify(k) + ':' + serializarEstable(valor[k]))
      .join(',') + '}';
  }
  return JSON.stringify(valor);
}

/**
 * Determina si un producto individual tiene información capturada
 * (medida, precio, kilos, taras o reportes). Un producto sin nada de esto es
 * un renglón placeholder: cada editor crea el suyo automáticamente, así que
 * al fusionar ediciones colaborativas los placeholders ajenos se descartan
 * para no duplicar renglones vacíos.
 */
export function productoTieneContenido(producto) {
  if (!producto) return false;
  return (
    stringHasContent(producto.medida) ||
    stringHasContent(producto.nombreAlternativoPDF) ||
    toNumber(producto.precio) > 0 ||
    arrayHasPositiveNumber(producto.kilos) ||
    arrayHasPositiveNumber(producto.taras) ||
    arrayHasPositiveNumber(producto.tarasExtra) ||
    arrayHasPositiveNumber(producto.reporteTaras) ||
    arrayHasPositiveNumber(producto.reporteBolsas)
  );
}

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

