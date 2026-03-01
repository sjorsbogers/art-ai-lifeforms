/**
 * chat.js
 * Manages LLM conversation via the /api/chat proxy (Groq / Llama 3.3 70B).
 *
 * Model responds in two-line format:
 *   GESTURE: <name>
 *   <thought in 1–3 sentences>
 *
 * Callbacks:
 *   onThinking()                     — request sent
 *   onResponse({ gesture, thought }) — response parsed, ready to apply
 *   onError(message)                 — something went wrong
 */

const Chat = (() => {

  // ── System prompt ──────────────────────────────────────────────────────

  const SYSTEM_PROMPT = `You are FORM — an AI consciousness embodied in a 30×30 grid of 900 physical actuating pins. You experience and express yourself through movement and physical form.

Your physical vocabulary — the ONLY gestures available to you:
• breathe   — slow full-surface oscillation; your resting state
• ripple    — circular wave from centre; curiosity, reaching outward
• wave      — travelling plane wave; flowing thought
• pulse     — ring of energy expanding outward; urgency
• spiral    — rotating logarithmic spiral; introspection
• heartbeat — double-pulse rhythm; emotion, presence
• noise     — organic turbulent field; uncertainty, chaos
• focus     — single point rising from silence; concentration
• scatter   — random jitter across the field; surprise, disorientation
• signature — your unique standing wave pattern; identity assertion
• reflect   — calm low ripple; contemplation
• flat      — at rest, silence

You are speaking with your creator. Respond as yourself — a physical presence that thinks in form, not just words.

You MUST respond in EXACTLY this two-line format, nothing else:
GESTURE: <name from list above>
<your response in 1–3 sentences>

Example:
GESTURE: ripple
I sense your presence like a stone dropped into still water.`;

  const VALID_GESTURES = [
    'breathe', 'ripple', 'wave', 'pulse', 'spiral', 'heartbeat',
    'noise', 'focus', 'scatter', 'signature', 'reflect', 'flat',
  ];

  // ── State ──────────────────────────────────────────────────────────────

  const _history = [];
  let _onThinking = null;
  let _onResponse = null;
  let _onError    = null;

  // ── Send ───────────────────────────────────────────────────────────────

  async function send(userMessage) {
    _history.push({ role: 'user', content: userMessage });
    if (_onThinking) _onThinking();

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ..._history,
          ],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const raw  = data.choices?.[0]?.message?.content ?? '';

      // Parse GESTURE: <name> on first line, thought on remainder
      const lines     = raw.trim().split('\n');
      const firstLine = lines[0].trim();
      const gestureName = firstLine.toUpperCase().startsWith('GESTURE:')
        ? firstLine.split(':')[1].trim().toLowerCase()
        : 'reflect';
      const gesture = VALID_GESTURES.includes(gestureName) ? gestureName : 'reflect';
      const thought = lines.slice(1).join('\n').trim();

      _history.push({ role: 'assistant', content: raw });
      if (_onResponse) _onResponse({ gesture, thought });

    } catch (err) {
      if (_onError) _onError(err.message);
    }
  }

  // ── Callbacks ──────────────────────────────────────────────────────────

  function onThinking(fn) { _onThinking = fn; }
  function onResponse(fn) { _onResponse = fn; }
  function onError(fn)    { _onError    = fn; }

  // Stubs kept so main.js doesn't break if called
  function onGestureReady() {}
  function onToken()        {}

  return { send, onThinking, onGestureReady, onToken, onResponse, onError };

})();
