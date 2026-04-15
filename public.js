/**
 * /api/public — Public read-only endpoint (ไม่ต้อง PIN)
 * ใช้โดย index.html เพื่อดึง steps และ guidelines จาก KV
 *
 * GET /api/public?r=steps      → Quick Steps array
 * GET /api/public?r=guidelines → Guideline text (สำหรับ paid AI ที่ call จาก browser)
 * GET /api/public?r=all        → ทั้งคู่
 */

import { DEFAULT_STEPS, DEFAULT_GUIDELINES } from './admin.js';

const CORS = {
  'Content-Type': 'application/json',
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

  } catch (e) {
    // Fallback to defaults on error
    const fallback = {};
    if (r === 'steps' || r === 'all') fallback.steps = DEFAULT_STEPS;
    if (r === 'guidelines' || r === 'all') fallback.guidelines = DEFAULT_GUIDELINES;
    return new Response(JSON.stringify({ ok: true, ...fallback, _fallback: true }), {
      headers: CORS,
    });
  }
}
