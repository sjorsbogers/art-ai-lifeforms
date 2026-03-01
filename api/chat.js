/**
 * api/chat.js
 * Vercel serverless proxy — forwards chat requests to NVIDIA / Kimi K2.5.
 * The API key lives ONLY in Vercel's environment variables, never in code.
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'NVIDIA_API_KEY not configured on server' });

  try {
    const { messages } = req.body;

    const upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        model:                 'moonshotai/kimi-k2.5',
        messages,
        max_tokens:            512,
        temperature:           1.0,
        top_p:                 1.0,
        stream:                false,
        chat_template_kwargs:  { thinking: true },
      }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
