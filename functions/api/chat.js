import { DEFAULT_GUIDELINES } from './_defaults.js';

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...CORS, ...(init.headers || {}) },
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

function buildSystemPrompt() {
  return `คุณคือผู้ช่วยแพทย์ผู้เชี่ยวชาญด้านแนวทางการดูแลผู้ป่วยโรคหลอดเลือดสมองเฉียบพลัน ของโรงพยาบาลสงฆ์
ตอบเป็นภาษาไทย ชัดเจน กระชับ เป็นขั้นตอน
หากคำถามอยู่นอกเหนือแนวทาง ให้แนะนำปรึกษาอายุรแพทย์ประสาทวิทยา

════ แนวทางการรักษา ════

${DEFAULT_GUIDELINES}

═══════════════════════`;
}

function normalizeMessages(messages) {
  const sys = { role: 'system', content: buildSystemPrompt() };
  const safe = Array.isArray(messages) ? messages : [];
  return [sys, ...safe]
    .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content }));
}

async function callOpenAICompatible({ endpoint, apiKey, model, messages }) {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      messages,
    }),
  });
  const dataText = await r.text();
  if (!r.ok) throw new Error(dataText || `HTTP ${r.status}`);
  const data = JSON.parse(dataText);
  return data?.choices?.[0]?.message?.content || 'ไม่ได้รับคำตอบ';
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const provider = String(body?.provider || '').trim();
  const messages = normalizeMessages(body?.messages);

  try {
    if (provider === 'groq') {
      if (!env.GROQ_API_KEY) return json({ error: 'ยังไม่ได้ตั้งค่า GROQ_API_KEY ใน Cloudflare Pages (Environment Variables/Secrets)' }, { status: 400 });
      const reply = await callOpenAICompatible({
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
        messages,
      });
      return json({ reply });
    }

    if (provider === 'openrouter') {
      if (!env.OPENROUTER_API_KEY) return json({ error: 'ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ใน Cloudflare Pages (Environment Variables/Secrets)' }, { status: 400 });
      const reply = await callOpenAICompatible({
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: env.OPENROUTER_API_KEY,
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages,
      });
      return json({ reply });
    }

    if (provider === 'together') {
      if (!env.TOGETHER_API_KEY) return json({ error: 'ยังไม่ได้ตั้งค่า TOGETHER_API_KEY ใน Cloudflare Pages (Environment Variables/Secrets)' }, { status: 400 });
      const reply = await callOpenAICompatible({
        endpoint: 'https://api.together.xyz/v1/chat/completions',
        apiKey: env.TOGETHER_API_KEY,
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages,
      });
      return json({ reply });
    }

    return json({ error: 'Unknown provider' }, { status: 400 });
  } catch (e) {
    return json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

