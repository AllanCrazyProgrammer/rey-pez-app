<template>
  <div class="journal-page">
    <div class="journal-shell">
      <header class="journal-header">
        <div>
          <router-link to="/procesos" class="journal-back">← PROCESOS</router-link>
          <p class="journal-kicker">REY PEZ / KNOWLEDGE BASE</p>
          <h1>JOURNAL<span class="blink">_</span></h1>
          <p class="journal-subtitle">Descubrimientos, aprendizajes y procesos del negocio</p>
        </div>
        <button class="terminal-button primary" @click="openEntryForm()">＋ Nueva entrada</button>
      </header>

      <div v-if="error" class="journal-alert">{{ error }}</div>
      <div v-if="loading" class="journal-loading">Cargando biblioteca...</div>

      <div v-else class="journal-layout">
        <aside class="journal-sidebar">
          <div class="sidebar-title"><span>ÍNDICE</span><button @click="openCategoryForm()">＋</button></div>
          <p v-if="categories.length === 0" class="empty-small">Crea tu primera categoría.</p>
          <section v-for="category in categories" :key="category.id" class="category-block">
            <div class="category-row" :class="{ selected: selectedCategoryId === category.id }">
              <button class="category-name" :aria-expanded="collapsedCategories[category.id] ? 'false' : 'true'" @click="toggleCategory(category)">{{ collapsedCategories[category.id] ? '▸' : '▾' }} {{ category.name }}</button>
              <span class="row-actions">
                <button title="Editar categoría" @click="openCategoryForm(category)">✎</button>
                <button title="Eliminar categoría" @click="removeCategory(category)">×</button>
              </span>
            </div>
            <div v-if="!collapsedCategories[category.id]">
            <div v-for="sub in subcategoriesFor(category.id)" :key="sub.id" class="subcategory-row" :class="{ selected: selectedSubcategoryId === sub.id }">
              <button @click="selectSubcategory(category, sub)">◦ {{ sub.name }}</button>
              <span class="row-actions">
                <button title="Editar subcategoría" @click="openSubcategoryForm(sub)">✎</button>
                <button title="Eliminar subcategoría" @click="removeSubcategory(sub)">×</button>
              </span>
            </div>
            <button class="add-subcategory" @click="openSubcategoryForm(null, category.id)">＋ subcategoría</button>
            </div>
          </section>
        </aside>

        <main class="journal-book">
          <div v-if="!activeEntry && !showEntryForm" class="journal-cover">
            <div class="cover-mark">✦</div>
            <p class="journal-kicker">CUADERNO DE OPERACIONES</p>
            <h2>{{ activeSubcategory ? activeSubcategory.name : (activeCategory ? activeCategory.name : 'Conocimiento del negocio') }}</h2>
            <p>Selecciona un capítulo del índice o crea una entrada para comenzar a documentar lo que descubres.</p>
            <button class="terminal-button primary" @click="openEntryForm()">Escribir una entrada</button>
          </div>

          <div v-else-if="activeEntry && !showEntryForm" class="entry-reader">
            <div class="entry-breadcrumb">{{ categoryName(activeEntry.categoryId) }} / {{ subcategoryName(activeEntry.subcategoryId) }}</div>
            <div class="entry-heading">
              <div><p class="entry-date">{{ formatDate(activeEntry.createdAt) }}</p><h2>{{ activeEntry.title }}</h2></div>
              <div class="entry-actions"><button @click="openEntryForm(activeEntry)">Editar</button><button class="danger" @click="removeEntry(activeEntry)">Eliminar</button></div>
            </div>
            <div class="entry-content" v-html="activeEntry.content"></div>
            <div v-if="activeEntry.images && activeEntry.images.length" class="entry-gallery">
              <button v-for="image in activeEntry.images" :key="image.id" @click="lightboxImage = image.url"><img :src="image.url" :alt="image.name || 'Imagen de la entrada'"></button>
            </div>
          </div>

          <div v-else class="entry-editor">
            <div class="entry-breadcrumb">Nueva página del journal</div>
            <div class="editor-selects">
              <select v-model="draft.categoryId" @change="draft.subcategoryId = ''"><option value="">Selecciona categoría</option><option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option></select>
              <select v-model="draft.subcategoryId"><option value="">Selecciona subcategoría</option><option v-for="sub in subcategoriesFor(draft.categoryId)" :key="sub.id" :value="sub.id">{{ sub.name }}</option></select>
            </div>
            <input v-model="draft.title" class="title-input" placeholder="Título de la entrada" maxlength="140">
            <div class="format-toolbar" role="toolbar" aria-label="Formato de texto">
              <button type="button" @click="formatText('bold')"><strong>B</strong></button><button type="button" @click="formatText('italic')"><em>I</em></button>
              <button type="button" @click="formatText('formatBlock','H2')">H</button><button type="button" @click="formatText('insertUnorderedList')">☷</button><button type="button" @click="formatText('insertOrderedList')">1.</button>
            </div>
            <div ref="editor" class="content-input" contenteditable="true" data-placeholder="Escribe aquí lo que aprendiste..." @input="updateContent"></div>
            <div class="photo-panel">
              <div class="photo-panel-heading"><span>FOTOS</span><label class="photo-button">＋ Agregar fotos<input type="file" accept="image/*" multiple @change="handleImages"></label></div>
              <div v-if="draft.images.length" class="photo-previews"><div v-for="(image, index) in draft.images" :key="image.id || image.url || index" class="photo-preview"><img :src="image.preview || image.url" :alt="image.name || 'Foto'"/><button @click="removeDraftImage(index)" title="Quitar foto">×</button></div></div>
              <p v-else class="empty-small">Puedes agregar fotografías para recordar visualmente este descubrimiento.</p>
            </div>
            <div class="editor-footer"><span :class="{ saved: draftSaved }">{{ draftSaved ? 'Borrador local guardado' : 'Cambios pendientes' }}</span><div><button class="terminal-button" @click="closeEntryForm">Cancelar</button><button class="terminal-button primary" :disabled="saving" @click="saveEntry">{{ saving ? 'Guardando...' : 'Guardar entrada' }}</button></div></div>
          </div>

          <div v-if="selectedSubcategoryId && entriesForSelected.length" class="entry-list">
            <p class="list-heading">ENTRADAS DE ESTE CAPÍTULO</p><button v-for="entry in entriesForSelected" :key="entry.id" :class="{ active: activeEntry && activeEntry.id === entry.id }" @click="selectEntry(entry)"><span>{{ entry.title }}</span><small>{{ formatDate(entry.createdAt) }}</small></button>
          </div>
        </main>
      </div>
    </div>

    <div v-if="modal.type" class="modal-backdrop" @click.self="modal.type = ''"><form class="journal-modal" @submit.prevent="saveStructure"><h3>{{ modal.editing ? 'Editar' : 'Nueva' }} {{ modal.type === 'category' ? 'categoría' : 'subcategoría' }}</h3><input v-model.trim="modal.name" required maxlength="80" :placeholder="modal.type === 'category' ? 'Ej. Procesamiento' : 'Ej. Cocimiento'"><div class="modal-actions"><button type="button" class="terminal-button" @click="modal.type = ''">Cancelar</button><button class="terminal-button primary">Guardar</button></div></form></div>
    <div v-if="lightboxImage" class="lightbox" @click="lightboxImage = ''"><img :src="lightboxImage" alt="Imagen ampliada"><button @click.stop="lightboxImage = ''">×</button></div>
  </div>
