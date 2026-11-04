<template>
  <section class="saldos-cuentas" aria-label="Saldos de cuentas">
    <header class="saldos-cabecera">
      <h2>Saldos de cuentas</h2>
      <p
        class="saldos-estado"
        :class="{ 'saldos-estado--pendiente': estado !== 'Guardado' }"
        role="status"
        aria-live="polite"
      >{{ estado }}</p>
    </header>

    <p v-if="errorGuardado" class="saldos-error" role="alert">{{ errorGuardado }}</p>

    <div class="saldos-tabla-wrap">
      <table class="saldos-tabla">
        <caption class="sr-only">Saldos por cuenta y total</caption>
        <thead>
          <tr>
            <th scope="col" class="col-nombre">Cuenta</th>
            <th scope="col" class="col-saldo">Saldo</th>
            <th scope="col" class="col-accion"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!cuentas.length">
            <td colspan="3" class="vacio">Sin cuentas. Agrega una para empezar.</td>
          </tr>
          <tr v-for="cuenta in cuentas" :key="cuenta.id">
            <th scope="row" class="nombre-cuenta" :style="{ color: cuenta.color }">{{ cuenta.nombre }}</th>
            <td class="monto">
              <label class="sr-only" :for="idSaldo(cuenta)">Saldo de {{ cuenta.nombre }}</label>
              <span class="signo" aria-hidden="true">$</span>
              <input
                :id="idSaldo(cuenta)"
                class="input-monto"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                spellcheck="false"
                :value="textoVisible(cuenta)"
                @focus="enfocar(cuenta)"
                @input="editarSaldo(cuenta, $event)"
                @blur="desenfocar(cuenta)"
              >
            </td>
            <td class="acciones">
              <button
                v-if="confirmarId !== cuenta.id"
                type="button"
                class="btn-eliminar"
                :aria-label="'Eliminar ' + cuenta.nombre"
                @click="confirmarId = cuenta.id"
              >
                <span class="btn-eliminar-texto">Eliminar</span>
                <span class="btn-eliminar-icono" aria-hidden="true">✕</span>
              </button>
              <div v-else class="confirmar-borrar">
                <button type="button" class="btn-peligro" @click="eliminar(cuenta)">Sí, eliminar</button>
                <button type="button" class="btn-secundario" @click="confirmarId = null">Cancelar</button>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="fila-total">
            <th scope="row">TOTAL</th>
            <td class="monto">
              <span class="signo" aria-hidden="true">$</span>
              <strong class="cifra-total">{{ totalFormateado }}</strong>
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="saldos-acciones">
      <button type="button" class="btn-agregar" @click="abrirAlta">Agregar cuenta</button>
      <button type="button" class="btn-whatsapp" @click="compartir">Compartir por WhatsApp</button>
    </div>

    <form v-if="formulario" class="saldos-alta" @submit.prevent="confirmarAlta">
      <label class="campo">
        <span>Nombre</span>
        <input v-model.trim="altaNombre" type="text" maxlength="40" required autocomplete="off">
      </label>
      <label class="campo">
        <span>Color</span>
        <input v-model="altaColor" type="color">
      </label>
      <p v-if="errorAlta" class="saldos-error" role="alert">{{ errorAlta }}</p>
      <div class="saldos-alta-acciones">
        <button type="button" class="btn-agregar" @click="confirmarAlta">Guardar cuenta</button>
        <button type="button" class="btn-secundario" @click="cerrarAlta">Cancelar</button>
      </div>
    </form>
  </section>
</template>

<script>
import { Capacitor } from '@capacitor/core'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import {
  COLOR_AZUL,
  COLECCION_SALDOS_CUENTAS,
  DOCUMENTO_SALDOS_CUENTAS,
  DEBOUNCE_GUARDADO_MS,
  cuentasIniciales,
  cuentasDesdeDocumento,
  crearCuenta,
  documentoSaldos,
  enlaceWhatsAppSaldos,
  formatearMonto,
  fusionarCuentas,
  parsearMonto,
  textoSaldosWhatsApp,
  totalSaldos
} from '@/utils/saldosCuentas'

