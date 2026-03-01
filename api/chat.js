/**
 * api/chat.js
 * Vercel serverless proxy — forwards chat requests to Groq / Llama 3.3 70B.
 * API key lives only in Vercel environment variables, never in code.
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured on server' });

  try {
    const { messages } = req.body;

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages,
        max_tokens:  512,
        temperature: 0.9,
      }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
