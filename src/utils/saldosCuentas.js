/**
 * Saldos de cuentas bancarias del menú de Cuentas México.
 * Lógica pura: parseo, formato, total, texto de WhatsApp y forma de los documentos.
 * No habla con Firestore.
 *
 * Modelo (documento saldosCuentas/porCuenta):
 *   { cuentas: { [id]: { nombre, color, saldo, orden, editadoEn } }, updatedAt }
 * Cada cuenta es un campo propio del mapa, así que guardar una cuenta no toca las
 * demás y dos dispositivos pueden editar cuentas distintas sin pisarse.
 * Los montos son pesos enteros (sin decimales). La pestaña de Capital usa el mismo
 * modelo en otro documento (saldosCuentas/capital) pero con centavos: todas las
 * funciones aceptan `centavos` (false por defecto = pesos enteros).
 */

const COLOR_AZUL = '#2979ff'
const COLOR_ROJO = '#ff1744'
const COLOR_VERDE = '#00c853'

const COLORES_CUENTA = {
  azul: COLOR_AZUL,
  rojo: COLOR_ROJO,
  verde: COLOR_VERDE
}

const COLECCION_SALDOS_CUENTAS = 'saldosCuentas'
const DOCUMENTO_SALDOS_CUENTAS = 'porCuenta'
/** Documento de la pestaña Capital (mismo formato, con centavos). */
const DOCUMENTO_CAPITAL_CUENTAS = 'capital'
/** Documento anterior (lista completa en un arreglo). Solo se lee para migrar. */
const DOCUMENTO_SALDOS_LEGADO = 'actual'
const COLECCION_HISTORIAL_SALDOS = 'saldosCuentasHistorial'
const ZONA_HORARIA = 'America/Mexico_City'
const SEPARADOR_WHATSAPP = '━━━━━━━━━━━━━━━━━━━━'
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const CUENTAS_INICIALES = [
  { id: 'bancomer-1', nombre: 'BANCOMER 1', color: COLOR_AZUL, saldo: 0 },
  { id: 'bancomer-2', nombre: 'BANCOMER 2', color: COLOR_AZUL, saldo: 0 },
  { id: 'banorte', nombre: 'BANORTE', color: COLOR_ROJO, saldo: 0 },
  { id: 'estuardo-afirme', nombre: 'ESTUARDO AFIRME', color: COLOR_VERDE, saldo: 0 },
  { id: 'allan-afirme', nombre: 'ALLAN AFIRME', color: COLOR_VERDE, saldo: 0 }
]

function cuentasIniciales() {
  return CUENTAS_INICIALES.map((cuenta, indice) => ({ ...cuenta, orden: indice, editadoEn: null }))
}

/** Capital de referencia capturado el 04/11/26 8:43 pm (hora de México). Total: 24,542,614.05. */
const CAPITAL_REFERENCIA_EN = 1793846587000
const CAPITAL_INICIAL = [
  { id: 'bancomer-14', nombre: 'BANCOMER 14', color: COLOR_AZUL, saldo: 11885668.65 },
  { id: 'bancomer-5', nombre: 'BANCOMER 5', color: COLOR_AZUL, saldo: 4491525.44 },
  { id: 'bancomer-r-6', nombre: 'BANCOMER R 6', color: COLOR_AZUL, saldo: 3284420 },
  { id: 'banorte-r-5', nombre: 'BANORTE R 5', color: COLOR_ROJO, saldo: 3425000 },
  { id: 'afirme-2-2-est', nombre: 'AFIRME 2.2 EST', color: COLOR_VERDE, saldo: 1455999.96 }
]

function capitalInicial() {
  return CAPITAL_INICIAL.map((cuenta, indice) => ({ ...cuenta, orden: indice, editadoEn: CAPITAL_REFERENCIA_EN }))
}

function redondear(numero, centavos = false) {
  if (!Number.isFinite(numero)) return 0
  const signo = numero < 0 ? -1 : 1
  const factor = centavos ? 100 : 1
  return signo * (Math.round(Math.abs(numero) * factor) / factor) || 0
}

