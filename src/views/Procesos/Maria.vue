<template>
  <main class="maria-page">
    <div class="maria-shell">
      <header class="page-header">
        <div><router-link to="/procesos">← Procesos</router-link><p class="eyebrow">REY PEZ · PERSONAL</p><h1>Maria<span> / Control laboral</span></h1><p>Asistencia, horarios reales e incidencias en un solo lugar.</p></div>
        <div class="actions"><button @click="tab = 'employees'">Empleados</button><button class="primary" :disabled="loading || !activeEmployees.length" @click="openRecord()">＋ Registrar jornada</button></div>
      </header>
      <p v-if="error" class="alert error" role="alert">{{ error }}</p><p v-if="notice" class="alert success" role="status">{{ notice }}</p>
      <nav class="tabs" aria-label="Secciones de Maria"><button :class="{selected: tab === 'records'}" @click="tab = 'records'">Jornadas y reportes</button><button :class="{selected: tab === 'employees'}" @click="tab = 'employees'">Personal y horarios</button></nav>
      <section v-if="tab === 'records'">
        <form class="filters panel" @submit.prevent="refreshRecords">
          <label>Desde<input v-model="from" type="date" required></label><label>Hasta<input v-model="to" type="date" required></label>
          <label>Empleado<select v-model="employeeFilter"><option value="">Todo el personal</option><option v-for="e in employees" :key="e.id" :value="e.id">{{ e.name }}</option></select></label>
          <label>Estado<select v-model="statusFilter"><option value="">Todos</option><option v-for="s in states" :key="s">{{ s }}</option><option>Pendiente de horario</option><option>Eliminados</option></select></label>
          <button :disabled="loading">{{ loading ? 'Cargando…' : 'Consultar' }}</button>
        </form>
        <div class="stats"><article><small>Jornadas presentes</small><strong>{{ summary.present }}</strong></article><article><small>Horas registradas</small><strong>{{ hours(summary.worked) }}</strong></article><article><small>Tiempo sobre lo asignado</small><strong>{{ hours(summary.extra) }}</strong></article><article><small>Horarios incompletos</small><strong>{{ summary.pending }}</strong></article></div>
        <section class="panel">
          <div class="section-heading"><div><h2>Registro de jornadas</h2><p>{{ loadedFrom }} al {{ loadedTo }} · {{ filteredRecords.length }} registros</p></div><div class="actions"><button :disabled="loading || !filteredRecords.length" @click="exportCsv">Exportar CSV</button><button :disabled="loading || !filteredRecords.length" @click="printReport">Imprimir / PDF</button></div></div>
          <p class="hint">Las horas trabajadas descuentan el descanso capturado. El tiempo sobre lo asignado es una diferencia informativa, sin cálculo de nómina.</p>
          <div class="table-scroll"><table><thead><tr><th>Fecha / empleado</th><th>Horario asignado</th><th>Entrada / salida real</th><th>Estado / incidencia</th><th>Tiempo trabajado</th><th>Capturó</th><th class="no-print">Acciones</th></tr></thead><tbody>
            <tr v-for="r in filteredRecords" :key="r.id"><td><strong>{{ r.date }}</strong><span>{{ r.employeeName }}</span><small>{{ r.area }}</small></td><td>{{ r.scheduledStart }} – {{ r.scheduledEnd }}{{ r.scheduledNextDay ? ' (+1 día)' : '' }}<small>Descanso: {{ r.scheduledBreak }} min</small></td><td>{{ r.actualStart || '—' }} – {{ r.actualEnd || '—' }}{{ r.actualNextDay ? ' (+1 día)' : '' }}<small v-if="r.status === 'Presente'">Descanso: {{ r.actualBreak }} min</small></td><td><span class="badge" :class="{pending: isPending(r)}">{{ r.deleted ? 'Eliminado' : r.status }}</span><small>{{ r.incident || 'Sin incidencia capturada' }}</small><small v-if="isPending(r)">Horario real pendiente</small></td><td>{{ r.status === 'Presente' ? hours(metrics(r).worked) : '—' }}<small v-if="metrics(r).late">Retardo: {{ metrics(r).late }} min</small><small v-if="metrics(r).extra">Sobre asignado: {{ hours(metrics(r).extra) }}</small></td><td>{{ r.updatedBy }}<small>{{ timestamp(r.updatedAt) }}</small></td><td class="no-print"><div class="actions"><button @click="openRecord(r)">{{ r.deleted ? 'Restaurar' : 'Editar' }}</button><button @click="showHistory(r)">Historial</button><button v-if="!r.deleted" class="danger" @click="openDelete(r)">Eliminar</button></div></td></tr>
            <tr v-if="!filteredRecords.length"><td colspan="7" class="empty">{{ loading ? 'Cargando jornadas…' : 'No hay registros en este periodo. Agrega personal y registra su primera jornada.' }}</td></tr>
          </tbody></table></div>
        </section>
      </section>
      <section v-else class="panel">
        <div class="section-heading"><div><h2>Personal y horario habitual</h2><p>El horario habitual se propone para nuevas jornadas. Los registros anteriores conservan su horario.</p></div><button class="primary" @click="openEmployee()">＋ Agregar empleado</button></div>
        <div class="employee-grid"><article v-for="e in employees" :key="e.id" class="employee-card"><span class="badge">{{ e.active ? 'Activo' : 'Inactivo' }}</span><h3>{{ e.name }}</h3><p>{{ e.area || 'Sin área asignada' }}</p><strong>{{ e.scheduledStart }} – {{ e.scheduledEnd }}{{ e.scheduledNextDay ? ' (+1 día)' : '' }}</strong><p>Descanso: {{ e.scheduledBreak }} min</p><button @click="openEmployee(e)">Editar empleado</button></article></div><p v-if="!employees.length" class="empty">Agrega tu primer empleado para comenzar.</p>
      </section>
      <p class="footer-note">Los cambios se confirman con conexión a internet y quedan asociados al usuario de la sesión. Horas expresadas en la hora local del centro de trabajo.</p>
    </div>
    <div v-if="modal" class="modal-backdrop" @click.self="closeModal" @keydown.esc="closeModal">
      <section class="maria-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="section-heading"><h2 id="modal-title">{{ modal === 'employee' ? (draft.id ? 'Editar empleado' : 'Nuevo empleado') : modal === 'history' ? 'Historial de cambios' : modal === 'delete' ? 'Eliminar jornada' : (draft.deleted ? 'Restaurar jornada' : draft.id ? 'Corregir jornada' : 'Registrar jornada') }}</h2><button aria-label="Cerrar" :disabled="saving" @click="closeModal">✕</button></div>
        <p v-if="modalError" class="alert error" role="alert">{{ modalError }}</p>
        <form v-if="modal === 'delete'" @submit.prevent="confirmDelete">
          <p>Vas a eliminar la jornada de <strong>{{ draft.employeeName }}</strong> del <strong>{{ draft.date }}</strong>.</p>
          <p>Dejará de aparecer en los reportes y totales. Su historial se conservará en la vista «Eliminados».</p>
          <label>Motivo de la eliminación<textarea v-model.trim="reason" required maxlength="500" rows="3" :disabled="saving"></textarea></label>
          <div class="modal-actions"><button type="button" :disabled="saving" @click="closeModal">Cancelar</button><button class="danger" :disabled="saving">{{ saving ? 'Eliminando…' : 'Confirmar eliminación' }}</button></div>
        </form>
        <form v-else-if="modal !== 'history'" @submit.prevent="save">
          <fieldset :disabled="saving">
            <template v-if="modal === 'employee'"><label>Nombre completo<input v-model.trim="draft.name" maxlength="120" required></label><label>Área / puesto<input v-model.trim="draft.area" maxlength="100"></label><label class="check"><input v-model="draft.active" type="checkbox"> Empleado activo</label><p class="hint">Desactivar conserva todas las jornadas e historial.</p></template>
            <template v-else><div class="form-grid"><label>Empleado<select v-model="draft.employeeId" :disabled="!!draft.id" required @change="applyEmployee"><option value="">Selecciona un empleado</option><option v-for="e in selectableEmployees" :key="e.id" :value="e.id">{{ e.name }}</option></select></label><label>Fecha de inicio<input v-model="draft.date" type="date" required :disabled="!!draft.id" :max="today"></label></div><label>Estado<select v-model="draft.status" @change="changeStatus"><option v-for="s in states" :key="s">{{ s }}</option></select></label></template>
            <h3>{{ modal === 'employee' ? 'Horario habitual' : 'Horario asignado a esta jornada' }}</h3>
            <div class="form-grid"><label>Inicio asignado<input v-model="draft.scheduledStart" type="time" required></label><label>Fin asignado<input v-model="draft.scheduledEnd" type="time" required></label><label>Descanso asignado (min)<input v-model.number="draft.scheduledBreak" type="number" min="0" max="1439" required></label></div><label class="check"><input v-model="draft.scheduledNextDay" type="checkbox"> El horario asignado termina al día siguiente</label>
            <template v-if="modal === 'record'"><template v-if="draft.status === 'Presente'"><h3>Horario real</h3><p class="hint">Captura las horas observadas. Puedes guardar la entrada y completar la salida más tarde.</p><div class="form-grid"><label>Entrada real<input v-model="draft.actualStart" type="time"></label><label>Salida real<input v-model="draft.actualEnd" type="time"></label><label>Descanso real (min)<input v-model.number="draft.actualBreak" type="number" min="0" max="1439" required></label></div><label class="check"><input v-model="draft.actualNextDay" type="checkbox"> La salida real fue al día siguiente</label></template><label>Incidencia / observaciones<textarea v-model.trim="draft.incident" rows="3" maxlength="1000" placeholder="Ej. permiso autorizado, motivo del retardo o salida anticipada"></textarea></label></template>
            <label v-if="draft.id">Motivo del cambio<textarea v-model.trim="reason" required maxlength="500" rows="2"></textarea></label>
            <div class="modal-actions"><button type="button" @click="closeModal">Cancelar</button><button class="primary">{{ saving ? 'Guardando…' : 'Guardar' }}</button></div>
          </fieldset>
        </form>
        <template v-else><p>{{ historyTitle }}</p><p v-if="historyLoading">Cargando historial…</p><article v-for="h in history" :key="h.id" class="history-item"><strong>{{ timestamp(h.changedAt) }} · {{ h.actor }}</strong><p>{{ h.reason }}</p><div v-for="change in changes(h)" :key="change.label" class="history-change"><b>{{ change.label }}:</b> {{ change.before }} → {{ change.after }}</div></article><p v-if="!historyLoading && !history.length">No hay cambios disponibles.</p></template>
      </section>
    </div>
  </main>
