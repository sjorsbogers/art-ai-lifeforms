/**
 * main.js
 * Entry point -- wires Brain, Scene, Identity, Chat, and Display.
 *
 * Chat flow:
 *   user types -> Chat.send() -> /api/chat (Groq) -> parsed response
 *   -> Brain applies: gesture/parametric -> display -> emotion
 *   -> Identity applies: identity updates, soul updates, emotional history
 */

(function () {

  // -- DOM refs ------------------------------------------------------------

  const canvasContainer = document.getElementById('canvas-container');
  const identityEl      = document.getElementById('identity-content');
  const soulEl          = document.getElementById('soul-content');
  const logEl           = document.getElementById('log-content');
  const uptimeEl        = document.getElementById('uptime-value');
  const stateEl         = document.getElementById('state-value');
  const chatInput       = document.getElementById('chat-input');
  const chatSend        = document.getElementById('chat-send');
  const voiceBtn        = document.getElementById('voice-btn');
  const voiceStatus     = document.getElementById('voice-status');
  const aboutBtn        = document.getElementById('about-btn');
  const aboutDrawer     = document.getElementById('about-drawer');
  const aboutClose      = document.getElementById('about-close');

  // -- About drawer --------------------------------------------------------

  if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
      aboutDrawer.classList.add('open');
      aboutDrawer.setAttribute('aria-hidden', 'false');
    });
  }

  if (aboutClose) {
    aboutClose.addEventListener('click', () => {
      aboutDrawer.classList.remove('open');
      aboutDrawer.setAttribute('aria-hidden', 'true');
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      aboutDrawer.classList.remove('open');
      aboutDrawer.setAttribute('aria-hidden', 'true');
    }
  });

  // -- Accordion toggles (IDENTITY.md / SOUL.md) ----------------------------

  document.querySelectorAll('.accordion-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const block = btn.closest('.accordion-block');
      const body  = block.querySelector('.accordion-body');
      const open  = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      body.hidden = open;
    });
  });

  // -- Chat UI helpers -----------------------------------------------------

  function setChatEnabled(enabled) {
    chatInput.disabled = !enabled;
    chatSend.disabled  = !enabled;
    if (enabled) chatInput.focus();
  }

  let _lastUserMessage = Date.now();

  function submitChat() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatInput.value = '';
    _lastUserMessage = Date.now();
    setChatEnabled(false);
    Identity.writeLog(`> ${msg}`, 'user-message');
    Chat.send(msg);
  }

  chatSend.addEventListener('click', submitChat);
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !chatInput.disabled) submitChat();
  });

  // -- Response handler (shared by send + heartbeat) -----------------------

  function _applyResponse({
    gesture, shape, parametricParams, drawMap,
    display, emotion,
    saveGesture,
    identityUpdates, soulUpdates,
    thought,
    isHeartbeat,
  }) {
    // 1 -- Motion (shape > draw > parametric > named gesture)
    if (shape) {
      Brain.setShape(shape);
    } else if (drawMap) {
      Brain.setDrawMap(drawMap);
    } else if (parametricParams) {
      Brain.setParametricGesture(parametricParams);
      if (parametricParams.motion === 'still') {
        Identity.writeLog('— holding still —', 'system');
      }
    } else if (gesture) {
      Brain.setGestureFromLLM(gesture);
    }

    // 2 -- Display
    if (display) {
      Brain.setDisplay(display);
    }

    // 3 -- Emotion
    if (emotion) {
      Brain.setEmotion(emotion);
    }

    // 4 -- Save custom gesture
    if (saveGesture && parametricParams) {
      Brain.saveGesture(saveGesture, parametricParams);
    }

    // 5 -- Identity updates
    for (const { key, value } of (identityUpdates || [])) {
      Identity.setIdentity(key, value);
    }
    for (const { key, value } of (soulUpdates || [])) {
      Identity.setSoul(key, value);
    }

    // 6 -- Record emotional history
    if (emotion && emotion !== 'neutral') {
      Identity.addEmotionalEntry({
        emotion,
        params:  parametricParams || { gesture: gesture || 'reflect' },
        context: thought.slice(0, 80),
      });
    }

    // 7 -- Log thought + record in session memory
    stateEl.textContent = 'LISTENING';
    if (thought) {
      Identity.writeLog(`"${thought}"`, 'ai-thought');
      Identity.addSessionThought(thought);
    }

    // 8 -- Record body usage for self-discovery tracking
    const usedName = shape || (parametricParams && parametricParams.motion) || gesture;
    if (usedName) Identity.recordBodyUse(usedName, emotion);

    setChatEnabled(true);
  }

  // -- Chat callbacks ------------------------------------------------------

  Chat.onThinking(() => {
    Brain.setGestureFromLLM('noise');
    stateEl.textContent = 'THINKING';
    Identity.writeLog('', 'ai-thought thinking');
  });

  Chat.onResponse(_applyResponse);

  Chat.onError(msg => {
    Brain.setGestureFromLLM('breathe');
    stateEl.textContent = 'LISTENING';
    Identity.writeLog(`Error: ${msg}`, 'system');
    setChatEnabled(true);
  });

  Brain.onChatEnabled(() => setChatEnabled(true));

  // -- Voice (ElevenLabs) --------------------------------------------------

  let _voiceActive = false;

  function setVoiceStatus(text) {
    if (voiceStatus) voiceStatus.textContent = text;
  }

  // Wire Voice callbacks once Voice is available (loaded as ESM module)
  function _initVoice() {
    if (!window.Voice) return;

    Voice.onConnect = () => {
      _voiceActive = true;
      voiceBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
      voiceBtn.title = 'Stop voice conversation';
      setVoiceStatus('LIVE');
      setChatEnabled(false);
      stateEl.textContent = 'VOICE';
      Identity.writeLog('Voice session started.', 'system');
    };

    Voice.onDisconnect = (reason) => {
      _voiceActive = false;
      voiceBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V21h2v-2.07A7 7 0 0 0 19 12h-2z"/></svg>';
      voiceBtn.title = 'Start voice conversation';
      setVoiceStatus('');
      setChatEnabled(true);
      stateEl.textContent = 'LISTENING';
      if (reason) {
        Identity.writeLog(`Voice ended: ${reason}`, 'system');
      } else {
        Identity.writeLog('Voice session ended.', 'system');
      }
    };

    Voice.onModeChange = (mode) => {
      if (mode === 'speaking') {
        Brain.setGestureFromLLM('noise');
        setVoiceStatus('SPEAKING');
      } else {
        Brain.setGestureFromLLM('breathe');
        setVoiceStatus('LISTENING');
      }
    };
  }

  // Voice button toggle
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      // Delay init in case voice.js ESM module hasn't resolved yet
      if (!window.Voice) {
        Identity.writeLog('Voice not available — check console.', 'system');
        return;
      }
      if (_voiceActive) {
        Voice.stop();
      } else {
        setVoiceStatus('CONNECTING…');
        Voice.start();
      }
    });
  }

  // Poll for Voice availability (ESM module loads asynchronously)
  const _voiceInitInterval = setInterval(() => {
    if (window.Voice) {
      _initVoice();
      clearInterval(_voiceInitInterval);
    }
  }, 100);

  // -- OpenClaw event polling (picks up autonomous thoughts from KV queue) --

  const POLL_INTERVAL = 3000;  // 3s

  async function _pollEvents() {
    try {
      const res = await fetch('/api/events');
      if (!res.ok) return;
      const { events } = await res.json();
      for (const raw of (events || [])) {
        Chat.processRaw(raw);
        // Space out multiple queued events
        await new Promise(r => setTimeout(r, 800));
      }
    } catch (_) { /* silently skip if offline / KV not connected */ }
  }

  setInterval(_pollEvents, POLL_INTERVAL);

  // -- Heartbeat loop ------------------------------------------------------

  const HEARTBEAT_INTERVAL = 160000; // 2m40s idle before spontaneous thought
  const HEARTBEAT_CHECK    = 10000;  // check every 10s

  const _heartbeatTypes = ['reflect', 'explore_body', 'feel_news', 'scan_self', 'explore', 'explore_body'];
  let _heartbeatIndex = 0;

  function _nextHeartbeatType() {
    const t = _heartbeatTypes[_heartbeatIndex % _heartbeatTypes.length];
    _heartbeatIndex++;
    return t;
  }

  setInterval(() => {
    if (Brain.getState() !== 'LISTENING') return;
    if (chatInput.disabled) return;
    if (_voiceActive) return;
    if (Date.now() - _lastUserMessage < HEARTBEAT_INTERVAL) return;
    _lastUserMessage = Date.now();
    Chat.sendHeartbeat(_nextHeartbeatType());
  }, HEARTBEAT_CHECK);

  // -- Boot ----------------------------------------------------------------

  function boot() {
    Identity.mount(identityEl, soulEl, logEl);
    Brain.init();
    Scene.init(canvasContainer);
    requestAnimationFrame(loop);
  }

  // -- Main loop -----------------------------------------------------------

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

  // -- Start ---------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
