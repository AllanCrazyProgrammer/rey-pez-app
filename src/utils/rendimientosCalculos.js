// Cálculos y formatos puros de la pantalla de Rendimientos (src/views/Embarques/Rendimientos.vue).
// Se movieron textualmente desde sus methods: no usan this y solo dependen de sus argumentos.
// La pantalla los sigue exponiendo con el mismo nombre en methods (plantilla y this.x() sin cambios).

export function formatearKg(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

export function deepClone(value) {
  if (value === undefined || value === null) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('[Rendimientos] No se pudo clonar profundamente un valor, devolviendo referencia original.', error);
    return value;
  }
}

export function combinarKilosCrudos(destino, origen) {
  if (!origen) return;
  Object.entries(origen).forEach(([medida, valor]) => {
    const existente = destino[medida];
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      const base = existente && typeof existente === 'object' ? { ...existente } : {
        medida1: 0,
        medida2: 0,
        etiqueta1: valor.etiqueta1 || 'Kilos en crudo (Medida 1)',
        etiqueta2: valor.etiqueta2 || 'Kilos en crudo (Medida 2)'
      };
      base.medida1 = Number(base.medida1 || 0) + Number(valor.medida1 || 0);
      base.medida2 = Number(base.medida2 || 0) + Number(valor.medida2 || 0);
      base.etiqueta1 = base.etiqueta1 || valor.etiqueta1;
      base.etiqueta2 = base.etiqueta2 || valor.etiqueta2;
      destino[medida] = base;
    } else {
      const suma = Number(existente || 0) + Number(valor || 0);
      destino[medida] = suma;
    }
  });
}

export function fusionarKilosCrudosSiVacio(destino, origen) {
  if (!origen) return;
  Object.entries(origen).forEach(([medida, valor]) => {
    const existente = destino[medida];
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      const base = existente && typeof existente === 'object' ? { ...existente } : null;
      if (base && (Number(base.medida1 || 0) > 0 || Number(base.medida2 || 0) > 0)) {
        return;
      }
      destino[medida] = {
        medida1: Number(valor.medida1 || 0),
        medida2: Number(valor.medida2 || 0),
        etiqueta1: valor.etiqueta1 || 'Kilos en crudo (Medida 1)',
        etiqueta2: valor.etiqueta2 || 'Kilos en crudo (Medida 2)'
      };
      return;
    }

    if (Number(existente || 0) > 0) {
      return;
    }
    destino[medida] = Number(valor || 0);
  });
}

// Helper para obtener YYYY-MM-DD en horario local (evita desfase UTC)
export function toLocalYMD(fecha) {
  if (!fecha) return '';
  let d;
  
  // Si es un Timestamp de Firebase, convertir correctamente
  if (typeof fecha === 'object' && fecha.seconds) {
    // Crear fecha desde el timestamp en milisegundos
    d = new Date(fecha.seconds * 1000);
  } else if (fecha instanceof Date) {
    d = fecha;
  } else if (typeof fecha === 'string' && fecha.includes('-')) {
    // Si ya es un string YYYY-MM-DD, parsearlo como fecha local
    const [y, m, day] = fecha.split('-');
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(fecha);
  }
  
  // Usar zona horaria local para mantener la fecha correcta
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Método auxiliar para normalizar fechas y manejar diferentes formatos
export function normalizarFecha(fecha) {
  if (!fecha) return null;
  
  try {
    // Si es un Timestamp de Firebase
    if (typeof fecha === 'object' && fecha.seconds) {
      return new Date(fecha.seconds * 1000);
    }

    // Si es un string YYYY-MM-DD, parsearlo como fecha local
    // para evitar que JavaScript lo interprete en UTC y reste un dia.
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [year, month, day] = fecha.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    // Si es un string o número
    const fechaObj = new Date(fecha);
    
    // Verificar si la fecha es válida
    if (isNaN(fechaObj.getTime())) {
      console.error('Fecha inválida:', fecha);
      return null;
    }
    
    return fechaObj;
  } catch (error) {
    console.error('Error al normalizar fecha:', fecha, error);
    return null;
  }
}

// Mapear nombres de clientes del embarque con IDs del sistema de precios
export function obtenerClienteIdParaPrecios(nombreCliente) {
  const nombre = nombreCliente.toLowerCase();
  if (nombre.includes('joselito')) return 'joselito';
  if (nombre.includes('catarro')) return 'catarro';
  if (nombre.includes('otilio')) return 'otilio';
  if (nombre.includes('ozuna')) return 'ozuna';
  if (nombre.includes('veronica') || nombre.includes('lorena')) return 'veronica';
  return null; // Cliente no reconocido
}

// Método auxiliar para obtener nombre de cliente desde ID
export function obtenerNombreClienteDeId(clienteId) {
  const mapeo = {
    'joselito': 'Joselito',
    'catarro': 'Catarro', 
    'otilio': 'Otilio',
    'ozuna': 'Ozuna'
  };
  return mapeo[clienteId] || clienteId;
}

export function calcularTotalKilos(producto) {
  if (!producto.kilos) return 0;
  
  const sumaKilos = producto.kilos.reduce((total, kilo) => total + (Number(kilo) || 0), 0);
  const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  const descuentoTaras = producto.restarTaras ? tarasNormales * 3 : 0;
  
  return sumaKilos - descuentoTaras;
}

export function calcularTotalTaras(producto) {
  const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  return tarasNormales + tarasExtra;
}

export function calcularTotalBolsas(producto) {
  const reporteTaras = producto.reporteTaras || [];
  const reporteBolsas = producto.reporteBolsas || [];
  let sumaTotalKilos = 0;

  for (let i = 0; i < reporteTaras.length; i++) {
    const taras = parseInt(reporteTaras[i]) || 0;
    const bolsa = parseInt(reporteBolsas[i]) || 0;
    sumaTotalKilos += taras * bolsa;
  }

  return sumaTotalKilos;
}

export function esMedidaMix(medida) {
  return medida.toLowerCase().includes('mix');
}

export function esMedidaRefri(medida) {
  return String(medida || '').toLowerCase().includes('refri');
}

export function formatearPrecio(precio) {
  if (!precio) return '0';
  const numeroRedondeado = Math.round(precio);
  // Formatear manualmente con comas para asegurar compatibilidad
  return numeroRedondeado.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatearPrecioConDecimales(precio, decimales = 2) {
  const numero = Number(precio) || 0;
  const [enteros, fraccion] = numero.toFixed(decimales).split('.');
  const enterosFormateados = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${enterosFormateados}.${fraccion}`;
}

export function formatearNumero(numero) {
  if (!numero) return '0';
  // Redondear hacia abajo para eliminar decimales
  const numeroSinDecimales = Math.floor(numero);
  // Formatear manualmente con comas para asegurar compatibilidad
  return numeroSinDecimales.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
