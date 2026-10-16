export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
export const TIEMPO_LECTURA_MS = 15000;
export const TIEMPO_SUBIDA_MS = 45000;
export const TIEMPO_REINTENTO_SUBIDA_MS = 12000;
export const TIEMPO_GUARDADO_MS = 20000;
const LADO_MAXIMO = 1600;

export function conTiempo(promesa, ms, mensaje) {
  return new Promise((resolve, reject) => {
    let cerrado = false;
    const timer = setTimeout(() => {
      if (cerrado) return;
      cerrado = true;
      const error = new Error(mensaje);
      error.code = 'timeout';
      reject(error);
    }, ms);
    Promise.resolve(promesa).then(
      (valor) => {
        if (cerrado) return;
        cerrado = true;
        clearTimeout(timer);
        resolve(valor);
      },
      (error) => {
        if (cerrado) return;
        cerrado = true;
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function rutaFotoMaquina(cuartoId, ahora = Date.now()) {
  const id = String(cuartoId || '').replace(/[^a-zA-Z0-9-]/g, '');
  return `bitacoras/cuarto-${id}/maquina-${ahora}.jpg`;
}

export function tipoDeArchivo(archivo) {
  const tipo = String((archivo && archivo.type) || '').toLowerCase();
  if (tipo === 'image/jpg') return 'image/jpeg';
  if (TIPOS_FOTO.indexOf(tipo) !== -1) return tipo;
  const nombre = String((archivo && archivo.name) || '').toLowerCase();
  if (nombre.endsWith('.jpg') || nombre.endsWith('.jpeg')) return 'image/jpeg';
  if (nombre.endsWith('.png')) return 'image/png';
  if (nombre.endsWith('.webp')) return 'image/webp';
  return '';
}

export function mensajeErrorFoto(error) {
  const codigo = String((error && error.code) || '');
  if (codigo.indexOf('retry-limit-exceeded') !== -1) {
    return 'No se pudo subir la foto. Revisa tu conexión y vuelve a intentarlo.';
  }
  if (codigo === 'timeout') {
    return (
      (error && error.message) ||
      'No se pudo subir la foto. Revisa tu conexión y vuelve a intentarlo.'
    );
  }
  if (codigo.indexOf('unauthorized') !== -1 || codigo.indexOf('permission-denied') !== -1) {
    return 'No hay permiso para guardar la bitácora o su foto. Debe ser JPG, PNG o WebP de máximo 10 MB.';
  }
  if (codigo.indexOf('canceled') !== -1) {
    return 'La subida de la foto se interrumpió. Vuelve a intentarlo.';
  }
  return 'No se pudo guardar la bitácora o sus fotos. Tus cambios siguen aquí; revisa tu conexión y vuelve a intentarlo.';
}

function copiarArchivo(archivo) {
  const tipo = tipoDeArchivo(archivo) || 'image/jpeg';
  return archivo.arrayBuffer().then((buffer) => ({
    blob: new Blob([buffer], { type: tipo }),
    contentType: tipo,
  }));
}

function comprimirFoto(archivo) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      reject(new Error('sin canvas'));
      return;
    }
    const url = URL.createObjectURL(archivo);
    const image = new Image();
    const limpiar = () => URL.revokeObjectURL(url);
    image.onload = () => {
      try {
        const escala = Math.min(1, LADO_MAXIMO / Math.max(image.width || 1, image.height || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((image.width || 1) * escala));
        canvas.height = Math.max(1, Math.round((image.height || 1) * escala));
        const contexto = canvas.getContext('2d');
        if (!contexto) throw new Error('sin canvas');
        contexto.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          limpiar();
          if (!blob || !blob.size) {
            reject(new Error('sin blob'));
            return;
          }
          resolve({ blob, contentType: 'image/jpeg' });
        }, 'image/jpeg', 0.82);
      } catch (error) {
        limpiar();
        reject(error);
      }
    };
    image.onerror = () => {
      limpiar();
      reject(new Error('imagen ilegible'));
    };
    image.src = url;
  });
}

export function prepararFoto(archivo) {
  const lectura = comprimirFoto(archivo).catch(() => copiarArchivo(archivo));
  return conTiempo(lectura, TIEMPO_LECTURA_MS, 'No pudimos leer la foto. Vuelve a elegirla.');
}