export default {
  name: 'SaldosCuentas',
  data() {
    return {
      cuentas: cuentasIniciales(),
      borradores: {},
      focoId: null,
      revisionesLocales: {},
      revisionesEnviadas: {},
      idsAlta: [],
      idsBaja: [],
      ultimoRemoto: null,
      tocado: false,
      listo: false,
      estado: 'Guardando…',
      errorGuardado: '',
      formulario: false,
      altaNombre: '',
      altaColor: COLOR_AZUL,
      confirmarId: null,
      errorAlta: ''
    }
  },
  computed: {
    totalFormateado() {
      return formatearMonto(totalSaldos(this.cuentas))
    }
  },
  created() {
    this._timer = null
    this._unsubscribe = null
    this._avisoListo = null
    this._escribiendo = false
    this._enCola = false
    this._reintentos = 0
    this._vivo = true
  },
  mounted() {
    const referencia = doc(db, COLECCION_SALDOS_CUENTAS, DOCUMENTO_SALDOS_CUENTAS)
    this._unsubscribe = onSnapshot(referencia, (snap) => {
      if (!this._vivo) return
      this.recibirSnapshot(snap)
    }, (error) => {
      console.warn('Saldos de cuentas sin conexión', error)
      if (!this._vivo) return
      this.listo = true
      this.marcarEstado()
    })
    this._avisoListo = setTimeout(() => {
      if (this._vivo && !this.listo) {
        this.listo = true
        this.marcarEstado()
      }
    }, 4000)
  },
  beforeDestroy() {
    this._vivo = false
    clearTimeout(this._timer)
    clearTimeout(this._avisoListo)
    this._timer = null
    if (this._unsubscribe) this._unsubscribe()
    if (!this.hayEdicionSinConfirmar()) return
    setDoc(this.referenciaSaldos(), documentoSaldos(this.cuentas, serverTimestamp())).catch((error) => {
      console.error('No se pudieron guardar los saldos', error)
    })
  },
  methods: {
    idSaldo(cuenta) {
      return `saldo-${cuenta.id}`
    },
    textoVisible(cuenta) {
      if (this.focoId === cuenta.id && Object.prototype.hasOwnProperty.call(this.borradores, cuenta.id)) {
        return this.borradores[cuenta.id]
      }
      return formatearMonto(cuenta.saldo)
    },
    enfocar(cuenta) {
      this.focoId = cuenta.id
      this.$set(this.borradores, cuenta.id, this.textoVisible(cuenta))
    },
    editarSaldo(cuenta, evento) {
      const texto = evento.target.value
      this.$set(this.borradores, cuenta.id, texto)
      const saldo = parsearMonto(texto)
      if (saldo === cuenta.saldo) return
      cuenta.saldo = saldo
      this.marcarEditada(cuenta.id)
      this.programarGuardado()
    },
    desenfocar(cuenta) {
      const habiaBorrador = Object.prototype.hasOwnProperty.call(this.borradores, cuenta.id)
      const texto = this.borradores[cuenta.id]
      if (this.focoId === cuenta.id) this.focoId = null
      this.$delete(this.borradores, cuenta.id)
      if (habiaBorrador) {
        const saldo = parsearMonto(texto)
        if (saldo !== cuenta.saldo) {
          cuenta.saldo = saldo
          this.marcarEditada(cuenta.id)
          this.programarGuardado()
        }
      }
      if (this.ultimoRemoto) this.aplicarRemoto(this.ultimoRemoto)
      this.marcarEstado()
    },
    abrirAlta() {
      this.formulario = true
      this.errorAlta = ''
      this.confirmarId = null
    },
    cerrarAlta() {
      this.formulario = false
      this.errorAlta = ''
      this.altaNombre = ''
      this.altaColor = COLOR_AZUL
    },
    confirmarAlta() {
      const cuenta = crearCuenta({ nombre: this.altaNombre, color: this.altaColor, saldo: 0 })
      if (!cuenta) {
        this.errorAlta = 'Escribe el nombre de la cuenta.'
        return
      }
      this.cuentas.push(cuenta)
      this.idsAlta.push(cuenta.id)
      this.marcarEditada(cuenta.id)
      this.cerrarAlta()
      this.programarGuardado()
    },
    eliminar(cuenta) {
      const id = cuenta.id
      const eraAlta = this.idsAlta.includes(id)
      this.confirmarId = null
      if (this.focoId === id) this.focoId = null
      this.$delete(this.borradores, id)
      this.cuentas = this.cuentas.filter((item) => item.id !== id)
      this.idsAlta = this.idsAlta.filter((item) => item !== id)
      this.$delete(this.revisionesLocales, id)
      this.$delete(this.revisionesEnviadas, id)
      if (!eraAlta) {
        if (!this.idsBaja.includes(id)) this.idsBaja.push(id)
        this.tocado = true
        this.programarGuardado()
        return
      }
      if (this.hayEdicionSinConfirmar()) this.programarGuardado()
      else this.marcarEstado()
    },
    async compartir() {
      const texto = textoSaldosWhatsApp(this.cuentas, new Date())
      const enlace = enlaceWhatsAppSaldos(texto)
      if (Capacitor.isNativePlatform() && typeof navigator.share === 'function') {
        try {
          await navigator.share({ text: texto })
          return
        } catch (error) {
          if (error && error.name === 'AbortError') return
        }
      }
      window.open(enlace, '_blank', 'noopener,noreferrer')
    },
    marcarEditada(id) {
      this.tocado = true
      this.$set(this.revisionesLocales, id, (this.revisionesLocales[id] || 0) + 1)
    },
    idsEnEdicion() {
      const ids = []
      this.cuentas.forEach((cuenta) => {
        const local = this.revisionesLocales[cuenta.id] || 0
        const enviada = this.revisionesEnviadas[cuenta.id] || 0
        if (local !== enviada || this.focoId === cuenta.id) ids.push(cuenta.id)
      })
      this.idsAlta.forEach((id) => {
        if (!ids.includes(id)) ids.push(id)
      })
      return ids
    },
    hayEdicionSinConfirmar() {
      if (this.idsAlta.length || this.idsBaja.length) return true
      return this.cuentas.some((cuenta) => {
        return (this.revisionesLocales[cuenta.id] || 0) !== (this.revisionesEnviadas[cuenta.id] || 0)
      })
    },
    marcarEstado() {
      const pendiente = Boolean(this._timer) || this._escribiendo || this.hayEdicionSinConfirmar()
      this.estado = !this.listo || pendiente ? 'Guardando…' : 'Guardado'
    },
    programarGuardado() {
      this.tocado = true
      this.errorGuardado = ''
      clearTimeout(this._timer)
      this._timer = setTimeout(() => {
        this._timer = null
        this.guardarAhora()
      }, DEBOUNCE_GUARDADO_MS)
      this.marcarEstado()
    },
    referenciaSaldos() {
      return doc(db, COLECCION_SALDOS_CUENTAS, DOCUMENTO_SALDOS_CUENTAS)
    },
    guardarAhora() {
      if (!this._vivo) return
      if (this._escribiendo) {
        this._enCola = true
        return
      }
      if (!this.hayEdicionSinConfirmar()) {
        this.marcarEstado()
        return
      }
      this._escribiendo = true
      this.marcarEstado()
      const payload = documentoSaldos(this.cuentas, serverTimestamp())
      let promesa
      try {
        promesa = setDoc(this.referenciaSaldos(), payload)
      } catch (error) {
        this._escribiendo = false
        this.falloGuardado(error)
        return
      }
      this._escribiendo = false
      this.marcarEstado()
      promesa.then(() => {
        this._reintentos = 0
        if (!this._vivo) return
        this.errorGuardado = ''
        this.marcarEstado()
      }).catch((error) => {
        if (!this._vivo) return
        this.falloGuardado(error)
      })
      if (this._enCola) {
        this._enCola = false
        this.programarGuardado()
      }
    },
    falloGuardado(error) {
      console.error('No se pudieron guardar los saldos', error)
      this.errorGuardado = 'No se pudo guardar. Se reintentará al reconectar.'
      this.estado = 'Guardando…'
      if (!this._vivo || this._reintentos >= 2) return
      this._reintentos += 1
      this._timer = setTimeout(() => {
        this._timer = null
        this.guardarAhora()
      }, 1500)
    },
    recibirSnapshot(snap) {
      if (!snap.exists()) {
        this.ultimoRemoto = null
        if (!this.tocado && !this.idsAlta.length && !this.idsBaja.length) {
          this.cuentas = cuentasIniciales()
        }
        this.listo = true
        this.marcarEstado()
        return
      }
      const remotas = cuentasDesdeDocumento(snap.data())
      if (!remotas) {
        this.listo = true
        this.marcarEstado()
        return
      }
      this.ultimoRemoto = remotas
      this.aplicarRemoto(remotas)
      this.listo = true
      this.marcarEstado()
    },
    aplicarRemoto(remotas) {
      const sinCambiosLocales = !this.tocado
        && !this.idsAlta.length
        && !this.idsBaja.length
        && !this.focoId
        && !this.hayEdicionSinConfirmar()
      if (sinCambiosLocales) {
        this.cuentas = remotas.map((cuenta) => ({ ...cuenta }))
      } else {
        this.cuentas = fusionarCuentas(this.cuentas, remotas, {
          editando: this.idsEnEdicion(),
          pendientesAlta: this.idsAlta,
          pendientesBaja: this.idsBaja
        })
      }
      this.idsBaja = this.idsBaja.filter((id) => remotas.some((cuenta) => cuenta.id === id))
      this.idsAlta = this.idsAlta.filter((id) => {
        const remota = remotas.find((cuenta) => cuenta.id === id)
        const local = this.cuentas.find((cuenta) => cuenta.id === id)
        if (!remota || !local) return true
        return local.saldo !== remota.saldo || local.nombre !== remota.nombre || local.color !== remota.color
      })
      remotas.forEach((remota) => {
        const local = this.cuentas.find((cuenta) => cuenta.id === remota.id)
        if (!local || this.focoId === local.id) return
        if (local.saldo === remota.saldo && local.nombre === remota.nombre && local.color === remota.color) {
          this.$set(this.revisionesEnviadas, local.id, this.revisionesLocales[local.id] || 0)
        }
      })
    }
  }
}
</script>

