/**
 * Saldos de cuentas bancarias del menú de Cuentas México.
 * Lógica pura: parseo, formato, total, texto de WhatsApp y forma de los documentos.
 * No habla con Firestore.
 *
 * Modelo (documento saldosCuentas/porCuenta):
 *   { cuentas: { [id]: { nombre, color, saldo, orden, editadoEn } }, updatedAt }
 * Cada cuenta es un campo propio del mapa, así que guardar una cuenta no toca las
 * demás y dos dispositivos pueden editar cuentas distintas sin pisarse.
 * Los montos son pesos enteros (sin decimales).
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

function redondear(numero) {
  if (!Number.isFinite(numero)) return 0
  const signo = numero < 0 ? -1 : 1
  return signo * Math.round(Math.abs(numero)) || 0
}

/**
 * Interpreta un monto escrito a mano y lo deja en pesos enteros.
 * Acepta 190,034 · $2,926.00 · 215746.45 · 1.363,79 · 1.363.790 · -500 · (500).
 * Un separador seguido de 1 o 2 dígitos al final son centavos (se redondean);
 * cualquier otro punto o coma es separador de miles. Vacío o ilegible vale 0.
 */
function parsearMonto(valor) {
  if (typeof valor === 'number') return redondear(valor)
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
  const resultado = redondear(numero)
  return negativo ? -resultado || 0 : resultado
}

/** 190034 → "190,034". Sin decimales. */
function formatearMonto(valor) {
  const pesos = parsearMonto(valor)
  const conMiles = String(Math.abs(pesos)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${pesos < 0 ? '-' : ''}${conMiles}`
}

function totalSaldos(cuentas) {
  const lista = Array.isArray(cuentas) ? cuentas : []
  return lista.reduce((suma, cuenta) => suma + parsearMonto(cuenta && cuenta.saldo), 0)
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

/** Fecha y hora concisas en hora de México: "05/11/26 14:32". */
function formatearFechaHoraCorta(fecha = new Date()) {
  const { year, month, day, hour, minute } = partesFechaHora(fecha)
  return `${dos(day)}/${dos(month)}/${String(year).slice(-2)} ${dos(hour)}:${dos(minute)}`
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

/** Milisegundos a partir de número, Date o Timestamp de Firestore; si no, null. */
function aMilisegundos(valor) {
  if (valor == null) return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.getTime()
  if (typeof valor.toMillis === 'function') return valor.toMillis()
  return null
}

function normalizarCuenta(raw, indice = 0) {
  const fuente = raw && typeof raw === 'object' ? raw : {}
  const nombre = String(fuente.nombre == null ? '' : fuente.nombre).trim().slice(0, 40)
  const id = String(fuente.id == null ? '' : fuente.id).trim() || `cuenta-${indice + 1}`
  const color = colorValido(fuente.color) ? String(fuente.color).trim().toLowerCase() : COLOR_AZUL
  const orden = Number.isFinite(fuente.orden) ? fuente.orden : indice
  return { id, nombre, color, saldo: parsearMonto(fuente.saldo), orden, editadoEn: aMilisegundos(fuente.editadoEn) }
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
function cuentasDesdeDocumento(data) {
  if (!data || typeof data !== 'object' || !data.cuentas || typeof data.cuentas !== 'object') return null
  const crudas = Array.isArray(data.cuentas)
    ? data.cuentas
    : Object.keys(data.cuentas).map((id) => ({ ...(data.cuentas[id] || {}), id }))
  const vistos = new Set()
  const lista = crudas
    .map((cuenta, indice) => normalizarCuenta(cuenta, indice))
    .filter((cuenta) => {
      if (!cuenta.nombre || vistos.has(cuenta.id)) return false
      vistos.add(cuenta.id)
      return true
    })
  return ordenarCuentas(lista)
}

/** Campos que se guardan para una cuenta dentro del mapa (el id es la llave). */
function datosCuenta(cuenta) {
  const normal = normalizarCuenta(cuenta)
  return {
    nombre: normal.nombre,
    color: normal.color,
    saldo: normal.saldo,
    orden: normal.orden,
    editadoEn: normal.editadoEn
  }
}

function mapaDesdeCuentas(cuentas) {
  const mapa = {}
  ;(Array.isArray(cuentas) ? cuentas : []).forEach((cuenta, indice) => {
    const normal = normalizarCuenta({ orden: indice, ...cuenta }, indice)
    if (normal.nombre && !mapa[normal.id]) mapa[normal.id] = datosCuenta(normal)
  })
  return mapa
}

/** Renglón del historial: un cambio de saldo, un alta o una baja. */
function registroHistorial({ tipo = 'saldo', cuenta, saldoAnterior = null, saldo = null, editadoEn }) {
  const normal = normalizarCuenta(cuenta)
  return {
    tipo,
    cuentaId: normal.id,
    nombre: normal.nombre,
    saldoAnterior: saldoAnterior == null ? null : parsearMonto(saldoAnterior),
    saldo: saldo == null ? null : parsearMonto(saldo),
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
  DOCUMENTO_SALDOS_LEGADO,
  COLECCION_HISTORIAL_SALDOS,
  cuentasIniciales,
  parsearMonto,
  formatearMonto,
  totalSaldos,
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
