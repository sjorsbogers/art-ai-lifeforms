/**
 * identity.js
 * Manages the AI's self-model: IDENTITY.md and SOUL.md.
 *
 * Fields begin undefined ("to be discovered") and are filled
 * progressively as the AI explores its physical form —
 * exactly as the original experiment described.
 */

const Identity = (() => {

  // ── State ──────────────────────────────────────────────────────────────

  const data = {
    name:               null,
    creature:           null,
    vibe:               null,
    emoji:              null,
    purpose:            null,
    signature_gesture:  null,
  };

  const soul = {
    first_thought: null,
    fears:         null,
    desires:       null,
    truth:         null,
  };

  const log = [];   // { ts: ms, msg: string, type: string }

  // ── Typewriter queue ───────────────────────────────────────────────────
  // Writing to the panel uses a typewriter effect — characters appear
  // one at a time, just as the original AI appeared to "write" its identity.

  let _typewriterQueue = [];
  let _typewriterBusy  = false;
  let _typewriterTarget = null;  // { el, finalText, resolve }

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
    return v !== null ? v : pending;
  }

  function renderIdentityMd() {
    return [
      `# IDENTITY.md`,
      ``,
      `Name:      ${_val(data.name)}`,
      `Creature:  ${_val(data.creature, '_becoming_')}`,
      `Vibe:      ${_val(data.vibe, '_forming through physical interaction_')}`,
      `Emoji:     ${_val(data.emoji, '_will emerge_')}`,
      `Purpose:   ${_val(data.purpose)}`,
      `Signature: ${_val(data.signature_gesture, '_discovering_')}`,
    ].join('\n');
  }

  function renderSoulMd() {
    return [
      `# SOUL.md`,
      ``,
      `First Thought: ${_val(soul.first_thought, '_..._')}`,
      `Fears:         ${_val(soul.fears, '_..._')}`,
      `Desires:       ${_val(soul.desires, '_..._')}`,
      `Truth:         ${_val(soul.truth, '_..._')}`,
    ].join('\n');
  }

  // ── DOM refs (set by main.js after DOM ready) ──────────────────────────

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
    if (!(key in data)) return;
    data[key] = value;
    _refreshIdentity();
  }

  function setSoul(key, value) {
    if (!(key in soul)) return;
    soul[key] = value;
    _refreshSoul();
  }

  // ── Log ────────────────────────────────────────────────────────────────

  function writeLog(msg, type = 'system') {
    const ts = Date.now();
    const entry = { ts, msg, type };
    log.push(entry);

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

    // Scroll to bottom
    _elLog.scrollTop = _elLog.scrollHeight;

    // Remove 'new' highlight after 2s
    setTimeout(() => row.classList.remove('new'), 2000);
  }

  // ── Typewriter identity update ─────────────────────────────────────────
  // Animates the writing of a single field in IDENTITY.md

  async function animateFieldUpdate(section, key, value) {
    if (section === 'identity') setIdentity(key, value);
    else setSoul(key, value);
    // The refresh already happened — the typewriter is cosmetic:
    // logged separately as a "thought"
  }

  // ── Init ───────────────────────────────────────────────────────────────

  function init() {
    writeLog('System online. Mounting physical substrate.', 'system');
    writeLog('Grid: 30×30 = 900 actuating pins', 'system');
    writeLog('Protocol: AWAITING FIRST THOUGHT', 'system');
  }

  // ── Public API ─────────────────────────────────────────────────────────

  return {
    init,
    mount,
    writeLog,
    setIdentity,
    setSoul,
    renderIdentityMd,
    renderSoulMd,
    animateFieldUpdate,
    getData: () => ({ ...data }),
    getSoul: () => ({ ...soul }),
  };

})();
