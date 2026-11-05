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

test('el total de la imagen es 507,649 sin decimales', () => {
  // Cada saldo se redondea a pesos: 215,746.45 → 215,746 · 97,578.76 → 97,579 · 1,363.79 → 1,364
  assert.equal(saldos.totalSaldos(imagen), 507649)
  assert.equal(saldos.formatearMonto(saldos.totalSaldos(imagen)), '507,649')
})

test('parsea y formatea montos en pesos enteros', () => {
  assert.equal(saldos.parsearMonto('$ 190,034.00'), 190034)
  assert.equal(saldos.parsearMonto('2,926.00'), 2926)
  assert.equal(saldos.parsearMonto('215746.45'), 215746)
  assert.equal(saldos.parsearMonto('1.363,79'), 1364)
  assert.equal(saldos.parsearMonto('1.363'), 1363)
  assert.equal(saldos.parsearMonto('1.363.790'), 1363790)
  assert.equal(saldos.parsearMonto('190034'), 190034)
  assert.equal(saldos.parsearMonto('1,5'), 2)
  assert.equal(saldos.parsearMonto(1000.5), 1001)
  assert.equal(saldos.formatearMonto(2926), '2,926')
  assert.equal(saldos.formatearMonto(1363.79), '1,364')
  assert.equal(saldos.formatearMonto('97,578.76'), '97,579')
  assert.equal(saldos.formatearMonto(0), '0')
  assert.equal(saldos.parsearMonto(''), 0)
  assert.equal(saldos.parsearMonto(null), 0)
  assert.equal(saldos.parsearMonto('abc'), 0)
  assert.equal(saldos.parsearMonto('-'), 0)
  assert.equal(Object.is(saldos.parsearMonto('-0'), -0), false)
  assert.equal(saldos.parsearMonto('-2,926.00'), -2926)
  assert.equal(saldos.parsearMonto('(500)'), -500)
  assert.equal(saldos.formatearMonto(-2926), '-2,926')
  assert.equal(saldos.totalSaldos([{ saldo: 0.4 }, { saldo: 0.4 }]), 0)
})

test('arma el texto y el enlace de WhatsApp', () => {
  const fecha = new Date('2026-11-04T18:00:00Z')
  const texto = saldos.textoSaldosWhatsApp(imagen, fecha)
  assert.equal(texto, [
    '🏦 *SALDOS DE CUENTAS*',
    '📅 miércoles 4 de noviembre 2026',
    '━━━━━━━━━━━━━━━━━━━━',
    '```',
    '🔵 BANCOMER 1       $190,034',
    '🔵 BANCOMER 2         $2,926',
    '🔴 BANORTE          $215,746',
    '🟢 ESTUARDO AFIRME   $97,579',
    '🟢 ALLAN AFIRME       $1,364',
    '```',
    '━━━━━━━━━━━━━━━━━━━━',
    '💰 *TOTAL: $507,649*'
  ].join('\n'))
  assert.equal(saldos.formatearFechaSaldos('2026-11-04'), '04/11/2026')
  assert.equal(saldos.formatearFechaSaldos(new Date('2026-11-04T05:00:00Z')), '03/11/2026')
  const enlace = saldos.enlaceWhatsAppSaldos(texto)
  assert.equal(enlace, `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`)
  assert.match(decodeURIComponent(enlace.split('text=')[1]), /💰 \*TOTAL: \$507,649\*/)
})

test('fecha y hora concisas en hora de México', () => {
  assert.equal(saldos.formatearFechaHoraCorta(new Date('2026-11-05T20:32:00Z')), '05/11/26 14:32')
  assert.equal(saldos.formatearFechaHoraCorta(Date.parse('2026-11-05T05:07:00Z')), '04/11/26 23:07')
  assert.equal(saldos.formatearFechaHoraCorta({ toMillis: () => 0 }), '31/12/69 18:00')
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

test('el saldo vacío o en cero vale 0 en el total y en WhatsApp', () => {
  const cuentas = [
    { nombre: 'BANCOMER 1', color: saldos.COLOR_AZUL, saldo: 2000 },
    { nombre: 'BANCOMER 2', color: saldos.COLOR_AZUL, saldo: '' },
    { nombre: 'BANORTE', color: saldos.COLOR_ROJO, saldo: '30' },
    { nombre: 'ESTUARDO AFIRME', color: saldos.COLOR_VERDE, saldo: 0 },
    { nombre: 'ALLAN AFIRME', color: saldos.COLOR_VERDE, saldo: null }
  ]
  assert.equal(saldos.totalSaldos(cuentas), 2030)
  const texto = saldos.textoSaldosWhatsApp(cuentas, new Date('2026-11-04T18:00:00Z'))
  assert.match(texto, /BANCOMER 2 +\$0\n/)
  assert.match(texto, /ESTUARDO AFIRME +\$0\n/)
  assert.match(texto, /ALLAN AFIRME +\$0\n/)
  assert.match(texto, /💰 \*TOTAL: \$2,030\*/)
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
    '⚪ CAJA  $10',
    '```',
    '━━━━━━━━━━━━━━━━━━━━',
    '💰 *TOTAL: $10*'
  ].join('\n'))
})

