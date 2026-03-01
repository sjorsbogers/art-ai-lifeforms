/**
 * api/chat.js — Edge runtime
 * Pipes NVIDIA / Kimi K2.5 SSE stream directly to the browser.
 * API key lives only in Vercel environment variables, never in code.
 */

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'NVIDIA_API_KEY not configured on server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages } = await req.json();

  const upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'Accept':        'text/event-stream',
    },
    body: JSON.stringify({
      model:       'moonshotai/kimi-k2.5',
      messages,
      max_tokens:  512,
      temperature: 1.0,
      top_p:       1.0,
      stream:      true,
    }),
  });

  // Pipe NVIDIA's SSE stream straight through to the browser
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
