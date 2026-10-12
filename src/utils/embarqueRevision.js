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
  'costosPorMedida',
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

/**
 * `kilosCrudos.<medida>`: todo lo que va después del primer punto es el
 * nombre de la medida, aunque tenga puntos (`7.5`). No se parte en segmentos.
 */
const PREFIJOS_POR_MEDIDA = ['kilosCrudos.', 'rendimientoManual.'];

export function segmentosDeClave(clave) {
  if (Array.isArray(clave)) return clave;
  if (typeof clave !== 'string') return [String(clave)];
  for (let i = 0; i < PREFIJOS_POR_MEDIDA.length; i += 1) {
    const prefijo = PREFIJOS_POR_MEDIDA[i];
    if (clave.indexOf(prefijo) === 0) return [prefijo.slice(0, -1), clave.slice(prefijo.length)];
  }
  if (clave.indexOf('.') === -1) return [clave];
  return clave.split('.');
}

export function leerCampo(data, path) {
  if (data == null || path == null) return undefined;
  if (typeof path === 'string' && Object.prototype.hasOwnProperty.call(data, path)) return data[path];
  const segmentos = segmentosDeClave(path);
  let actual = data;
  for (let i = 0; i < segmentos.length; i += 1) {
    if (actual == null || typeof actual !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(actual, segmentos[i])) return undefined;
    actual = actual[segmentos[i]];
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
 * @param {string} [sinBase] Si no hay foto de la base: 'conflicto' (pide
 *   recargar) o 'ultima' (el pendiente viejo, sin foto, gana en los campos
 *   que el servidor no tiene ya iguales).
 * @returns {{accion:'crear'|'escribir'|'fusionar'|'parcial'|'omitir'|'conflicto', rev:number, campos:Object, camposEnConflicto:string[]}}
 */
export function planearEscritura({ remoto, baseRev, baseCampos, campos, sinBase = 'conflicto', forzar = false } = {}) {
  const cambios = campos || {};
  const claves = Object.keys(cambios);
  const revRemota = remoto ? (Number(remoto.rev) || 0) : 0;
  const revBase = Number(baseRev) || 0;

  if (!remoto) {
    return { accion: 'crear', rev: revBase + 1, campos: cambios, camposEnConflicto: [], camposRemotosDistintos: [] };
  }

  const porEscribir = {};
  const enConflicto = [];
  const coincidentes = {};
  const remotosDistintos = [];
  const baseConocida = baseCampos != null;
  claves.forEach(clave => {
    const remotoValor = leerCampo(remoto, clave);
    const nuevo = cambios[clave];
    // Esta pantalla no tocó el campo. Si el servidor ya lo cambió, no se
    // adopta la rev nueva sin traer ese valor: el que llama tiene que fusionar.
    if (baseConocida && equivalentes(nuevo, leerCampo(baseCampos, clave))) {
      if (!equivalentes(remotoValor, nuevo)) remotosDistintos.push(clave);
      return;
    }
    // Ya está en el servidor el valor que íbamos a guardar. No se reescribe,
    // pero la base de esta pantalla tiene que reconocerlo: si se queda en el
    // valor viejo, el siguiente cambio se marca conflicto sin serlo.
    if (equivalentes(remotoValor, nuevo)) {
      coincidentes[clave] = nuevo;
      return;
    }
    if (forzar) {
      porEscribir[clave] = nuevo;
      return;
    }
    // Con foto de base se compara campo por campo aunque `rev` coincida.
    // Una fusión anterior no nos deja leer los campos que no escribimos;
    // adoptar esa rev y volver a mandar el formulario completo no puede
    // pisar un valor remoto más nuevo.
    if (baseConocida) {
      if (equivalentes(remotoValor, leerCampo(baseCampos, clave))) porEscribir[clave] = nuevo;
      else enConflicto.push(clave);
      return;
    }
    if (revRemota === revBase || sinBase === 'ultima') porEscribir[clave] = nuevo;
    else enConflicto.push(clave);
  });

  const hayEscritura = Object.keys(porEscribir).length > 0;
  if (!hayEscritura && enConflicto.length === 0) {
    return { accion: 'omitir', rev: revRemota, campos: {}, camposEnConflicto: [], camposCoincidentes: coincidentes, camposRemotosDistintos: remotosDistintos };
  }
  if (!hayEscritura) {
    return { accion: 'conflicto', rev: revRemota, campos: cambios, camposEnConflicto: enConflicto, camposCoincidentes: coincidentes, camposRemotosDistintos: remotosDistintos };
  }
  let accion = revRemota === revBase ? 'escribir' : 'fusionar';
  if (enConflicto.length) accion = 'parcial';
  return { accion, rev: revRemota + 1, campos: porEscribir, camposEnConflicto: enConflicto, camposCoincidentes: coincidentes, camposRemotosDistintos: remotosDistintos };
}

/**
 * Parte `kilosCrudos` y `rendimientoManual` por medida para que dos equipos
 * guarden tallas distintas sin pisarse el mapa entero.
 * Borrar una talla no viaja aquí: no se manda `FieldValue.delete()`.
 * Una medida que desaparece del mapa se queda en el servidor hasta que alguien
 * la vuelva a escribir. Una clave vacía sí se omite, para no tumbar el guardado.
 */
function expandirMapaPorMedida(salida, campo) {
  const mapa = salida[campo];
  if (mapa == null || typeof mapa !== 'object' || Array.isArray(mapa)) return;
  delete salida[campo];
  Object.keys(mapa).forEach(medida => {
    if (!String(medida).trim()) return;
    salida[`${campo}.${medida}`] = mapa[medida];
  });
}

export function expandirKilosCrudos(campos) {
  const salida = { ...(campos || {}) };
  expandirMapaPorMedida(salida, 'kilosCrudos');
  expandirMapaPorMedida(salida, 'rendimientoManual');
  return salida;
}

/**
 * Lo que sí puede ir al servidor: kilos por medida, sin las claves bloqueadas.
 * El mapa completo se queda en la copia de este equipo.
 */
export function prepararPayloadServidor(campos, bloqueadas, baseCampos) {
  const lista = bloqueadas || [];
  let salida = expandirKilosCrudos(campos);
  ['kilosCrudos', 'rendimientoManual'].forEach(campo => {
    if (!lista.includes(campo)) return;
    Object.keys(salida).forEach(clave => {
      if (clave === campo || clave.indexOf(`${campo}.`) === 0) delete salida[clave];
    });
  });
  Object.keys(salida).forEach(clave => {
    const punto = clave.indexOf('.');
    if (punto <= 0) return;
    const padre = clave.slice(0, punto);
    if ((padre === 'kilosCrudos' || padre === 'rendimientoManual') && !clave.slice(punto + 1).trim()) {
      delete salida[clave];
    }
  });
  if (baseCampos) {
    Object.keys(salida).forEach(clave => {
      if (equivalentes(salida[clave], leerCampo(baseCampos, clave))) delete salida[clave];
    });
  }
  salida = sinClavesBloqueadas(salida, lista);
  return salida;
}

/** Mete escrituras `padre.hijo` dentro del mapa de la base. */
export function integrarCamposEnBase(base, campos) {
  const siguiente = { ...(base || {}) };
  Object.keys(campos || {}).forEach(clave => {
    const segmentos = segmentosDeClave(clave);
    if (segmentos.length > 1) {
      const padre = segmentos[0];
      const hijo = segmentos.slice(1).join('.');
      const mapa = siguiente[padre] && typeof siguiente[padre] === 'object' && !Array.isArray(siguiente[padre])
        ? { ...siguiente[padre] }
        : {};
      mapa[hijo] = campos[clave];
      siguiente[padre] = mapa;
    } else {
      siguiente[clave] = campos[clave];
    }
  });
  return siguiente;
}

/** Quita claves que ya están en conflicto hasta que la persona reintente o recargue. */
export function sinClavesBloqueadas(campos, bloqueadas) {
  const copia = { ...(campos || {}) };
  (bloqueadas || []).forEach(clave => { delete copia[clave]; });
  return copia;
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