<style scoped>
.saldos-cuentas {
  width: 100%;
  box-sizing: border-box;
  background: #161616;
  color: #f5f5f5;
  border: 1px solid #3a3a3a;
  padding: 14px;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}

.saldos-cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.saldos-cabecera h2 {
  margin: 0;
  font-family: 'Orbitron', 'Segoe UI', sans-serif;
  font-size: 1.05rem;
  letter-spacing: 0.5px;
  color: #00ff41;
  text-shadow: 0 0 8px rgba(0, 255, 65, 0.45);
}

.saldos-estado {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.4px;
  color: #9be7a8;
  white-space: nowrap;
}

.saldos-estado--pendiente {
  color: #ffb000;
}

.saldos-error {
  margin: 0 0 8px;
  color: #ff8a80;
  font-size: 0.85rem;
}

.saldos-tabla-wrap {
  overflow-x: auto;
}

.saldos-tabla {
  width: 100%;
  border-collapse: collapse;
  background: #2a2a2a;
  table-layout: fixed;
}

.saldos-tabla caption {
  caption-side: top;
}

.saldos-tabla th,
.saldos-tabla td {
  border: 1px solid #4a4a4a;
  padding: 8px 10px;
  vertical-align: middle;
}

.saldos-tabla thead th {
  background: #3c3c3c;
  color: #e0e0e0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  text-align: left;
}

