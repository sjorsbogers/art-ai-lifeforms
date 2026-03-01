/**
 * api/code.js
 * Serves whitelisted JS source files so FORM can introspect its own code.
 *
 * GET /api/code?file=gestures.js -> { file, content }
 */

const fs   = require('fs');
const path = require('path');

const ALLOWED = [
  'gestures.js',
  'brain.js',
  'scene.js',
  'display.js',
  'config.js',
  'identity.js',
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const file = req.query?.file;

  if (!file || !ALLOWED.includes(file)) {
    return res.status(403).json({
      error: 'Not allowed',
      allowed: ALLOWED,
    });
  }

  try {
    const filePath = path.join(process.cwd(), 'lifeforms/01-pin-grid/js', file);
    const content  = fs.readFileSync(filePath, 'utf8');
    return res.status(200).json({ file, content });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
