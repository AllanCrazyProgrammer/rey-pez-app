<template>
  <div class="imagen-cajas-overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <section ref="dialog" class="imagen-cajas-dialog" role="dialog" aria-modal="true" aria-labelledby="imagen-cajas-title" tabindex="-1" @keydown.tab="atraparFoco">
      <header><h2 id="imagen-cajas-title">Imagen para WhatsApp</h2><button type="button" aria-label="Cerrar imagen" @click="$emit('close')">✕</button></header>
      <p>Edita esta copia antes de compartir. Los cambios no modifican el pedido.</p>
      <p v-if="pendientes.length" class="aviso">Sin rendimiento: {{ pendientes.join(', ') }}. Estas medidas no se incluyen; completa su cálculo en la vista.</p>
      <div class="imagen-cajas-layout">
        <div class="imagen-cajas-editor">
          <label>Título<input v-model="titulo" maxlength="55"></label>
          <label>Fecha o referencia<input v-model="referencia" maxlength="70"></label>
          <div v-for="(fila, index) in filas" :key="index" class="imagen-cajas-fila">
            <label class="incluir"><input v-model="fila.incluir" type="checkbox" :aria-label="'Incluir ' + fila.medida"> Incluir</label>
            <label>Medida<input v-model="fila.medida" maxlength="45" :aria-label="'Medida ' + (index + 1)"></label>
            <label>Cantidad<input v-model.number="fila.cantidad" type="number" min="0" max="999999" step="1" :aria-label="'Cantidad ' + (index + 1)"></label>
            <label>Unidad<select v-model="fila.unidad" :aria-label="'Unidad ' + (index + 1)"><option value="cajas">cajas</option><option value="kg">kg</option></select></label>
            <label v-if="fila.unidad === 'cajas'">Master (kg)<input v-model.number="fila.master" type="number" min="1" max="999" :aria-label="'Master ' + (index + 1)"></label>
          </div>
          <button type="button" @click="filas.push({ medida: '', cantidad: 1, unidad: 'cajas', master: 20, incluir: true })">+ Agregar medida</button>
          <label>Nota opcional<textarea v-model="nota" maxlength="240" rows="2" placeholder="Ej. Sacar antes de las 7:00"></textarea></label>
          <p v-if="!seleccionadas.length" class="aviso">No hay cantidades pendientes para incluir.</p>
          <p v-else-if="!valido" class="aviso">Revisa las medidas, cantidades y masters. Usa cantidades enteras para cajas.</p>
        </div>
        <div class="imagen-cajas-preview"><img v-if="imagen" :src="imagen" alt="Vista previa de las medidas y cajas a sacar"><p>PNG compacto · {{ peso }} KB</p></div>
      </div>
      <p v-if="mensaje" role="status">{{ mensaje }}</p>
      <footer>
        <button type="button" @click="$emit('close')">Cerrar</button>
        <button type="button" :disabled="!valido || !archivo" @click="descargar">Descargar imagen</button>
        <button v-if="puedeCompartir" type="button" class="principal" :disabled="!valido || !archivo || compartiendo" @click="compartir">{{ compartiendo ? 'Compartiendo…' : 'Compartir imagen' }}</button>
      </footer>
      <p class="ayuda">{{ puedeCompartir ? 'Elige WhatsApp en el menú para compartir.' : 'Descarga la imagen y adjúntala en WhatsApp.' }}</p>
    </section>
  </div>
</template>