.col-nombre { width: 46%; }
.col-saldo { width: 38%; }
.col-accion { width: 16%; }

.nombre-cuenta {
  font-weight: 800;
  text-align: left;
  font-size: 0.92rem;
  line-height: 1.2;
  word-break: break-word;
}

.monto {
  text-align: right;
  white-space: nowrap;
}

.signo {
  display: inline-block;
  min-width: 0.8rem;
  margin-right: 4px;
  color: #ffffff;
  font-weight: 700;
}

.input-monto {
  width: calc(100% - 1.2rem);
  max-width: 11rem;
  box-sizing: border-box;
  border: 0;
  background: transparent;
  color: #ffffff;
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 16px;
  text-align: right;
  padding: 4px 2px;
}

.input-monto:focus {
  outline: 2px solid #00ff41;
  background: #111111;
}

.fila-total th {
  text-align: left;
  font-size: 1rem;
  letter-spacing: 0.4px;
  color: #ffffff;
  background: #242424;
}

.fila-total td {
  background: #242424;
}

.cifra-total {
  display: inline-block;
  min-width: 7.5rem;
  border-bottom: 2px solid #ffffff;
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 1.05rem;
  font-weight: 700;
  text-align: right;
  color: #ffffff;
}

.acciones {
  text-align: center;
  padding: 4px;
}

