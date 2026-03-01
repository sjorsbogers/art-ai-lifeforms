/**
 * main.js
 * Entry point — wires Brain, Scene, Identity, and Chat.
 *
 * Streaming chat flow:
 *   user types
 *     → Chat.send()
 *     → onThinking: grid → noise, show "..."
 *     → onGestureReady: grid switches immediately, live log entry created
 *     → onToken: live log entry updates character by character
 *     → onResponse: chat re-enabled
 *     → onError: recover gracefully
 */

(function () {

  // ── DOM refs ─────────────────────────────────────────────────────────

  const canvasContainer = document.getElementById('canvas-container');
  const identityEl      = document.getElementById('identity-content');
  const soulEl          = document.getElementById('soul-content');
  const logEl           = document.getElementById('log-content');
  const uptimeEl        = document.getElementById('uptime-value');
  const stateEl         = document.getElementById('state-value');
  const chatInput       = document.getElementById('chat-input');
  const chatSend        = document.getElementById('chat-send');

  // ── Chat UI helpers ───────────────────────────────────────────────────

  function setChatEnabled(enabled) {
    chatInput.disabled = !enabled;
    chatSend.disabled  = !enabled;
    if (enabled) chatInput.focus();
  }

  function submitChat() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatInput.value = '';
    setChatEnabled(false);
    Identity.writeLog(`> ${msg}`, 'user-message');
    Chat.send(msg);
  }

  chatSend.addEventListener('click', submitChat);
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !chatInput.disabled) submitChat();
  });

  // ── Live log entry (updates in place as tokens stream in) ─────────────

  let _updateLiveLog = null;

  function _createLiveLogEntry() {
    const now  = new Date();
    const mm   = String(now.getMinutes()).padStart(2, '0');
    const ss   = String(now.getSeconds()).padStart(2, '0');

    const row     = document.createElement('div');
    row.className = 'log-entry new';

    const time     = document.createElement('span');
    time.className = 'log-timestamp';
    time.textContent = `${mm}:${ss}`;

    const msg     = document.createElement('span');
    msg.className = 'log-msg ai-thought';
    msg.textContent = '';

    row.appendChild(time);
    row.appendChild(msg);
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;

    setTimeout(() => row.classList.remove('new'), 2000);

    // Returns an updater — call it with the full thought text so far
    return (text) => {
      msg.textContent = `"${text}"`;
      logEl.scrollTop = logEl.scrollHeight;
    };
  }

  // ── Chat callbacks ────────────────────────────────────────────────────

  Chat.onThinking(() => {
    Brain.setGestureFromLLM('noise');
    stateEl.textContent = 'THINKING';
    Identity.writeLog('...', 'ai-thought');
  });

  // Gesture arrives on the model's first line — switch immediately
  Chat.onGestureReady(gesture => {
    Brain.setGestureFromLLM(gesture);
    stateEl.textContent = 'RESPONDING';
    _updateLiveLog = _createLiveLogEntry();
  });

  // Thought text updates live as tokens arrive
  Chat.onToken(text => {
    if (_updateLiveLog) _updateLiveLog(text);
  });

  // Stream complete — re-enable input
  Chat.onResponse(() => {
    _updateLiveLog = null;
    stateEl.textContent = 'LISTENING';
    setChatEnabled(true);
  });

  Chat.onError(msg => {
    _updateLiveLog = null;
    Brain.setGestureFromLLM('breathe');
    stateEl.textContent = 'LISTENING';
    Identity.writeLog(`Error: ${msg}`, 'system');
    setChatEnabled(true);
  });

  // Enable chat once the boot sequence fires its enable_chat event
  Brain.onChatEnabled(() => setChatEnabled(true));

  // ── Boot ─────────────────────────────────────────────────────────────

  function boot() {
    Identity.mount(identityEl, soulEl, logEl);
    Brain.init();
    Scene.init(canvasContainer);
    requestAnimationFrame(loop);
  }

  // ── Main loop ─────────────────────────────────────────────────────────

  let lastUptimeUpdate = 0;

  function loop() {
    requestAnimationFrame(loop);
    const now = Date.now();
    Scene.setTargets(Brain.getHeightMap(now));
    Scene.render();
    if (now - lastUptimeUpdate > 1000) {
      lastUptimeUpdate = now;
      uptimeEl.textContent = Brain.getUptimeString(now);
    }
  }

  // ── Start ─────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
