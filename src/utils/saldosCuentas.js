/**
 * Saldos de cuentas bancarias del menú de Cuentas México.
 * Lógica pura: parseo, formato, total, texto de WhatsApp y fusión con snapshots.
 * No habla con Firestore.
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
const DOCUMENTO_SALDOS_CUENTAS = 'actual'
const DEBOUNCE_GUARDADO_MS = 500
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
  return CUENTAS_INICIALES.map((cuenta) => ({ ...cuenta }))
}

function aCentavos(numero) {
  if (!Number.isFinite(numero)) return 0
  const signo = numero < 0 ? -1 : 1
  const absoluto = Math.abs(numero)
  return signo * Math.round((absoluto + Number.EPSILON) * 100)
}

function desdeCentavos(centavos) {
  return centavos / 100
}

/**
 * Interpreta un monto escrito a mano: 190,034.00, $2,926.00, 215746.45 o 1.363,79.
 * Vacío o ilegible vale 0. El resultado queda en centavos.
 */
function parsearMonto(valor) {
  if (typeof valor === 'number') return desdeCentavos(aCentavos(valor))
  if (valor == null) return 0
  let texto = String(valor).trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!texto) return 0
  const negativo = /^\(.*\)$/.test(texto) || texto.startsWith('-')
  texto = texto.replace(/[()]/g, '').replace(/^-/, '')
  if (!texto) return 0

  const ultimaComa = texto.lastIndexOf(',')
  const ultimoPunto = texto.lastIndexOf('.')
  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    texto = ultimaComa > ultimoPunto
      ? texto.replace(/\./g, '').replace(',', '.')
      : texto.replace(/,/g, '')
  } else if (ultimaComa !== -1) {
    const partes = texto.split(',')
    const miles = partes.length > 1
      && partes[0].length >= 1
      && partes[0].length <= 3
      && partes.slice(1).every((parte) => parte.length === 3)
    texto = miles ? partes.join('') : texto.replace(',', '.')
  } else if ((texto.match(/\./g) || []).length > 1) {
    const partes = texto.split('.')
    const miles = partes.slice(1).every((parte) => parte.length === 3)
    if (miles) texto = partes.join('')
  }

  texto = texto.replace(/[.,]$/, '')
  if (!/^\d+(\.\d+)?$/.test(texto)) return 0
  const numero = desdeCentavos(aCentavos(Number(texto)))
  return negativo ? -numero : numero
}

