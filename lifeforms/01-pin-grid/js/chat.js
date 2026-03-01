/**
 * chat.js
 * Streams Kimi K2.5 responses via the /api/chat Edge proxy.
 *
 * Response format the model is instructed to use:
 *   GESTURE: <name>
 *   <thought in 1–3 sentences>
 *
 * Callbacks fired in order:
 *   onThinking()              — request sent, waiting for first token
 *   onGestureReady(name)      — first line parsed, gesture known immediately
 *   onToken(thoughtSoFar)     — thought text updating live as tokens arrive
 *   onResponse({ gesture, thought }) — stream complete, chat can re-enable
 *   onError(message)          — something went wrong
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
  let _onThinking     = null;
  let _onGestureReady = null;
  let _onToken        = null;
  let _onResponse     = null;
  let _onError        = null;

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

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer         = '';
      let accumulated    = '';
      let gestureEmitted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process all complete SSE lines, keep partial last line in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;

          let parsed;
          try { parsed = JSON.parse(payload); } catch (_) { continue; }

          const token = parsed.choices?.[0]?.delta?.content ?? '';
          if (!token) continue;

          accumulated += token;

          // Fire onGestureReady as soon as the first complete line arrives
          if (!gestureEmitted && accumulated.includes('\n')) {
            const firstLine = accumulated.split('\n')[0].trim();
            if (firstLine.toUpperCase().startsWith('GESTURE:')) {
              const name = firstLine.split(':')[1].trim().toLowerCase();
              const safe = VALID_GESTURES.includes(name) ? name : 'reflect';
              gestureEmitted = true;
              if (_onGestureReady) _onGestureReady(safe);
            }
          }

          // Stream the thought text live (everything after the first line)
          if (gestureEmitted && _onToken) {
            const thought = accumulated.split('\n').slice(1).join('\n').trimStart();
            if (thought) _onToken(thought);
          }
        }
      }

      // ── Final parse ──────────────────────────────────────────────────
      const resultLines = accumulated.split('\n');
      const firstLine   = (resultLines[0] ?? '').trim();
      const gestureName = firstLine.toUpperCase().startsWith('GESTURE:')
        ? firstLine.split(':')[1].trim().toLowerCase()
        : 'reflect';
      const gesture = VALID_GESTURES.includes(gestureName) ? gestureName : 'reflect';
      const thought = resultLines.slice(1).join('\n').trim();

      _history.push({ role: 'assistant', content: accumulated });
      if (_onResponse) _onResponse({ gesture, thought });

    } catch (err) {
      if (_onError) _onError(err.message);
    }
  }

  // ── Callbacks ──────────────────────────────────────────────────────────

  function onThinking(fn)     { _onThinking     = fn; }
  function onGestureReady(fn) { _onGestureReady = fn; }
  function onToken(fn)        { _onToken        = fn; }
  function onResponse(fn)     { _onResponse     = fn; }
  function onError(fn)        { _onError        = fn; }

  return { send, onThinking, onGestureReady, onToken, onResponse, onError };

})();