/**
 * Interpreta un monto escrito a mano y lo deja en pesos enteros.
 * Acepta 190,034 · $2,926.00 · 215746.45 · 1.363,79 · 1.363.790 · -500 · (500).
 * Un separador seguido de 1 o 2 dígitos al final son centavos (se redondean);
 * cualquier otro punto o coma es separador de miles. Vacío o ilegible vale 0.
 * Con `centavos` se conservan 2 decimales en lugar de redondear a pesos.
 */
function parsearMonto(valor, centavos = false) {
  if (typeof valor === 'number') return redondear(valor, centavos)
  if (valor == null) return 0
  let texto = String(valor).trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!texto) return 0
  const negativo = /^\(.*\)$/.test(texto) || texto.startsWith('-')
  texto = texto.replace(/[()]/g, '').replace(/^-/, '')
  if (!texto) return 0

  let entero = texto
  let decimales = ''
  const ultimo = Math.max(texto.lastIndexOf(','), texto.lastIndexOf('.'))
  if (ultimo !== -1) {
    const despues = texto.slice(ultimo + 1)
    if (despues.length <= 2) {
      entero = texto.slice(0, ultimo)
      decimales = despues
    }
  }
  entero = entero.replace(/[.,]/g, '')
  if (!entero && !decimales) return 0
  if (!/^\d*$/.test(entero) || !/^\d*$/.test(decimales)) return 0
  const numero = Number(`${entero || '0'}.${decimales || '0'}`)
  const resultado = redondear(numero, centavos)
  return negativo ? -resultado || 0 : resultado
}

