/**
 * api/chat.js
 * Vercel serverless proxy — Groq primary, Gemini 2.5 Flash fallback.
 *
 * Primary:  Groq / Llama 3.3 70B    (~0.2s, free 14k req/day)
 * Fallback: Gemini 2.5 Flash         (~0.5s, free tier)
 * Last:     Ollama                    (local, browser-side only)
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;

  // -- 1. Try Groq -------------------------------------------------------

  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
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

      if (upstream.ok) {
        const data = await upstream.json();
        return res.status(200).json(data);
      }
      // Non-2xx (429 etc.) — fall through to Gemini
    } catch (_) { /* fall through */ }
  }

  // -- 2. Fallback: Gemini 2.5 Flash (v1beta endpoint) ------------------

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
            model:       'gemini-2.5-flash',
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
    } catch (_) { /* fall through */ }
  }

  // Both failed — browser will try Ollama
  return res.status(429).json({ error: 'Groq and Gemini both unavailable' });
};
