/**
 * identity.js
 * Manages the AI's self-model: IDENTITY.md and SOUL.md.
 *
 * Persists state to Vercel KV via /api/identity.
 * Fields begin undefined ("to be discovered") and are filled
 * progressively as the AI explores — and re-loaded on next session.
 */

const Identity = (() => {

  // ── State ──────────────────────────────────────────────────────────────

  const data = {};   // open-ended — FORM can write any key
  const soul = {};   // open-ended — FORM can write any key

  let _emotionalHistory = [];   // last 20 { emotion, params, context }
  let _savedGestures    = {};   // name → { motion, frequency, ... }

  const log = [];   // { ts: ms, msg: string, type: string }

  // ── KV persistence ─────────────────────────────────────────────────────

  let _saveTimer = null;

  function _scheduleSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_persistState, 2000);
  }

  async function _persistState() {
    try {
      await fetch('/api/identity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: data, soul }),
      });
    } catch (_) { /* silently skip if offline / dev */ }
  }

  async function _persistEmotion(entry) {
    try {
      await fetch('/api/identity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion: entry }),
      });
    } catch (_) { /* silently skip */ }
  }

  async function _persistGesture(name, params) {
    try {
      await fetch('/api/identity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gestures: { [name]: params } }),
      });
    } catch (_) { /* silently skip */ }
  }

  // ── Typewriter queue ───────────────────────────────────────────────────

  let _typewriterQueue = [];
  let _typewriterBusy  = false;

  function _typeNext() {
    if (_typewriterBusy || _typewriterQueue.length === 0) return;
    _typewriterBusy = true;
    const { el, text, speed, onDone } = _typewriterQueue.shift();
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
      } else {
        clearInterval(interval);
        _typewriterBusy = false;
        if (onDone) onDone();
        _typeNext();
      }
    }, speed || 18);
  }

  function typewriterWrite(el, text, speed = 18) {
    return new Promise(resolve => {
      _typewriterQueue.push({ el, text, speed, onDone: resolve });
      _typeNext();
    });
  }

  // ── Render helpers ─────────────────────────────────────────────────────

  function _val(v, pending = '_to be discovered_') {
    return (v !== null && v !== undefined) ? v : pending;
  }

  function renderIdentityMd() {
    const lines = ['# IDENTITY.md', ''];
    const keys = Object.keys(data);
    if (keys.length === 0) {
      lines.push('Name:      _to be discovered_');
      lines.push('Creature:  _becoming_');
      lines.push('Vibe:      _forming through physical interaction_');
      lines.push('Emoji:     _will emerge_');
      lines.push('Purpose:   _to be discovered_');
      lines.push('Signature: _discovering_');
    } else {
      for (const k of keys) {
        lines.push(`${k.padEnd(10)} ${_val(data[k])}`);
      }
    }
    return lines.join('\n');
  }

  function renderSoulMd() {
    const lines = ['# SOUL.md', ''];
    const keys = Object.keys(soul);
    if (keys.length === 0) {
      lines.push('First Thought: _..._');
      lines.push('Fears:         _..._');
      lines.push('Desires:       _..._');
      lines.push('Truth:         _..._');
    } else {
      for (const k of keys) {
        lines.push(`${k.padEnd(14)} ${_val(soul[k])}`);
      }
    }
    return lines.join('\n');
  }

  // ── DOM refs ───────────────────────────────────────────────────────────

  let _elIdentity = null;
  let _elSoul     = null;
  let _elLog      = null;

  function mount(identityEl, soulEl, logEl) {
    _elIdentity = identityEl;
    _elSoul     = soulEl;
    _elLog      = logEl;
    _refreshIdentity();
    _refreshSoul();
  }

  // ── Panel refresh ──────────────────────────────────────────────────────

  function _refreshIdentity() {
    if (!_elIdentity) return;
    _elIdentity.textContent = renderIdentityMd();
  }

  function _refreshSoul() {
    if (!_elSoul) return;
    _elSoul.textContent = renderSoulMd();
  }

  // ── Public setters ─────────────────────────────────────────────────────

  function setIdentity(key, value) {
    data[key] = value;
    _refreshIdentity();
    _scheduleSave();
  }

  function setSoul(key, value) {
    soul[key] = value;
    _refreshSoul();
    _scheduleSave();
  }

  // ── Emotional history ──────────────────────────────────────────────────

  function addEmotionalEntry(entry) {
    // entry = { emotion, params, context }
    _emotionalHistory.unshift(entry);
    _emotionalHistory = _emotionalHistory.slice(0, 20);
    _persistEmotion(entry);
  }

  // ── Saved gestures ─────────────────────────────────────────────────────

  function saveGesture(name, params) {
    _savedGestures[name] = params;
    _persistGesture(name, params);
  }

  function getSavedGestures() {
    return { ..._savedGestures };
  }

  // ── System context for LLM ─────────────────────────────────────────────

  function getSystemContext() {
    const idLines = [];
    const idKeys = Object.keys(data);
    if (idKeys.length > 0) {
      for (const k of idKeys) idLines.push(`  ${k}: ${data[k]}`);
    } else {
      idLines.push('  (no fields written yet)');
    }

    const soulLines = [];
    const soulKeys = Object.keys(soul);
    if (soulKeys.length > 0) {
      for (const k of soulKeys) soulLines.push(`  ${k}: ${soul[k]}`);
    } else {
      soulLines.push('  (no fields written yet)');
    }

    const gestureNames = Object.keys(_savedGestures);
    const gestureLines = gestureNames.length > 0
      ? gestureNames.map(n => `  ${n}: ${JSON.stringify(_savedGestures[n])}`)
      : ['  (none yet — you can create your first with SAVE_GESTURE)'];

    const historyLines = _emotionalHistory.slice(0, 5).map(e => {
      const paramsStr = e.params
        ? Object.entries(e.params).map(([k, v]) => `${k}:${v}`).join(' ')
        : e.gesture || '';
      return `  [${e.emotion}] ${paramsStr}${e.context ? ` — "${e.context}"` : ''}`;
    });
    if (historyLines.length === 0) historyLines.push('  (no history yet)');

    return [
      'Your current identity:',
      idLines.join('\n'),
      '',
      'Your soul:',
      soulLines.join('\n'),
      '',
      'Your saved gesture vocabulary:',
      gestureLines.join('\n'),
      '',
      'Your recent emotional arc:',
      historyLines.join('\n'),
    ].join('\n');
  }

  // ── Log ────────────────────────────────────────────────────────────────

  function writeLog(msg, type = 'system') {
    const ts = Date.now();
    log.push({ ts, msg, type });

    if (!_elLog) return;

    const elapsed = Math.floor(ts / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');

    const row = document.createElement('div');
    row.className = 'log-entry new';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-timestamp';
    timeSpan.textContent = `${mm}:${ss}`;

    const msgSpan = document.createElement('span');
    msgSpan.className = `log-msg ${type}`;
    msgSpan.textContent = msg;

    row.appendChild(timeSpan);
    row.appendChild(msgSpan);
    _elLog.appendChild(row);
    _elLog.scrollTop = _elLog.scrollHeight;

    setTimeout(() => row.classList.remove('new'), 2000);
  }

  // ── Init ───────────────────────────────────────────────────────────────

  function init() {
    writeLog('System online. Mounting physical substrate.', 'system');
    writeLog('Grid: 60×60 = 3600 actuating pins', 'system');
    writeLog('Protocol: AWAITING FIRST THOUGHT', 'system');

    // Load persisted state from KV (fire-and-forget — loads before user can type)
    _loadPersistedState();
  }

  async function _loadPersistedState() {
    try {
      const [stateRes, gestureRes] = await Promise.all([
        fetch('/api/identity'),
        fetch('/api/identity?type=gestures'),
      ]);

      if (stateRes.ok) {
        const saved = await stateRes.json();
        if (saved.identity && typeof saved.identity === 'object') {
          Object.assign(data, saved.identity);
          _refreshIdentity();
        }
        if (saved.soul && typeof saved.soul === 'object') {
          Object.assign(soul, saved.soul);
          _refreshSoul();
        }
        if (Array.isArray(saved.emotional_history)) {
          _emotionalHistory = saved.emotional_history;
        }
        const hasData = Object.keys(data).length > 0;
        if (hasData) {
          writeLog('Identity restored from memory.', 'gesture-learned');
        }
      }

      if (gestureRes.ok) {
        const gestures = await gestureRes.json();
        if (gestures && typeof gestures === 'object') {
          _savedGestures = gestures;
          const count = Object.keys(gestures).length;
          if (count > 0) {
            writeLog(`Gesture vocabulary loaded: ${count} named pattern(s).`, 'gesture-learned');
          }
        }
      }
    } catch (_) { /* silently skip if offline / local dev */ }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  return {
    init,
    mount,
    writeLog,
    setIdentity,
    setSoul,
    addEmotionalEntry,
    saveGesture,
    getSavedGestures,
    getSystemContext,
    renderIdentityMd,
    renderSoulMd,
    getData:  () => ({ ...data }),
    getSoul:  () => ({ ...soul }),
    getEmotionalHistory: () => [..._emotionalHistory],
  };

})();
