import { DEFAULT_STEPS, DEFAULT_GUIDELINES } from './_defaults.js';

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const r = url.searchParams.get('r') || 'all';

  const kv = env.STROKE_KV;
  let steps = null, guidelines = null;

  try {
    if ((r === 'steps' || r === 'all') && kv) {
      const raw = await kv.get('quick_steps');
      steps = raw ? JSON.parse(raw) : DEFAULT_STEPS;
    } else if (r === 'steps') {
      steps = DEFAULT_STEPS;
    }

    if ((r === 'guidelines' || r === 'all') && kv) {
      const raw = await kv.get('guidelines');
      guidelines = raw || DEFAULT_GUIDELINES;
    } else if (r === 'guidelines') {
      guidelines = DEFAULT_GUIDELINES;
    }

    const result = {};
    if (r === 'steps' || r === 'all') result.steps = steps || DEFAULT_STEPS;
    if (r === 'guidelines' || r === 'all') result.guidelines = guidelines || DEFAULT_GUIDELINES;

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...CORS, 'Cache-Control': 'no-store' },
    });
  } catch (_e) {
    const fallback = {};
    if (r === 'steps' || r === 'all') fallback.steps = DEFAULT_STEPS;
    if (r === 'guidelines' || r === 'all') fallback.guidelines = DEFAULT_GUIDELINES;
    return new Response(JSON.stringify({ ok: true, ...fallback, _fallback: true }), {
      headers: CORS,
    });
  }
}

