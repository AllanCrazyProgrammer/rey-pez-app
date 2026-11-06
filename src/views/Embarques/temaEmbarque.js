// Preferencia local del editor de embarques. No forma parte del documento
// del embarque: vive en el dispositivo y sigue disponible sin conexión.
export const CLAVE_TEMA_EMBARQUE = 'embarque:tema-colores';
export const FONDO_CABINA = '#121e34';
export const CONTRASTE_MINIMO = 3;
export const COLORES_ORIGINALES = {
  acento: '#38d9ff',
  etiquetas: '#8da0bd',
};

export function normalizarHex(valor) {
  if (typeof valor !== 'string') return null;
  const coincidencia = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(valor.trim());
  if (!coincidencia) return null;
  let hex = coincidencia[1].toLowerCase();
  if (hex.length === 3) hex = hex.split('').map((digito) => digito + digito).join('');
  return `#${hex}`;
}

function canal(valor) {
  const c = valor / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * canal(r)) + (0.7152 * canal(g)) + (0.0722 * canal(b));
}

export function contraste(a, b) {
  const izquierda = normalizarHex(a);
  const derecha = normalizarHex(b);
  if (!izquierda || !derecha) return 0;
  const clara = Math.max(luminancia(izquierda), luminancia(derecha));
  const oscura = Math.min(luminancia(izquierda), luminancia(derecha));
  return (clara + 0.05) / (oscura + 0.05);
}

export function colorTextoSobre(fondo) {
  const hex = normalizarHex(fondo) || COLORES_ORIGINALES.acento;
  return contraste(hex, '#06101c') >= 4.5 ? '#06101c' : '#f8fbff';
}

export function colorUtilizable(valor, fondo = FONDO_CABINA) {
  const hex = normalizarHex(valor);
  if (!hex) return null;
  if (hex === COLORES_ORIGINALES.acento || hex === COLORES_ORIGINALES.etiquetas) return hex;
  if (contraste(hex, fondo) < CONTRASTE_MINIMO) return null;
  return hex;
}

export function sanearTema(tema) {
  const origen = tema && typeof tema === 'object' && !Array.isArray(tema) ? tema : {};
  return {
    acento: colorUtilizable(origen.acento) || COLORES_ORIGINALES.acento,
    etiquetas: colorUtilizable(origen.etiquetas) || COLORES_ORIGINALES.etiquetas,
  };
}

function almacenamientoDe(almacenamiento) {
  if (almacenamiento) return almacenamiento;
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    return localStorage;
  } catch (error) {
    return null;
  }
}

export function leerTema(almacenamiento) {
  const store = almacenamientoDe(almacenamiento);
  if (!store) return { ...COLORES_ORIGINALES };
  try {
    const crudo = store.getItem(CLAVE_TEMA_EMBARQUE);
    if (!crudo) return { ...COLORES_ORIGINALES };
    return sanearTema(JSON.parse(crudo));
  } catch (error) {
    return { ...COLORES_ORIGINALES };
  }
}

export function guardarTema(tema, almacenamiento) {
  const seguro = sanearTema(tema);
  const store = almacenamientoDe(almacenamiento);
  if (!store) return seguro;
  try {
    const esOriginal = seguro.acento === COLORES_ORIGINALES.acento
      && seguro.etiquetas === COLORES_ORIGINALES.etiquetas;
    if (esOriginal) store.removeItem(CLAVE_TEMA_EMBARQUE);
    else store.setItem(CLAVE_TEMA_EMBARQUE, JSON.stringify(seguro));
  } catch (error) {
    // Sin almacenamiento la sesión sigue mostrando el color elegido.
  }
  return seguro;
}

export function restaurarTema(almacenamiento) {
  const store = almacenamientoDe(almacenamiento);
  if (store) {
    try {
      store.removeItem(CLAVE_TEMA_EMBARQUE);
    } catch (error) {
      // La restauración visual no depende de poder borrar la clave.
    }
  }
  return { ...COLORES_ORIGINALES };
}

function pintar(elemento, nombre, valor, activo) {
  if (activo) elemento.style.setProperty(nombre, valor);
  else elemento.style.removeProperty(nombre);
}

export function aplicarTema(elemento, tema) {
  const seguro = sanearTema(tema);
  if (!elemento || !elemento.style || typeof elemento.style.setProperty !== 'function') return seguro;
  const acentoPropio = seguro.acento !== COLORES_ORIGINALES.acento;
  const etiquetasPropias = seguro.etiquetas !== COLORES_ORIGINALES.etiquetas;
  pintar(elemento, '--embarque-acento', seguro.acento, acentoPropio);
  pintar(elemento, '--cian', seguro.acento, acentoPropio);
  pintar(elemento, '--embarque-acento-texto', colorTextoSobre(seguro.acento), acentoPropio);
  pintar(elemento, '--embarque-etiquetas', seguro.etiquetas, etiquetasPropias);
  return seguro;
}