function formatearMonto(valor) {
  const centavos = aCentavos(typeof valor === 'number' ? valor : parsearMonto(valor))
  const negativo = centavos < 0
  const absoluto = Math.abs(centavos)
  const entero = Math.floor(absoluto / 100)
  const decimales = String(absoluto % 100).padStart(2, '0')
  const conMiles = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negativo ? '-' : ''}${conMiles}.${decimales}`
}

/** Texto del campo. Vacío o cero no se muestran; en el total y en WhatsApp siguen valiendo 0. */
function textoSaldoCampo(saldo) {
  const numero = typeof saldo === 'number' ? saldo : parsearMonto(saldo)
  if (!Number.isFinite(numero) || aCentavos(numero) === 0) return ''
  return formatearMonto(numero)
}

function totalSaldos(cuentas) {
  const lista = Array.isArray(cuentas) ? cuentas : []
  const centavos = lista.reduce((suma, cuenta) => suma + aCentavos(parsearMonto(cuenta && cuenta.saldo)), 0)
  return desdeCentavos(centavos)
}

function partesCalendarioSaldos(fecha) {
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const partes = fecha.split('-')
    return { year: Number(partes[0]), month: Number(partes[1]), day: Number(partes[2]) }
  }
  const base = fecha instanceof Date ? fecha : new Date(fecha)
  const valida = Number.isNaN(base.getTime()) ? new Date() : base
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).formatToParts(valida)
  const valor = (tipo) => Number(partes.find((parte) => parte.type === tipo).value)
  return { year: valor('year'), month: valor('month'), day: valor('day') }
}

function formatearFechaSaldos(fecha = new Date()) {
  const { year, month, day } = partesCalendarioSaldos(fecha)
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  return `${dd}/${mm}/${year}`
}

function formatearFechaLargaSaldos(fecha = new Date()) {
  const { year, month, day } = partesCalendarioSaldos(fecha)
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
function lineasCuentasWhatsApp(lista) {
  const filas = lista.map((cuenta) => ({
    emoji: emojiCuenta(cuenta && cuenta.color),
    nombre: String(cuenta.nombre).trim(),
    monto: `$${formatearMonto(cuenta && cuenta.saldo)}`
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

/** Las cuentas sin nombre no se listan ni suman al total del mensaje. */
function textoSaldosWhatsApp(cuentas, fecha = new Date()) {
  const lista = cuentasNombradas(cuentas)
  const lineas = [
    '🏦 *SALDOS DE CUENTAS*',
    `📅 ${formatearFechaLargaSaldos(fecha)}`,
    SEPARADOR_WHATSAPP
  ]
  if (lista.length) lineas.push(...lineasCuentasWhatsApp(lista))
  lineas.push(SEPARADOR_WHATSAPP, `💰 *TOTAL: $${formatearMonto(totalSaldos(lista))}*`)
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

function normalizarCuenta(raw, indice = 0) {
  const fuente = raw && typeof raw === 'object' ? raw : {}
  const nombre = String(fuente.nombre == null ? '' : fuente.nombre).trim().slice(0, 40)
  const id = String(fuente.id == null ? '' : fuente.id).trim() || `cuenta-${indice + 1}`
  const color = colorValido(fuente.color) ? String(fuente.color).trim().toLowerCase() : COLOR_AZUL
  return { id, nombre, color, saldo: parsearMonto(fuente.saldo) }
}

function clonarCuenta(cuenta) {
  return { id: cuenta.id, nombre: cuenta.nombre, color: cuenta.color, saldo: cuenta.saldo }
}

function crearIdCuenta(nombre, ahora = Date.now(), aleatorio = Math.random().toString(36).slice(2, 6)) {
  const base = String(nombre || 'cuenta')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'cuenta'
  return `${base}-${Number(ahora).toString(36)}${aleatorio}`
}

function crearCuenta({ nombre, color, saldo = 0, id, ahora, aleatorio } = {}) {
  const cuenta = normalizarCuenta({
    id: id || crearIdCuenta(nombre, ahora, aleatorio),
    nombre,
    color,
    saldo
  })
  if (!cuenta.nombre) return null
  return cuenta
}

function cuentasDesdeDocumento(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.cuentas)) return null
  return data.cuentas
    .map((cuenta, indice) => normalizarCuenta(cuenta, indice))
    .filter((cuenta) => cuenta.nombre)
}

function documentoSaldos(cuentas, updatedAt) {
  return {
    cuentas: (Array.isArray(cuentas) ? cuentas : []).map((cuenta, indice) => normalizarCuenta(cuenta, indice)),
    updatedAt: updatedAt === undefined ? null : updatedAt
  }
}

/**
 * Aplica un snapshot remoto sin pisar lo que este dispositivo está editando,
 * dando de alta o dando de baja.
 */
function fusionarCuentas(local, remoto, opciones = {}) {
  const editando = new Set(opciones.editando || [])
  const altas = new Set(opciones.pendientesAlta || [])
  const bajas = new Set(opciones.pendientesBaja || [])
  const locales = new Map()
  ;(Array.isArray(local) ? local : []).forEach((cuenta, indice) => {
    const normal = normalizarCuenta(cuenta, indice)
    if (normal.id) locales.set(normal.id, normal)
  })
  const salida = []
  const vistos = new Set()
  ;(Array.isArray(remoto) ? remoto : []).forEach((cuenta, indice) => {
    const remota = normalizarCuenta(cuenta, indice)
    if (!remota.id || vistos.has(remota.id) || bajas.has(remota.id)) return
    vistos.add(remota.id)
    const propia = locales.get(remota.id)
    const conservar = propia && (editando.has(remota.id) || altas.has(remota.id))
    salida.push(clonarCuenta(conservar ? propia : remota))
  })
  locales.forEach((propia, id) => {
    if (!vistos.has(id) && (altas.has(id) || editando.has(id)) && !bajas.has(id)) {
      salida.push(clonarCuenta(propia))
    }
  })
  return salida
}

module.exports = {
  COLOR_AZUL,
  COLOR_ROJO,
  COLOR_VERDE,
  COLORES_CUENTA,
  COLECCION_SALDOS_CUENTAS,
  DOCUMENTO_SALDOS_CUENTAS,
  DEBOUNCE_GUARDADO_MS,
  cuentasIniciales,
  parsearMonto,
  formatearMonto,
  textoSaldoCampo,
  totalSaldos,
  formatearFechaSaldos,
  textoSaldosWhatsApp,
  enlaceWhatsAppSaldos,
  normalizarCuenta,
  crearCuenta,
  cuentasDesdeDocumento,
  documentoSaldos,
  fusionarCuentas
}
