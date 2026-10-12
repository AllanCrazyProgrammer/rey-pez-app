/**
 * Reglas de revisión del documento `embarques/{id}`.
 *
 * Varias pantallas escriben el mismo documento. Cada una solo puede pisar
 * los campos que le pertenecen, y solo si nadie más los cambió desde la
 * revisión que tenía cargada (`rev`). Si otra pantalla tocó otros campos,
 * se fusiona. Si tocó los mismos, hay conflicto: hay que recargar.
 */

export const MENSAJE_CONFLICTO_EMBARQUE =
  'Otra pantalla guardó cambios más nuevos en este embarque. Recarga antes de volver a guardar para no perder datos.';

export const CAMPOS_EDITOR = [
  'fecha',
  'cargaCon',
  'camionNumero',
  'clientes',
  'productosEliminados',
  'borrador',
  'clientesJuntarMedidas',
  'clientesReglaOtilio',
  'clientesIncluirPrecios',
  'clientesCuentaEnPdf',
  'clientesSumarKgCatarro',
  'clientesPersonalizados',
  'embarqueBloqueado',
  'medidasConfiguracion',
  'preciosActuales',
];

export const CAMPOS_RENDIMIENTOS = [
  'kilosCrudos',
  'medidaOculta',
  'analizarGanancia',
  'analizarGananciaCrudos',
  'rendimientoManual',
  'analizarMaquilaGanancia',
  'precioMaquila',
  'pesoTaraCosto',
  'pesoTaraVenta',
  'nombresMedidasPersonalizados',
  'notaRendimientos',
  'totalGanancias',
];

export const CAMPOS_COSTOS = [
  'fecha',
  'costosPorMedida',
  'costosPorMedidaManuales',
  'proveedorActivoPorMedida',
  'medidaSeleccionada',
  'medidaOculta',
  'aplicarCostoExtra',
  'costoExtra',
];

export const CAMPOS_FLETES = [
  'fletePagado',
  'fletePagos',
  'fletePagoActualizadoEn',
  'fletePagoActualizadoPor',
];

export const CAMPOS_LISTA = ['noEnviadoMexico'];

const editor = new Set(CAMPOS_EDITOR);

export const CAMPOS_AJENOS_AL_EDITOR = Array.from(new Set([
  ...CAMPOS_RENDIMIENTOS,
  ...CAMPOS_COSTOS.filter(campo => !editor.has(campo)),
  ...CAMPOS_FLETES,
  ...CAMPOS_LISTA,
]));

export function esErrorConflictoEmbarque(error) {
  return Boolean(error && (
    error.code === 'embarque-modificado-externamente' ||
    error.code === 'embarque-eliminado'
  ));
}

export function pedirRecargaPorConflicto(error) {
  const mensaje = (error && error.message) || MENSAJE_CONFLICTO_EMBARQUE;
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return false;
  return window.confirm(`${mensaje}\n\n¿Recargar esta pantalla ahora?`);
}

/**
 * El editor ignora un snapshot cuando `rev` no se movió: lo trata como eco
 * de su propio guardado. Una escritura que no incrementa `rev` desaparece.
 */
export function esEcoDeRevisionLocal({ revRemota, revBase, inicializando = false } = {}) {
  const remota = Number(revRemota) || 0;
  const base = Number(revBase) || 0;
  return !inicializando && remota !== 0 && remota === base;
}

export function leerCampo(data, path) {
  if (!data || path == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(data, path)) return data[path];
  if (typeof path !== 'string' || path.indexOf('.') === -1) return undefined;
  const partes = path.split('.');
  let actual = data;
  for (let i = 0; i < partes.length; i += 1) {
    if (actual == null || typeof actual !== 'object') return undefined;
    actual = actual[partes[i]];
  }
  return actual;
}

function normalizar(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try { return value.toDate().toISOString(); } catch (error) { return null; }
    }
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(normalizar);
    const salida = {};
    Object.keys(value).sort().forEach(clave => {
      const siguiente = normalizar(value[clave]);
      if (siguiente !== null) salida[clave] = siguiente;
    });
    return salida;
  }
  return value;
}

export function equivalentes(a, b) {
  if ((typeof a === 'boolean' && (b === undefined || b === null)) ||
      (typeof b === 'boolean' && (a === undefined || a === null))) {
    return Boolean(a) === Boolean(b);
  }
  return JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));
}

export function seleccionarCampos(data, lista) {
  const salida = {};
  if (!data) return salida;
  (lista || []).forEach(clave => {
    if (Object.prototype.hasOwnProperty.call(data, clave) && data[clave] !== undefined) {
      salida[clave] = data[clave];
    }
  });
  return salida;
}

export function fotoCampos(data, lista) {
  const salida = {};
  (lista || []).forEach(clave => {
    salida[clave] = data && Object.prototype.hasOwnProperty.call(data, clave) ? data[clave] : undefined;
  });
  return salida;
}

/**
 * @returns {{accion:'crear'|'escribir'|'fusionar'|'omitir'|'conflicto', rev:number, campos:Object, camposEnConflicto?:string[]}}
 */
export function planearEscritura({ remoto, baseRev, baseCampos, campos } = {}) {
  const cambios = campos || {};
  const claves = Object.keys(cambios);
  const revRemota = remoto ? (Number(remoto.rev) || 0) : 0;
  const revBase = Number(baseRev) || 0;

  if (!remoto) {
    return { accion: 'crear', rev: revBase + 1, campos: cambios };
  }

  const sinCambios = claves.every(clave => equivalentes(leerCampo(remoto, clave), cambios[clave]));
  if (sinCambios) {
    return { accion: 'omitir', rev: revRemota, campos: cambios };
  }

  if (revRemota === revBase) {
    return { accion: 'escribir', rev: revRemota + 1, campos: cambios };
  }

  if (!baseCampos) {
    return { accion: 'conflicto', rev: revRemota, campos: cambios, camposEnConflicto: claves };
  }

  const cambiados = claves.filter(clave => !equivalentes(
    leerCampo(remoto, clave),
    leerCampo(baseCampos, clave)
  ));
  if (cambiados.length) {
    return { accion: 'conflicto', rev: revRemota, campos: cambios, camposEnConflicto: cambiados };
  }
  return { accion: 'fusionar', rev: revRemota + 1, campos: cambios };
}

export function quitarCamposAjenosAlEditor(payload, hayRemoto, camposPendientes = []) {
  if (!hayRemoto || !payload) return payload;
  const pendientes = new Set(camposPendientes || []);
  const copia = { ...payload };
  CAMPOS_AJENOS_AL_EDITOR.forEach(clave => {
    if (!pendientes.has(clave)) delete copia[clave];
  });
  return copia;
}

export function conservarCamposAjenos(docData, docPrevio) {
  const copia = { ...(docData || {}) };
  if (!docPrevio) return copia;
  CAMPOS_AJENOS_AL_EDITOR.forEach(clave => {
    if (copia[clave] === undefined && docPrevio[clave] !== undefined) {
      copia[clave] = docPrevio[clave];
    }
  });
  return copia;
}