<script>
export default {
  name: 'ImagenCajasModal',
  props: {
    iniciales: { type: Array, required: true },
    pendientes: { type: Array, default: () => [] },
    fecha: { type: String, default: '' }
  },
  data() {
    return {
      filas: this.iniciales.map(f => ({ ...f, incluir: f.cantidad > 0 })),
      titulo: 'Cajas a sacar', referencia: this.fecha, nota: '', imagen: '', archivo: null,
      mensaje: '', peso: 0, puedeCompartir: false, compartiendo: false, version: 0,
      focoAnterior: null, overflowAnterior: ''
    }
  },
  computed: {
    seleccionadas() { return this.filas.filter(f => f.incluir) },
    valido() {
      return !!this.titulo.trim() && this.seleccionadas.length > 0 && this.seleccionadas.every(f =>
        f.medida.trim() && Number.isFinite(Number(f.cantidad)) && Number(f.cantidad) > 0 && Number(f.cantidad) <= 999999 &&
        (f.unidad === 'kg' || (Number.isInteger(Number(f.cantidad)) && Number(f.master) > 0 && Number(f.master) <= 999)))
    }
  },
  watch: {
    filas: { deep: true, handler: 'generar' }, titulo: 'generar', referencia: 'generar', nota: 'generar'
  },
  mounted() {
    this.focoAnterior = document.activeElement
    this.overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    this.$refs.dialog.focus()
    this.generar()
  },
  beforeDestroy() {
    this.version++
    document.body.style.overflow = this.overflowAnterior
    if (this.focoAnterior && this.focoAnterior.isConnected) this.focoAnterior.focus()
  },
  methods: {
    atraparFoco(event) {
      const elementos = this.$refs.dialog.querySelectorAll('button:not(:disabled), input, select, textarea')
      const primero = elementos[0], ultimo = elementos[elementos.length - 1]
      if (event.shiftKey && (document.activeElement === primero || document.activeElement === this.$refs.dialog)) {
        event.preventDefault(); ultimo.focus()
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault(); primero.focus()
      }
    },
    generar() {
      const version = ++this.version
      this.archivo = null
      this.mensaje = ''
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) { this.mensaje = 'No se pudo crear la imagen en este navegador.'; return }
      const ancho = 640, margen = 32
      // Medir y envolver también palabras largas para no recortar notas o medidas.
      const lineas = (texto, maximo, fuente) => {
        ctx.font = fuente
        const resultado = []; let actual = ''
        for (const caracter of String(texto)) {
          if (caracter === '\n' || ctx.measureText(actual + caracter).width > maximo) {
            resultado.push(actual); actual = caracter === '\n' ? '' : caracter
          } else actual += caracter
        }
        if (actual) resultado.push(actual)
        return resultado
      }
      const titulos = lineas(this.titulo, 576, 'bold 32px Arial')
      const referencias = lineas(this.referencia, 576, '20px Arial')
      const notas = lineas(this.nota, 576, '22px Arial')
      const filas = this.seleccionadas.map(f => ({ ...f, lineas: lineas(f.medida, 285, 'bold 28px Arial') }))
      const encabezado = 52 + titulos.length * 38 + referencias.length * 26
      const altoFilas = filas.reduce((s, f) => s + Math.max(66, f.lineas.length * 34 + 24), 0)
      canvas.width = ancho
      canvas.height = encabezado + 52 + altoFilas + 78 + (notas.length ? notas.length * 28 + 28 : 0)
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, ancho, canvas.height)
      ctx.fillStyle = '#075e54'; ctx.fillRect(0, 0, ancho, encabezado)
      const texto = (valor, x, y, fuente, color = '#18332f') => {
        ctx.font = fuente; ctx.fillStyle = color; ctx.fillText(String(valor), x, y)
      }
      let y = 42
      titulos.forEach(l => { texto(l, margen, y, 'bold 32px Arial', '#ffffff'); y += 38 })
      referencias.forEach(l => { texto(l, margen, y, '20px Arial', '#dbf4eb'); y += 26 })
      y = encabezado + 34
      texto('MEDIDA', margen, y, 'bold 18px Arial', '#55736b')
      texto('A SACAR', 390, y, 'bold 18px Arial', '#55736b')
      y += 18
      filas.forEach((f, i) => {
        const alto = Math.max(66, f.lineas.length * 34 + 24)
        ctx.fillStyle = i % 2 ? '#ffffff' : '#eef7f3'; ctx.fillRect(20, y, 600, alto)
        f.lineas.forEach((l, n) => texto(l, margen, y + 34 + n * 34, 'bold 28px Arial'))
        texto(`${f.cantidad} ${f.unidad}`, 350, y + 30, 'bold 27px Arial')
        if (f.unidad === 'cajas') texto(`Master ${f.master} kg`, 350, y + 53, '18px Arial', '#55736b')
        y += alto
      })
      const cajas = filas.filter(f => f.unidad === 'cajas').reduce((s, f) => s + Number(f.cantidad || 0), 0)
      const kilos = filas.filter(f => f.unidad === 'kg').reduce((s, f) => s + Number(f.cantidad || 0), 0)
      const total = [cajas ? `${cajas} cajas` : '', kilos ? `${Number(kilos.toFixed(2))} kg` : ''].filter(Boolean).join(' + ')
      texto(`Total: ${total || '0'}`, margen, y + 42, 'bold 26px Arial')
      y += 78
      notas.forEach(l => { texto(l, margen, y, '22px Arial'); y += 28 })
      this.imagen = canvas.toDataURL('image/png')
      canvas.toBlob(blob => {
        if (version !== this.version) return
        if (!blob) { this.mensaje = 'No se pudo generar el archivo. Intenta editar de nuevo.'; return }
        this.archivo = new File([blob], 'cajas-a-sacar.png', { type: 'image/png' })
        this.peso = Math.ceil(blob.size / 1024)
        this.puedeCompartir = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [this.archivo] }))
      }, 'image/png')
    },
    descargar() {
      const url = URL.createObjectURL(this.archivo)
      const enlace = document.createElement('a')
      enlace.href = url; enlace.download = this.archivo.name
      document.body.appendChild(enlace); enlace.click(); enlace.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      this.mensaje = 'Imagen descargada. Puedes adjuntarla en WhatsApp.'
    },
    async compartir() {
      this.compartiendo = true
      try { await navigator.share({ files: [this.archivo] }) }
      catch (error) {
        if (error.name !== 'AbortError') this.mensaje = 'No se pudo compartir. Descarga la imagen y adjúntala en WhatsApp.'
      } finally { this.compartiendo = false }
    }
  }
}
</script>

