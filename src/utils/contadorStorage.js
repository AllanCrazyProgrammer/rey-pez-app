const STORAGE_KEY = 'reypez_descargas_v1';
const DEFAULT_CATS = ['U-15', '16/20', '21/25', '26/30', '31/40'];
const MAX_LOG = 500;

function buildFreshState() {
  const now = Date.now();
  return {
    plate: '',
    provider: '',
    startedAt: null,
    categories: DEFAULT_CATS.map((name, i) => ({
      id: 'c' + now + '_' + i,
      name,
      count: 0
    })),
    activeId: null,
    log: [],
    stibaHistory: {}
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initFresh();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      return initFresh();
    }
    parsed.log = Array.isArray(parsed.log) ? parsed.log : [];
    parsed.stibaHistory = parsed.stibaHistory && typeof parsed.stibaHistory === 'object'
      ? parsed.stibaHistory
      : {};
    parsed.plate = parsed.plate || '';
    parsed.provider = parsed.provider || '';
    parsed.startedAt = parsed.startedAt || null;
    if (!parsed.activeId || !parsed.categories.find(c => c.id === parsed.activeId)) {
      parsed.activeId = parsed.categories[0].id;
    }
    parsed.categories = parsed.categories.map(c => ({
      id: c.id,
      name: String(c.name || ''),
      count: Number(c.count) || 0
    }));
    return parsed;
  } catch (e) {
    console.error('contadorStorage.loadState parse error:', e);
    return initFresh();
  }
}

export function saveState(state) {
  try {
    if (state && Array.isArray(state.log) && state.log.length > MAX_LOG) {
      state.log.length = MAX_LOG;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('contadorStorage.saveState error:', e);
  }
}

export function initFresh() {
  const state = buildFreshState();
  state.activeId = state.categories[0].id;
  saveState(state);
  return state;
}

export { STORAGE_KEY, DEFAULT_CATS, MAX_LOG };
