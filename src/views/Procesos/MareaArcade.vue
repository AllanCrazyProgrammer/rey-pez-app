<template>
  <main ref="root" class="marea" :class="{ 'marea--playing': screen === 'play' }">
    <div class="marea-shell">
      <header class="marea-topbar">
        <router-link v-if="screen === 'home'" to="/procesos" class="marea-back">← Procesos</router-link>
        <button v-else class="marea-back" @click="leaveMode">← {{ screen === 'play' ? 'Salir' : 'Los juegos' }}</button>
        <span class="marea-brand"><span aria-hidden="true">≋</span> REY PEZ <b> / ARCADE</b></span>
        <button class="marea-sound" :aria-pressed="sound" :aria-label="sound ? 'Desactivar sonido' : 'Activar sonido'" @click="toggleSound">{{ sound ? '♪ Sonido' : '♪ Silencio' }}</button>
      </header>

      <template v-if="screen === 'home'">
        <section class="marea-hero">
          <div class="marea-hero-copy">
            <span class="marea-eyebrow"><span class="marea-dot"></span> UN DESCANSO BIEN GANADO</span>
            <h1>Marea <em>Arcade.</em></h1>
            <p>Mucho camarón.<br>Un gran equipo. <strong>Tu mejor jugada.</strong></p>
            <div class="marea-pills"><span>3 retos avanzados</span><span>75–90 segundos</span><span>Oleadas progresivas</span></div>
          </div>
          <div class="marea-hero-art" aria-hidden="true">
            <HarborScene class="marea-harbor" />
            <span class="marea-art-sun"></span><span class="marea-art-wave">≋</span>
            <ArcadeArt kind="worker" class="marea-hero-worker" />
            <ArcadeArt kind="basket" class="marea-hero-basket" />
            <span class="marea-stamp">HECHO EN<br><b>LA COSTA</b><br>✦ ✦ ✦</span>
          </div>
        </section>
        <div class="marea-section-title"><h2>Elige tu próxima aventura</h2><span>PARTIDAS CORTAS, BUENAS RACHAS</span></div>
        <section class="marea-modes" aria-label="Modos de juego">
          <button v-for="item in modes" :key="item.id" class="marea-mode" :class="'marea-mode--' + item.id" @click="chooseMode(item.id)">
            <div class="marea-mode-scene"><HarborScene class="marea-card-harbor" /><span class="marea-mode-number">{{ item.number }}</span><ArcadeArt :kind="item.icon" :color="item.id === 'equipo' ? '#c67b50' : '#2c8a78'" /><span class="marea-mode-duration">{{ item.duration }} s</span></div>
            <div class="marea-mode-copy"><span class="marea-eyebrow">{{ item.tag }}</span><h3>{{ item.title }}</h3><p>{{ item.description }}</p><div class="marea-mode-bottom"><span>Récord <b>{{ records[item.id] }}</b></span><span class="marea-play-link">Jugar <span aria-hidden="true">↗</span></span></div></div>
          </button>
        </section>
        <footer class="marea-home-footer"><span>✦ Hecho para disfrutar, a tu ritmo.</span><span>{{ storageAvailable ? 'Tus récords se guardan en este dispositivo.' : 'Récords disponibles durante esta sesión.' }}</span></footer>
      </template>

      <section v-else-if="screen === 'instructions'" class="marea-instructions">
        <span class="marea-eyebrow">MODO {{ mode.number }} · {{ mode.tag }}</span>
        <ArcadeArt :kind="mode.icon" class="marea-instruction-art" />
        <h1>{{ mode.title }}</h1><p class="marea-lead">{{ mode.description }}</p>
        <ol><li v-for="(step, index) in mode.steps" :key="index"><span>{{ index + 1 }}</span><p>{{ step }}</p></li></ol>
        <div class="marea-mission"><span>Reto de 3 estrellas</span><strong>{{ mode.goal }} puntos y sobrevivir {{ mode.duration }} segundos</strong></div>
        <button ref="startButton" class="marea-primary" @click="startGame">¡A jugar! <span aria-hidden="true">→</span></button>
        <p class="marea-small">Sin prisa para aprender. El reloj empieza cuando juegas.</p>
      </section>

      <section v-else-if="screen === 'play'" class="marea-game" :aria-label="mode.title">
        <div class="marea-game-title"><div><span class="marea-eyebrow">{{ mode.tag }}</span><h1>{{ mode.title }}</h1></div><button ref="pauseButton" class="marea-pause" aria-label="Pausar partida" @click="pauseGame">Ⅱ</button></div>
        <div class="marea-hud"><div><small>PUNTOS</small><strong>{{ view.score }}</strong></div><div :class="{ 'marea-urgent': view.remaining <= 10 }"><small>TIEMPO</small><strong>{{ view.remaining }}<span>s</span></strong></div><div><small>VIDAS</small><strong class="marea-hearts" :aria-label="view.lives + ' vidas'">{{ '♥'.repeat(view.lives) }}<span>{{ '♡'.repeat(3 - view.lives) }}</span></strong></div></div>
        <div class="marea-wave"><strong>OLEADA {{ view.level }}</strong><span>Racha {{ view.combo }} · ×{{ Math.min(3, 1 + Math.floor(view.combo / 5)) }}</span><span v-if="mode.id === 'atrapar'">Perdidos {{ view.lost }}/3</span></div>
        <div class="marea-time-track" role="progressbar" aria-label="Tiempo restante" :aria-valuenow="view.remaining" :aria-valuemax="mode.duration" aria-valuemin="0"><span :style="{ transform: `scaleX(${view.progress})` }"></span></div>
        <p class="marea-feedback" :class="{ 'marea-feedback--error': !view.goodEvent }" role="status">{{ view.feedback || (view.combo >= 5 ? '¡Buena racha! Sigue así.' : 'Cada camarón cuenta.') }}</p>

        <template v-if="mode.id === 'limpiar'">
          <div class="marea-clean-board" :class="{ 'is-clean': view.shrimp.clean }">
            <div class="marea-board-heading"><span>FRESCURA {{ Math.ceil(view.shrimp.freshness) }} s</span><span class="marea-size-chip">{{ sizes[view.shrimp.size] }}</span></div>
            <div class="marea-freshness"><i :style="{ transform: `scaleX(${Math.max(0, view.shrimp.freshness / view.shrimp.deadline)})` }"></i></div>
            <div class="marea-cut-sequence"><span v-for="(direction, index) in view.shrimp.sequence" :key="index" :class="{ done: view.shrimp.step > index, current: view.shrimp.step === index }">{{ view.shrimp.step > index ? '✓' : arrows[direction] }} <small>{{ index === 0 ? 'Cabeza' : 'Cáscara' }}</small></span></div>
            <button ref="shrimpButton" class="marea-shrimp" :class="{ 'is-dragging': dragging }" :style="dragStyle" :aria-label="view.shrimp.bad ? 'Camarón con manchas, descartar' : 'Camarón fresco, sigue las flechas'" @pointerdown="shrimpDown" @pointermove="shrimpMove" @pointerup="shrimpUp" @pointercancel="cancelDrag" @keydown.left.prevent="clean('left')" @keydown.right.prevent="clean('right')" @keydown.up.prevent="clean('up')">
              <ArcadeArt kind="shrimp" :bad="view.shrimp.bad" :clean="view.shrimp.clean" :style="{ width: [135, 165, 195][view.shrimp.size] + 'px' }" />
            </button>
            <span class="marea-board-instruction">{{ view.shrimp.clean ? '↓ Revisa las manchas y elige su tara' : 'Sigue la flecha iluminada · Un gesto por paso' }}</span>
          </div>
          <div class="marea-cut-controls"><button v-for="direction in ['left', 'up', 'right']" :key="direction" :disabled="view.shrimp.clean" :aria-label="'Cortar ' + directionNames[direction]" @click="clean(direction)">{{ arrows[direction] }}</button><button class="marea-discard" @click="discard">Descartar <small>con manchas</small></button></div>
          <div class="marea-baskets"><button v-for="(size, index) in sizes" :key="size" :data-basket="index" :aria-label="'Tara ' + size" @click="sort(index)"><ArcadeArt kind="basket" :color="colors[index]" /><strong>{{ size }}</strong></button></div>
        </template>

        <template v-else-if="mode.id === 'equipo'">
          <div class="marea-orders-heading"><h2>Pedidos en espera</h2><span>1. Elige una tara</span></div>
          <div class="marea-orders">
            <button v-for="order in view.orders" :key="order.id" class="marea-order" :class="{ 'is-selected': view.selected === order.id, 'is-urgent': order.remaining < 5 }" :aria-pressed="view.selected === order.id" :aria-label="`Pedido ${order.id}, ${sizes[order.size]}`" @click="select(order.id)">
              <span>#{{ order.id }} {{ order.urgent ? '⚡' : '' }} · {{ order.quantity }} taras</span><ArcadeArt kind="basket" :color="colors[order.size]" /><strong>{{ sizes[order.size] }}</strong><small>{{ Math.ceil(order.remaining) }} s{{ order.urgent ? ' · urgente' : '' }}</small><span class="marea-order-timer"><i :style="{ transform: `scaleX(${order.remaining / order.deadline})` }"></i></span>
            </button>
            <div v-if="!view.orders.length" class="marea-orders-empty">¡Todo en marcha! Vienen más pedidos…</div>
          </div>
          <div class="marea-orders-heading"><h2>Tu cuadrilla</h2><span>2. Asigna a alguien libre</span></div>
          <div class="marea-workers"><div v-for="(worker, index) in view.workers" :key="worker.name" class="marea-worker-station"><button class="marea-worker" :class="{ 'is-ready': worker.job && !worker.job.work, 'is-working': worker.job && worker.job.work > 0 }" :disabled="!!worker.resting || !!(worker.job && worker.job.work > 0)" :aria-label="worker.job && !worker.job.work ? `Entregar pedido de ${worker.name}` : `Asignar a ${worker.name}, especialidad ${sizes[worker.size]}`" @click="worker.job ? deliver(index) : assign(index)"><ArcadeArt kind="worker" :color="colors[index]" /><strong>{{ worker.name }}</strong><small>{{ sizes[worker.size] }} · Energía {{ Math.round(worker.energy) }}%</small><span class="marea-worker-status">{{ worker.resting ? 'Descanso · ' + Math.ceil(worker.resting) + ' s' : worker.job ? worker.job.work ? 'Trabajando · ' + Math.ceil(worker.job.work) + ' s' : '¡Entregar! · ' + Math.ceil(worker.job.remaining) + ' s' : 'Asignar →' }}</span><span class="marea-work-track"><i :style="{ transform: `scaleX(${worker.job ? 1 - worker.job.work / worker.job.duration : worker.energy / 100})` }"></i></span></button><button class="marea-rest" :disabled="!!worker.job || !!worker.resting || worker.energy >= 100" :aria-label="'Descansar ' + worker.name" @click="rest(index)">Descansar ↻</button></div></div>
          <p class="marea-small">3. Toca Entregar al terminar. El pedido aún puede vencer.</p>
        </template>

        <template v-else>
          <div class="marea-catch-wrap"><canvas ref="catchCanvas" class="marea-catch" width="360" height="360" tabindex="0" role="img" aria-label="Atrapa camarones y evita las piedras. Arrastra la tara o usa las flechas izquierda y derecha." @pointerdown="catchDown" @pointermove="catchMove" @pointerup="catchUp" @pointercancel="catchUp" @keydown="catchKey($event, true)" @keyup="catchKey($event, false)" @blur="clearKeys"></canvas></div>
          <div class="marea-powerups"><span :class="{ active: view.shield }">⬡ {{ view.shield ? 'Escudo activo' : 'Escudo azul' }}</span><span :class="{ active: view.frozen }">❄ {{ view.frozen ? 'Hielo ' + view.frozen + ' s' : 'Hielo: ralentiza' }}</span></div>
          <div class="marea-catch-controls"><button aria-label="Mover tara a la izquierda" @pointerdown.prevent="holdDirection($event, -1)" @pointerup="releaseDirection" @pointercancel="releaseDirection" @lostpointercapture="clearKeys" @click="nudge($event, -1)">←</button><span><b>{{ view.current < 0 ? '← Corriente' : 'Corriente →' }}</b><small>Dorado ×3 · Evita piedras</small></span><button aria-label="Mover tara a la derecha" @pointerdown.prevent="holdDirection($event, 1)" @pointerup="releaseDirection" @pointercancel="releaseDirection" @lostpointercapture="clearKeys" @click="nudge($event, 1)">→</button></div>
        </template>
        <div class="marea-game-footer"><span>Reto: {{ mode.goal }} pts</span><span>Récord: {{ records[mode.id] }}</span></div>

        <div v-if="paused" class="marea-overlay" @keydown.tab="trapFocus">
          <section ref="pauseDialog" class="marea-dialog" role="dialog" aria-modal="true" aria-labelledby="marea-pause-title"><span class="marea-eyebrow">TOMA AIRE</span><h2 id="marea-pause-title">La marea espera.</h2><p>Tu partida está en pausa.<br>Todo sigue donde lo dejaste.</p><button ref="resumeButton" class="marea-primary" @click="resumeGame">Seguir jugando →</button><button class="marea-secondary" @click="goHome">Salir al menú de juegos</button></section>
        </div>
      </section>

      <section v-else-if="screen === 'result'" class="marea-result">
        <span class="marea-eyebrow">{{ mode.title }} · {{ resultReason === 'vidas' ? 'FIN DE LA JORNADA' : 'TIEMPO CUMPLIDO' }}</span>
        <div class="marea-result-stars" :aria-label="stars + ' de 3 estrellas'"><span v-for="n in 3" :key="n" :class="{ 'is-earned': n <= stars }">★</span></div>
        <h1>{{ won ? '¡Qué buena jornada!' : '¡Cada vez mejor!' }}</h1>
        <p>{{ won ? 'Reto cumplido. Tu cuadrilla se luce.' : resultReason === 'vidas' ? 'Se acabaron las vidas. Completa la jornada para ganar las tres estrellas.' : 'Jornada completa. Supera el objetivo para ganar las tres estrellas.' }}</p>
        <div class="marea-result-score"><strong>{{ view.score }}</strong><span>PUNTOS</span><b v-if="newRecord">✦ NUEVO RÉCORD</b></div>
        <div class="marea-result-stats"><div><b>{{ view.completed }}</b><span>{{ mode.id === 'equipo' ? 'Pedidos listos' : 'Camarones' }}</span></div><div><b>{{ view.bestCombo }}</b><span>Mejor racha</span></div><div><b>{{ records[mode.id] }}</b><span>Tu récord</span></div></div>
        <p class="marea-small">{{ storageAvailable ? 'Récord guardado en este dispositivo.' : 'No se pudo guardar el récord; se conserva durante esta sesión.' }}</p>
        <button ref="replayButton" class="marea-primary" @click="startGame">Otra partida ↻</button><button class="marea-secondary" @click="goHome">Elegir otro juego</button>
      </section>
    </div>
  </main>
