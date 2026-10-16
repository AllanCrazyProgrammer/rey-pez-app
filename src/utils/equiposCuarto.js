/** Equipos de un cuarto frío. Colección Firestore: cuartos/{id}. */

export const CORTE_DOS_COLUMNAS = 640;
export const CORTE_CINCO_COLUMNAS = 1100;

export const CUARTOS_FRIOS = [
  { id: '1', nombre: 'Cuarto frío #1' },
  { id: '2', nombre: 'Cuarto frío #2' },
  { id: '3', nombre: 'Cuarto frío #3' },
  { id: '4', nombre: 'Cuarto frío #4' },
  { id: '5', nombre: 'Cuarto frío #5' },
  { id: 'agua-fria', nombre: 'Agua fría' },
];

export const TIPOS_EQUIPO = [
  { valor: 'compresor', etiqueta: 'Compresor' },
  { valor: 'condensador', etiqueta: 'Condensador' },
  { valor: 'evaporador', etiqueta: 'Evaporador' },
  { valor: 'tablero', etiqueta: 'Tablero' },
  { valor: 'difusor', etiqueta: 'Difusor' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const MAX_FOTOS_EQUIPO = 6;

export function columnasParaAncho(ancho) {
  if (ancho >= CORTE_CINCO_COLUMNAS) return 3;
  if (ancho >= CORTE_DOS_COLUMNAS) return 2;
  return 1;
}

export function nombreDeCuarto(cuartoId) {
  const id = cuartoId === null || cuartoId === undefined ? '' : String(cuartoId);
  const cuarto = CUARTOS_FRIOS.find((item) => item.id === id);
  if (cuarto) return cuarto.nombre;
  if (!id) return '';
  return `Cuarto frío #${id}`;
}

export function fotoMaquinaDesdeDocumento(data) {
  const foto = data && data.fotoMaquina;
  if (!foto || typeof foto !== 'object') return null;
  const url = String(foto.url || '').trim();
  const path = String(foto.path || '').trim();
  if (!url || !path) return null;
  return { url, path };
}

export function nuevoIdEquipo() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function equipoVacio() {
  return {
    id: '',
    nombre: '',
    tipo: '',
    marcaModelo: '',
    refrigerante: '',
    voltaje: '',
    notas: '',
    fotos: [],
  };
}

export function fotosDeEquipo(origen) {
  const lista = origen && Array.isArray(origen.fotos) ? origen.fotos : [];
  return lista
    .filter((foto) => foto && foto.url && foto.path)
    .slice(0, MAX_FOTOS_EQUIPO)
    .map((foto) => ({
      url: String(foto.url).trim(),
      path: String(foto.path).trim(),
    }));
}

export function etiquetaTipo(tipo) {
  const encontrado = TIPOS_EQUIPO.find((item) => item.valor === tipo);
  return encontrado ? encontrado.etiqueta : '';
}

export function serializarEquipo(equipo) {
  const origen = equipo || {};
  const tipo = TIPOS_EQUIPO.some((item) => item.valor === origen.tipo) ? origen.tipo : '';
  return {
    id: origen.id ? String(origen.id) : nuevoIdEquipo(),
    nombre: String(origen.nombre || '').trim(),
    tipo,
    marcaModelo: String(origen.marcaModelo || '').trim(),
    refrigerante: String(origen.refrigerante || '').trim(),
    voltaje: String(origen.voltaje || '').trim(),
    notas: String(origen.notas || '').trim(),
    fotos: fotosDeEquipo(origen),
  };
}

export function equiposDesdeDocumento(data) {
  if (!data || !Array.isArray(data.equipos)) return [];
  return data.equipos
    .filter((item) => item && typeof item === 'object')
    .map((item) => serializarEquipo(item));
}

export function validarEquipo(equipo) {
  if (!String((equipo && equipo.nombre) || '').trim()) {
    return 'El nombre del equipo es obligatorio.';
  }
  if (equipo && equipo.tipo && !TIPOS_EQUIPO.some((item) => item.valor === equipo.tipo)) {
    return 'Selecciona un tipo de equipo válido.';
  }
  return '';
}

export function mensajeErrorCuartos(error, accion) {
  const codigo = String((error && error.code) || '');
  const denegado = codigo === 'permission-denied' || codigo.indexOf('permission-denied') !== -1;
  if (denegado) {
    return accion === 'guardar'
      ? 'No hay permiso para guardar los equipos de este cuarto.'
      : 'No hay permiso para leer los equipos de los cuartos.';
  }
  return accion === 'guardar'
    ? 'No se pudieron guardar los equipos. Revisa tu conexión y vuelve a intentarlo.'
    : 'No pudimos cargar los equipos. Revisa tu conexión e inténtalo de nuevo.';
}