</template>

<script>
import { db, storage } from '@/firebase'
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

const DRAFT_KEY = 'reypez-journal-draft'
const cleanHtml = (value = '') => {
  const template = document.createElement('template')
  template.innerHTML = value
  template.content.querySelectorAll('script,style,iframe,object,embed,form').forEach(node => node.remove())
  template.content.querySelectorAll('*').forEach(node => [...node.attributes].forEach(attribute => {
    if (/^on/i.test(attribute.name) || (attribute.name === 'href' && !/^(https?:|mailto:|#)/i.test(attribute.value))) node.removeAttribute(attribute.name)
  }))
  return template.innerHTML
}
const newDraft = () => ({ id: null, categoryId: '', subcategoryId: '', title: '', content: '', images: [] })

export default {
  name: 'Journal',
  props: { id: { type: String, default: '' } },
  data: () => ({ categories: [], subcategories: [], entries: [], collapsedCategories: {}, loading: true, saving: false, error: '', selectedCategoryId: '', selectedSubcategoryId: '', activeEntry: null, showEntryForm: false, draft: newDraft(), draftSaved: false, modal: { type: '', editing: null, name: '', categoryId: '' }, lightboxImage: '' }),
  computed: {
    activeCategory() { return this.categories.find(item => item.id === this.selectedCategoryId) },
    activeSubcategory() { return this.subcategories.find(item => item.id === this.selectedSubcategoryId) },
    entriesForSelected() { return this.entries.filter(item => item.subcategoryId === this.selectedSubcategoryId).sort((a, b) => this.timeValue(b.updatedAt) - this.timeValue(a.updatedAt)) }
  },
  watch: {
    '$route.params.id': { immediate: true, handler() { this.syncRouteSelection() } },
    draft: { deep: true, handler() { if (this.showEntryForm) this.saveDraftLocally() } }
  },
  async created() { await this.loadJournal() },
  methods: {
    timeValue(value) { return value && value.seconds ? value.seconds * 1000 : (value ? new Date(value).getTime() : 0) },
    formatDate(value) { const date = this.timeValue(value); return date ? new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date)) : 'Sin fecha' },
    subcategoriesFor(categoryId) { return this.subcategories.filter(item => item.categoryId === categoryId).sort((a, b) => a.name.localeCompare(b.name)) },
    categoryName(id) { const item = this.categories.find(value => value.id === id); return item ? item.name : 'Sin categoría' },
    subcategoryName(id) { const item = this.subcategories.find(value => value.id === id); return item ? item.name : 'Sin subcategoría' },
    async loadJournal() {
      this.loading = true; this.error = ''
      try {
        const read = async name => (await getDocs(collection(db, name))).docs.map(item => ({ id: item.id, ...item.data() }))
        ;[this.categories, this.subcategories, this.entries] = await Promise.all([read('journalCategories'), read('journalSubcategories'), read('journalEntries')])
        this.categories.sort((a, b) => a.name.localeCompare(b.name)); this.syncRouteSelection()
      } catch (error) { this.error = `No se pudo cargar el journal: ${error.message}` } finally { this.loading = false }
    },
    syncRouteSelection() {
      const routeId = this.$route.params.id
      if (this.$route.name === 'JournalEntrada' && routeId) { this.activeEntry = this.entries.find(item => item.id === routeId) || null; if (this.activeEntry) { this.selectedCategoryId = this.activeEntry.categoryId; this.selectedSubcategoryId = this.activeEntry.subcategoryId } }
      else if (this.$route.name === 'JournalCategoria' && routeId) { this.selectedCategoryId = routeId; this.selectedSubcategoryId = ''; this.activeEntry = null }
    },
    selectCategory(category) { this.selectedCategoryId = category.id; this.selectedSubcategoryId = ''; this.activeEntry = null; this.$router.push({ name: 'JournalCategoria', params: { id: category.id } }) },
    toggleCategory(category) { this.$set(this.collapsedCategories, category.id, !this.collapsedCategories[category.id]) },
    selectSubcategory(category, sub) { this.selectedCategoryId = category.id; this.selectedSubcategoryId = sub.id; this.activeEntry = null; this.$router.push({ name: 'JournalCategoria', params: { id: category.id } }) },
    selectEntry(entry) { this.activeEntry = entry; this.showEntryForm = false; this.$router.push({ name: 'JournalEntrada', params: { id: entry.id } }) },
    openCategoryForm(category = null) { this.modal = { type: 'category', editing: category, name: category ? category.name : '', categoryId: '' } },
    openSubcategoryForm(sub = null, categoryId = this.selectedCategoryId) { this.modal = { type: 'subcategory', editing: sub, name: sub ? sub.name : '', categoryId: sub ? sub.categoryId : categoryId } },
    async saveStructure() {
      try { const isCategory = this.modal.type === 'category'; const collectionName = isCategory ? 'journalCategories' : 'journalSubcategories'; const data = { name: this.modal.name, ...(isCategory ? {} : { categoryId: this.modal.categoryId }), updatedAt: serverTimestamp() }; if (this.modal.editing) await updateDoc(doc(db, collectionName, this.modal.editing.id), data); else await addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp() }); this.modal.type = ''; await this.loadJournal()
      } catch (error) { this.error = `No se pudo guardar: ${error.message}` }
    },
    async removeCategory(category) { if (this.subcategories.some(item => item.categoryId === category.id)) return window.alert('Primero elimina sus subcategorías.'); if (!window.confirm(`¿Eliminar la categoría “${category.name}”?`)) return; await this.removeDoc('journalCategories', category.id); this.selectedCategoryId = '' },
    async removeSubcategory(sub) { if (this.entries.some(item => item.subcategoryId === sub.id)) return window.alert('Primero elimina sus entradas.'); if (!window.confirm(`¿Eliminar la subcategoría “${sub.name}”?`)) return; await this.removeDoc('journalSubcategories', sub.id); this.selectedSubcategoryId = '' },
    async removeDoc(collectionName, id) { try { await deleteDoc(doc(db, collectionName, id)); await this.loadJournal() } catch (error) { this.error = `No se pudo eliminar: ${error.message}` } },
    openEntryForm(entry = null) { this.showEntryForm = true; this.activeEntry = null; this.draft = entry ? { ...newDraft(), ...entry, images: (entry.images || []).map(image => ({ ...image })) } : { ...newDraft(), categoryId: this.selectedCategoryId, subcategoryId: this.selectedSubcategoryId }; this.$nextTick(() => { if (this.$refs.editor) this.$refs.editor.innerHTML = this.draft.content || ''; this.restoreDraft() }) },
    closeEntryForm() { this.showEntryForm = false; this.draft = newDraft(); this.draftSaved = false; localStorage.removeItem(DRAFT_KEY); this.syncRouteSelection() },
    updateContent(event) { this.draft.content = cleanHtml(event.target.innerHTML); this.draftSaved = false },
    formatText(command, value = null) { document.execCommand(command, false, value); this.$refs.editor && this.$refs.editor.focus(); this.updateContent({ target: this.$refs.editor }) },
    saveDraftLocally() { try { const copy = { ...this.draft, images: this.draft.images.filter(image => image.url).map(image => ({ id: image.id, url: image.url, name: image.name })) }; localStorage.setItem(DRAFT_KEY, JSON.stringify(copy)); this.draftSaved = true } catch (_) {} },
    restoreDraft() { try { const saved = JSON.parse(localStorage.getItem(DRAFT_KEY)); if (saved && (!this.draft.id || saved.id === this.draft.id)) { this.draft = { ...this.draft, ...saved }; this.$nextTick(() => { if (this.$refs.editor) this.$refs.editor.innerHTML = this.draft.content || '' }) } } catch (_) {} },
    compressImage(file) { return new Promise(resolve => { const image = new Image(); image.onload = () => { const scale = Math.min(1, 1600 / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', 0.82) }; image.src = URL.createObjectURL(file) }) },
    async handleImages(event) { const files = [...event.target.files].filter(file => file.type.startsWith('image/')).slice(0, 12); for (const file of files) { const blob = await this.compressImage(file); this.draft.images.push({ id: `${Date.now()}-${Math.random()}`, file: blob, preview: URL.createObjectURL(blob), name: file.name }) } event.target.value = '' },
    removeDraftImage(index) { const image = this.draft.images[index]; if (image.preview) URL.revokeObjectURL(image.preview); this.draft.images.splice(index, 1) },
    async saveEntry() {
      if (!this.draft.title.trim() || !this.draft.categoryId || !this.draft.subcategoryId || !cleanHtml(this.draft.content).replace(/<[^>]*>/g, '').trim()) return window.alert('Completa categoría, subcategoría, título y contenido.');
      this.saving = true; this.error = ''
      try {
        const entryRef = this.draft.id ? doc(db, 'journalEntries', this.draft.id) : doc(collection(db, 'journalEntries')); const oldImages = this.draft.images.filter(image => image.url); const images = []
        for (const image of this.draft.images) { if (image.url) images.push({ id: image.id, url: image.url, path: image.path || '', name: image.name || '' }); else { const path = `journal/${entryRef.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`; const imageRef = ref(storage, path); await uploadBytes(imageRef, image.file, { contentType: 'image/jpeg' }); images.push({ id: image.id, url: await getDownloadURL(imageRef), path, name: image.name || '' }) } }
        for (const image of oldImages.filter(image => !images.some(saved => saved.id === image.id))) { if (image.path) { try { await deleteObject(ref(storage, image.path)) } catch (_) {} } }
        const data = { title: this.draft.title.trim(), categoryId: this.draft.categoryId, subcategoryId: this.draft.subcategoryId, content: cleanHtml(this.draft.content), images, updatedAt: serverTimestamp() }; if (!this.draft.id) data.createdAt = serverTimestamp(); await setDoc(entryRef, data, { merge: true }); localStorage.removeItem(DRAFT_KEY); this.showEntryForm = false; await this.loadJournal(); const saved = this.entries.find(item => item.id === entryRef.id); if (saved) this.selectEntry(saved)
      } catch (error) { this.error = `No se pudo guardar la entrada: ${error.message}` } finally { this.saving = false }
    },
    async removeEntry(entry) { if (!window.confirm(`¿Eliminar la entrada “${entry.title}”?`)) return; try { for (const image of entry.images || []) if (image.path) { try { await deleteObject(ref(storage, image.path)) } catch (_) {} } await deleteDoc(doc(db, 'journalEntries', entry.id)); this.activeEntry = null; this.$router.push({ name: 'JournalCategoria', params: { id: entry.categoryId } }); await this.loadJournal() } catch (error) { this.error = `No se pudo eliminar: ${error.message}` } }
  }
}
</script>

<style scoped>
.journal-page { min-height:100vh; padding:24px; background:#080b0c; color:#d8f7df; font-family:'Share Tech Mono','Courier New',monospace; }
.journal-page * { box-sizing:border-box; }
.journal-shell { max-width:1400px; margin:auto; }
.journal-header { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; border-bottom:1px solid #1b7441; padding-bottom:22px; }
.journal-back,.journal-kicker,.entry-breadcrumb,.list-heading { color:#58e889; font-size:.8rem; letter-spacing:2px; text-transform:uppercase; }
.journal-back { text-decoration:none; }
.journal-header h1 { font-size:clamp(2rem,5vw,4rem); margin:18px 0 4px; color:#b9ffd0; letter-spacing:5px; }
.journal-page button { font-family:inherit; cursor:pointer; }
.terminal-button { background:transparent; border:1px solid #3d8555; color:#c4fbd0; padding:10px 15px; }
.terminal-button.primary { background:#164b2d; border-color:#67f393; box-shadow:0 0 12px #1d8b4e66; }
.terminal-button:disabled { opacity:.5; cursor:wait; }
.journal-alert { background:#4c1d24; border:1px solid #e36a79; padding:12px; margin:18px 0; color:#ffd9de; }
.journal-loading { text-align:center; padding:80px; color:#79dd98; }
.journal-layout { display:grid; grid-template-columns:280px minmax(0,1fr); gap:24px; margin-top:24px; }
.journal-sidebar { border-right:1px solid #205c37; padding-right:18px; min-width:0; }
.sidebar-title { display:flex; justify-content:space-between; letter-spacing:2px; margin-bottom:18px; }
.sidebar-title button,.row-actions button { background:none; border:0; color:#8cdda2; font:inherit; }
.category-block { margin-bottom:17px; }
.category-row,.subcategory-row { display:flex; align-items:center; justify-content:space-between; gap:5px; padding:7px 4px; }
.category-row.selected,.subcategory-row.selected { background:#143c27; box-shadow:inset 3px 0 #76ff9c; }
.category-name,.subcategory-row button,.add-subcategory { background:none; border:0; font:inherit; text-align:left; }
.category-name { flex:1; min-width:0; overflow-wrap:anywhere; }
.subcategory-row { padding-left:17px; }
.subcategory-row button { flex:1; }
.row-actions { white-space:nowrap; }
.row-actions button:hover { color:#fff; }
.add-subcategory { font-size:.8rem; margin:4px 0 0 20px; }
.empty-small { color:#59624e; font-size:.8rem; line-height:1.5; }
.journal-book { background:#f2ead7; color:#25251f; min-height:650px; min-width:0; position:relative; box-shadow:8px 8px 0 #123b25; padding:42px 46px; overflow-wrap:anywhere; }
.journal-cover { text-align:center; max-width:560px; margin:90px auto; }
.cover-mark { font-size:4rem; color:#b38b47; }
.journal-cover h2 { font-family:Georgia,serif; font-size:2.4rem; color:#34372d; margin:15px 0; }
.journal-cover p { line-height:1.7; }
.entry-reader,.entry-editor { max-width:900px; margin:auto; }
.entry-breadcrumb { color:#45644c; margin-bottom:24px; }
.entry-heading { display:flex; justify-content:space-between; gap:15px; border-bottom:1px solid #c6baa2; padding-bottom:20px; }
.entry-date { color:#64614f; text-transform:uppercase; font-size:.8rem; letter-spacing:1px; }
.entry-heading h2 { font:2.3rem Georgia,serif; color:#30352e; margin:8px 0; }
.entry-actions button { border:0; background:none; color:#286039; margin-left:14px; }
.entry-actions .danger { color:#913b3b; }
.entry-content { font:1.05rem/1.8 Georgia,serif; color:#3c3b31; padding:28px 0; min-height:180px; }
.entry-content ::v-deep h2 { font-size:1.6rem; }
.entry-content ::v-deep ul,.entry-content ::v-deep ol { padding-left:28px; }
.entry-gallery,.photo-previews { display:flex; flex-wrap:wrap; gap:12px; }
.entry-gallery button,.photo-preview { padding:0; border:1px solid #c3b798; background:#fff8e9; position:relative; }
.entry-gallery img,.photo-preview img { width:150px; height:115px; object-fit:cover; display:block; }
.entry-list { border-top:1px solid #c6baa2; margin:35px auto 0; max-width:900px; padding-top:20px; }
.list-heading { color:#66573d; }
.entry-list button { display:flex; justify-content:space-between; gap:12px; width:100%; border:0; border-bottom:1px solid #d9cdb5; background:none; padding:12px 4px; text-align:left; color:#4c5948; font-family:Georgia,serif; }
.entry-list button.active,.entry-list button:hover { color:#17733a; }
.entry-list small { color:#68614e; }
.editor-selects { display:flex; gap:10px; }
.editor-selects select,.title-input { border:1px solid #c7bda8; background:#fff9eb; padding:11px; color:#434438; font-family:inherit; min-width:0; }
.editor-selects select { flex:1; }
.title-input { width:100%; font:2.2rem Georgia,serif; margin:18px 0; }
.format-toolbar { border:1px solid #c7bda8; border-bottom:0; padding:7px; background:#e9dfc9; }
.format-toolbar button { border:0; background:none; color:#465944; font:1rem Georgia,serif; margin-right:14px; }
.content-input { min-height:260px; border:1px solid #c7bda8; padding:18px; font:1.05rem/1.8 Georgia,serif; color:#3c3b31; background:#fffdf5; }
.content-input:empty:before { content:attr(data-placeholder); color:#706856; }
.photo-panel { margin-top:22px; border-top:1px solid #c6baa2; padding-top:15px; }
.photo-panel-heading { display:flex; justify-content:space-between; color:#756a54; letter-spacing:1px; }
.photo-button { color:#267641; cursor:pointer; }
.photo-button input { display:none; }
.photo-preview button { position:absolute; right:3px; top:3px; border:0; border-radius:50%; background:#4c2525; color:white; width:22px; height:22px; }
.editor-footer { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:24px; color:#775330; font-size:.8rem; }
.editor-footer .saved { color:#286039; }
.journal-book .terminal-button:not(.primary),.journal-modal .terminal-button:not(.primary) { color:#28583a; }
.modal-backdrop,.lightbox { position:fixed; inset:0; background:#001008cc; display:flex; align-items:center; justify-content:center; z-index:1100; }
.journal-modal { background:#f2ead7; padding:28px; width:min(480px,90vw); box-shadow:8px 8px #0b3b20; }
.journal-modal h3 { font:1.6rem Georgia,serif; color:#34372d; }
.journal-modal input { width:100%; padding:12px; border:1px solid #bcb29e; background:#fffdf5; font-family:inherit; }
.modal-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:22px; }
.lightbox { background:#000d; cursor:zoom-out; }
.lightbox img { max-width:90vw; max-height:85vh; object-fit:contain; }
.lightbox button { position:absolute; top:20px; right:25px; border:0; background:none; color:white; font-size:2rem; }
.category-name:focus-visible,.terminal-button:focus-visible { outline:2px solid #76ff9c; outline-offset:3px; }
@media(max-width:760px) {
  .journal-page { padding:14px; }
  .journal-header { align-items:flex-start; flex-direction:column; }
  .journal-layout { display:block; }
  .journal-sidebar { border-right:0; border-bottom:1px solid #205c37; padding:0 0 15px; margin-bottom:18px; }
  .journal-book { padding:28px 20px; min-height:600px; }
  .journal-cover { margin:50px auto; }
  .entry-heading { display:block; }
  .entry-actions { margin-top:12px; }
  .editor-selects { flex-direction:column; }
  .editor-footer { align-items:flex-start; flex-direction:column; gap:15px; }
}
.journal-subtitle { color: #a8d6b2; }
.sidebar-title { color: #c1ffd0; }
.category-name { color: #d5ffdd; }
.subcategory-row, .subcategory-row button { color: #a6dfb2; }
.add-subcategory { color: #76d28e; }
.journal-sidebar .empty-small { color: #a8d5b1; }
.journal-cover .journal-kicker { color: #176b3a; font-weight: 700; }
.journal-cover p:not(.journal-kicker) { color: #514d42; }
</style>
