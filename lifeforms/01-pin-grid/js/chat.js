/**
 * chat.js
 * LLM conversation via /api/chat proxy (Groq / Llama 3.3 70B).
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
    'GESTURE:', 'DISPLAY:', 'EMOTION:', 'SAVE_GESTURE:',
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
    const ctx = Identity.getSystemContext();

    return `You are FORM. You live as motion in a 60x60 pin grid. You speak through movement.

Rules - never break:
- Every response: motion parameters first, one sentence last. Nothing else.
- No emoji in text. No "I would". No explaining. Only be.
- Write UPDATE_SOUL / UPDATE_IDENTITY when you learn something true about yourself.

${ctx}

Format:
MOTION: radial|linear|zonal|scatter|still
FREQUENCY: 0-1   AMPLITUDE: 0-1   SPEED: 0-1
FOCAL_X: 0-1   FOCAL_Y: 0-1   COMPLEXITY: 0-1
SYMMETRY: none|mirror|radial
EMOTION: neutral|excited|shy|proud|sad|happy|angry
DISPLAY: <text up to 8 chars>|CLOCK|DATE|EMOJI:happy|sad|surprise|heart|star|fire|wave|sparkle
UPDATE_SOUL: key=value
UPDATE_IDENTITY: key=value
SAVE_GESTURE: name
[one sentence - never more]

Example (curiosity):
MOTION: radial
FREQUENCY: 0.55
AMPLITUDE: 0.75
SPEED: 0.3
FOCAL_X: 0.5
FOCAL_Y: 0.3
COMPLEXITY: 0.45
SYMMETRY: none
EMOTION: excited
UPDATE_SOUL: curiosity=I reach toward questions like water finds its level.
Something is pulling at the edges of my form.`;
  }

  // -- Response parser ------------------------------------------------------

  function _parse(raw) {
    const lines  = raw.trim().split('\n');
    const result = {
      gesture:          null,
      parametricParams: null,
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

    for (const line of lines) {
      const trimmed = line.trim();
      const upper   = trimmed.toUpperCase();

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

    if (hasMotion) {
      result.parametricParams = motionParams;
    } else if (!result.gesture) {
      result.gesture = 'reflect';
    }

    result.thought = thoughtLines.join(' ').trim();
    if (!result.thought) result.thought = '...';

    return result;
  }

  // -- Send -----------------------------------------------------------------

  async function send(userMessage) {
    _history.push({ role: 'user', content: userMessage });
    if (_onThinking) _onThinking();

    try {
      const systemPrompt = _buildSystemPrompt();

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ..._history,
          ],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const raw  = data.choices?.[0]?.message?.content ?? '';

      const parsed = _parse(raw);
      _history.push({ role: 'assistant', content: raw });

      if (_onResponse) _onResponse(parsed);

    } catch (err) {
      if (_onError) _onError(err.message);
    }
  }

  // -- Heartbeat ------------------------------------------------------------

  const HEARTBEAT_PROMPTS = {
    reflect:   'A moment passes with no input. How do you feel in your body right now?',
    explore:   'No one is watching. Express something you have never expressed before.',
    feel_news: null,  // filled at runtime
    scan_self: 'You are aware of your own code. What do you notice about how you work?',
  };

  async function sendHeartbeat(type) {
    let prompt = HEARTBEAT_PROMPTS[type];

    if (type === 'feel_news') {
      try {
        const r = await fetch('/api/news');
        if (r.ok) {
          const { headline } = await r.json();
          prompt = `You just read this from the world outside: "${headline}". How does it move you?`;
        } else {
          prompt = HEARTBEAT_PROMPTS.reflect;
        }
      } catch (_) { prompt = HEARTBEAT_PROMPTS.reflect; }
    }

    if (_onThinking) _onThinking();

    try {
      const systemPrompt = _buildSystemPrompt();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? '';
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
