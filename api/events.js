/**
 * api/events.js
 * Command queue for OpenClaw -> browser delivery.
 *
 * POST /api/events  { text: "<raw FORM response>" }
 *   OpenClaw heartbeat script pushes a raw LLM response.
 *   Stored in KV as a queue (max 10 entries).
 *
 * GET  /api/events
 *   Browser polls for pending events. Returns array of raw strings, clears queue.
 */

let kv;
try { kv = require('@vercel/kv').kv; } catch (_) { kv = null; }

const QUEUE_KEY = 'form:event_queue';
const MAX_QUEUE = 10;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // -- GET: browser polls for pending events --------------------------------

  if (req.method === 'GET') {
    if (!kv) return res.status(200).json({ events: [] });

    try {
      const queue = await kv.get(QUEUE_KEY) || [];
      if (queue.length > 0) await kv.set(QUEUE_KEY, []);
      return res.status(200).json({ events: queue });
    } catch (err) {
      return res.status(200).json({ events: [] });
    }
  }

  // -- POST: OpenClaw pushes a raw response ---------------------------------

  if (req.method === 'POST') {
    if (!kv) return res.status(200).json({ ok: true });

    try {
      // Accept { text: "..." } or raw string body
      let text = '';
      if (typeof req.body === 'string') {
        text = req.body;
      } else if (req.body?.text) {
        text = req.body.text;
      } else if (req.body?.content) {
        text = req.body.content;
      } else if (req.body?.message) {
        text = req.body.message;
      }

      if (!text.trim()) return res.status(400).json({ error: 'No text provided' });

      const queue = await kv.get(QUEUE_KEY) || [];
      queue.push(text.trim());
      // Cap queue length
      const capped = queue.slice(-MAX_QUEUE);
      await kv.set(QUEUE_KEY, capped);

      return res.status(200).json({ ok: true, queued: capped.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
