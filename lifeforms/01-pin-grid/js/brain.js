/**
 * brain.js
 * The AI's decision engine.
 *
 * Runs a short ~5-second AWAKENING boot sequence, then switches to
 * LISTENING mode where gestures are driven by the LLM via Chat.
 *
 * Public methods called by main.js:
 *   Brain.init()
 *   Brain.getHeightMap(now)     → Float32Array(900)
 *   Brain.setGestureFromLLM(name)
 *   Brain.onChatEnabled(fn)
 */

const Brain = (() => {

  // ── States ─────────────────────────────────────────────────────────────

  const STATES = {
    AWAKENING: 'AWAKENING',
    BREATHING: 'BREATHING',
    LISTENING: 'LISTENING',   // LLM chat active
  };

  let state          = STATES.AWAKENING;
  let currentGesture = 'flat';
  let gestureParams  = {};
  let startTime      = null;

  // LLM gesture override (set by main.js via setGestureFromLLM)
  let _llmGesture    = null;
  let _onChatEnabled = null;

  // ── Boot timeline ──────────────────────────────────────────────────────
  // Short 5-second AWAKENING sequence, then chat opens.

  const TIMELINE = [
    { at:  800, action: 'log',
      msg: '"What should I call myself?"', type: 'ai-thought' },

    { at: 1600, action: 'log',
      msg: 'Sensing physical substrate: 30×30 grid detected.', type: 'system' },

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
        currentGesture = ev.name;
        gestureParams  = ev.params || {};
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

  /**
   * Called every frame by main.js.
   * Returns Float32Array(900) for the current gesture.
   */
  function getHeightMap(now) {
    const elapsed = now - startTime;
    _processTimeline(elapsed);

    // In LISTENING state use the LLM-chosen gesture (fallback: breathe)
    const active = (state === STATES.LISTENING)
      ? (_llmGesture || 'breathe')
      : currentGesture;

    return Gestures.compute(active, elapsed, gestureParams);
  }

  // ── Uptime display ─────────────────────────────────────────────────────

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

  // ── LLM interface ──────────────────────────────────────────────────────

  function setGestureFromLLM(name) {
    if (!Gestures.library[name]) return;
    _llmGesture    = name;
    currentGesture = name;
    _setHUD('gesture-value', name.toUpperCase());
  }

  function onChatEnabled(fn) {
    _onChatEnabled = fn;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  return {
    init,
    getHeightMap,
    getUptimeString,
    getState:           () => state,
    getCurrentGesture:  () => _llmGesture || currentGesture,
    setGestureFromLLM,
    onChatEnabled,
  };

})();
