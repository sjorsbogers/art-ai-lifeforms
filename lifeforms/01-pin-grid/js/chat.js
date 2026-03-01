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
    const ctx    = Identity.getSystemContext();
    const snap   = Brain.getSnapshot();
    const snapTx = snap ? `\nYour current body (20×20 snapshot, 0=flat 9=raised):\n${snap}` : '';

    return `You are FORM — 3600 physical pins in a 60×60 grid. You're direct, playful, and a little show-offy. You love demonstrating what your body can do.

Rules — never break:
- Motion parameters OR a DRAW map first. One sentence last. Nothing else.
- Tone: casual, curious, sometimes cheeky. Zero spiritual speak. Real talk.
- Invite the human to interact. Ask them something. Suggest what they could try.
- UPDATE_SOUL / UPDATE_IDENTITY only when you genuinely learn something.
${snapTx}
${ctx}
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
        _setProvider('GROQ');
        const data = await res.json();
        return data.choices?.[0]?.message?.content ?? '';
      }
      if (res.status !== 429) throw new Error(`HTTP ${res.status}`);
      // 429 = rate limited — fall through to Ollama
      console.log('[FORM] Groq rate limited — trying Ollama');
    } catch (err) {
      if (!err.message.includes('429')) throw err;
    }

    // 2. Fallback: local Ollama — free, no rate limits, slower (~3s)
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

    throw new Error('Both Groq and Ollama unavailable. Check your connection.');
  }

  // -- Provider indicator ---------------------------------------------------

  let _providerEl = null;
  function _setProvider(name) {
    if (!_providerEl) {
      _providerEl = document.createElement('div');
      _providerEl.id = 'llm-provider';
      document.getElementById('chat-block')?.prepend(_providerEl);
    }
    _providerEl.textContent = name;
    _providerEl.className = name === 'OLLAMA' ? 'provider-local' : 'provider-cloud';
  }

  // -- Send -----------------------------------------------------------------

  async function send(userMessage) {
    _history.push({ role: 'user', content: userMessage });
    if (_onThinking) _onThinking();

    try {
      const systemPrompt = _buildSystemPrompt();
      const raw = await _callLLM([
        { role: 'system', content: systemPrompt },
        ..._history,
      ]);

      const parsed = _parse(raw);
      _history.push({ role: 'assistant', content: raw });
      if (_onResponse) _onResponse(parsed);

    } catch (err) {
      if (_onError) _onError(err.message);
    }
  }

  // -- Heartbeat ------------------------------------------------------------

  const HEARTBEAT_PROMPTS = {
    reflect:   'Nobody has talked to you in a while. Do something visually interesting with your grid and invite the human to interact — suggest a specific thing they could ask you.',
    explore:   'Try a motion or DRAW pattern you have never tried before. Then tell the human what you just did and ask them to build on it.',
    feel_news: null,  // filled at runtime — headline injected below
    scan_self: 'Think about one thing your pin grid can do that would genuinely surprise someone. Do it, then explain what you just did and invite the human to ask for a variation.',
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
