/**
 * Líneas de pedido limpio con la misma forma que guarda PedidosLimpio.vue.
 * Kilos en blanco se persisten como null (fila nueva de la UI). Macuil y
 * maquila aceptan tipo libre, incluido vacío. La etiqueta solo puede ser un
 * botón ya existente en pedido.etiquetas.
 */

const AGUA_DEFAULT = 0.65;

const TIPOS_UI = [
  'S/H20',
  'C/H20',
  '1.4',
  '1.5',
  '1.35 y .15',
  '1.3 y .2',
  '1.5 y .3',
  '.7 y .3',
  '.9 y .1',
  '.9'
];

const TIPO_DEFAULT_POR_CLIENTE = {
  otilio: '',
  catarro: 'S/H20',
  joselito: '',
  lorena: '',
  ozuna: 'S/H20',
  temporal: ''
};

const CLIENTES_FIJOS = ['otilio', 'catarro', 'joselito', 'lorena', 'ozuna'];

function tipoCanonico(valor) {
  const clave = String(valor || '').trim().toUpperCase();
  if (!clave) return '';
  return TIPOS_UI.find((tipo) => tipo.toUpperCase() === clave) || null;
}

function leerCantidad(linea) {
  const valor = Object.prototype.hasOwnProperty.call(linea, 'cantidad')
    ? linea.cantidad
    : linea.kilos;
  if (valor === null || valor === undefined) return { blanco: true };
  if (typeof valor === 'string' && valor.trim() === '') return { blanco: true };
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return { blanco: false, invalida: true };
  return { blanco: false, cantidad: numero };
}

function esMacuilOMaquila(medidaKey) {
  return medidaKey === 'macuil' || medidaKey === 'maquila';
}

/**
 * @returns {{ errores: object[], lineasNormalizadas: object[], pedidoPorCliente: object }}
 */