/** 190034 → "190,034" (sin decimales) · con `centavos`: 11885668.65 → "11,885,668.65". */
function formatearMonto(valor, centavos = false) {
  const monto = parsearMonto(valor, centavos)
  const [enteros, decimales] = Math.abs(monto).toFixed(centavos ? 2 : 0).split('.')
  const conMiles = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${monto < 0 ? '-' : ''}${conMiles}${centavos ? `.${decimales}` : ''}`
}

/** Suma en unidades mínimas (pesos o centavos) para no arrastrar error de punto flotante. */
function totalSaldos(cuentas, centavos = false) {
  const lista = Array.isArray(cuentas) ? cuentas : []
  const factor = centavos ? 100 : 1
  const suma = lista.reduce(
    (acumulado, cuenta) => acumulado + Math.round(parsearMonto(cuenta && cuenta.saldo, centavos) * factor),
    0
  )
  return suma / factor
}

/** Total listo para mostrar: con `redondeado` va en pesos enteros aunque las cuentas lleven centavos. */
function formatearTotal(total, centavos = false, redondeado = false) {
  return formatearMonto(total, redondeado ? false : centavos)
}

function partesFechaHora(fecha) {
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const partes = fecha.split('-')
    return { year: Number(partes[0]), month: Number(partes[1]), day: Number(partes[2]), hour: 0, minute: 0 }
  }
  const ms = aMilisegundos(fecha)
  const base = ms != null ? new Date(ms) : new Date(fecha)
  const valida = Number.isNaN(base.getTime()) ? new Date() : base
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(valida)
  const valor = (tipo) => Number(partes.find((parte) => parte.type === tipo).value)
  return { year: valor('year'), month: valor('month'), day: valor('day'), hour: valor('hour'), minute: valor('minute') }
}

const dos = (n) => String(n).padStart(2, '0')

function formatearFechaSaldos(fecha = new Date()) {
  const { year, month, day } = partesFechaHora(fecha)
  return `${dos(day)}/${dos(month)}/${year}`
}

/** Fecha y hora concisas en hora de México, formato de 12 horas: "05/11/26 2:32 pm". */
function formatearFechaHoraCorta(fecha = new Date()) {
  const { year, month, day, hour, minute } = partesFechaHora(fecha)
  const hora12 = hour % 12 === 0 ? 12 : hour % 12
  const periodo = hour < 12 ? 'am' : 'pm'
  return `${dos(day)}/${dos(month)}/${String(year).slice(-2)} ${hora12}:${dos(minute)} ${periodo}`
}

function formatearFechaLargaSaldos(fecha = new Date()) {
  const { year, month, day } = partesFechaHora(fecha)
  const indice = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return `${DIAS_SEMANA[indice]} ${day} de ${MESES[month - 1]} ${year}`
}

function emojiCuenta(color) {
  const valor = String(color == null ? '' : color).trim().toLowerCase()
  if (valor === COLOR_AZUL) return '🔵'
  if (valor === COLOR_ROJO) return '🔴'
  if (valor === COLOR_VERDE) return '🟢'
  return '⚪'
}

function cuentasNombradas(cuentas) {
  const lista = Array.isArray(cuentas) ? cuentas : []
  return lista.filter((cuenta) => String(cuenta && cuenta.nombre != null ? cuenta.nombre : '').trim())
}

/** Bloque monoespaciado para que los montos queden en columna en el celular. */
function lineasCuentasWhatsApp(lista, centavos = false) {
  const filas = lista.map((cuenta) => ({
    emoji: emojiCuenta(cuenta && cuenta.color),
    nombre: String(cuenta.nombre).trim(),
    monto: `$${formatearMonto(cuenta && cuenta.saldo, centavos)}`
  }))
  const anchoNombre = filas.reduce((max, fila) => Math.max(max, fila.nombre.length), 0)
  const anchoMonto = filas.reduce((max, fila) => Math.max(max, fila.monto.length), 0)
  const cuerpo = filas.map((fila) => {
    const nombre = fila.nombre.padEnd(anchoNombre, ' ')
    const monto = fila.monto.padStart(anchoMonto, ' ')
    return `${fila.emoji} ${nombre}  ${monto}`
  })
  return ['```', ...cuerpo, '```']
}

/**
 * Las cuentas sin nombre no se listan ni suman al total del mensaje.
 * `opciones`: { titulo: 'SALDOS DE CUENTAS', centavos: false, totalRedondeado: false }.
 * Con `totalRedondeado` el TOTAL va en pesos enteros aunque las cuentas lleven centavos.
 */
function textoSaldosWhatsApp(
  cuentas,
  fecha = new Date(),
  { titulo = 'SALDOS DE CUENTAS', centavos = false, totalRedondeado = false } = {}
) {
  const lista = cuentasNombradas(cuentas)
  const lineas = [
    `🏦 *${titulo}*`,
    `📅 ${formatearFechaLargaSaldos(fecha)}`,
    SEPARADOR_WHATSAPP
  ]
  if (lista.length) lineas.push(...lineasCuentasWhatsApp(lista, centavos))
  lineas.push(SEPARADOR_WHATSAPP, `💰 *TOTAL: $${formatearTotal(totalSaldos(lista, centavos), centavos, totalRedondeado)}*`)
  return lineas.join('\n')
}

/**
 * Enlace directo a api.whatsapp.com. wa.me no abre el chat: responde 302 y,
 * al reescribir `text`, cambia cada emoji (UTF-8 de 4 bytes, %F0…) por
 * %EF%BF%BD (U+FFFD). Los de 1 a 3 bytes, como ━ y é, sí sobreviven.
 */
function enlaceWhatsAppSaldos(texto) {
  const plano = String(texto == null ? '' : texto)
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(plano)}`
}

function colorValido(valor) {
  return typeof valor === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(valor.trim())
}

/** Milisegundos a partir de número, Date o Timestamp de Firestore; si no, null. */
function aMilisegundos(valor) {
  if (valor == null) return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.getTime()
  if (typeof valor.toMillis === 'function') return valor.toMillis()
  return null
}

function normalizarCuenta(raw, indice = 0, centavos = false) {
  const fuente = raw && typeof raw === 'object' ? raw : {}
  const nombre = String(fuente.nombre == null ? '' : fuente.nombre).trim().slice(0, 40)
  const id = String(fuente.id == null ? '' : fuente.id).trim() || `cuenta-${indice + 1}`
  const color = colorValido(fuente.color) ? String(fuente.color).trim().toLowerCase() : COLOR_AZUL
  const orden = Number.isFinite(fuente.orden) ? fuente.orden : indice
  return { id, nombre, color, saldo: parsearMonto(fuente.saldo, centavos), orden, editadoEn: aMilisegundos(fuente.editadoEn) }
}

function crearIdCuenta(nombre, ahora = Date.now(), aleatorio = Math.random().toString(36).slice(2, 6)) {
  const base = String(nombre || 'cuenta')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'cuenta'
  return `${base}-${Number(ahora).toString(36)}${aleatorio}`
}

