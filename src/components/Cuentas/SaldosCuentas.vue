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

    <p v-if="!cargado" class="saldos-aviso">
      {{ sinConexion
        ? 'Sin conexión: los saldos aparecerán en cuanto haya red. Mientras tanto no se pueden editar.'
        : 'Cargando saldos…' }}
    </p>

    <div v-else class="saldos-tabla-wrap">
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
            <th scope="row" class="nombre-cuenta">
              <span :style="{ color: cuenta.color }">{{ cuenta.nombre }}</span>
              <span v-if="cuenta.editadoEn" class="editado-en">{{ fechaCorta(cuenta.editadoEn) }}</span>
            </th>
            <td class="monto">
              <span class="signo" aria-hidden="true">$</span>
              <span class="cifra-saldo">{{ formatear(cuenta.saldo) }}</span>
            </td>
            <td class="acciones">
              <button
                type="button"
                class="btn-editar"
                :aria-label="'Editar saldo de ' + cuenta.nombre"
                @click="abrirEdicion(cuenta)"
              >
                <span class="btn-editar-texto">Editar</span>
                <span class="btn-editar-icono" aria-hidden="true">✎</span>
              </button>
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
      <button type="button" class="btn-agregar" :disabled="!cargado" @click="abrirAlta">Agregar cuenta</button>
      <button type="button" class="btn-whatsapp" :disabled="!cargado" @click="compartir">Compartir por WhatsApp</button>
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

    <div v-if="edicion" class="modal-fondo" @click.self="cerrarEdicion">
      <div
        class="modal-saldo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-edicion-saldo"
      >
        <header class="modal-cabecera">
          <h3 id="titulo-edicion-saldo" :style="{ color: edicion.color }">{{ edicion.nombre }}</h3>
          <p class="modal-fecha" :title="'Fecha y hora de esta edición'">🕒 {{ fechaCorta(ahora) }}</p>
        </header>

        <label class="modal-label" for="monto-edicion-saldo">Nuevo saldo</label>
        <div class="modal-input-wrap">
          <span class="signo" aria-hidden="true">$</span>
          <input
            id="monto-edicion-saldo"
            ref="inputMonto"
            v-model="edicion.texto"
            class="modal-input"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            spellcheck="false"
            placeholder="0"
            @keydown.enter.prevent="guardarEdicion"
          >
        </div>
        <p class="modal-detalle">
          Se guardará: <strong>${{ formatear(edicion.texto) }}</strong>
          <span class="modal-antes">
            · Antes: ${{ formatear(edicion.saldoAnterior) }}<template v-if="edicion.editadoAntes"> ({{ fechaCorta(edicion.editadoAntes) }})</template>
          </span>
        </p>
        <p v-if="errorEdicion" class="saldos-error" role="alert">{{ errorEdicion }}</p>

        <div class="modal-acciones">
          <button type="button" class="btn-guardar" @click="guardarEdicion">Guardar</button>
          <button type="button" class="btn-secundario" @click="cerrarEdicion">Cancelar</button>
        </div>

        <div class="modal-borrar">
          <button
            v-if="!edicion.confirmarBorrar"
            type="button"
            class="btn-link-peligro"
            @click="edicion.confirmarBorrar = true"
          >Eliminar cuenta</button>
          <div v-else class="confirmar-borrar">
            <span>¿Eliminar {{ edicion.nombre }}?</span>
            <button type="button" class="btn-peligro" @click="eliminarCuenta">Sí, eliminar</button>
            <button type="button" class="btn-secundario" @click="edicion.confirmarBorrar = false">No</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { Capacitor } from '@capacitor/core'
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/firebase'
import {
  COLOR_AZUL,
  COLECCION_SALDOS_CUENTAS,
  DOCUMENTO_SALDOS_CUENTAS,
  DOCUMENTO_SALDOS_LEGADO,
  COLECCION_HISTORIAL_SALDOS,
  cuentasIniciales,
  cuentasDesdeDocumento,
  crearCuenta,
  datosCuenta,
  enlaceWhatsAppSaldos,
  formatearFechaHoraCorta,
  formatearMonto,
  mapaDesdeCuentas,
  parsearMonto,
  registroHistorial,
  textoSaldosWhatsApp,
  totalSaldos
} from '@/utils/saldosCuentas'

