/**
 * api/news.js
 * Returns a random headline from BBC News RSS (no API key required).
 *
 * GET /api/news -> { headline }
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rss = await fetch('https://feeds.bbci.co.uk/news/rss.xml', {
      headers: { 'User-Agent': 'FORM-AI-lifeform/1.0' },
    });

    if (!rss.ok) throw new Error(`RSS fetch failed: ${rss.status}`);

    const xml = await rss.text();

    // Extract titles from <item> blocks (skip the channel title, start from items)
    const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g)];
    if (items.length === 0) throw new Error('No items in RSS');

    const limit = Math.min(items.length, 10);
    const pick  = items[Math.floor(Math.random() * limit)];
    const headline = pick[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();

    return res.status(200).json({ headline });

  } catch (err) {
    return res.status(200).json({ headline: 'Nothing today.' });
  }
};
