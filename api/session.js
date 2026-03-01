/**
 * api/session.js
 * Persists FORM's session memory — what it thought and did each session.
 *
 * GET  /api/session  -> { sessions: [{ ts, date, thoughts, exchanges }, ...] }
 * POST /api/session  -> { thoughts: string[], exchanges: number } -> saved
 *
 * Keeps last 5 sessions in KV key 'form:sessions'.
 */

let kv;
try { kv = require('@vercel/kv').kv; } catch (_) { kv = null; }

const SESSION_KEY  = 'form:sessions';
const MAX_SESSIONS = 5;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    if (!kv) return res.status(200).json({ sessions: [] });
    try {
      const sessions = await kv.get(SESSION_KEY) || [];
      return res.status(200).json({ sessions });
    } catch (_) {
      return res.status(200).json({ sessions: [] });
    }
  }

  if (req.method === 'POST') {
    if (!kv) return res.status(200).json({ ok: true });
    try {
      const { thoughts, exchanges } = req.body || {};
      if (!thoughts || !thoughts.length) return res.status(200).json({ ok: true });

      const sessions = await kv.get(SESSION_KEY) || [];
      sessions.unshift({
        ts:        Date.now(),
        date:      new Date().toISOString().slice(0, 10),
        thoughts:  thoughts.slice(0, 10),   // cap at 10 thoughts per session
        exchanges: exchanges || 0,
      });
      await kv.set(SESSION_KEY, sessions.slice(0, MAX_SESSIONS));
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
