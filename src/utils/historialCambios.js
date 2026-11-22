// Deshacer / rehacer de la hoja del día. Cada cambio se guarda como { antes, despues }: mapas de
// rutas de campo (las mismas de guardarCampos, p. ej. `pesos.p1.c2`) con su valor anterior y el
// nuevo. Deshacer vuelve a escribir `antes`; rehacer, `despues`.
//
// - Lo escrito tecla por tecla en una misma celda se agrupa en un solo paso (`agrupar` = la ruta)
//   hasta que se confirma la celda (`cerrar`).
// - Si el cambio crea una fila o columna nueva, deshacerlo la marca como eliminada (nada se borra
//   de verdad; las filas y columnas eliminadas solo se ocultan).
// - Un campo que no existía vuelve a null al deshacer.

const ENTIDADES = ['personas', 'columnas'];

function entidadDe(ruta) {
  const partes = ruta.split('.');
  return ENTIDADES.includes(partes[0]) && partes.length > 2 ? `${partes[0]}.${partes[1]}` : null;
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function valorEnRuta(objeto, ruta) {
  return ruta.split('.').reduce((actual, parte) => (actual == null ? undefined : actual[parte]), objeto);
}

export function crearHistorial(limite = 100) {
  const pasado = [];
  const futuro = [];
  let abierto = null;

  return {
    // `leer(ruta)` da el valor actual (antes de aplicar `campos`).
    registrar(campos, leer, agrupar = null) {
      const antes = {};
      const despues = {};
      Object.entries(campos).forEach(([ruta, valor]) => {
        const entidad = entidadDe(ruta);
        if (entidad && leer(entidad) === undefined) {
          antes[`${entidad}.eliminado`] = true;
          despues[`${entidad}.eliminado`] = false;
        } else {
          const previo = leer(ruta);
          antes[ruta] = previo === undefined ? null : previo;
        }
        despues[ruta] = valor;
      });
      const cambia = Object.keys(despues).some(ruta => !(ruta in antes) || !igual(antes[ruta], despues[ruta]));
      if (!cambia) return false;
      const ultimo = pasado[pasado.length - 1];
      if (agrupar && abierto === agrupar && ultimo) {
        // Mismo campo que se sigue escribiendo: se queda el "antes" original.
        Object.entries(antes).forEach(([ruta, valor]) => { if (!(ruta in ultimo.antes)) ultimo.antes[ruta] = valor; });
        Object.assign(ultimo.despues, despues);
      } else {
        pasado.push({ antes, despues });
        if (pasado.length > limite) pasado.shift();
      }
      abierto = agrupar;
      futuro.length = 0;
      return true;
    },
    cerrar() { abierto = null; },
    deshacer() {
      abierto = null;
      const paso = pasado.pop();
      if (!paso) return null;
      futuro.push(paso);
      return { ...paso.antes };
    },
    rehacer() {
      abierto = null;
      const paso = futuro.pop();
      if (!paso) return null;
      pasado.push(paso);
      return { ...paso.despues };
    },
    limpiar() { pasado.length = 0; futuro.length = 0; abierto = null; },
    get atras() { return pasado.length; },
    get adelante() { return futuro.length; }
  };
}
