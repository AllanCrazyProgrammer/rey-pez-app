// Funciones de formateo para el PDF

export const formatearKilos = (kilos) => {
  if (typeof kilos === 'number') {
    return Math.floor(kilos) + ' kg';
  }
  // Para medidas mixtas que tienen medida1 y medida2
  if (typeof kilos === 'object' && kilos !== null) {
    const total = Math.floor((Number(kilos.medida1) || 0) + (Number(kilos.medida2) || 0));
    return total + ' kg';
  }
  const numero = Math.floor(Number(kilos));
  return numero + ' kg';
};

export const formatearRendimiento = (rendimiento) => {
  return Number(rendimiento).toFixed(2);
};

export const formatearPrecio = (precio) => {
  if (!precio) return '0';
  const numeroRedondeado = Math.round(precio);
  return numeroRedondeado.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatearNumero = (numero) => {
  if (!numero) return '0';
  // Redondear hacia abajo para eliminar decimales
  const numeroSinDecimales = Math.floor(numero);
  return numeroSinDecimales.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin fecha';
  
  let fechaObj;
  // Si la fecha es un objeto Timestamp de Firestore
  if (fecha && typeof fecha.toDate === 'function') {
    fechaObj = fecha.toDate();
  } 
  // Si la fecha es una cadena ISO
  else if (typeof fecha === 'string') {
    fechaObj = new Date(fecha);
  }
  // Si ya es un objeto Date
  else if (fecha instanceof Date) {
    fechaObj = fecha;
  }
  
  // Verificar si la fecha es válida
  if (isNaN(fechaObj.getTime())) {
    return 'Fecha inválida';
  }

  // Ajustar la zona horaria a la hora local de México
  const fechaLocal = new Date(fechaObj.getTime() + (fechaObj.getTimezoneOffset() * 60000));
  
  // Formatear la fecha
  return fechaLocal.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Mexico_City'
  });
};

export const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = reject;
    img.src = url;
  });
};