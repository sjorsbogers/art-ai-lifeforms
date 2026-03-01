/**
 * api/chat.js
 * Vercel serverless proxy — Gemini first, Groq fallback, then Ollama in browser.
 *
 * Primary:  Gemini 1.5 Flash  (~0.5s, free 1.5k req/day, no card needed)
 * Fallback: Groq / Llama 3.3  (~0.2s, free 14k req/day)
 * Last:     Ollama             (local, browser-side only)
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;

  // -- 1. Try Gemini 1.5 Flash -------------------------------------------
  // Uses OpenAI-compatible endpoint. Free tier: 1500 req/day, 15 req/min.
  // Falls through on 429 (rate limit) or any non-2xx error.

  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      const upstream = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${geminiKey}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            model:       'gemini-1.5-flash',
            messages,
            max_tokens:  180,
            temperature: 0.9,
          }),
        }
      );

      if (upstream.ok) {
        const data = await upstream.json();
        data._provider = 'GEMINI';
        return res.status(200).json(data);
      }
      // Any non-2xx (429, 503, quota errors) — fall through to Groq
    } catch (_) {
      // Network error — fall through to Groq
    }
  }

  // -- 2. Fallback: Groq -------------------------------------------------

  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    return res.status(429).json({ error: 'Gemini unavailable and GROQ_API_KEY not configured' });
  }

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages,
        max_tokens:  180,
        temperature: 0.9,
      }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