/** La cuenta nueva va al final de la lista existente. */
function crearCuenta({ nombre, color, saldo = 0, id, ahora, aleatorio, existentes = [] } = {}) {
  const ordenes = (Array.isArray(existentes) ? existentes : [])
    .map((cuenta) => cuenta && cuenta.orden)
    .filter((orden) => Number.isFinite(orden))
  const cuenta = normalizarCuenta({
    id: id || crearIdCuenta(nombre, ahora, aleatorio),
    nombre,
    color,
    saldo,
    orden: ordenes.length ? Math.max(...ordenes) + 1 : 0,
    editadoEn: ahora === undefined ? null : ahora
  })
  if (!cuenta.nombre) return null
  return cuenta
}

function ordenarCuentas(lista) {
  return lista.slice().sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre) || a.id.localeCompare(b.id))
}

/**
 * Lee las cuentas de un documento. Acepta el formato nuevo (mapa por id) y el
 * anterior (arreglo). Devuelve null si el documento no trae cuentas.
 */
function cuentasDesdeDocumento(data, centavos = false) {
  if (!data || typeof data !== 'object' || !data.cuentas || typeof data.cuentas !== 'object') return null
  const crudas = Array.isArray(data.cuentas)
    ? data.cuentas
    : Object.keys(data.cuentas).map((id) => ({ ...(data.cuentas[id] || {}), id }))
  const vistos = new Set()
  const lista = crudas
    .map((cuenta, indice) => normalizarCuenta(cuenta, indice, centavos))
    .filter((cuenta) => {
      if (!cuenta.nombre || vistos.has(cuenta.id)) return false
      vistos.add(cuenta.id)
      return true
    })
  return ordenarCuentas(lista)
}

/** Campos que se guardan para una cuenta dentro del mapa (el id es la llave). */
function datosCuenta(cuenta, centavos = false) {
  const normal = normalizarCuenta(cuenta, 0, centavos)
  return {
    nombre: normal.nombre,
    color: normal.color,
    saldo: normal.saldo,
    orden: normal.orden,
    editadoEn: normal.editadoEn
  }
}

function mapaDesdeCuentas(cuentas, centavos = false) {
  const mapa = {}
  ;(Array.isArray(cuentas) ? cuentas : []).forEach((cuenta, indice) => {
    const normal = normalizarCuenta({ orden: indice, ...cuenta }, indice, centavos)
    if (normal.nombre && !mapa[normal.id]) mapa[normal.id] = datosCuenta(normal, centavos)
  })
  return mapa
}

/** Renglón del historial: un cambio de saldo, un alta o una baja. */
function registroHistorial({ tipo = 'saldo', cuenta, saldoAnterior = null, saldo = null, editadoEn, centavos = false }) {
  const normal = normalizarCuenta(cuenta, 0, centavos)
  return {
    tipo,
    cuentaId: normal.id,
    nombre: normal.nombre,
    saldoAnterior: saldoAnterior == null ? null : parsearMonto(saldoAnterior, centavos),
    saldo: saldo == null ? null : parsearMonto(saldo, centavos),
    editadoEn: aMilisegundos(editadoEn),
    fecha: formatearFechaHoraCorta(editadoEn)
  }
}

module.exports = {
  COLOR_AZUL,
  COLOR_ROJO,
  COLOR_VERDE,
  COLORES_CUENTA,
  COLECCION_SALDOS_CUENTAS,
  DOCUMENTO_SALDOS_CUENTAS,
  DOCUMENTO_CAPITAL_CUENTAS,
  DOCUMENTO_SALDOS_LEGADO,
  COLECCION_HISTORIAL_SALDOS,
  cuentasIniciales,
  capitalInicial,
  parsearMonto,
  formatearMonto,
  totalSaldos,
  formatearTotal,
  formatearFechaSaldos,
  formatearFechaHoraCorta,
  textoSaldosWhatsApp,
  enlaceWhatsAppSaldos,
  normalizarCuenta,
  crearCuenta,
  cuentasDesdeDocumento,
  datosCuenta,
  mapaDesdeCuentas,
  registroHistorial
}
