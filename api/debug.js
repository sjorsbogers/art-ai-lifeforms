/**
 * api/debug.js
 * Temporary — tests each LLM service and returns status.
 * Visit /api/debug in browser to diagnose.
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey   = process.env.GROQ_API_KEY;

  const results = {
    env: {
      GEMINI_API_KEY: geminiKey ? `set (${geminiKey.slice(0, 8)}...)` : 'NOT SET',
      GROQ_API_KEY:   groqKey   ? `set (${groqKey.slice(0, 8)}...)` : 'NOT SET',
    },
    gemini: null,
    groq:   null,
  };

  // Test Gemini
  if (geminiKey) {
    try {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${geminiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-2.5-flash',
            messages: [{ role: 'user', content: 'say ok' }],
            max_tokens: 5,
          }),
        }
      );
      const body = await r.json();
      results.gemini = { status: r.status, ok: r.ok, body };
    } catch (e) {
      results.gemini = { error: e.message };
    }
  } else {
    results.gemini = 'skipped — no key';
  }

  // Test Groq
  if (groqKey) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'say ok' }],
          max_tokens: 5,
        }),
      });
      const body = await r.json();
      results.groq = { status: r.status, ok: r.ok, body };
    } catch (e) {
      results.groq = { error: e.message };
    }
  } else {
    results.groq = 'skipped — no key';
  }

  return res.status(200).json(results);
};