const ESPERA_SIN_CONEXION_MS = 6000

export default {
  name: 'SaldosCuentas',
  data() {
    return {
      cuentas: [],
      cargado: false,
      sinConexion: false,
      pendiente: false,
      errorGuardado: '',
      formulario: false,
      altaNombre: '',
      altaColor: COLOR_AZUL,
      errorAlta: '',
      edicion: null,
      errorEdicion: '',
      ahora: Date.now()
    }
  },
  computed: {
    totalFormateado() {
      return formatearMonto(totalSaldos(this.cuentas))
    },
    estado() {
      if (!this.cargado) return this.sinConexion ? 'Sin conexión' : 'Cargando…'
      return this.pendiente ? 'Guardando…' : 'Guardado'
    }
  },
  created() {
    this._unsubscribe = null
    this._avisoSinConexion = null
    this._reloj = null
    this._inicializando = false
    this._intentosInicio = 0
    this._vivo = true
    this._alTeclear = (evento) => {
      if (evento.key === 'Escape' && this.edicion) this.cerrarEdicion()
    }
  },
  mounted() {
    this._unsubscribe = onSnapshot(
      this.referenciaSaldos(),
      { includeMetadataChanges: true },
      (snap) => {
        if (this._vivo) this.recibirSnapshot(snap)
      },
      (error) => {
        console.warn('Saldos de cuentas sin conexión', error)
        if (!this._vivo) return
        this.sinConexion = true
        this.errorGuardado = 'No se pudieron leer los saldos.'
      }
    )
    this._avisoSinConexion = setTimeout(() => {
      if (this._vivo && !this.cargado) this.sinConexion = true
    }, ESPERA_SIN_CONEXION_MS)
    document.addEventListener('keydown', this._alTeclear)
  },
  beforeDestroy() {
    this._vivo = false
    clearTimeout(this._avisoSinConexion)
    clearInterval(this._reloj)
    document.removeEventListener('keydown', this._alTeclear)
    if (this._unsubscribe) this._unsubscribe()
  },
  methods: {
    formatear(valor) {
      return formatearMonto(valor)
    },
    fechaCorta(valor) {
      return formatearFechaHoraCorta(valor)
    },
    referenciaSaldos() {
      return doc(db, COLECCION_SALDOS_CUENTAS, DOCUMENTO_SALDOS_CUENTAS)
    },
    recibirSnapshot(snap) {
      if (!snap.exists()) {
        // Desde caché "no existe" solo significa "aún no sé": no se muestran ni se
        // guardan cuentas de arranque para no sobrescribir los datos reales.
        if (!snap.metadata.fromCache) this.inicializarDocumento()
        return
      }
      this.cuentas = cuentasDesdeDocumento(snap.data()) || []
      this.pendiente = snap.metadata.hasPendingWrites
      this.cargado = true
      this.sinConexion = false
      if (this.errorGuardado === 'No se pudieron leer los saldos.') this.errorGuardado = ''
    },
    /**
     * Primera vez: crea saldosCuentas/porCuenta a partir del documento anterior
     * (saldosCuentas/actual) o, si no existe, con las cuentas de arranque.
     * La transacción evita que dos dispositivos lo creen a la vez.
     */
    async inicializarDocumento() {
      if (this._inicializando) return
      this._inicializando = true
      const referencia = this.referenciaSaldos()
      const legado = doc(db, COLECCION_SALDOS_CUENTAS, DOCUMENTO_SALDOS_LEGADO)
      try {
        await runTransaction(db, async (tx) => {
          const actual = await tx.get(referencia)
          if (actual.exists()) return
          const anterior = await tx.get(legado)
          const previas = anterior.exists() ? cuentasDesdeDocumento(anterior.data()) : null
          tx.set(referencia, {
            cuentas: mapaDesdeCuentas(previas || cuentasIniciales()),
            migradoDe: previas ? DOCUMENTO_SALDOS_LEGADO : null,
            updatedAt: serverTimestamp()
          })
        })
        this._intentosInicio = 0
      } catch (error) {
        console.error('No se pudo preparar el documento de saldos', error)
        if (!this._vivo) return
        this.sinConexion = true
        if (this._intentosInicio < 3) {
          this._intentosInicio += 1
          setTimeout(() => {
            if (this._vivo && !this.cargado) this.inicializarDocumento()
          }, 3000)
        } else {
          this.errorGuardado = 'No se pudieron preparar los saldos. Recarga la página.'
        }
      } finally {
        this._inicializando = false
      }
    },
    /** Escribe solo la cuenta indicada (más su renglón de historial). */
    escribirCuenta(cuenta, valorCampo, registro) {
      const batch = writeBatch(db)
      batch.set(this.referenciaSaldos(), {
        cuentas: { [cuenta.id]: valorCampo },
        updatedAt: serverTimestamp()
      }, { merge: true })
      batch.set(doc(collection(db, COLECCION_HISTORIAL_SALDOS)), {
        ...registro,
        creado: serverTimestamp()
      })
      this.errorGuardado = ''
      batch.commit().catch((error) => {
        console.error('No se pudieron guardar los saldos', error)
        if (this._vivo) this.errorGuardado = `No se pudo guardar ${cuenta.nombre}. Intenta de nuevo.`
      })
    },
    abrirEdicion(cuenta) {
      this.cerrarAlta()
      this.errorEdicion = ''
      this.ahora = Date.now()
      this.edicion = {
        id: cuenta.id,
        nombre: cuenta.nombre,
        color: cuenta.color,
        saldoAnterior: cuenta.saldo,
        editadoAntes: cuenta.editadoEn,
        texto: cuenta.saldo ? formatearMonto(cuenta.saldo) : '',
        confirmarBorrar: false
      }
      clearInterval(this._reloj)
      this._reloj = setInterval(() => { this.ahora = Date.now() }, 15000)
      this.$nextTick(() => {
        const input = this.$refs.inputMonto
        if (input) {
          input.focus()
          input.select()
        }
      })
    },
    cerrarEdicion() {
      clearInterval(this._reloj)
      this._reloj = null
      this.edicion = null
      this.errorEdicion = ''
    },
    cuentaEnEdicion() {
      const cuenta = this.edicion && this.cuentas.find((item) => item.id === this.edicion.id)
      if (!cuenta) this.errorEdicion = 'Esta cuenta se eliminó en otro dispositivo.'
      return cuenta
    },
    guardarEdicion() {
      const cuenta = this.cuentaEnEdicion()
      if (!cuenta) return
      const editadoEn = Date.now()
      const saldo = parsearMonto(this.edicion.texto)
      this.escribirCuenta(
        cuenta,
        datosCuenta({ ...cuenta, saldo, editadoEn }),
        registroHistorial({ tipo: 'saldo', cuenta, saldoAnterior: cuenta.saldo, saldo, editadoEn })
      )
      this.cerrarEdicion()
    },
    eliminarCuenta() {
      const cuenta = this.cuentaEnEdicion()
      if (!cuenta) return
      this.escribirCuenta(
        cuenta,
        deleteField(),
        registroHistorial({ tipo: 'baja', cuenta, saldoAnterior: cuenta.saldo, editadoEn: Date.now() })
      )
      this.cerrarEdicion()
    },
    abrirAlta() {
      this.formulario = true
      this.errorAlta = ''
    },
    cerrarAlta() {
      this.formulario = false
      this.errorAlta = ''
      this.altaNombre = ''
      this.altaColor = COLOR_AZUL
    },
    confirmarAlta() {
      const editadoEn = Date.now()
      const cuenta = crearCuenta({
        nombre: this.altaNombre,
        color: this.altaColor,
        saldo: 0,
        ahora: editadoEn,
        existentes: this.cuentas
      })
      if (!cuenta) {
        this.errorAlta = 'Escribe el nombre de la cuenta.'
        return
      }
      this.escribirCuenta(
        cuenta,
        datosCuenta(cuenta),
        registroHistorial({ tipo: 'alta', cuenta, saldo: 0, editadoEn })
      )
      this.cerrarAlta()
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

.saldos-aviso {
  margin: 0;
  padding: 18px 12px;
  border: 1px dashed #4a4a4a;
  background: #202020;
  color: #d0d0d0;
  text-align: center;
  font-size: 0.9rem;
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
.col-saldo { width: 34%; }
.col-accion { width: 20%; }

.nombre-cuenta {
  font-weight: 800;
  text-align: left;
  font-size: 0.92rem;
  line-height: 1.2;
  word-break: break-word;
}

.editado-en {
  display: block;
  margin-top: 3px;
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 0.72rem;
  font-weight: 400;
  color: #9a9a9a;
  letter-spacing: 0.2px;
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

.cifra-saldo {
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 16px;
  color: #ffffff;
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
  min-width: 6rem;
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
.modal-acciones,
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
.modal-acciones button,
.btn-editar,
.btn-peligro,
.btn-secundario {
  min-height: 44px;
  padding: 8px 12px;
  font: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  border-radius: 0;
}

.saldos-acciones button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-agregar,
.btn-secundario,
.btn-editar {
  background: transparent;
  color: #d8d8d8;
  border: 1px solid #6a6a6a;
}

.btn-agregar:hover:not(:disabled),
.btn-secundario:hover,
.btn-editar:hover {
  border-color: #00ff41;
  color: #00ff41;
}

.btn-editar {
  width: 100%;
}

.btn-whatsapp {
  background: #25d366;
  color: #06210f;
  border: 1px solid #25d366;
  font-weight: 700;
}

.btn-whatsapp:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-guardar {
  background: #00c853;
  color: #04170b;
  border: 1px solid #00c853;
  font-weight: 700;
}

.btn-peligro {
  background: #ff1744;
  color: #ffffff;
  border: 1px solid #ff1744;
  font-weight: 700;
}

.saldos-acciones button,
.modal-acciones button {
  flex: 1 1 140px;
}

.btn-editar-icono {
  display: none;
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

/* Modal de edición */
.modal-fondo {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.7);
}

.modal-saldo {
  width: 100%;
  max-width: 360px;
  box-sizing: border-box;
  background: #1c1c1c;
  border: 1px solid #00ff41;
  box-shadow: 0 0 24px rgba(0, 255, 65, 0.2);
  padding: 16px;
  color: #f5f5f5;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.modal-cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.modal-cabecera h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  word-break: break-word;
}

.modal-fecha {
  margin: 0;
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 0.85rem;
  color: #9be7a8;
  white-space: nowrap;
}

.modal-label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.8rem;
  color: #c8c8c8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modal-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #5a5a5a;
  background: #111111;
  padding: 0 10px;
}

.modal-input-wrap:focus-within {
  border-color: #00ff41;
}

.modal-input {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  border: 0;
  outline: none;
  background: transparent;
  color: #ffffff;
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 22px;
  text-align: right;
}

.modal-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.modal-detalle {
  margin: 8px 0 12px;
  font-size: 0.82rem;
  color: #bdbdbd;
}

.modal-detalle strong {
  color: #ffffff;
}

.modal-antes {
  color: #8a8a8a;
}

.modal-borrar {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid #333333;
  font-size: 0.85rem;
}

.btn-link-peligro {
  min-height: 36px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #ff8a80;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.confirmar-borrar {
  align-items: center;
}

.confirmar-borrar span {
  flex: 1 1 100%;
  color: #ff8a80;
}

.confirmar-borrar button {
  flex: 1 1 90px;
  font-size: 0.85rem;
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

  .btn-editar {
    min-width: 44px;
    padding: 8px;
  }

  .btn-editar-texto {
    display: none;
  }

  .btn-editar-icono {
    display: inline;
    font-size: 1.05rem;
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
    max-width: 560px;
    align-self: start;
    justify-self: end;
  }

  .col-accion {
    width: 96px;
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
