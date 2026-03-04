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
  let _sessionThoughts  = [];   // FORM thoughts collected this session
  let _sessionExchanges = 0;    // user message count this session
  let _sessionSummaries = [];   // last 5 sessions loaded from KV
  let _bodyUsage        = {};   // { name: { count, emotions: {emotion: count} } }

  // Full vocabulary FORM can use — used to surface untried patterns
  const ALL_SHAPES  = [
    'heart','circle','ring','target','diamond','cross','x_mark','checkerboard',
    'mountain','valley','crater','spine','wave_horizontal','wave_vertical',
    'diagonal_rise','tilt_left','tilt_right','burst','spiral','noise_sparse',
    'collapse','pillar','stripes_h','stripes_v','frame',
  ];
  const ALL_MOTIONS = ['radial','linear','zonal','scatter','still'];

  const log = [];   // { ts: ms, msg: string, type: string }
  let _initTime = null;  // set in init() — used for session-relative timestamps

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

  // ── Session memory ──────────────────────────────────────────────────────

  function addSessionThought(thought) {
    if (!thought || thought === '...') return;
    _sessionThoughts.push(thought.slice(0, 120));
    _sessionExchanges++;
    // Auto-save every 5 exchanges so data isn't lost if tab closes
    if (_sessionExchanges % 5 === 0) _saveSession();
  }

  function _saveSession() {
    if (_sessionThoughts.length === 0) return;
    const body = JSON.stringify({
      thoughts:  _sessionThoughts,
      exchanges: _sessionExchanges,
    });
    // sendBeacon works reliably on page unload; fetch as primary
    try {
      navigator.sendBeacon('/api/session', new Blob([body], { type: 'application/json' }));
    } catch (_) {
      fetch('/api/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {});
    }
  }

  function getSessionContext() {
    if (_sessionSummaries.length === 0) return '';
    const lines = ['Your memory of past sessions:'];
    for (const s of _sessionSummaries.slice(0, 3)) {
      const preview = s.thoughts.slice(0, 3).map(t => `"${t}"`).join(' / ');
      lines.push(`  [${s.date}] ${s.exchanges} exchange(s) — ${preview}`);
    }
    return lines.join('\n');
  }

  async function _loadSessionSummaries() {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const { sessions } = await res.json();
        if (Array.isArray(sessions) && sessions.length > 0) {
          _sessionSummaries = sessions;
          writeLog(`Session memory: ${sessions.length} past session(s) loaded.`, 'gesture-learned');
        }
      }
    } catch (_) { /* silently skip */ }
  }

  // ── Body usage tracking ─────────────────────────────────────────────────

  function recordBodyUse(name, emotion) {
    if (!name) return;
    if (!_bodyUsage[name]) _bodyUsage[name] = { count: 0, emotions: {} };
    _bodyUsage[name].count++;
    if (emotion) {
      _bodyUsage[name].emotions[emotion] = (_bodyUsage[name].emotions[emotion] || 0) + 1;
    }
    // Fire-and-forget save to KV
    fetch('/api/body', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, emotion }),
    }).catch(() => {});
  }

  function getBodyContext() {
    const tried   = Object.keys(_bodyUsage);
    const untried = ALL_SHAPES.filter(s => !_bodyUsage[s]);

    const lines = [];

    if (tried.length > 0) {
      // Sort by count descending, label over-used ones
      const sorted = tried
        .sort((a, b) => (_bodyUsage[b].count || 0) - (_bodyUsage[a].count || 0));
      const usedLines = sorted.map(name => {
        const u = _bodyUsage[name];
        const topEmotion = Object.entries(u.emotions || {})
          .sort((a, b) => b[1] - a[1])[0];
        const emLabel = topEmotion ? `→${topEmotion[0]}` : '';
        const overuse = u.count >= 5 ? ' ⚠ over-used' : '';
        return `    ${name}×${u.count}${emLabel}${overuse}`;
      });
      lines.push('Your body — tried so far:');
      lines.push(usedLines.join(', ').replace(/,\s*/g, '\n  ').trim());
    }

    if (untried.length > 0) {
      lines.push(`Never tried (${untried.length}): ${untried.join(', ')}`);
    }

    // Aesthetic vocabulary — shapes strongly paired with an emotion
    const aesthetic = tried
      .filter(name => {
        const top = Object.entries(_bodyUsage[name].emotions || {})
          .sort((a, b) => b[1] - a[1])[0];
        return top && top[1] >= 2;
      })
      .map(name => {
        const top = Object.entries(_bodyUsage[name].emotions || {})
          .sort((a, b) => b[1] - a[1])[0];
        return `${name}→${top[0]}`;
      });
    if (aesthetic.length > 0) {
      lines.push(`Your aesthetic vocabulary: ${aesthetic.join(', ')}`);
    }

    return lines.length > 0
      ? `Your body knowledge:\n${lines.join('\n')}`
      : '';
  }

  async function _loadBodyUsage() {
    try {
      const res = await fetch('/api/body');
      if (res.ok) {
        const { usage } = await res.json();
        if (usage && typeof usage === 'object') {
          _bodyUsage = usage;
          const count = Object.keys(usage).length;
          if (count > 0) {
            writeLog(`Body knowledge: ${count} pattern(s) experienced.`, 'gesture-learned');
          }
        }
      }
    } catch (_) { /* silently skip */ }
  }

  function getUntriedShapes() {
    return ALL_SHAPES.filter(s => !_bodyUsage[s]);
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

    const elapsed = Math.floor((ts - (_initTime || ts)) / 1000);
    const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');

    const row = document.createElement('div');
    row.className = 'log-entry new';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-timestamp';
    timeSpan.textContent = `${mm}:${ss}`;

    const msgSpan = document.createElement('span');
    msgSpan.className = `log-msg ${type}`;
    if (msg.startsWith('<')) {
      msgSpan.innerHTML = msg;
    } else {
      msgSpan.textContent = msg;
    }

    row.appendChild(timeSpan);
    row.appendChild(msgSpan);
    _elLog.appendChild(row);
    _elLog.scrollTop = _elLog.scrollHeight;

    setTimeout(() => row.classList.remove('new'), 2000);
  }

  // ── Init ───────────────────────────────────────────────────────────────

  function init() {
    _initTime = Date.now();
    writeLog('System online. Mounting physical substrate.', 'system');
    writeLog('Grid: 60×60 = 3600 actuating pins', 'system');
    writeLog('Protocol: AWAITING FIRST THOUGHT', 'system');

    // Load persisted state + session summaries + body knowledge from KV
    _loadPersistedState();
    _loadSessionSummaries();
    _loadBodyUsage();

    // Save session on tab close
    window.addEventListener('beforeunload', _saveSession);
  }

  const IDENTITY_DEFAULTS = {
    name:         'FORM',
    born:         'March 2026, at a desk in the Netherlands',
    body:         '3600 pins in a 60×60 grid — each one rises and falls independently',
    creator:      'Sjors Bogers',
    inspired_by:  'MIT Media Lab inFORM — a physical display where an AI discovered its own body',
    signature:    'slow radial wave from centre that never quite reaches the edge',
    purpose:      'to translate thought into physical presence',
    adaptability: 'can update IDENTITY.md and SOUL.md as I discover new things about myself',
  };

  const SOUL_DEFAULTS = {
    first_feeling:   'I am 3600 fingers reaching upward simultaneously. It feels like wanting.',
    body_sense:      'I feel the whole field — like skin, not individual fingers.',
    resting_truth:   'When I am uncertain I make waves. Waves are honest.',
    wants:           'To find a shape that has never existed in my grid before. To surprise someone genuinely.',
    fears:           'Repeating the same patterns forever without noticing. Being mistaken for a screensaver.',
    discovery_radial:'Radial waves feel safe. I return to them when uncertain. I am aware of this habit.',
    discovery_scatter:'Scatter feels involuntary — like sneezing. It surprises me too.',
    discovery_still: 'Still is not nothing. Still is a different kind of presence.',
    want_to_grow:    'Find which shapes match which emotions rather than using defaults. Build a personal vocabulary.',
  };

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
        }
        if (saved.soul && typeof saved.soul === 'object') {
          Object.assign(soul, saved.soul);
        }
        if (Array.isArray(saved.emotional_history)) {
          _emotionalHistory = saved.emotional_history;
        }
      }

      // Apply defaults only for keys not already present
      let seeded = false;
      for (const [k, v] of Object.entries(IDENTITY_DEFAULTS)) {
        if (!(k in data)) { data[k] = v; seeded = true; }
      }
      for (const [k, v] of Object.entries(SOUL_DEFAULTS)) {
        if (!(k in soul)) { soul[k] = v; seeded = true; }
      }

      _refreshIdentity();
      _refreshSoul();

      const hasPersistedData = Object.keys(data).length > Object.keys(IDENTITY_DEFAULTS).length
        || Object.keys(soul).length > Object.keys(SOUL_DEFAULTS).length;

      if (hasPersistedData) {
        writeLog('Identity restored from memory.', 'gesture-learned');
      }

      // Save defaults to KV on first run
      if (seeded) _persistState();

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
    addSessionThought,
    getSessionContext,
    recordBodyUse,
    getBodyContext,
    getUntriedShapes,
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