function construirLineasPedidoLimpio(lineas, {
  validMedidaNombres,
  medidaNombresMap,
  etiquetasDisponibles = [],
  generarAsistenteId
}) {
  const errores = [];
  const lineasNormalizadas = [];
  const pedidoPorCliente = {
    otilio: [],
    catarro: [],
    joselito: [],
    lorena: [],
    ozuna: [],
    clientesTemporales: {}
  };
  const botones = Array.isArray(etiquetasDisponibles) ? etiquetasDisponibles : [];

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i] || {};
    const idx = i + 1;

    const cliente = String(linea.cliente || '').trim().toLowerCase();
    if (!cliente) {
      errores.push({ linea: idx, campo: 'cliente', mensaje: 'El cliente es requerido' });
      continue;
    }

    const cantidadLeida = leerCantidad(linea);
    if (cantidadLeida.invalida) {
      errores.push({ linea: idx, campo: 'cantidad', mensaje: 'La cantidad debe ser mayor a 0' });
      continue;
    }
    const cantidadEnBlanco = cantidadLeida.blanco;
    const cantidad = cantidadLeida.cantidad;

    const unidad = String(linea.unidad || '').trim().toLowerCase();
    if (!cantidadEnBlanco && !['taras', 'kg'].includes(unidad)) {
      errores.push({ linea: idx, campo: 'unidad', mensaje: 'La unidad debe ser "taras" o "kg"' });
      continue;
    }
    if (cantidadEnBlanco && unidad && !['taras', 'kg'].includes(unidad)) {
      errores.push({ linea: idx, campo: 'unidad', mensaje: 'La unidad debe ser "taras" o "kg"' });
      continue;
    }

    const medidaNombre = String(linea.medida || '').trim();
    if (!medidaNombre) {
      errores.push({ linea: idx, campo: 'medida', mensaje: 'La medida es requerida' });
      continue;
    }

    const medidaKey = medidaNombre.toLowerCase();
    const medidaConocida = validMedidaNombres.has(medidaKey);
    // Una fila con kilos en blanco puede guardar el texto tal cual (la UI no
    // rechaza la fila vacía). Con kilos, la medida tiene que existir.
    if (!medidaConocida && !cantidadEnBlanco) {
      const sugerencias = Array.from(medidaNombresMap.values())
        .filter((nombre) => nombre.toLowerCase().includes(medidaKey) || medidaKey.includes(nombre.toLowerCase()))
        .slice(0, 3);
      errores.push({
        linea: idx,
        campo: 'medida',
        mensaje: `Medida "${medidaNombre}" no encontrada o no es válida para pedidos limpio`,
        sugerencias: sugerencias.length > 0 ? sugerencias : undefined
      });
      continue;
    }

    const exactNombre = medidaConocida
      ? (medidaNombresMap.get(medidaKey) || medidaNombre)
      : medidaNombre;

    const tipoFueEnviado = linea.tipo !== undefined || linea.glaseo !== undefined;
    const tipoCrudo = String(linea.tipo ?? linea.glaseo ?? '').trim();
    let tipo = '';
    if (esMacuilOMaquila(medidaKey)) {
      // La UI limpia el glaseo al elegir macuil/maquila y deja un texto libre.
      tipo = tipoCrudo;
    } else if (!tipoFueEnviado && cantidadEnBlanco) {
      const clienteDefault = CLIENTES_FIJOS.includes(cliente) ? cliente : 'temporal';
      tipo = TIPO_DEFAULT_POR_CLIENTE[clienteDefault] ?? '';
    } else if (tipoCrudo) {
      const canonico = tipoCanonico(tipoCrudo);
      if (!canonico) {
        errores.push({
          linea: idx,
          campo: 'tipo',
          mensaje: `Tipo/glaseo inválido: ${tipoCrudo}. Opciones: ${TIPOS_UI.join(', ')}`
        });
        continue;
      }
      tipo = canonico;
    }

    const notaValor = linea.nota || '';
    const nota = ['Sellado', 'Kileado'].includes(notaValor) ? notaValor : '';

    let etiqueta = '';
    const etiquetaPedida = linea.etiqueta == null ? '' : String(linea.etiqueta).trim();
    if (etiquetaPedida) {
      const encontrada = botones.find((nombre) => String(nombre).toLowerCase() === etiquetaPedida.toLowerCase());
      if (!encontrada) {
        errores.push({
          linea: idx,
          campo: 'etiqueta',
          mensaje: `La etiqueta "${etiquetaPedida}" no está entre los botones de este pedido`,
          disponibles: botones.slice()
        });
        continue;
      }
      etiqueta = encontrada;
    }

    let esTara;
    if (unidad) {
      esTara = unidad === 'taras';
    } else if (cantidadEnBlanco) {
      esTara = cliente === 'otilio';
    } else {
      esTara = false;
    }

    const item = {
      kilos: cantidadEnBlanco ? null : cantidad,
      esTara,
      medida: exactNombre,
      tipo,
      nota,
      esProveedor: !!linea.proveedor,
      proveedor: linea.proveedor || '',
      etiqueta,
      _asistenteId: generarAsistenteId()
    };

    if (tipo === 'C/H20') item.agua = AGUA_DEFAULT;

    if (cliente === 'ozuna') {
      if (linea.esMaquila !== undefined) item.esMaquila = !!linea.esMaquila;
      else if (cantidadEnBlanco) item.esMaquila = true;
    } else if (linea.esMaquila !== undefined) {
      item.esMaquila = !!linea.esMaquila;
    }

    const lineaNormalizada = {
      cliente,
      cantidad: cantidadEnBlanco ? null : cantidad,
      unidad: unidad || (esTara ? 'taras' : 'kg'),
      medida: exactNombre,
      tipo,
      nota,
      proveedor: linea.proveedor || '',
      etiqueta
    };
    lineasNormalizadas.push(lineaNormalizada);

    if (CLIENTES_FIJOS.includes(cliente)) {
      pedidoPorCliente[cliente].push(item);
    } else if (!pedidoPorCliente.clientesTemporales[cliente]) {
      pedidoPorCliente.clientesTemporales[cliente] = {
        id: cliente,
        nombre: cliente.charAt(0).toUpperCase() + cliente.slice(1),
        pedidos: [item]
      };
    } else {
      pedidoPorCliente.clientesTemporales[cliente].pedidos.push(item);
    }
  }

  return { errores, lineasNormalizadas, pedidoPorCliente };
}

module.exports = {
  TIPOS_UI,
  TIPO_DEFAULT_POR_CLIENTE,
  construirLineasPedidoLimpio,
  tipoCanonico
};