</template>

<script>
import ArcadeArt from '@/games/marea/ArcadeArt.vue';
import HarborScene from '@/games/marea/HarborScene.vue';
import { MODES, SIZES, STORAGE_KEY, createGame, cleanShrimp, discardShrimp, sortShrimp, selectOrder, assignOrder, deliverOrder, restWorker, moveBasket, stepGame, snapshot, loadRecords } from '@/games/marea/engine';
import { drawCatch } from '@/games/marea/canvas';
import './marea-arcade.css';

export default {
  name: 'MareaArcade', components: { ArcadeArt, HarborScene },
  data: () => ({ modes: MODES, sizes: SIZES, colors: ['#2c8a78', '#c78051', '#6f81b5'], screen: 'home', modeId: 'limpiar',
    paused: false, sound: false, records: { limpiar: 0, equipo: 0, atrapar: 0 }, storageAvailable: true,
    view: {}, newRecord: false, resultReason: '', dragging: false, dragX: 0, dragY: 0,
    arrows: { left: '←', right: '→', up: '↑' }, directionNames: { left: 'izquierda', right: 'derecha', up: 'arriba' } }),
  computed: {
    mode() { return this.modes.find(item => item.id === this.modeId); },
    won() { return this.resultReason === 'tiempo' && this.view.score >= this.mode.goal; },
    stars() { return this.won ? 3 : this.view.score >= this.mode.goal / 2 ? 2 : this.view.score > 0 ? 1 : 0; },
    dragStyle() { return this.dragging ? { transform: `translate(${this.dragX}px, ${this.dragY}px)` } : {}; }
  },
  mounted() {
    try { this.records = loadRecords(window.localStorage); } catch (_) { this.storageAvailable = false; }
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('blur', this.pauseGame);
    window.addEventListener('keydown', this.onEscape);
  },
  beforeRouteLeave(to, from, next) { this.stopLoop(); next(); },
  beforeDestroy() {
    this.stopLoop(); document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('blur', this.pauseGame); window.removeEventListener('keydown', this.onEscape);
    if (this._audio) this._audio.close().catch(() => {});
  },
  methods: {
    chooseMode(id) { this.modeId = id; this.screen = 'instructions'; this.scrollTop('startButton'); },
    scrollTop(ref) { this.$nextTick(() => { this.$refs.root.scrollIntoView({ block: 'start' }); if (ref && this.$refs[ref]) this.$refs[ref].focus({ preventScroll: true }); }); },
    startGame() {
      this.stopLoop(); this._game = createGame(this.modeId); this.view = snapshot(this._game);
      this.screen = 'play'; this.paused = false; this.newRecord = false; this._lastEvent = 0;
      this._lastTime = 0; this._lastPaint = 0; this.cancelDrag(); this.unlockAudio();
      this.$nextTick(() => { this.scrollTop(this.modeId === 'atrapar' ? 'catchCanvas' : this.modeId === 'limpiar' ? 'shrimpButton' : 'pauseButton'); this._frame = requestAnimationFrame(this.tick); });
    },
    tick(time) {
      if (this.screen !== 'play' || this.paused) return;
      const dt = this._lastTime ? (time - this._lastTime) / 1000 : 0;
      this._lastTime = time;
      // Pause instead of surprising the player after a suspended browser frame.
      if (dt > 0.5) { this.pauseGame(); return; }
      if (this._direction) moveBasket(this._game, this._game.basket + this._direction * dt * 0.8);
      stepGame(this._game, dt);
      if (this.modeId === 'atrapar') drawCatch(this.$refs.catchCanvas, this._game);
      if (time - this._lastPaint > 90 || this._game.done) { this.refresh(); this._lastPaint = time; }
      if (this.screen === 'play' && !this.paused) this._frame = requestAnimationFrame(this.tick);
    },
    refresh() {
      this.view = snapshot(this._game);
      if (this._lastEvent !== this._game.event) { this._lastEvent = this._game.event; this.tone(this._game.goodEvent); }
      if (this._game.done) this.finish();
    },
    active() { return this.screen === 'play' && !this.paused && this._game && !this._game.done; },
    finish() {
      this.stopLoop(); this.resultReason = this._game.reason; this.newRecord = this.view.score > this.records[this.modeId];
      if (this.newRecord) this.$set(this.records, this.modeId, this.view.score);
      try {
        const saved = loadRecords(window.localStorage);
        for (const mode of this.modes) this.$set(this.records, mode.id, Math.max(saved[mode.id], this.records[mode.id]));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records)); this.storageAvailable = true;
      } catch (_) { this.storageAvailable = false; }
      this.screen = 'result'; this.cancelDrag(); this.scrollTop('replayButton');
    },
    stopLoop() { if (this._frame) cancelAnimationFrame(this._frame); this._frame = null; this.clearKeys(); },
    pauseGame() { if (!this.active()) return; this.paused = true; this.stopLoop(); this.cancelDrag(); this.$nextTick(() => this.$refs.resumeButton && this.$refs.resumeButton.focus()); },
    resumeGame() { if (!this.paused || this.screen !== 'play') return; this.paused = false; this._lastTime = 0; this.unlockAudio(); this.$nextTick(() => { const target = this.$refs.catchCanvas || this.$refs.shrimpButton || this.$refs.pauseButton; if (target) target.focus({ preventScroll: true }); this._frame = requestAnimationFrame(this.tick); }); },
    onVisibility() { if (document.hidden) this.pauseGame(); },
    onEscape(event) { if (event.key === 'Escape' && this.screen === 'play') { event.preventDefault(); if (this.paused) this.resumeGame(); else this.pauseGame(); } },
    leaveMode() { if (this.screen === 'play') this.pauseGame(); else this.goHome(); },
    goHome() { this.stopLoop(); this.paused = false; this.screen = 'home'; this._game = null; this.cancelDrag(); this.scrollTop(); },
    trapFocus(event) {
      const buttons = this.$refs.pauseDialog.querySelectorAll('button');
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
    },
    clean(direction) { if (this.active()) { cleanShrimp(this._game, direction); this.refresh(); } },
    discard() { if (this.active()) { discardShrimp(this._game); this.refresh(); } },
    deliver(index) { if (this.active()) { deliverOrder(this._game, index); this.refresh(); } },
    rest(index) { if (this.active()) { restWorker(this._game, index); this.refresh(); } },
    sort(index) { if (this.active()) { sortShrimp(this._game, index); this.refresh(); } },
    select(id) { if (this.active()) { selectOrder(this._game, id); this.refresh(); } },
    assign(index) { if (this.active()) { assignOrder(this._game, index); this.refresh(); } },
    shrimpDown(event) {
      if (!this.active() || event.isPrimary === false || event.button > 0) return;
      this._gesture = { x: event.clientX, y: event.clientY, clean: this._game.shrimp.clean, shrimpId: this._game.shrimp.id, handled: false, id: event.pointerId };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    shrimpMove(event) {
      if (!this._gesture || event.pointerId !== this._gesture.id || !this.active()) return;
      const dx = event.clientX - this._gesture.x, dy = event.clientY - this._gesture.y;
      if (this._gesture.clean) { this.dragging = true; this.dragX = dx; this.dragY = dy; }
      else if (!this._gesture.handled && Math.hypot(dx, dy) > 28 && this._gesture.shrimpId === this._game.shrimp.id) {
        this._gesture.handled = true;
        this.clean(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');
      }
    },
    shrimpUp(event) {
      if (!this._gesture || event.pointerId !== this._gesture.id) return;
      if (this._gesture.clean) {
        const basket = Array.from(this.$refs.root.querySelectorAll('[data-basket]')).find(element => {
          const rect = element.getBoundingClientRect();
          return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        });
        if (basket && this._gesture.shrimpId === this._game.shrimp.id) this.sort(Number(basket.dataset.basket));
      }
      this.cancelDrag();
    },
    cancelDrag() { this._gesture = null; this.dragging = false; this.dragX = 0; this.dragY = 0; },
    catchDown(event) { if (!this.active() || event.isPrimary === false) return; this._catchPointer = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); this.catchMove(event); },
    catchMove(event) { if (!this.active() || this._catchPointer !== event.pointerId) return; const rect = event.currentTarget.getBoundingClientRect(); moveBasket(this._game, (event.clientX - rect.left) / rect.width); },
    catchUp() { this._catchPointer = null; },
    catchKey(event, down) { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); this._direction = down && this.active() ? (event.key === 'ArrowLeft' ? -1 : 1) : 0; },
    clearKeys() { this._direction = 0; this._catchPointer = null; },
    holdDirection(event, direction) { if (!this.active()) return; event.currentTarget.setPointerCapture(event.pointerId); this._direction = direction; moveBasket(this._game, this._game.basket + direction * 0.04); },
    releaseDirection() { this._direction = 0; },
    nudge(event, direction) { if (event.detail === 0 && this.active()) moveBasket(this._game, this._game.basket + direction * 0.1); },
    toggleSound() { this.sound = !this.sound; if (this.sound) { this.unlockAudio(); this.tone(true); } },
    unlockAudio() {
      if (!this.sound) return;
      try { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return; if (!this._audio) this._audio = new Audio(); if (this._audio.state === 'suspended') this._audio.resume().catch(() => {}); } catch (_) { /* Sound is optional. */ }
    },
    tone(good) {
      if (!this.sound || !this._audio || this._audio.state !== 'running') return;
      const ctx = this._audio, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(good ? 620 : 180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(good ? 880 : 100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.045, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.14);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
  }
};
</script>
