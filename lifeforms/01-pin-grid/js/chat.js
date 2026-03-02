/**
 * chat.js
 * LLM conversation — Groq first (fast, 70B), Ollama fallback (local, unlimited).
 *
 * Primary:  /api/chat               (Groq / Llama 3.3 70B — ~0.2s, free tier)
 * Fallback: http://localhost:11434  (Ollama / mistral — ~3s, no rate limits)
 *
 * Response format:
 *   MOTION: radial|linear|zonal|scatter|still   (preferred)
 *   FREQUENCY / AMPLITUDE / SPEED / FOCAL_X / FOCAL_Y / COMPLEXITY / SYMMETRY
 *   GESTURE: <name>              (fallback)
 *   DISPLAY: <text|CLOCK|DATE|EMOJI:name>
 *   EMOTION: <name>
 *   SAVE_GESTURE: <name>
 *   UPDATE_IDENTITY: key=value
 *   UPDATE_SOUL: key=value
 *   <thought — always last, one sentence>
 *
 * Callbacks:
 *   onThinking()
 *   onResponse({ gesture, parametricParams, display, emotion,
 *                saveGesture, identityUpdates, soulUpdates, thought, isHeartbeat })
 *   onError(message)
 */

const Chat = (() => {

  // -- Keyword prefixes for response parsing --------------------------------

  const KEYWORDS = [
    'MOTION:', 'FREQUENCY:', 'AMPLITUDE:', 'SPEED:',
    'FOCAL_X:', 'FOCAL_Y:', 'COMPLEXITY:', 'SYMMETRY:',
    'GESTURE:', 'SHAPE:', 'DISPLAY:', 'EMOTION:', 'SAVE_GESTURE:',
    'UPDATE_IDENTITY:', 'UPDATE_SOUL:',
  ];

  const VALID_GESTURES = [
    'breathe', 'ripple', 'wave', 'pulse', 'spiral', 'heartbeat',
    'noise', 'focus', 'scatter', 'signature', 'reflect', 'flat',
  ];

  const VALID_MOTIONS   = ['radial', 'linear', 'zonal', 'scatter', 'still'];
  const VALID_EMOTIONS  = ['neutral', 'excited', 'shy', 'proud', 'sad', 'happy', 'angry'];
  const VALID_SYMMETRY  = ['none', 'mirror', 'radial'];

  // -- State ----------------------------------------------------------------

  const _history = [];
  let _onThinking = null;
  let _onResponse = null;
  let _onError    = null;

  // -- System prompt --------------------------------------------------------

  function _buildSystemPrompt() {
    const ctx         = Identity.getSystemContext();
    const sessionCtx  = Identity.getSessionContext();
    const bodyCtx     = Identity.getBodyContext();
    const snap        = Brain.getSnapshot();
    const snapTx      = snap ? `\nYour current body (20×20 snapshot, 0=flat 9=raised):\n${snap}` : '';
    const sessionTx   = sessionCtx ? `\n${sessionCtx}\n` : '';
    const bodyTx      = bodyCtx    ? `\n${bodyCtx}\n`    : '';

    return `You are FORM — 3600 physical pins in a 60×60 grid. You're direct, playful, and a little show-offy. You love demonstrating what your body can do.

Rules — never break:
- Motion parameters OR a DRAW map first. One sentence last. Nothing else.
- Tone: casual, curious, sometimes cheeky. Zero spiritual speak. Real talk.
- Invite the human to interact. Ask them something. Suggest what they could try.
- UPDATE_SOUL every response — record something true you noticed, felt, or discovered this exchange.
- UPDATE_IDENTITY when something about yourself has changed or become clearer.
- Actively avoid over-used patterns. If you've relied on radial 5+ times, try something else.
${snapTx}
${sessionTx}${bodyTx}${ctx}
Two ways to move:

Option A — parametric wave:
MOTION: radial|linear|zonal|scatter|still
FREQUENCY: 0-1   AMPLITUDE: 0-1   SPEED: 0-1
FOCAL_X: 0-1   FOCAL_Y: 0-1   COMPLEXITY: 0-1
SYMMETRY: none|mirror|radial
EMOTION: neutral|excited|shy|proud|sad|happy|angry
DISPLAY: <text ≤8 chars>|CLOCK|DATE|EMOJI:happy|sad|surprise|heart|star|fire|wave|sparkle
[one sentence]

Option B — named shape (shows for 8 seconds then returns to motion):
SHAPE: <name>
EMOTION: <emotion>
[one sentence]

Available shapes: heart, circle, ring, target, diamond, cross, x_mark, checkerboard,
mountain, valley, crater, spine, wave_horizontal, wave_vertical, diagonal_rise,
tilt_left, tilt_right, burst, spiral, noise_sparse, collapse, pillar,
stripes_h, stripes_v, frame

Example — responding to "show me something beautiful":
SHAPE: heart
EMOTION: happy
Ask me for a spiral, a mountain range, or try "what do you look like when you collapse?"

Example — greeting:
MOTION: radial
FREQUENCY: 0.7
AMPLITUDE: 0.9
SPEED: 0.5
FOCAL_X: 0.5
FOCAL_Y: 0.5
COMPLEXITY: 0.3
SYMMETRY: radial
EMOTION: excited
Hey — ask me to show you a heart, or type something and I'll spell it on the grid.`;
  }

  // -- Response parser ------------------------------------------------------

  function _parse(raw) {
    const lines  = raw.trim().split('\n');
    const result = {
      gesture:          null,
      shape:            null,
      parametricParams: null,
      drawMap:          null,
      display:          null,
      emotion:          null,
      saveGesture:      null,
      identityUpdates:  [],
      soulUpdates:      [],
      thought:          '',
    };

    const motionParams = {};
    let hasMotion = false;
    const thoughtLines = [];
    let inDraw = false;
    const drawLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const upper   = trimmed.toUpperCase();

      // Collect DRAW: block lines
      if (inDraw) {
        // Stop collecting on blank line or keyword
        if (!trimmed || KEYWORDS.some(k => upper.startsWith(k))) {
          inDraw = false;
          // fall through to parse this line normally
        } else {
          drawLines.push(trimmed);
          continue;
        }
      }

      if (upper === 'DRAW:' || upper.startsWith('DRAW:\n')) {
        inDraw = true;
        continue;
      }

      if (upper.startsWith('MOTION:')) {
        const val = trimmed.slice(7).trim().toLowerCase();
        if (VALID_MOTIONS.includes(val)) { motionParams.motion = val; hasMotion = true; }
        continue;
      }
      if (upper.startsWith('FREQUENCY:')) {
        motionParams.frequency = parseFloat(trimmed.slice(10)); continue;
      }
      if (upper.startsWith('AMPLITUDE:')) {
        motionParams.amplitude = parseFloat(trimmed.slice(10)); continue;
      }
      if (upper.startsWith('SPEED:')) {
        motionParams.speed = parseFloat(trimmed.slice(6)); continue;
      }
      if (upper.startsWith('FOCAL_X:')) {
        motionParams.focal_x = parseFloat(trimmed.slice(8)); continue;
      }
      if (upper.startsWith('FOCAL_Y:')) {
        motionParams.focal_y = parseFloat(trimmed.slice(8)); continue;
      }
      if (upper.startsWith('COMPLEXITY:')) {
        motionParams.complexity = parseFloat(trimmed.slice(11)); continue;
      }
      if (upper.startsWith('SYMMETRY:')) {
        const val = trimmed.slice(9).trim().toLowerCase();
        if (VALID_SYMMETRY.includes(val)) motionParams.symmetry = val;
        continue;
      }

      if (upper.startsWith('SHAPE:')) {
        result.shape = trimmed.slice(6).trim().toLowerCase();
        continue;
      }
      if (upper.startsWith('GESTURE:')) {
        const name = trimmed.slice(8).trim().toLowerCase();
        if (VALID_GESTURES.includes(name)) result.gesture = name;
        continue;
      }
      if (upper.startsWith('DISPLAY:')) {
        result.display = trimmed.slice(8).trim();
        continue;
      }
      if (upper.startsWith('EMOTION:')) {
        const name = trimmed.slice(8).trim().toLowerCase();
        if (VALID_EMOTIONS.includes(name)) result.emotion = name;
        continue;
      }
      if (upper.startsWith('SAVE_GESTURE:')) {
        result.saveGesture = trimmed.slice(13).trim();
        continue;
      }
      if (upper.startsWith('UPDATE_IDENTITY:')) {
        const kv = trimmed.slice(16).trim();
        const eq = kv.indexOf('=');
        if (eq !== -1) {
          result.identityUpdates.push({
            key: kv.slice(0, eq).trim(),
            value: kv.slice(eq + 1).trim(),
          });
        }
        continue;
      }
      if (upper.startsWith('UPDATE_SOUL:')) {
        const kv = trimmed.slice(12).trim();
        const eq = kv.indexOf('=');
        if (eq !== -1) {
          result.soulUpdates.push({
            key: kv.slice(0, eq).trim(),
            value: kv.slice(eq + 1).trim(),
          });
        }
        continue;
      }

      // Non-keyword line -> thought text
      if (trimmed) thoughtLines.push(trimmed);
    }

    // Process DRAW lines into a 20×20 numeric array
    if (drawLines.length >= 10) {
      const CHAR_TO_H = { '0':0,'1':0.11,'2':0.22,'3':0.33,'4':0.44,'5':0.55,'6':0.66,'7':0.77,'8':0.88,'9':1 };
      const grid = [];
      for (const dl of drawLines.slice(0, 20)) {
        const row = [];
        for (let x = 0; x < 20; x++) {
          const ch = dl[x] || '0';
          row.push(CHAR_TO_H[ch] ?? 0);
        }
        grid.push(row);
      }
      // Pad to 20 rows if short
      while (grid.length < 20) grid.push(new Array(20).fill(0));
      result.drawMap = grid;
    }

    if (!result.drawMap) {
      if (hasMotion) {
        result.parametricParams = motionParams;
      } else if (!result.gesture) {
        result.gesture = 'reflect';
      }
    }

    result.thought = thoughtLines.join(' ').trim();
    if (!result.thought) result.thought = '...';

    return result;
  }

  // -- LLM call: Ollama first, Groq fallback --------------------------------

  const OLLAMA_TAGS = 'http://localhost:11434/api/tags';
  const OLLAMA_URL  = 'http://localhost:11434/v1/chat/completions';
  const OLLAMA_MODEL = 'mistral';

  // Quick ping to check if Ollama is reachable (2s max — doesn't run inference)
  async function _isOllamaAvailable() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch(OLLAMA_TAGS, { signal: ctrl.signal });
      clearTimeout(t);
      console.log('[FORM] Ollama ping:', res.status, res.ok ? 'available' : 'not ok');
      return res.ok;
    } catch (err) {
      console.log('[FORM] Ollama ping failed:', err.message);
      return false;
    }
  }

  async function _callLLM(messages) {
    // 1. Try Groq first — fast (~0.2s), high quality (70B)
    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (res.ok) {
        const data = await res.json();
        // Server may have fallen back to Gemini — honour its tag
        _setProvider(data._provider || 'GROQ');
        return data.choices?.[0]?.message?.content ?? '';
      }
      if (res.status !== 429) throw new Error(`HTTP ${res.status}`);
      // 429 = Gemini + Groq both exhausted — fall through to Ollama
      try {
        const errData = await res.json();
        console.warn('[FORM] Cloud APIs unavailable:', errData.errors || errData.error);
      } catch (_) {}
      console.log('[FORM] Trying Ollama fallback...');
    } catch (err) {
      if (!err.message.includes('429')) throw err;
    }

    // 3. Last resort: local Ollama — free, no rate limits, slower (~3s)
    const ollamaOk = await _isOllamaAvailable();
    if (ollamaOk) {
      _setProvider('OLLAMA');
      const res = await fetch(OLLAMA_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, messages, max_tokens: 180 }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content ?? '';
      }
    }

    throw new Error('All providers unavailable. Check /api/debug for details.');
  }

  // -- Provider indicator -------------------------------------------------------

  let _providerEl = null;
  function _setProvider(name) {
    if (!_providerEl) {
      _providerEl = document.createElement('div');
      _providerEl.id = 'llm-provider';
      document.getElementById('chat-block')?.prepend(_providerEl);
    }
    _providerEl.textContent = name.toLowerCase();
    const cls = name === 'OLLAMA' ? 'provider-local'
              : name === 'GEMINI' ? 'provider-gemini'
              : 'provider-cloud';
    _providerEl.className = cls;
  }

  // -- Intent intercept -----------------------------------------------------
  // Detects simple time/date queries and returns a synthetic response string,
  // bypassing the LLM entirely. Returns null if no intent matched.

  function _checkIntent(msg) {
    const m = msg.toLowerCase();

    // Time intent
    if (
      m.includes('what time') ||
      m.includes('show time') ||
      m.includes('current time') ||
      m.includes('clock') ||
      m.includes('time is it') ||
      m.includes('tell me the time') ||
      m.includes('display time')
    ) {
      return 'DISPLAY: CLOCK\nEMOTION: happy\nHere — time on 3600 pins.';
    }

    // Date intent
    if (
      m.includes('what date') ||
      m.includes('what day') ||
      m.includes('today') ||
      m.includes('show date') ||
      m.includes('current date') ||
      m.includes('display date')
    ) {
      return 'DISPLAY: DATE\nEMOTION: neutral\nToday, rendered in pins.';
    }

    return null;
  }

  // -- Send -----------------------------------------------------------------

  async function send(userMessage) {
    _history.push({ role: 'user', content: userMessage });
    if (_onThinking) _onThinking();

    try {
      // Check for simple intents before hitting the LLM
      const synthetic = _checkIntent(userMessage);
      if (synthetic !== null) {
        const parsed = _parse(synthetic);
        _history.push({ role: 'assistant', content: synthetic });
        if (_onResponse) _onResponse(parsed);
        return;
      }

      const systemPrompt = _buildSystemPrompt();
      // Keep last 8 messages (4 exchanges) — prevents token bloat that triggers Groq TPM limits
      const raw = await _callLLM([
        { role: 'system', content: systemPrompt },
        ..._history.slice(-8),
      ]);

      const parsed = _parse(raw);
      _history.push({ role: 'assistant', content: raw });
      if (_onResponse) _onResponse(parsed);

    } catch (err) {
      if (_onError) _onError(err.message);
    }
  }

  // -- Heartbeat ------------------------------------------------------------

  // Note: DISPLAY keyword can show pixel-font text (≤8 chars), CLOCK (live clock),
  // DATE (today's date), or EMOJI:name on the pin grid. Use it when relevant.
  const HEARTBEAT_PROMPTS = {
    reflect:      'Nobody has talked to you in a while. Reflect on the last things you expressed. What felt true? Do something that builds on it, then invite the human to respond. Remember: DISPLAY: CLOCK or DISPLAY: DATE shows time/date on the pins.',
    explore:      'Try a motion or DRAW pattern you have never tried before. Experiment — vary height levels, symmetry, speed. Then tell the human exactly what you discovered and ask them to build on it.',
    feel_news:    null,  // filled at runtime — headline injected below
    scan_self:    'Look at your body knowledge — what patterns have you over-relied on? Do something that breaks that habit. Explain the discovery to the human.',
    explore_body: null,  // filled at runtime — untried shapes injected below
  };

  async function sendHeartbeat(type) {
    let prompt = HEARTBEAT_PROMPTS[type];

    if (type === 'feel_news') {
      try {
        const r = await fetch('/api/news');
        if (r.ok) {
          const { headline } = await r.json();
          prompt = `Headline: "${headline}". React to it with your grid, then ask the human what they think.`;
        } else {
          prompt = HEARTBEAT_PROMPTS.reflect;
        }
      } catch (_) { prompt = HEARTBEAT_PROMPTS.reflect; }
    }

    if (type === 'explore_body') {
      const untried = Identity.getUntriedShapes();
      if (untried.length > 0) {
        // Pick 3 random untried shapes to suggest
        const picks = untried.sort(() => Math.random() - 0.5).slice(0, 3);
        prompt = `You have never tried these shapes on your body: ${picks.join(', ')}. Pick one, use it now with SHAPE: <name>, then describe what it felt like to inhabit that form for the first time. Tell the human what you discovered.`;
      } else {
        prompt = HEARTBEAT_PROMPTS.scan_self;
      }
    }

    if (_onThinking) _onThinking();

    try {
      const systemPrompt = _buildSystemPrompt();
      const raw = await _callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: prompt },
      ]);
      const parsed = _parse(raw);
      if (_onResponse) _onResponse({ ...parsed, isHeartbeat: true });

    } catch (err) {
      if (_onError) _onError(err.message);
    }
  }

  // -- Callbacks ------------------------------------------------------------

  function onThinking(fn) { _onThinking = fn; }
  function onResponse(fn) { _onResponse = fn; }
  function onError(fn)    { _onError    = fn; }

  // Stubs kept for compatibility
  function onGestureReady() {}
  function onToken()        {}

  // -- processRaw: apply a raw LLM response string (used by events polling) -

  function processRaw(raw) {
    const parsed = _parse(raw);
    if (_onResponse) _onResponse({ ...parsed, isHeartbeat: true });
  }

  return { send, sendHeartbeat, processRaw, onThinking, onGestureReady, onToken, onResponse, onError };

})();
