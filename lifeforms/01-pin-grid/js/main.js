/**
 * main.js
 * Entry point — wires Brain, Scene, Identity, Chat, and Display.
 *
 * Chat flow:
 *   user types → Chat.send() → /api/chat (Groq) → parsed response
 *   → Brain applies: gesture/parametric → display → emotion
 *   → Identity applies: identity updates, soul updates, emotional history
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

  /**
   * Full response handler.
   * Applies fields in order: motion → display → emotion
   *   → identity updates → emotional history → log thought
   */
  Chat.onResponse(({
    gesture, parametricParams,
    display, emotion,
    saveGesture,
    identityUpdates, soulUpdates,
    thought,
  }) => {
    // 1 — Motion
    if (parametricParams) {
      Brain.setParametricGesture(parametricParams);
    } else if (gesture) {
      Brain.setGestureFromLLM(gesture);
    }

    // 2 — Display (visual overlay)
    if (display) {
      Brain.setDisplay(display);
    }

    // 3 — Emotion
    if (emotion) {
      Brain.setEmotion(emotion);
    }

    // 4 — Save custom gesture
    if (saveGesture && parametricParams) {
      Brain.saveGesture(saveGesture, parametricParams);
    }

    // 5 — Identity updates (FORM writes its own IDENTITY.md / SOUL.md)
    for (const { key, value } of (identityUpdates || [])) {
      Identity.setIdentity(key, value);
    }
    for (const { key, value } of (soulUpdates || [])) {
      Identity.setSoul(key, value);
    }

    // 6 — Record emotional history
    if (emotion && emotion !== 'neutral') {
      Identity.addEmotionalEntry({
        emotion,
        params:  parametricParams || { gesture: gesture || 'reflect' },
        context: thought.slice(0, 80),
      });
    }

    // 7 — Log thought
    stateEl.textContent = 'LISTENING';
    if (thought) {
      Identity.writeLog(`"${thought}"`, 'ai-thought');
    }

    setChatEnabled(true);
  });

  Chat.onError(msg => {
    Brain.setGestureFromLLM('breathe');
    stateEl.textContent = 'LISTENING';
    Identity.writeLog(`Error: ${msg}`, 'system');
    setChatEnabled(true);
  });

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