.vacio {
  text-align: center;
  color: #cfcfcf;
  padding: 16px 8px;
}

.saldos-acciones,
.saldos-alta-acciones,
.confirmar-borrar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.saldos-acciones {
  margin-top: 12px;
}

.saldos-acciones button,
.saldos-alta-acciones button,
.btn-eliminar,
.btn-peligro,
.btn-secundario {
  min-height: 44px;
  padding: 8px 12px;
  font: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  border-radius: 0;
}

.btn-agregar,
.btn-secundario,
.btn-eliminar {
  background: transparent;
  color: #d8d8d8;
  border: 1px solid #6a6a6a;
}

.btn-agregar:hover,
.btn-secundario:hover,
.btn-eliminar:hover {
  border-color: #00ff41;
  color: #00ff41;
}

.btn-whatsapp {
  background: #25d366;
  color: #06210f;
  border: 1px solid #25d366;
  font-weight: 700;
}

.btn-whatsapp:hover {
  filter: brightness(1.05);
}

.btn-peligro {
  background: #ff1744;
  color: #ffffff;
  border: 1px solid #ff1744;
  font-weight: 700;
}

.saldos-acciones button {
  flex: 1 1 160px;
}

.btn-eliminar-icono {
  display: none;
}

.confirmar-borrar {
  justify-content: center;
}

.confirmar-borrar button {
  flex: 1 1 70px;
  padding: 8px 6px;
  font-size: 0.8rem;
}

.saldos-alta {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #3a3a3a;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #d0d0d0;
}

.campo input[type="text"] {
  min-height: 44px;
  box-sizing: border-box;
  border: 1px solid #5a5a5a;
  background: #111111;
  color: #ffffff;
  font: inherit;
  font-size: 16px;
  padding: 8px 10px;
}

.campo input[type="color"] {
  width: 100%;
  height: 44px;
  padding: 4px;
  border: 1px solid #5a5a5a;
  background: #111111;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 420px) {
  .saldos-cuentas {
    padding: 10px;
  }

  .saldos-cabecera h2 {
    font-size: 0.95rem;
  }

  .saldos-tabla th,
  .saldos-tabla td {
    padding: 7px 6px;
  }

  .nombre-cuenta {
    font-size: 0.78rem;
  }

  .col-accion {
    width: 52px;
  }

  .btn-eliminar {
    min-width: 44px;
    padding: 8px;
  }

  .btn-eliminar-texto {
    display: none;
  }

  .btn-eliminar-icono {
    display: inline;
    font-size: 1rem;
  }

  .saldos-acciones button {
    flex-basis: 100%;
  }

  .cifra-total {
    min-width: 0;
    font-size: 0.95rem;
  }
}

@media (min-width: 1100px) {
  .saldos-cuentas {
    max-width: 520px;
    align-self: start;
    justify-self: end;
  }

  .nombre-cuenta {
    font-size: 0.95rem;
    white-space: nowrap;
  }

  .saldos-cabecera h2 {
    font-size: 1.15rem;
  }
}
</style>