<style scoped>
.imagen-cajas-overlay { position: fixed; inset: 0; z-index: 12000; background: #091b36b8; display: flex; align-items: center; justify-content: center; padding: 16px; }
.imagen-cajas-dialog { background: #fff; color: #203830; border-radius: 18px; padding: 22px; width: 100%; max-width: 960px; max-height: 92vh; overflow: auto; box-shadow: 0 20px 70px #0005; text-align: left; }
header, footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
h2 { font-size: 24px; margin: 0; }
p { font-size: 14px; margin: 12px 0; }
.imagen-cajas-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; margin-bottom: 10px; min-width: 0; }
input, select, textarea { width: 100%; min-width: 0; border: 1px solid #b8cec4; border-radius: 7px; padding: 8px; font: inherit; color: #203830; background: #fff; box-sizing: border-box; }
.imagen-cajas-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px; background: #f0f6f3; border-radius: 10px; margin-bottom: 10px; }
.incluir { grid-column: 1 / -1; flex-direction: row; align-items: center; }
.incluir input { width: auto; }
button { border: 1px solid #b8cec4; background: #f1f7f4; border-radius: 8px; padding: 10px 13px; color: #203830; cursor: pointer; font-size: 14px; }
button:disabled { opacity: .5; cursor: not-allowed; }
.principal { background: #087b55; color: white; border-color: #087b55; }
.imagen-cajas-preview img { width: 100%; border-radius: 8px; border: 1px solid #d1dfd8; }
.imagen-cajas-preview { align-self: start; position: sticky; top: 0; }
.aviso { color: #834b0a; background: #fff5dc; padding: 10px; border-radius: 8px; }
footer { justify-content: flex-end; flex-wrap: wrap; margin-top: 16px; }
.ayuda { text-align: right; color: #55736b; }
@media(max-width: 650px) { .imagen-cajas-layout { grid-template-columns: 1fr; } .imagen-cajas-dialog { padding: 16px; } .imagen-cajas-preview { position: static; } }
</style>
