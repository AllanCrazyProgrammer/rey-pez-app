export function numeroPedido(valor) {
  const numero = Number(typeof valor === 'string' ? valor.replace(',', '.') : valor);
  return Number.isFinite(numero) ? numero : 0;
}

export function estadoPedido(referencia, totales) {
  const kilos = numeroPedido(referencia?.kilos);
  const taras = numeroPedido(referencia?.taras);
  const tieneReferencia = kilos > 0 || taras > 0;
  return {
    tieneReferencia,
    // Mismo criterio que las tarjetas: kilos si el pedido los especifica;
    // en los pedidos expresados solamente en taras se comparan las taras.
    cubierto: tieneReferencia && (kilos > 0
      ? totales.totalKilos >= kilos : totales.totalTaras >= taras),
  };
}

export function totalTarasReportadas(producto) {
  return (producto.reporteTaras || []).reduce((total, tara) => total + (parseInt(tara, 10) || 0), 0);
}

// El contorno de ProductoItem prioriza el reporte de taras; su indicador de
// pedido conserva por separado el cumplimiento de la cantidad solicitada.
export function estadoMedidaProducto(producto, individuales, agrupados, referencia = producto.pedidoReferencia) {
  const pedido = estadoPedido(referencia, agrupados);
  if (individuales.totalTaras > 0) {
    const cubierto = individuales.totalTaras === totalTarasReportadas(producto);
    return { ...pedido, cubierto, etiqueta: cubierto ? 'Reportado' : 'Falta reportar' };
  }
  return { ...pedido, etiqueta: pedido.cubierto ? 'Completo' : pedido.tieneReferencia ? 'Pendiente' : 'Sin referencia' };
}

export function normalizarMedidaReferencia(valor) {
  let medida = String(valor || '').toLowerCase(), tipoDetectado = '';
  if (/s\/h2[o0]/.test(medida)) { tipoDetectado = 's/h20'; medida = medida.replace(/s\/h2[o0]/g, ' '); }
  if (/c\/h2[o0]/.test(medida)) { tipoDetectado = 'c/h20'; medida = medida.replace(/c\/h2[o0]/g, ' '); }
  return { medida: medida.replace(/\s+/g, ' ').trim(), tipoDetectado };
}

export function medidaSinAnotaciones(valor) {
  return String(valor || '').replace(/\([^()]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

export function claveReferenciaProducto(producto) {
  const { medida, tipoDetectado } = normalizarMedidaReferencia(producto.nombreAlternativoPDF || producto.medida);
  if (!medida) return null;
  const tipo = String(producto.tipo || tipoDetectado || '').trim().toLowerCase().replace(/h2o$/, 'h20');
  const personalizado = tipo === 'otro' ? String(producto.tipoPersonalizado || '').trim().toLowerCase() : '';
  return `${medida}__${tipo}__${personalizado}`;
}

// Derivar la referencia del índice actual evita guardar una copia que pueda
// quedar obsoleta al renombrar una medida o al recibir datos de otra ventana.
export function referenciaPedidoProducto(producto, indiceCliente) {
  if (!indiceCliente) return producto.pedidoReferencia || null;
  const nombres = [producto.nombreAlternativoPDF, producto.medida].filter(nombre => String(nombre || '').trim());
  for (const nombre of nombres) {
    const clave = claveReferenciaProducto({ ...producto, nombreAlternativoPDF: nombre });
    const { medida, tipoDetectado } = normalizarMedidaReferencia(nombre);
    const referencia = producto.tipo || tipoDetectado
      ? indiceCliente.porClave?.[clave]
      : indiceCliente.porMedida?.[medida];
    if (referencia) return referencia;
    // El índice conserva las anotaciones y resuelve esta equivalencia solo
    // cuando identifica una única variante. Nunca sumar sellado con normal.
    if (producto.tipo || tipoDetectado) {
      const claveSinNota = claveReferenciaProducto({ ...producto, nombreAlternativoPDF: medidaSinAnotaciones(nombre) });
      const original = indiceCliente.porClaveSinAnotaciones?.[claveSinNota];
      if (original) return indiceCliente.porClave[original] || null;
    }
  }
  return null;
}

export function tarasCrudoPorTalla(items) {
  const mapa = {};
  const cantidad = valor => Number(String(valor || '').match(/^(\d+)/)?.[1]) || 0;
  (items || []).forEach(item => {
    const talla = String(item.talla || item.medida || '').trim();
    if (talla) mapa[talla] = (mapa[talla] || 0) + cantidad(item.taras) + cantidad(item.sobrante) + cantidad(item.sobrante2);
  });
  return mapa;
}
