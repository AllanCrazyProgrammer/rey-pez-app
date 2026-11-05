// Lógica de saldos de cuentas. Importa el util; no reimplementa parseo, total ni WhatsApp.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const saldos = require('../src/utils/saldosCuentas')

const imagen = [
  { id: 'bancomer-1', nombre: 'BANCOMER 1', color: '#2979ff', saldo: '190,034.00' },
  { id: 'bancomer-2', nombre: 'BANCOMER 2', color: '#2979ff', saldo: '$2,926.00' },
  { id: 'banorte', nombre: 'BANORTE', color: '#ff1744', saldo: '215,746.45' },
  { id: 'estuardo-afirme', nombre: 'ESTUARDO AFIRME', color: '#00c853', saldo: '97,578.76' },
  { id: 'allan-afirme', nombre: 'ALLAN AFIRME', color: '#00c853', saldo: '1,363.79' }
]

test('el total de la imagen es 507,649.00', () => {
  assert.equal(saldos.totalSaldos(imagen), 507649)
  assert.equal(saldos.formatearMonto(saldos.totalSaldos(imagen)), '507,649.00')
})

test('parsea y formatea los montos de la imagen', () => {
  assert.equal(saldos.parsearMonto('$ 190,034.00'), 190034)
  assert.equal(saldos.parsearMonto('2,926.00'), 2926)
  assert.equal(saldos.parsearMonto('215746.45'), 215746.45)
  assert.equal(saldos.parsearMonto('1.363,79'), 1363.79)
  assert.equal(saldos.formatearMonto(2926), '2,926.00')
  assert.equal(saldos.formatearMonto(1363.79), '1,363.79')
  assert.equal(saldos.formatearMonto('97,578.76'), '97,578.76')
  assert.equal(saldos.parsearMonto(''), 0)
  assert.equal(saldos.parsearMonto(null), 0)
  assert.equal(saldos.parsearMonto('abc'), 0)
  assert.equal(saldos.parsearMonto('-2,926.00'), -2926)
  assert.equal(saldos.formatearMonto(-2926), '-2,926.00')
  assert.equal(saldos.totalSaldos([{ saldo: 0.1 }, { saldo: 0.2 }]), 0.3)
  assert.equal(saldos.formatearMonto(saldos.totalSaldos([{ saldo: 0.1 }, { saldo: 0.2 }])), '0.30')
})

test('arma el texto y el enlace de WhatsApp', () => {
  const fecha = new Date('2026-11-04T18:00:00Z')
  const texto = saldos.textoSaldosWhatsApp(imagen, fecha)
  assert.equal(texto, [
    '🏦 *SALDOS DE CUENTAS*',
    '📅 miércoles 4 de noviembre 2026',
    '━━━━━━━━━━━━━━━━━━━━',
    '```',
    '🔵 BANCOMER 1       $190,034.00',
    '🔵 BANCOMER 2         $2,926.00',
    '🔴 BANORTE          $215,746.45',
    '🟢 ESTUARDO AFIRME   $97,578.76',
    '🟢 ALLAN AFIRME       $1,363.79',
    '```',
    '━━━━━━━━━━━━━━━━━━━━',
    '💰 *TOTAL: $507,649.00*'
  ].join('\n'))
  assert.equal(saldos.formatearFechaSaldos('2026-11-04'), '04/11/2026')
  assert.equal(saldos.formatearFechaSaldos(new Date('2026-11-04T05:00:00Z')), '03/11/2026')
  const enlace = saldos.enlaceWhatsAppSaldos(texto)
  assert.equal(enlace, `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`)
  assert.match(decodeURIComponent(enlace.split('text=')[1]), /💰 \*TOTAL: \$507,649\.00\*/)
})

