/**
 * main.js
 * Entry point — wires Brain, Scene, Identity, and Chat.
 *
 * Loop:
 *   1. Brain.getHeightMap(now) → Float32Array(900)
 *   2. Scene.setTargets(heightMap)
 *   3. Scene.render()
 *   4. HUD uptime updated every second
 *
 * Chat flow:
 *   user types → Chat.send() → /api/chat proxy → Kimi K2.5
 *   → Brain.setGestureFromLLM() + Identity.writeLog()
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

  // ── Chat callbacks ────────────────────────────────────────────────────

  Chat.onThinking(() => {
    Brain.setGestureFromLLM('noise');
    stateEl.textContent = 'THINKING';
    Identity.writeLog('...', 'ai-thought');
  });

  Chat.onResponse(({ gesture, thought }) => {
    Brain.setGestureFromLLM(gesture);
    stateEl.textContent = 'LISTENING';
    Identity.writeLog(`"${thought}"`, 'ai-thought');
    setChatEnabled(true);
  });

  Chat.onError(msg => {
    Brain.setGestureFromLLM('breathe');
    stateEl.textContent = 'LISTENING';
    Identity.writeLog(`Error: ${msg}`, 'system');
    setChatEnabled(true);
  });

  // Enable chat input once boot sequence fires enable_chat event
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
