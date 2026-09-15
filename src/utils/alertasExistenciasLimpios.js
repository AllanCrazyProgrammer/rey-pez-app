const normalizar = (valor) =>
  String(valor || '')
    .trim()
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ');

export const fechaLoteAlerta = (valor) => {
  if (!valor) return '';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const fecha =
    typeof valor.toDate === 'function'
      ? valor.toDate()
      : typeof valor.seconds === 'number'
      ? new Date(valor.seconds * 1000)
      : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toISOString().slice(0, 10);
};

export const contextoLoteAlerta = (item, proveedor = item.proveedor) => ({
  alcance: 'lote',
  medida: String(item.medida || '').trim(),
  proveedor: String(proveedor || '').trim(),
  fechaEntrada: fechaLoteAlerta(item.fechaEntrada),
  precio:
    item.precio !== null &&
    item.precio !== undefined &&
    item.precio !== '' &&
    Number.isFinite(Number(item.precio))
      ? Number(item.precio)
      : null,
  cuartoFrio:
    !item.cuartoFrio || normalizar(item.cuartoFrio) === 'sin cuarto designado'
      ? 's/c'
      : normalizar(item.cuartoFrio),
});

export const idAlertaLote = (lote) => {
  const contexto = contextoLoteAlerta(lote);
  return (
    'lote-' +
    encodeURIComponent(
      JSON.stringify([
        normalizar(contexto.medida),
        normalizar(contexto.proveedor),
        contexto.fechaEntrada,
        contexto.precio,
        contexto.cuartoFrio,
      ])
    )
  );
};

export const kilosLoteAlerta = (existencias, seleccion) => {
  const objetivo = idAlertaLote(seleccion);
  let kilos = 0;
  Object.entries(existencias || {}).forEach(([proveedor, medidas]) => {
    Object.values(medidas || {}).forEach((registro) => {
      const lotes = Array.isArray(registro.lotes) ? registro.lotes : [registro];
      lotes.forEach((lote) => {
        const contexto = contextoLoteAlerta({ ...registro, ...lote }, proveedor);
        if (idAlertaLote(contexto) === objetivo) kilos += Math.max(0, Number(lote.kilos) || 0);
      });
    });
  });
  return kilos;
};

export const evaluarAlertasExistencias = (existencias, configuraciones) =>
  configuraciones
    // Los antiguos mínimos por medida no deben transformarse en mínimos por lote.
    .filter(
      (config) => config.alcance === 'lote' && Number.isFinite(config.minimo) && config.minimo >= 0
    )
    .map((config) => ({ ...config, kilos: kilosLoteAlerta(existencias, config) }))
    .filter((config) => Math.round(config.kilos * 100) <= Math.round(config.minimo * 100));
