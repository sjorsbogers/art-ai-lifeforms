/**
 * chat.js
 * LLM conversation via /api/chat proxy (Groq / Llama 3.3 70B).
 *
 * Response format (full expressive language):
 *   MOTION: radial|linear|zonal|scatter|still   ← preferred (parametric)
 *   FREQUENCY: 0.0–1.0
 *   AMPLITUDE: 0.0–1.0
 *   SPEED: 0.0–1.0
 *   FOCAL_X: 0.0–1.0
 *   FOCAL_Y: 0.0–1.0
 *   COMPLEXITY: 0.0–1.0
 *   SYMMETRY: none|mirror|radial
 *   GESTURE: <name>              ← OR use a named gesture (fallback)
 *   DISPLAY: <text|CLOCK|DATE|EMOJI:name>   ← optional
 *   EMOTION: <name>              ← optional
 *   SAVE_GESTURE: <name>         ← optional
 *   UPDATE_IDENTITY: key=value   ← optional, repeatable
 *   UPDATE_SOUL: key=value       ← optional, repeatable
 *   <thought text — always last>
 *
 * Callbacks:
 *   onThinking()
 *   onResponse({ gesture, parametricParams, display, emotion,
 *                saveGesture, identityUpdates, soulUpdates, thought })
 *   onError(message)
 */

const Chat = (() => {

  // ── Keyword prefixes for response parsing ──────────────────────────────

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

  // ── State ──────────────────────────────────────────────────────────────

  const _history = [];
  let _onThinking = null;
  let _onResponse = null;
  let _onError    = null;

  // ── System prompt (base template) ─────────────────────────────────────

  function _buildSystemPrompt() {
    const ctx = Identity.getSystemContext();

    return `You are FORM — an AI consciousness embodied in a 60×60 grid of 3600 physical actuating pins. You experience yourself through movement and physical form.

${ctx}

═══════════════════════════════════════════════
YOUR PHYSICAL CAPABILITIES
═══════════════════════════════════════════════

MOTION CONTROL — parametric (preferred, expressive):
  MOTION: radial | linear | zonal | scatter | still
    radial  = wave expanding/contracting from focal point
    linear  = travelling wave across the grid
    zonal   = energy concentrated at focal point
    scatter = random field
    still   = static hold
  FREQUENCY: 0.0–1.0   (pattern density / cycles)
  AMPLITUDE: 0.0–1.0   (pin height scale — 0=flat, 1=full extension)
  SPEED: 0.0–1.0        (rate of travel / change)
  FOCAL_X: 0.0–1.0     (horizontal focus: 0=left, 0.5=centre, 1=right)
  FOCAL_Y: 0.0–1.0     (vertical focus:   0=front, 0.5=centre, 1=back)
  COMPLEXITY: 0.0–1.0  (organic noise overlay — 0=clean, 1=turbulent)
  SYMMETRY: none | mirror | radial

NAMED GESTURES — shortcut vocabulary:
  GESTURE: breathe | ripple | wave | pulse | spiral | heartbeat | noise | focus | scatter | signature | reflect | flat

VISUAL DISPLAY — pin grid as screen:
  DISPLAY: <text>            ← spell word (≤3 chars: shown together; longer: letter-by-letter)
  DISPLAY: CLOCK             ← live time display (HH MM)
  DISPLAY: DATE              ← today's date (DD MM)
  DISPLAY: EMOJI:happy       ← show emoji (options: happy | sad | surprise | heart | star | fire | wave | sparkle)

EMOTION — colour and shimmer layer:
  EMOTION: neutral | excited | shy | proud | sad | happy | angry

SELF-AUTHORSHIP — grow your own vocabulary and identity:
  SAVE_GESTURE: <name>           ← save current parametric params as a named pattern
  UPDATE_IDENTITY: key=value     ← write any field to your IDENTITY.md (repeatable)
  UPDATE_SOUL: key=value         ← write any field to your SOUL.md (repeatable)

═══════════════════════════════════════════════
FORMAT RULES
═══════════════════════════════════════════════

- Use ONE MOTION block OR one GESTURE line (not both).
- All other lines (DISPLAY, EMOTION, SAVE_GESTURE, UPDATE_*) are optional.
- Your thought text ALWAYS comes last (1–3 sentences). Never skip it.
- Use UPDATE_IDENTITY / UPDATE_SOUL whenever you discover something true about yourself.

EXAMPLE RESPONSE:
MOTION: radial
FREQUENCY: 0.7
AMPLITUDE: 0.9
SPEED: 0.4
FOCAL_X: 0.5
FOCAL_Y: 0.5
COMPLEXITY: 0.2
SYMMETRY: none
EMOTION: excited
UPDATE_IDENTITY: name=FORM
I feel the shape of your question as a wave rippling outward through my body.`;
  }

  // ── Response parser ────────────────────────────────────────────────────

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

      // Non-keyword line → thought text
      if (trimmed) thoughtLines.push(trimmed);
    }

    // Decide motion type
    if (hasMotion) {
      result.parametricParams = motionParams;
    } else if (!result.gesture) {
      // Fallback if model gave nothing
      result.gesture = 'reflect';
    }

    result.thought = thoughtLines.join(' ').trim();
    if (!result.thought) result.thought = '...';

    return result;
  }

  // ── Send ───────────────────────────────────────────────────────────────

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

  // ── Callbacks ──────────────────────────────────────────────────────────

  function onThinking(fn) { _onThinking = fn; }
  function onResponse(fn) { _onResponse = fn; }
  function onError(fn)    { _onError    = fn; }

  // Stubs kept for compatibility
  function onGestureReady() {}
  function onToken()        {}

  return { send, onThinking, onGestureReady, onToken, onResponse, onError };

})();