test('decodificar la URL deja los emojis intactos y sin sustitutos sueltos', () => {
  const fecha = new Date('2026-11-04T18:00:00Z')
  const texto = saldos.textoSaldosWhatsApp(imagen, fecha)
  const enlace = saldos.enlaceWhatsAppSaldos(texto)
  // wa.me responde 302 y reescribe cada UTF-8 de 4 bytes (%F0…) como %EF%BF%BD.
  // ━ y las letras con acento sobreviven; por eso el mensaje real pierde solo los emojis.
  assert.equal(enlace.includes('wa.me'), false)
  assert.equal(enlace.startsWith('https://api.whatsapp.com/send?text='), true)
  const crudo = enlace.slice(enlace.indexOf('text=') + 'text='.length)
  assert.equal(crudo.toUpperCase().includes('%EF%BF%BD'), false)
  assert.match(crudo, /%F0%9F%8F%A6/i)
  const decodificado = decodeURIComponent(crudo)
  assert.equal(decodificado, texto)
  assert.equal(decodificado.isWellFormed(), true)
  assert.equal(decodificado.includes('\uFFFD'), false)
  for (const emoji of ['🏦', '📅', '🔵', '🔴', '🟢', '💰']) {
    assert.equal(decodificado.includes(emoji), true)
    assert.ok(emoji.codePointAt(0) > 0xFFFF)
  }
  assert.equal(decodificado.includes('━'), true)
  for (let i = 0; i < decodificado.length; i += 1) {
    const code = decodificado.charCodeAt(i)
    if (code < 0xD800 || code > 0xDFFF) continue
    assert.ok(code <= 0xDBFF, 'sustituto bajo suelto')
    const par = decodificado.charCodeAt(i + 1)
    assert.ok(par >= 0xDC00 && par <= 0xDFFF, 'par sustituto incompleto')
    i += 1
  }
})

test('el saldo vacío o en cero no se escribe en el campo y sí suma', () => {
  assert.equal(saldos.textoSaldoCampo(0), '')
  assert.equal(saldos.textoSaldoCampo('0.00'), '')
  assert.equal(saldos.textoSaldoCampo(''), '')
  assert.equal(saldos.textoSaldoCampo(null), '')
  assert.equal(saldos.textoSaldoCampo(30), '30.00')
  assert.equal(saldos.textoSaldoCampo(2000), '2,000.00')
  const cuentas = [
    { nombre: 'BANCOMER 1', color: saldos.COLOR_AZUL, saldo: 2000 },
    { nombre: 'BANCOMER 2', color: saldos.COLOR_AZUL, saldo: '' },
    { nombre: 'BANORTE', color: saldos.COLOR_ROJO, saldo: '30' },
    { nombre: 'ESTUARDO AFIRME', color: saldos.COLOR_VERDE, saldo: 0 },
    { nombre: 'ALLAN AFIRME', color: saldos.COLOR_VERDE, saldo: null }
  ]
  assert.equal(saldos.totalSaldos(cuentas), 2030)
  const texto = saldos.textoSaldosWhatsApp(cuentas, new Date('2026-11-04T18:00:00Z'))
  assert.match(texto, /BANCOMER 2 +\$0\.00/)
  assert.match(texto, /ESTUARDO AFIRME +\$0\.00/)
  assert.match(texto, /ALLAN AFIRME +\$0\.00/)
  assert.match(texto, /💰 \*TOTAL: \$2,030\.00\*/)
})

test('omite cuentas sin nombre y usa círculo blanco si el color no es azul, rojo ni verde', () => {
  const fecha = new Date('2026-11-04T18:00:00Z')
  const texto = saldos.textoSaldosWhatsApp([
    { nombre: 'CAJA', color: '#123456', saldo: 10 },
    { nombre: '   ', color: saldos.COLOR_AZUL, saldo: 99 },
    { nombre: null, saldo: 1 }
  ], fecha)
  assert.equal(texto, [
    '🏦 *SALDOS DE CUENTAS*',
    '📅 miércoles 4 de noviembre 2026',
    '━━━━━━━━━━━━━━━━━━━━',
    '```',
    '⚪ CAJA  $10.00',
    '```',
    '━━━━━━━━━━━━━━━━━━━━',
    '💰 *TOTAL: $10.00*'
  ].join('\n'))
})

test('las cuentas iniciales traen color y saldo en cero', () => {
  const iniciales = saldos.cuentasIniciales()
  assert.deepEqual(iniciales.map((cuenta) => cuenta.nombre), [
    'BANCOMER 1', 'BANCOMER 2', 'BANORTE', 'ESTUARDO AFIRME', 'ALLAN AFIRME'
  ])
  assert.equal(iniciales[0].color, saldos.COLOR_AZUL)
  assert.equal(iniciales[1].color, saldos.COLOR_AZUL)
  assert.equal(iniciales[2].color, saldos.COLOR_ROJO)
  assert.equal(iniciales[3].color, saldos.COLOR_VERDE)
  assert.equal(iniciales[4].color, saldos.COLOR_VERDE)
  assert.ok(iniciales.every((cuenta) => cuenta.saldo === 0 && cuenta.id))
  iniciales[0].saldo = 10
  assert.equal(saldos.cuentasIniciales()[0].saldo, 0)
  assert.equal(saldos.DEBOUNCE_GUARDADO_MS, 500)
  assert.equal(saldos.COLECCION_SALDOS_CUENTAS, 'saldosCuentas')
  assert.equal(saldos.DOCUMENTO_SALDOS_CUENTAS, 'actual')
})

