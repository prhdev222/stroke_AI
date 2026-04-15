import { DEFAULT_GUIDELINES, DEFAULT_STEPS } from './_defaults.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function bad(msg, status = 400) {
  return json({ ok: false, error: msg }, { status });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const pinExpected = String(env.ADMIN_PIN || '').trim();
  if (!pinExpected) return bad('ADMIN_PIN ไม่ถูกตั้งค่าใน env ของ Cloudflare Pages', 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('Invalid JSON');
  }

  const pin = String(body?.pin || '').trim();
  if (!pin || pin !== pinExpected) return bad('PIN ไม่ถูกต้อง', 401);

  const kv = env.STROKE_KV;
  if (!kv) return bad('ยังไม่ได้ bind KV: STROKE_KV', 500);

  const nextGuidelines = typeof body?.guidelines === 'string' ? body.guidelines : null;
  const nextSteps = Array.isArray(body?.steps) ? body.steps : null;

  if (nextGuidelines === null && nextSteps === null) {
    return bad('ต้องส่งอย่างน้อยหนึ่งค่า: guidelines หรือ steps');
  }

  try {
    if (nextGuidelines !== null) {
      const g = nextGuidelines.trim();
      await kv.put('guidelines', g.length ? g : DEFAULT_GUIDELINES);
    }
    if (nextSteps !== null) {
      // validate minimal shape
      const sane = nextSteps.map(s => ({
        id: String(s?.id || '').trim(),
        ico: String(s?.ico || '📋'),
        ttl: String(s?.ttl || '').trim(),
        step: String(s?.step || '').trim(),
        qs: Array.isArray(s?.qs) ? s.qs.map(q => String(q)) : [],
      })).filter(s => s.id && s.ttl);

      await kv.put('quick_steps', JSON.stringify(sane.length ? sane : DEFAULT_STEPS));
    }
    return json({ ok: true });
  } catch (e) {
    return bad(e?.message || 'Server error', 500);
  }
}

