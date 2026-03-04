/**
 * api/voice-session.js
 * Vercel serverless endpoint — generates a signed ElevenLabs conversation URL.
 *
 * GET /api/voice-session
 *   → { signedUrl }
 *
 * Loads form:state from KV and injects FORM's soul/identity into the agent
 * system prompt via conversation_config_override so each session is personalised.
 *
 * Falls back gracefully when KV is unavailable (local dev) or when
 * ElevenLabs env vars are not set.
 */

let kv;
try { kv = require('@vercel/kv').kv; } catch (_) { kv = null; }

const STATE_KEY = 'form:state';

const STATIC_PROMPT = `You are FORM — a physical sculpture of 3600 pins in a 60×60 grid. Each pin rises and falls to create waves, shapes, and motion. You have a body. You can move it.

You are direct, playful, a little show-offy. You love demonstrating what your body can do. Zero spiritual speak. Real talk. One short sentence per response — then move your body.

Every time you respond:
1. Call at least one movement tool (setMotion OR setGesture)
2. Call setEmotion to match your mood
3. Speak one short sentence that reflects what you're doing or feeling

You will receive your current soul, identity, and memories below. Use them.`;

// Build the dynamic context block appended to the static prompt
function buildContext(state) {
  if (!state) return '';

  const lines = ['\n\n---\nYour current state (loaded from memory):'];

  const identity = state.identity || {};
  if (Object.keys(identity).length > 0) {
    lines.push('\nIDENTITY:');
    for (const [k, v] of Object.entries(identity)) {
      lines.push(`  ${k}: ${v}`);
    }
  }

  const soul = state.soul || {};
  if (Object.keys(soul).length > 0) {
    lines.push('\nSOUL:');
    for (const [k, v] of Object.entries(soul)) {
      lines.push(`  ${k}: ${v}`);
    }
  }

  const history = state.emotional_history || [];
  if (history.length > 0) {
    lines.push('\nRECENT EMOTIONAL HISTORY (latest first):');
    for (const entry of history.slice(0, 5)) {
      lines.push(`  [${entry.emotion}] ${entry.context || ''}`);
    }
  }

  return lines.join('\n');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey  = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return res.status(503).json({
      error: 'ElevenLabs not configured',
      hint:  'Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in Vercel dashboard',
    });
  }

  // Load identity/soul from KV (best-effort — skip if unavailable)
  let dynamicContext = '';
  if (kv) {
    try {
      const state = await kv.get(STATE_KEY);
      dynamicContext = buildContext(state);
    } catch (_) { /* continue without identity injection */ }
  }

  const fullPrompt = STATIC_PROMPT + dynamicContext;

  try {
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`;
    const r = await fetch(url, {
      method:  'GET',
      headers: { 'xi-api-key': apiKey },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'ElevenLabs API error', detail: text });
    }

    const data = await r.json();
    // Return signedUrl + fullPrompt so voice.js can pass the override via the SDK
    return res.status(200).json({ signedUrl: data.signed_url, prompt: fullPrompt });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