test('crea cuentas y arma el documento único', () => {
  assert.equal(saldos.crearCuenta({ nombre: '   ' }), null)
  const nueva = saldos.crearCuenta({
    nombre: '  Caja chica  ',
    color: '#AbC',
    saldo: '1,000.5',
    id: 'caja'
  })
  assert.deepEqual(nueva, { id: 'caja', nombre: 'Caja chica', color: '#abc', saldo: 1000.5 })
  const invalida = saldos.crearCuenta({ nombre: 'Otra', color: 'rojo', saldo: 5, id: 'otra' })
  assert.equal(invalida.color, saldos.COLOR_AZUL)
  const doc = saldos.documentoSaldos(imagen, '2026-11-04T18:00:00.000Z')
  assert.equal(doc.updatedAt, '2026-11-04T18:00:00.000Z')
  assert.equal(doc.cuentas[0].saldo, 190034)
  assert.equal(saldos.cuentasDesdeDocumento(doc)[4].saldo, 1363.79)
  assert.equal(saldos.cuentasDesdeDocumento({}), null)
  assert.equal(saldos.cuentasDesdeDocumento(null), null)
})

test('el snapshot no pisa la edición, el alta ni la baja local', () => {
  const local = [
    { id: 'bancomer-1', nombre: 'BANCOMER 1', color: '#2979ff', saldo: 10 },
    { id: 'banorte', nombre: 'BANORTE', color: '#ff1744', saldo: 5 }
  ]
  const remoto = [
    { id: 'bancomer-1', nombre: 'BANCOMER 1', color: '#2979ff', saldo: '99' },
    { id: 'banorte', nombre: 'BANORTE', color: '#ff1744', saldo: '7.5' },
    { id: 'allan-afirme', nombre: 'ALLAN AFIRME', color: '#00c853', saldo: 1 }
  ]
  const fusion = saldos.fusionarCuentas(local, remoto, { editando: ['bancomer-1'] })
  assert.equal(fusion.find((cuenta) => cuenta.id === 'bancomer-1').saldo, 10)
  assert.equal(fusion.find((cuenta) => cuenta.id === 'banorte').saldo, 7.5)
  assert.equal(fusion.find((cuenta) => cuenta.id === 'allan-afirme').saldo, 1)
  fusion[0].saldo = 0
  assert.equal(local[0].saldo, 10)

  const conAlta = saldos.fusionarCuentas(
    local.concat([{ id: 'caja', nombre: 'CAJA', color: '#2979ff', saldo: 3 }]),
    remoto,
    { pendientesAlta: ['caja'] }
  )
  assert.equal(conAlta.find((cuenta) => cuenta.id === 'caja').saldo, 3)

  const conBaja = saldos.fusionarCuentas(
    local.filter((cuenta) => cuenta.id !== 'banorte'),
    remoto,
    { pendientesBaja: ['banorte'] }
  )
  assert.equal(conBaja.some((cuenta) => cuenta.id === 'banorte'), false)
  assert.equal(conBaja.some((cuenta) => cuenta.id === 'allan-afirme'), true)
})

test('el menú de Cuentas usa el componente que importa este util', () => {
  const menu = fs.readFileSync(path.join(__dirname, '../src/views/CuentasMexico.vue'), 'utf8')
  const vista = fs.readFileSync(path.join(__dirname, '../src/components/Cuentas/SaldosCuentas.vue'), 'utf8')
  assert.match(menu, /SaldosCuentas/)
  assert.match(vista, /from '@\/utils\/saldosCuentas'/)
  assert.match(vista, /COLECCION_SALDOS_CUENTAS/)
  assert.match(vista, /onSnapshot/)
  assert.match(vista, /DEBOUNCE_GUARDADO_MS/)
  assert.match(vista, /enlaceWhatsAppSaldos/)
  assert.match(vista, /textoSaldoCampo/)
  assert.match(vista, /placeholder="0\.00"/)
  assert.match(vista, /Guardando…/)
  assert.match(vista, /Guardado/)
  assert.equal((vista.match(/<button\b(?![^>]*type="button")/g) || []).length, 0)
})
