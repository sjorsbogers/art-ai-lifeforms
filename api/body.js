/**
 * api/body.js
 * Tracks FORM's body usage — which shapes/motions it has used and
 * how many times, plus which emotions it associated with them.
 *
 * GET  /api/body  -> { usage: { name: { count, emotions: {emotion: count} } } }
 * POST /api/body  -> { name, emotion } -> increments count + emotion
 */

let kv;
try { kv = require('@vercel/kv').kv; } catch (_) { kv = null; }

const BODY_KEY = 'form:body_usage';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    if (!kv) return res.status(200).json({ usage: {} });
    try {
      const usage = await kv.get(BODY_KEY) || {};
      return res.status(200).json({ usage });
    } catch (_) {
      return res.status(200).json({ usage: {} });
    }
  }

  if (req.method === 'POST') {
    if (!kv) return res.status(200).json({ ok: true });
    try {
      const { name, emotion } = req.body || {};
      if (!name) return res.status(200).json({ ok: true });

      const usage = await kv.get(BODY_KEY) || {};
      if (!usage[name]) usage[name] = { count: 0, emotions: {} };
      usage[name].count++;
      if (emotion) {
        usage[name].emotions[emotion] = (usage[name].emotions[emotion] || 0) + 1;
      }
      await kv.set(BODY_KEY, usage);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