test('las cuentas iniciales traen color, orden y saldo en cero', () => {
  const iniciales = saldos.cuentasIniciales()
  assert.deepEqual(iniciales.map((cuenta) => cuenta.nombre), [
    'BANCOMER 1', 'BANCOMER 2', 'BANORTE', 'ESTUARDO AFIRME', 'ALLAN AFIRME'
  ])
  assert.deepEqual(iniciales.map((cuenta) => cuenta.orden), [0, 1, 2, 3, 4])
  assert.equal(iniciales[0].color, saldos.COLOR_AZUL)
  assert.equal(iniciales[2].color, saldos.COLOR_ROJO)
  assert.equal(iniciales[4].color, saldos.COLOR_VERDE)
  assert.ok(iniciales.every((cuenta) => cuenta.saldo === 0 && cuenta.id && cuenta.editadoEn === null))
  iniciales[0].saldo = 10
  assert.equal(saldos.cuentasIniciales()[0].saldo, 0)
  assert.equal(saldos.COLECCION_SALDOS_CUENTAS, 'saldosCuentas')
  assert.equal(saldos.DOCUMENTO_SALDOS_CUENTAS, 'porCuenta')
  assert.equal(saldos.DOCUMENTO_SALDOS_LEGADO, 'actual')
  assert.equal(saldos.COLECCION_HISTORIAL_SALDOS, 'saldosCuentasHistorial')
})

test('crea cuentas al final de la lista', () => {
  assert.equal(saldos.crearCuenta({ nombre: '   ' }), null)
  const nueva = saldos.crearCuenta({
    nombre: '  Caja chica  ',
    color: '#AbC',
    saldo: '1,000.5',
    id: 'caja',
    ahora: 1000,
    existentes: saldos.cuentasIniciales()
  })
  assert.deepEqual(nueva, { id: 'caja', nombre: 'Caja chica', color: '#abc', saldo: 1001, orden: 5, editadoEn: 1000 })
  const invalida = saldos.crearCuenta({ nombre: 'Otra', color: 'rojo', saldo: 5, id: 'otra' })
  assert.equal(invalida.color, saldos.COLOR_AZUL)
  assert.equal(invalida.orden, 0)
})

test('lee el formato nuevo (mapa por cuenta) y el anterior (arreglo)', () => {
  const legado = saldos.cuentasDesdeDocumento({ cuentas: imagen })
  assert.deepEqual(legado.map((cuenta) => cuenta.id), imagen.map((cuenta) => cuenta.id))
  assert.equal(legado[2].saldo, 215746)

  const mapa = saldos.mapaDesdeCuentas(legado)
  assert.deepEqual(Object.keys(mapa), imagen.map((cuenta) => cuenta.id))
  assert.deepEqual(mapa.banorte, { nombre: 'BANORTE', color: '#ff1744', saldo: 215746, orden: 2, editadoEn: null })

  // El orden lo define `orden`, no el orden de las llaves del mapa.
  const leidas = saldos.cuentasDesdeDocumento({
    cuentas: {
      z: { nombre: 'ZETA', color: '#2979ff', saldo: 5, orden: 0, editadoEn: { toMillis: () => 42 } },
      a: { nombre: 'ALFA', color: '#2979ff', saldo: '1,234.50', orden: 1 },
      vacia: { saldo: 9 }
    }
  })
  assert.deepEqual(leidas.map((cuenta) => cuenta.id), ['z', 'a'])
  assert.equal(leidas[0].editadoEn, 42)
  assert.equal(leidas[1].saldo, 1235)

  assert.equal(saldos.cuentasDesdeDocumento({}), null)
  assert.equal(saldos.cuentasDesdeDocumento(null), null)
  assert.deepEqual(saldos.cuentasDesdeDocumento({ cuentas: {} }), [])
})

test('cada cuenta se guarda como un campo propio, con su historial', () => {
  const cuenta = { id: 'banorte', nombre: 'BANORTE', color: '#FF1744', saldo: 10, orden: 2 }
  assert.deepEqual(saldos.datosCuenta({ ...cuenta, saldo: '20,000.40', editadoEn: 5 }), {
    nombre: 'BANORTE', color: '#ff1744', saldo: 20000, orden: 2, editadoEn: 5
  })
  const editadoEn = Date.parse('2026-11-05T20:32:00Z')
  assert.deepEqual(saldos.registroHistorial({ tipo: 'saldo', cuenta, saldoAnterior: 10, saldo: '20,000', editadoEn }), {
    tipo: 'saldo',
    cuentaId: 'banorte',
    nombre: 'BANORTE',
    saldoAnterior: 10,
    saldo: 20000,
    editadoEn,
    fecha: '05/11/26 14:32'
  })
  assert.equal(saldos.registroHistorial({ tipo: 'baja', cuenta, editadoEn }).saldo, null)
})

test('el menú de Cuentas usa el componente que importa este util', () => {
  const menu = fs.readFileSync(path.join(__dirname, '../src/views/CuentasMexico.vue'), 'utf8')
  const vista = fs.readFileSync(path.join(__dirname, '../src/components/Cuentas/SaldosCuentas.vue'), 'utf8')
  assert.match(menu, /SaldosCuentas/)
  assert.match(vista, /from '@\/utils\/saldosCuentas'/)
  assert.match(vista, /COLECCION_SALDOS_CUENTAS/)
  assert.match(vista, /onSnapshot/)
  assert.match(vista, /writeBatch/)
  assert.match(vista, /\{ merge: true \}/)
  assert.match(vista, /runTransaction/)
  assert.match(vista, /enlaceWhatsAppSaldos/)
  assert.match(vista, /formatearFechaHoraCorta/)
  assert.match(vista, /role="dialog"/)
  assert.match(vista, /inputmode="numeric"/)
  assert.equal(/btn-eliminar/.test(vista), false)
  assert.match(menu, /AccesoPreciosVenta/)
  assert.match(menu, /import\('@\/components\/TransaccionesAgendaModal\.vue'\)/)
  assert.equal(/import TransaccionesAgendaModal from/.test(menu), false)
  assert.match(vista, /Guardando…/)
  assert.match(vista, /Guardado/)
  assert.match(vista, /Cargando…/)
  assert.equal((vista.match(/<button\b(?![^>]*type="button")/g) || []).length, 0)
})
