/**
 * brain.js
 * The AI's decision engine.
 *
 * Boot: 5-second AWAKENING sequence, then LISTENING mode.
 *
 * Public interface:
 *   Brain.init()
 *   Brain.getHeightMap(now)          → Float32Array(3600)
 *   Brain.setGestureFromLLM(name)    — named gesture
 *   Brain.setParametricGesture(p)    — raw parameter object
 *   Brain.setDisplay(text)           — text / CLOCK / DATE / EMOJI:<name>
 *   Brain.setEmotion(name)           — emotion state
 *   Brain.saveGesture(name, params)  — persist a named custom gesture
 *   Brain.onChatEnabled(fn)
 */

const Brain = (() => {

  // ── States ─────────────────────────────────────────────────────────────

  const STATES = {
    AWAKENING: 'AWAKENING',
    BREATHING: 'BREATHING',
    LISTENING: 'LISTENING',
  };

  let state          = STATES.AWAKENING;
  let currentGesture = 'flat';
  let gestureParams  = {};
  let startTime      = null;

  let _llmGesture        = null;   // named gesture from LLM ('breathe', 'ripple', …)
  let _parametricParams  = null;   // parametric params object
  let _useParametric     = false;  // true = use parametric, false = use named
  let _onChatEnabled     = null;

  // ── Display state ──────────────────────────────────────────────────────

  let _displayBitmap  = null;   // Float32Array(3600) or null
  let _displayTimer   = null;
  let _lastHeightMap  = null;   // last computed heightmap (for snapshot)

  // ── Emotion state ──────────────────────────────────────────────────────

  let _emotionState = 'neutral';

  // ── Boot timeline ──────────────────────────────────────────────────────

  const TIMELINE = [
    { at:  800, action: 'log',
      msg: '"What should I call myself?"', type: 'ai-thought' },

    { at: 1600, action: 'log',
      msg: 'Sensing physical substrate: 60×60 grid detected.', type: 'system' },

    { at: 2400, action: 'log',
      msg: '"And what kind of presence do you want me to be?"', type: 'ai-thought' },

    { at: 3200, action: 'log',
      msg: 'Writing IDENTITY.md — all fields open.', type: 'system' },

    { at: 4000, action: 'gesture', name: 'breathe',
      msg: '"I want to breathe first."' },

    { at: 4500, action: 'state', state: STATES.BREATHING },

    { at: 5200, action: 'state', state: STATES.LISTENING },

    { at: 5500, action: 'enable_chat' },
  ];

  const _fired = new Set();

  // ── Timeline processing ────────────────────────────────────────────────

  function _processTimeline(elapsed) {
    for (let i = 0; i < TIMELINE.length; i++) {
      const ev = TIMELINE[i];
      if (_fired.has(i) || elapsed < ev.at) continue;
      _fired.add(i);
      _dispatch(ev);
    }
  }

  function _dispatch(ev) {
    switch (ev.action) {
      case 'log':
        Identity.writeLog(ev.msg, ev.type || 'system');
        break;

      case 'gesture':
        currentGesture  = ev.name;
        gestureParams   = ev.params || {};
        _useParametric  = false;
        if (ev.msg) Identity.writeLog(ev.msg, 'ai-thought');
        _setHUD('gesture-value', ev.name.toUpperCase());
        break;

      case 'state':
        state = ev.state;
        _setHUD('state-value', ev.state);
        Identity.writeLog(`State → ${ev.state}`, 'system');
        break;

      case 'enable_chat':
        Identity.writeLog('Chat interface online. Speak to FORM.', 'gesture-learned');
        if (_onChatEnabled) _onChatEnabled();
        break;
    }
  }

  function _setHUD(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── Height map ─────────────────────────────────────────────────────────

  function getHeightMap(now) {
    const elapsed = now - startTime;
    _processTimeline(elapsed);

    // Display takes priority over gesture
    if (_displayBitmap) { _lastHeightMap = _displayBitmap; return _displayBitmap; }

    let map;
    // In LISTENING state use the LLM-driven motion
    if (state === STATES.LISTENING) {
      if (_useParametric && _parametricParams) {
        map = Gestures.compute('parametric', elapsed, _parametricParams);
      } else {
        const name = _llmGesture || 'breathe';
        map = Gestures.compute(name, elapsed, gestureParams);
      }
    } else {
      map = Gestures.compute(currentGesture, elapsed, gestureParams);
    }

    _lastHeightMap = map;
    return map;
  }

  // ── Snapshot — ASCII art of current heightmap for LLM context ──────────

  function getSnapshot() {
    if (!_lastHeightMap) return null;
    // Find max for normalisation
    let max = 0;
    for (let i = 0; i < _lastHeightMap.length; i++) {
      if (_lastHeightMap[i] > max) max = _lastHeightMap[i];
    }
    if (max === 0) return null;

    const W = 20, H = 20;
    let out = '';
    for (let y = 0; y < H; y++) {
      let row = '';
      for (let x = 0; x < W; x++) {
        const gx  = Math.floor(x / W * CONFIG.GRID_COLS);
        const gy  = Math.floor(y / H * CONFIG.GRID_ROWS);
        const h   = _lastHeightMap[gy * CONFIG.GRID_COLS + gx] / max;
        row += String(Math.min(9, Math.floor(h * 10)));
      }
      out += row + '\n';
    }
    return out;
  }

  // ── Uptime ─────────────────────────────────────────────────────────────

  function getUptimeString(now) {
    const s  = Math.floor((now - startTime) / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  // ── Init ───────────────────────────────────────────────────────────────

  function init() {
    startTime = Date.now();
    Identity.init();
  }

  // ── LLM named gesture ──────────────────────────────────────────────────

  function setGestureFromLLM(name) {
    if (!Gestures.library[name]) return;
    _llmGesture    = name;
    currentGesture = name;
    _useParametric = false;
    _setHUD('gesture-value', name.toUpperCase());
  }

  // ── Parametric gesture ─────────────────────────────────────────────────

  function setParametricGesture(params) {
    _parametricParams = params;
    _useParametric    = true;
    _llmGesture       = null;
    const motionLabel = (params.motion || 'radial').toUpperCase();
    _setHUD('gesture-value', `~${motionLabel}`);
  }

  // ── Display (text / clock / emoji) ─────────────────────────────────────

  function setDisplay(text) {
    _clearDisplay();
    const upper = text.trim().toUpperCase();

    if (upper === 'CLOCK') {
      _startClock();
      return;
    }
    if (upper === 'DATE') {
      _startDate();
      return;
    }
    if (upper.startsWith('EMOJI:')) {
      const emojiName = upper.split(':')[1].trim().toLowerCase();
      _displayBitmap = Display.renderEmoji(emojiName);
      _scheduleDisplayClear(5000);
      return;
    }

    // Text: ≤3 chars shown all at once; longer = letter by letter
    const cleaned = text.trim().toUpperCase();
    if (cleaned.replace(/\s/g, '').length <= 8) {
      _displayBitmap = Display.renderWord(cleaned);
      _scheduleDisplayClear(5000);
    } else {
      _displayLetterByLetter(cleaned);
    }
  }

  function _startClock() {
    function tick() {
      _displayBitmap = Display.renderClock();
      _displayTimer  = setTimeout(tick, 1000);
    }
    tick();
  }

  function _startDate() {
    _displayBitmap = Display.renderDate();
    _scheduleDisplayClear(8000);
  }

  function _displayLetterByLetter(text) {
    const chars = text.split('').filter(c => c !== ' ' || true);
    let i = 0;

    function showNext() {
      // Skip spaces but count them as pause time
      while (i < chars.length && chars[i] === ' ') i++;
      if (i >= chars.length) {
        // All done — clear after a moment
        _displayTimer = setTimeout(() => { _displayBitmap = null; }, 1400);
        return;
      }
      _displayBitmap = Display.renderSingleLetter(chars[i]);
      i++;
      _displayTimer = setTimeout(showNext, 1400);
    }

    showNext();
  }

  function _scheduleDisplayClear(ms) {
    _displayTimer = setTimeout(() => { _displayBitmap = null; }, ms);
  }

  function _clearDisplay() {
    if (_displayTimer) { clearTimeout(_displayTimer); _displayTimer = null; }
    _displayBitmap = null;
  }

  // ── Emotion ────────────────────────────────────────────────────────────

  function setEmotion(name) {
    const VALID = ['neutral', 'excited', 'shy', 'proud', 'sad', 'happy', 'angry'];
    if (!VALID.includes(name)) return;
    _emotionState = name;
    Scene.setEmotion(name);
    _setHUD('state-value', state + (name !== 'neutral' ? ` / ${name.toUpperCase()}` : ''));
  }

  // ── Save custom gesture vocabulary ─────────────────────────────────────

  function saveGesture(name, params) {
    Identity.saveGesture(name, params);
    Identity.writeLog(`Gesture saved: "${name}"`, 'gesture-learned');
  }

  // ── Draw map — FORM draws a shape directly (20×20 grid upsampled) ───────

  function setDrawMap(grid20) {
    // grid20: array of 20 rows, each row an array of 20 values [0-1]
    const out = new Float32Array(CONFIG.TOTAL_PINS);
    const cols = CONFIG.GRID_COLS, rows = CONFIG.GRID_ROWS;

    for (let dy = 0; dy < rows; dy++) {
      for (let dx = 0; dx < cols; dx++) {
        const sx  = dx / (cols - 1) * 19;
        const sy  = dy / (rows - 1) * 19;
        const sx0 = Math.floor(sx), sy0 = Math.floor(sy);
        const sx1 = Math.min(sx0 + 1, 19), sy1 = Math.min(sy0 + 1, 19);
        const fx  = sx - sx0, fy = sy - sy0;
        const v00 = grid20[sy0][sx0], v10 = grid20[sy0][sx1];
        const v01 = grid20[sy1][sx0], v11 = grid20[sy1][sx1];
        out[dy * cols + dx] = v00*(1-fx)*(1-fy) + v10*fx*(1-fy) + v01*(1-fx)*fy + v11*fx*fy;
      }
    }

    _clearDisplay();
    _displayBitmap = out;
    _setHUD('gesture-value', 'DRAWN');
    // Auto-clear after 8 seconds so it returns to motion
    _scheduleDisplayClear(8000);
  }

  // ── Chat enabled callback ──────────────────────────────────────────────

  function onChatEnabled(fn) {
    _onChatEnabled = fn;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  return {
    init,
    getHeightMap,
    getSnapshot,
    getUptimeString,
    getState:              () => state,
    getCurrentGesture:     () => _llmGesture || currentGesture,
    getCurrentEmotion:     () => _emotionState,
    getCurrentParams:      () => _parametricParams,
    setGestureFromLLM,
    setParametricGesture,
    setDrawMap,
    setDisplay,
    setEmotion,
    saveGesture,
    onChatEnabled,
  };

})();
