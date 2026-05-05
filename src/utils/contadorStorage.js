const STORAGE_KEY = 'reypez_descargas_v1';
const DAYS_KEY = 'reypez_descargas_days_v1';
const MAX_LOG = 500;

// ── Camioneta (session inside a day) ─────────────────────────────────────────

export function createNewCamioneta() {
  return {
    id: 'cam' + Date.now(),
    plate: '',
    provider: '',
    startedAt: Date.now(),
    categories: [],   // no predefined tallas
    activeId: null,
    log: [],
    stibaHistory: {}
  };
}

export function sanitizeCamioneta(raw) {
  const cats = Array.isArray(raw.categories)
    ? raw.categories.map(c => ({ id: c.id, name: String(c.name || ''), count: Number(c.count) || 0 }))
    : [];
  const activeId = raw.activeId && cats.find(c => c.id === raw.activeId)
    ? raw.activeId
    : (cats[0] ? cats[0].id : null);
  return {
    id: raw.id || ('cam' + Date.now()),
    plate: raw.plate || '',
    provider: raw.provider || '',
    startedAt: raw.startedAt || Date.now(),
    categories: cats,
    activeId,
    log: Array.isArray(raw.log) ? raw.log : [],
    stibaHistory: (raw.stibaHistory && typeof raw.stibaHistory === 'object') ? raw.stibaHistory : {}
  };
}

// ── Day ───────────────────────────────────────────────────────────────────────

export function createNewDay() {
  return { id: 'd' + Date.now(), date: new Date().toISOString().split('T')[0], camionetas: [] };
}

function sanitizeDay(raw) {
  // Backward compat: old format had `state` instead of `camionetas`
  if (raw.state && !raw.camionetas) {
    return {
      id: raw.id,
      date: raw.date,
      camionetas: [sanitizeCamioneta({ ...raw.state, id: 'cam_migrated_' + raw.id })]
    };
  }
  return {
    id: raw.id,
    date: raw.date,
    camionetas: Array.isArray(raw.camionetas) ? raw.camionetas.map(sanitizeCamioneta) : []
  };
}

// ── Persistence ───────────────────────────────────────────────────────────────

export function loadDays() {
  try {
    const raw = localStorage.getItem(DAYS_KEY);
    console.log('[loadDays] key:', DAYS_KEY, '| raw length:', raw ? raw.length : 0);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const result = parsed.map(sanitizeDay);
        console.log('[loadDays] OK —', result.length, 'días cargados');
        return result;
      }
      console.warn('[loadDays] parsed is not an array:', typeof parsed);
    }
    console.log('[loadDays] sin datos — intentando migración legacy');
    return migrateLegacy();
  } catch (e) {
    console.error('[loadDays] ERROR:', e);
    return [];
  }
}

export function saveDays(days) {
  try {
    const json = JSON.stringify(days);
    localStorage.setItem(DAYS_KEY, json);
    const verify = localStorage.getItem(DAYS_KEY);
    if (verify === json) {
      console.log('[saveDays] OK —', days.length, 'días guardados, bytes:', json.length);
    } else {
      console.error('[saveDays] VERIFICACIÓN FALLIDA — localStorage no coincide');
    }
  } catch (e) {
    console.error('[saveDays] ERROR:', e);
  }
}

export function getDaysKey() { return DAYS_KEY; }

function migrateLegacy() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed) return [];
    const total = Array.isArray(parsed.categories)
      ? parsed.categories.reduce((s, c) => s + (Number(c.count) || 0), 0)
      : 0;
    if (total === 0 && !parsed.plate && !parsed.provider) return [];
    const dateISO = parsed.startedAt
      ? new Date(parsed.startedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const days = [{
      id: 'd_legacy_' + Date.now(),
      date: dateISO,
      camionetas: [sanitizeCamioneta({ ...parsed, id: 'cam_legacy' })]
    }];
    saveDays(days);
    return days;
  } catch (e) {
    return [];
  }
}

// ── Legacy single-session (kept so old imports don't break) ───────────────────

export function loadState() { return sanitizeCamioneta({}); }
export function saveState() {}
export function initFresh() { return sanitizeCamioneta({}); }

export { MAX_LOG };