</template>

<script>
import { loadEmployees, loadRecords, saveEmployee, saveRecord, deleteRecord, loadHistory } from '@/services/mariaService';
import { STATES, totals, hours, csvCell } from '@/utils/maria/attendance.cjs';
function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
const schedule = () => ({ scheduledStart: '08:00', scheduledEnd: '17:00', scheduledNextDay: false, scheduledBreak: 60 });
export default {
  name: 'Maria',
  data() { const today = localDate(); return { today, from: today.slice(0,8)+'01', to: today, loadedFrom: '', loadedTo: '', employees: [], records: [], tab: 'records', employeeFilter: '', statusFilter: '', loading: false, saving: false, error: '', notice: '', modal: '', modalError: '', draft: {}, reason: '', states: STATES, history: [], historyTitle: '', historyLoading: false }; },
  computed: {
    activeEmployees() { return this.employees.filter(e => e.active); },
    selectableEmployees() { return this.employees.filter(e => e.active || e.id === this.draft.employeeId); },
    filteredRecords() { return this.records.filter(r => (this.statusFilter === 'Eliminados' ? r.deleted : !r.deleted) && (!this.employeeFilter || r.employeeId === this.employeeFilter) && (!this.statusFilter || this.statusFilter === 'Eliminados' || (this.statusFilter === 'Pendiente de horario' ? this.isPending(r) : r.status === this.statusFilter))); },
    summary() { return this.filteredRecords.reduce((s,r) => { if(!r.deleted && r.status === 'Presente') { const t = totals(r); s.present++; s.worked += t.worked || 0; s.extra += t.extra; if(this.isPending(r)) s.pending++; } return s; }, {present:0, worked:0, extra:0, pending:0}); }
  },
  async created() { await this.refreshAll(); },
  methods: {
    hours, metrics: totals,
    isPending(r) { return !r.deleted && r.status === 'Presente' && (!r.actualStart || !r.actualEnd); },
    timestamp(t) { return t && t.toDate ? t.toDate().toLocaleString('es-MX') : 'Sin fecha disponible'; },
    async refreshAll() { this.loading = true; this.error = ''; try { this.employees = await loadEmployees(); await this.refreshRecords(); } catch(e) { this.error = 'No se pudo cargar el personal. ' + e.message; } finally { this.loading = false; } },
    async refreshRecords() { if(!this.from || !this.to || this.from > this.to) { this.error = 'Selecciona un periodo válido.'; return; } this.loading = true; this.error = ''; const from = this.from, to = this.to; try { this.records = await loadRecords(from,to); this.loadedFrom = from; this.loadedTo = to; } catch(e) { this.error = 'No se pudo consultar el periodo. ' + e.message; } finally { this.loading = false; } },
    openEmployee(e) { this.draft = e ? {...e} : {name:'', area:'', active:true, ...schedule()}; this.openModal('employee'); },
    openRecord(r) { this.today = localDate(); this.draft = r ? {...r} : { employeeId:'', employeeName:'', area:'', date:this.today, status:'Presente', ...schedule(), actualStart:'', actualEnd:'', actualNextDay:false, actualBreak:0, incident:'' }; this.openModal('record'); },
    openDelete(r) { this.draft = {...r}; this.openModal('delete'); },
    async confirmDelete() {
      this.modalError = ''; this.notice = '';
      if(!navigator.onLine) { this.modalError = 'Necesitas conexión para confirmar la eliminación.'; return; }
      this.saving = true;
      try { await deleteRecord(this.draft,this.reason); this.modal = ''; this.notice = 'Jornada eliminada. Su historial permanece en la vista Eliminados.'; await this.refreshAll(); }
      catch(e) { this.modalError = e.message || 'No se pudo eliminar. Intenta nuevamente.'; }
      finally { this.saving = false; }
    },
    openModal(type) { this.modalError = ''; this.reason = ''; this.modal = type; },
    closeModal() { if(!this.saving) this.modal = ''; },
    applyEmployee() { const e = this.employees.find(e => e.id === this.draft.employeeId); if(e) Object.assign(this.draft, {employeeName:e.name, area:e.area, scheduledStart:e.scheduledStart, scheduledEnd:e.scheduledEnd, scheduledNextDay:e.scheduledNextDay, scheduledBreak:e.scheduledBreak}); },
    changeStatus() { if(this.draft.status !== 'Presente') Object.assign(this.draft, {actualStart:'', actualEnd:'', actualNextDay:false, actualBreak:0}); },
    async save() { this.modalError = ''; this.notice = ''; if(!navigator.onLine) { this.modalError = 'Necesitas conexión para confirmar el guardado. Tus datos siguen en este formulario.'; return; } this.saving = true; try { if(this.modal === 'employee') await saveEmployee(this.draft,this.reason); else { if(this.draft.date > localDate()) throw new Error('No puedes registrar asistencia futura.'); await saveRecord(this.draft,this.reason); } this.modal = ''; this.notice = 'Registro guardado con historial de cambios.'; await this.refreshAll(); } catch(e) { this.modalError = e.message || 'No se pudo guardar. Intenta nuevamente.'; } finally { this.saving = false; } },
    async showHistory(r) { this.openModal('history'); this.historyTitle = `${r.employeeName} · ${r.date}`; this.history = []; this.historyLoading = true; try { this.history = await loadHistory(r.id); } catch(e) { this.modalError = 'No se pudo consultar el historial. ' + e.message; } finally { this.historyLoading = false; } },
    changes(h) { const fields = {deleted:'Eliminado',status:'Estado',scheduledStart:'Inicio asignado',scheduledEnd:'Fin asignado',scheduledNextDay:'Fin asignado al día siguiente',scheduledBreak:'Descanso asignado',actualStart:'Entrada real',actualEnd:'Salida real',actualNextDay:'Salida al día siguiente',actualBreak:'Descanso real',incident:'Incidencia'}; const display = v => typeof v === 'boolean' ? (v ? 'Sí' : 'No') : (v === undefined || v === '' ? '—' : v); return Object.keys(fields).filter(k => !h.before || h.before[k] !== h.after[k]).map(k => ({label:fields[k],before:display(h.before && h.before[k]),after:display(h.after[k])})); },
    exportCsv() { const rows = [['Fecha','Empleado','Área','Estado','Inicio asignado','Fin asignado','Fin asignado al día siguiente','Descanso asignado (min)','Entrada real','Salida real','Salida al día siguiente','Descanso real (min)','Minutos trabajados','Minutos sobre asignado','Retardo (min)','Incidencia','Capturó','Última actualización']]; this.filteredRecords.forEach(r => { const t = totals(r); rows.push([r.date,r.employeeName,r.area,r.deleted ? 'Eliminado' : r.status,r.scheduledStart,r.scheduledEnd,r.scheduledNextDay?'Sí':'No',r.scheduledBreak,r.actualStart,r.actualEnd,r.actualNextDay?'Sí':'No',r.actualBreak,t.worked,t.extra,t.late,r.incident,r.updatedBy,this.timestamp(r.updatedAt)]); }); const url = URL.createObjectURL(new Blob(['\ufeff'+rows.map(row => row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'})); const a = document.createElement('a'); a.href=url; a.download=`Maria-asistencia-${this.loadedFrom}-${this.loadedTo}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); },
    printReport() { window.print(); }
  }
};
</script>

<style scoped>
.maria-page { min-height:100vh; padding:32px 24px; background:#f3f6f5; color:#172b2a; font-family:Arial,sans-serif; }
.maria-shell { max-width:1450px; margin:auto; }
.page-header,.section-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:22px; }
.page-header a { color:#176653; font-weight:700; text-decoration:none; }
.page-header a:hover { text-decoration:underline; }
.eyebrow { font-size:12px; font-weight:700; letter-spacing:2px; color:#397668; margin:24px 0 8px; }
h1 { color:#183e37; text-align:left; padding:0; border:0; font-size:38px; letter-spacing:-1px; margin:0 0 10px; }
h1 span { font-size:21px; color:#52706a; font-weight:400; }
h2 { color:#203e39; font-size:21px; margin:0 0 8px; }
h3 { color:#244b42; font-size:16px; margin:22px 0 12px; }
p { color:#4c625e; line-height:1.55; margin:8px 0; }
.actions,.tabs { display:flex; gap:9px; flex-wrap:wrap; }
button { border:1px solid #c4d2ce; border-radius:8px; background:#fff; color:#233d38; padding:10px 14px; font-size:14px; font-weight:600; cursor:pointer; transition:background .15s,border-color .15s; }
button:hover { background:#edf5f2; border-color:#438b77; }
button:disabled { opacity:.55; cursor:wait; }
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible { outline:3px solid #25856c; outline-offset:2px; }
.primary { background:#176653; border-color:#176653; color:#fff; }
.danger { background:#fff1f0; color:#8e2727; border-color:#dcaaa5; }
.danger:hover { background:#ffe0dc; border-color:#af4840; }
.primary:hover { background:#104f40; border-color:#104f40; }
.tabs { margin:26px 0 20px; border-bottom:1px solid #d2ddda; padding-bottom:12px; }
.tabs .selected { background:#e5f2ed; border-color:#36816d; color:#145b49; }
.panel { background:#fff; border:1px solid #d9e2df; border-radius:12px; padding:22px; margin-bottom:20px; box-shadow:0 2px 8px #193c3210; }
.filters { display:flex; gap:14px; align-items:flex-end; flex-wrap:wrap; }
label { display:flex; flex-direction:column; gap:7px; font-size:13px; font-weight:600; color:#304d47; margin-bottom:14px; }
.filters label { flex:1; min-width:145px; margin:0; }
input,select,textarea { width:100%; box-sizing:border-box; color:#203a35; background:#fff; border:1px solid #b9cbc5; border-radius:7px; padding:10px 11px; font:inherit; font-size:14px; color-scheme:light; }
input::placeholder,textarea::placeholder { color:#718580; }
textarea { resize:vertical; }
.stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:20px 0; }
.stats article { padding:19px 20px; background:#fff; border:1px solid #d9e2df; border-radius:12px; box-shadow:0 2px 8px #193c320a; }
.stats small { display:block; color:#536963; font-size:13px; font-weight:600; margin-bottom:10px; }
.stats strong { font-size:25px; color:#176653; }
.table-scroll { overflow-x:auto; border:1px solid #e0e8e5; border-radius:8px; }
table { width:100%; min-width:1000px; border-collapse:collapse; font-size:13px; }
th { text-align:left; color:#38564f; background:#edf3f1; font-size:12px; text-transform:uppercase; letter-spacing:.35px; padding:13px 11px; border-bottom:1px solid #d4dfdb; }
td { padding:15px 11px; border-bottom:1px solid #e3eae7; vertical-align:top; color:#213b35; }
tbody tr:nth-child(even) { background:#f8faf9; }
tbody tr:hover { background:#eef6f3; }
td span,td small { display:block; margin-top:6px; }
td small { color:#526963; line-height:1.5; }
.badge { display:inline-block; background:#e1f2e9; color:#15583e; padding:5px 9px; border-radius:20px; font-size:12px; font-weight:700; }
.badge.pending { background:#fff0cc; color:#704900; }
.hint,.footer-note { font-size:13px; color:#526963; }
.empty { padding:38px; text-align:center; }
.employee-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:16px; }
.employee-card { padding:20px; background:#fff; border:1px solid #d9e2df; border-radius:10px; }
.employee-card h3 { margin-top:14px; }
.employee-card button { margin-top:12px; }
.alert { padding:14px 16px; border-radius:8px; font-weight:600; }
.error { background:#ffeded; border:1px solid #eab8b8; color:#7f2525; }
.success { background:#e5f5eb; border:1px solid #b2d9bf; color:#205c35; }
/* Fondo sólido y panel opaco para que el texto del formulario no se mezcle con la página. */
.modal-backdrop { position:fixed; inset:0; background:#253631; opacity:1!important; z-index:2000; display:flex; align-items:center; justify-content:center; padding:18px; }
.maria-modal { background:#fff; color:#203a35; border:1px solid #bacbc5; border-radius:14px; padding:26px; width:700px; max-width:100%; max-height:90vh; overflow:auto; box-sizing:border-box; box-shadow:0 18px 50px #0d201a40; }
.maria-modal .section-heading { padding-bottom:14px; border-bottom:1px solid #e0e8e5; }
.maria-modal h2,.maria-modal h3 { color:#183e37; }
.maria-modal p,.maria-modal label { color:#405b54; }
.maria-modal .hint { color:#526963; }
.form-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.check { flex-direction:row; align-items:center; }
.check input { width:auto; accent-color:#176653; }
.modal-actions { display:flex; justify-content:flex-end; gap:12px; margin-top:24px; padding-top:16px; border-top:1px solid #e0e8e5; }
fieldset { border:0; padding:0; margin:0; min-width:0; }
.history-item { padding:18px 0; border-bottom:1px solid #dce6e2; }
.history-item strong,.history-change { color:#27473f; }
.history-change { font-size:13px; line-height:1.8; overflow-wrap:anywhere; }
@media(max-width:750px) {
  .maria-page { padding:20px 14px; }
  .page-header,.section-heading { align-items:flex-start; flex-direction:column; }
  .page-header .actions { width:100%; }
  .page-header .actions button { flex:1; }
  h1 { font-size:32px; }
  h1 span { display:block; margin-top:7px; font-size:19px; }
  .stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .stats article { padding:15px; }
  .stats strong { font-size:20px; }
  .form-grid { grid-template-columns:1fr; gap:0; }
  .panel { padding:16px; }
  .maria-modal { padding:20px; max-height:calc(100dvh - 24px); }
}
@media(max-width:390px) { .maria-page { padding:18px 10px; } .stats small { font-size:12px; } .stats strong { font-size:18px; } }
@media print {
  .maria-page { background:#fff!important; color:#111!important; padding:0; }
  .page-header .actions,.page-header a,.tabs,.filters,.no-print,.footer-note,.alert { display:none!important; }
  .section-heading .actions { display:none; }
  .panel,.stats article { border:1px solid #bbb; background:#fff; color:#111; box-shadow:none; }
  .stats strong,p,td small,th,h1 span { color:#333; }
  .table-scroll { overflow:visible; }
  table { min-width:0; font-size:9px; }
  td,th { padding:7px 4px; }
  .badge { background:#fff; color:#111; }
  tr { break-inside:avoid; }
  .modal-backdrop { display:none; }
}
</style>

<style>
@media print {
  body:has(.maria-page) #app > :not(.content-wrapper),
  body:has(.maria-page) .content-horizon-grid { display: none !important; }
  body:has(.maria-page) .content-wrapper { padding: 0 !important; margin: 0 !important; background: white !important; }
}
</style>
