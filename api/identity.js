/**
 * api/identity.js
 * Vercel serverless endpoint — persists FORM's identity, soul,
 * custom gestures, and emotional history in Vercel KV.
 *
 * GET  /api/identity          → { identity, soul, emotional_history, gestures }
 * GET  /api/identity?type=gestures → { name: params, ... }
 * POST /api/identity          → { identity?, soul?, emotion?, gestures? } → merge + save
 */

const { kv } = require('@vercel/kv');

const STATE_KEY   = 'form:state';
const GESTURE_KEY = 'form:gestures';

const EMPTY_STATE = () => ({
  identity:         {},
  soul:             {},
  emotional_history: [],
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET ───────────────────────────────────────────────────────────────────

  if (req.method === 'GET') {
    try {
      if (req.query?.type === 'gestures') {
        const gestures = await kv.get(GESTURE_KEY) || {};
        return res.status(200).json(gestures);
      }

      const state = await kv.get(STATE_KEY) || EMPTY_STATE();
      return res.status(200).json(state);

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST ──────────────────────────────────────────────────────────────────

  if (req.method === 'POST') {
    try {
      const { identity, soul, emotion, gestures } = req.body || {};

      // Merge identity / soul
      if (identity || soul || emotion !== undefined) {
        const state = await kv.get(STATE_KEY) || EMPTY_STATE();

        if (identity && typeof identity === 'object') {
          Object.assign(state.identity, identity);
        }
        if (soul && typeof soul === 'object') {
          Object.assign(state.soul, soul);
        }
        if (emotion && typeof emotion === 'object') {
          state.emotional_history.unshift(emotion);
          state.emotional_history = state.emotional_history.slice(0, 20);
        }

        await kv.set(STATE_KEY, state);
      }

      // Merge custom gesture vocabulary
      if (gestures && typeof gestures === 'object') {
        const existing = await kv.get(GESTURE_KEY) || {};
        Object.assign(existing, gestures);
        await kv.set(GESTURE_KEY, existing);
      }

      return res.status(200).json({ ok: true });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
