// AI Creative Studio — Worker (Cloudflare Workers + D1)
// Phase 1 — Core AI API server (Google Gemini) + static frontend
// Phase 2 — Google OAuth login + sessions (users table)
// Phase 3 — Plan limits, API key server-side only, WAF protection
// Phase 4 — Studio Control (ON/OFF) + content CMS + project save
// Phase 5 — Free/Pro feature access + usage quotas + admin panel
// Phase 6 — Admin Dashboard, Usage, Audit Logs, AI Models management
// Phase 7 — Brain CMS (11-Layer), creative mode, voice/video studios
// Phase 8 — Pro-status handling, expiry, project drafts, prompt v2
// Phase 9 — Fallback models, first-time index, security tests, CI
// Phase 10 — Dependency-free module splitting (Studio/V2 lazy load)
// Phase 11 — Cookie-based session (login stays alive in new tabs)
// Phase 12 — Image (AI Image Studio) + voice generation
// Phase 13 — Creations saved in browser IndexedDB (Option 2)
// Phase 14 — API test limits (rate limiting) table + admin limits

import { handleStudioRequest } from './studios.js';
import { adminApi, ADMIN_HTML } from './admin.js';
import { handleTestRoutes } from './test-routes.js';
import { checkFeatureEnabled, checkLimit, incrementUsage, getDailyLimit } from './core/limits.js';
import { verifyJwt, signJwt, safeDecode } from './core/jwt.js';
import { getGoogleUser } from './core/google.js';
import { getStudioSettings } from './core/studioSettings.js';
import { FEATURE_REGISTRY } from './config/features.js';
import { getFeatureSettings } from './core/featureSettings.js';
import { STUDIO_REGISTRY } from './config/studios.js';
import { getAiModels } from './core/aiModels.js';
import { checkApiLimit } from './core/apiTestLimits.js';

const htmlPage = (body) => new Response('<!DOCTYPE html>\n<html lang="my"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>AI Creative Studio</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#080C18;color:#F8FAFC;margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;box-sizing:border-box}code{background:#111A2C;padding:2px 6px;border-radius:6px;font-size:.9em}.card{max-width:640px;width:100%;background:#0D1424;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px;box-shadow:0 18px 60px rgba(0,0,0,.28)}.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}</style></head><body><div class="card">' + body + '</div></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

const json = (data, status = 200, cors = null) => {
  const h = { 'Content-Type': 'application/json; charset=utf-8' };
  if (cors) Object.assign(h, cors);
  return new Response(JSON.stringify(data), { status, headers: h });
};

const CORS_ALL = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
});

const corsFor = (request, env) => {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.some((a) => a === origin)) return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' };
  return {};
};

function isStudioApiPath(path) {
  return /^\/api\/studio\/(?:content|story|short|image|voice|shop)(?:\/.*)?$/.test(path) &&
    /\/(?:generate|revise|tts|transcribe|srt|translate-srt|video|video-image|prompt|ad-prompt)$/.test(path);
}

function getBearer(request) {
  const authHeader = request.headers.get('Authorization') || '';
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  return bearer;
}

async function getSessionUser(env, request) {
  const token = getBearer(request);
  if (token) {
    const user = await verifyJwt(env, token);
    if (user && user.email) return user;
  }
  const c = request.headers.get('Cookie') || '';
  const m = c.match(/(?:^|;\s*)aics_token=([^;]+)/);
  if (m) {
    try {
      const user = await verifyJwt(env, decodeURIComponent(m[1]));
      if (user && user.email) return user;
    } catch (e) {}
  }
  return null;
}

function validToken(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return false;
  if (token.length > 8000) return false;
  if (/^[a-z0-9._-]+$/i.test(token) || /^[a-zA-Z0-9+/=_-]+$/.test(token)) return true;
  return false;
}

async function getOrCreateUser(env, user, request) {
  const cors = corsFor(request, env);
  const email = String(user.email || '').toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  const userId = user.sub;
  const existing = await env.DB.prepare('SELECT id, email, plan, expiry FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    const ins = await env.DB.prepare('UPDATE users SET name = CASE WHEN name = \'\' THEN ? ELSE name END, updated_at = datetime(\'now\') WHERE id = ?').bind(String(user.name || '').slice(0, 60), userId).run();
    const expiry = existing.expiry;
    const effective = expiry && String(expiry).length >= 10 ? expiry : (existing.plan === 'PRO' ? null : null);
    return { id: existing.id, email: existing.email, name: existing.name, plan: existing.plan, expiry: existing.expiry, sub: userId };
  }
  const ins = await env.DB.prepare('INSERT INTO users (email, name, plan, created_at, updated_at) VALUES (?, ?, \'FREE\', datetime(\'now\'), datetime(\'now\'))').bind(email, String(user.name || '').slice(0, 60)).run();
  return { id: ins.meta.last_row_id, email, name: String(user.name || '').slice(0, 60), plan: 'FREE', expiry: null, sub: userId };
}

const makeToken = async (env, user) => {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(env, {
    sub: String(user.id),
    email: String(user.email),
    plan: user.plan,
    exp: now + 60 * 60 * 24 * 30,
  });
};

async function getCmsForStudio(env, studio) {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM cms_prompts WHERE studio=? ORDER BY plan, type').bind(studio).all();
    return results || [];
  } catch (e) {
    return [];
  }
}

function pickCms(rows, plan, type) {
  const exact = rows.find((r) => r.plan === plan && String(r.type) === String(type));
  if (exact) return exact;
  const planAny = rows.find((r) => r.plan === plan && !r.type);
  if (planAny) return planAny;
  const typeAny = rows.find((r) => r.plan !== plan && String(r.type) === String(type));
  if (typeAny) return typeAny;
  return rows.find((r) => !r.plan && !r.type) || null;
}

const ALLOWED_TYPES = ['text', 'image', 'voice', 'transcribe'];

function summarizeImagePrompt(prompt) {
  const p = String(prompt || '');
  const max = 2200;
  return p.length <= max ? p : p.slice(0, max) + ' …(truncated for image model)';
}

function summarizeForSystem(prompt) {
  const p = String(prompt || '');
  const max = 3500;
  return p.length <= max ? p : p.slice(0, max) + '…';
}

function getFallbackModel(env, category) {
  const list = (env.AI_MODEL_FALLBACKS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (category === 'image') {
    const img = list.find((m) => m.startsWith('imagen-') || m.startsWith('gemini-2.0-flash-preview-image') || m.includes('image'));
    if (img) return img;
  }
  return null;
}

function inferCategory(modelId) {
  const id = String(modelId || '');
  if (id.startsWith('imagen-') || id.includes('-image') || id === 'gemini-2.0-flash-preview-image-generation') return 'image';
  if (id.startsWith('gemini-2.5-flash') || id.startsWith('gemini-2.0-flash') || id.startsWith('gemini-1.5')) return 'text';
  return 'text';
}

async function runGemini(env, body) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(body.model) + ':generateContent';
  const key = env.GEMINI_API_KEY || '';
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: body.contents, generationConfig: body.generationConfig, safetySettings: body.safetySettings }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('Gemini bad response: ' + text.slice(0, 200)); }
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) || 'Gemini error ' + res.status;
    throw new Error(msg);
  }
  const textPart = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || []).filter((p) => p.text).map((p) => p.text).join('\n');
  return { text: textPart, raw: data };
}

async function runImage(env, body) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(body.model) + ':predict';
  const key = env.GEMINI_API_KEY || '';
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ instances: [{ prompt: summarizeImagePrompt(body.prompt) }], parameters: { sampleCount: 1, aspectRatio: body.aspectRatio || '1:1' } }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('Image bad response: ' + text.slice(0, 200)); }
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) || 'Image error ' + res.status;
    throw new Error(msg);
  }
  const img = (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) || '';
  const mime = (data.predictions && data.predictions[0] && data.predictions[0].mimeType) || 'image/png';
  if (!img) throw new Error('No image bytes returned');
  return { b64: img, mime };
}

async function runTts(env, body) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(body.model) + ':generateContent';
  const key = env.GEMINI_API_KEY || '';
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: body.text || body.prompt || '' }] }], generationConfig: { responseModalities: ['AUDIO'], voice: body.voice || 'Kaya' } }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('TTS bad response: ' + text.slice(0, 200)); }
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) || 'TTS error ' + res.status;
    throw new Error(msg);
  }
  const part = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || []).find((p) => p.inlineData);
  if (!part || !part.inlineData) throw new Error('No audio returned');
  return { b64: part.inlineData.data, mime: part.inlineData.mimeType || 'audio/mpeg' };
}

async function runTranscribe(env, body) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(body.model) + ':generateContent';
  const key = env.GEMINI_API_KEY || '';
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: body.prompt || '' }, { inlineData: { mimeType: body.mimeType || 'audio/mpeg', data: body.audioB64 || '' } }] }], generationConfig: body.generationConfig }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error('Transcribe bad response: ' + text.slice(0, 200)); }
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) || 'Transcribe error ' + res.status;
    throw new Error(msg);
  }
  const textPart = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || []).filter((p) => p.text).map((p) => p.text).join('\n');
  return { text: textPart, raw: data };
}

async function generateImageFromPrompt(env, studio, plan, payload, user) {
  const models = await getAiModels(env);
  const imageModels = models.filter((m) => m.category === 'image' && m.enabled !== false);
  const primary = imageModels.find((m) => m.is_default) || imageModels[0];
  const model = primary ? primary.id : 'imagen-3.0-generate-002';
  return runImage(env, { model, prompt: payload.prompt, aspectRatio: payload.aspectRatio });
}

async function generateVoiceFromPrompt(env, studio, plan, payload, user) {
  const models = await getAiModels(env);
  const voiceModels = models.filter((m) => m.category === 'voice' && m.enabled !== false);
  const primary = voiceModels.find((m) => m.is_default) || voiceModels[0];
  const model = primary ? primary.id : 'gemini-2.0-flash-exp-voice';
  return runTts(env, { model, text: payload.text, voice: payload.voice });
}

async function transcribeVoice(env, studio, plan, payload, user) {
  const models = await getAiModels(env);
  const txModels = models.filter((m) => m.category === 'transcribe' && m.enabled !== false);
  const primary = txModels.find((m) => m.is_default) || txModels[0];
  const model = primary ? primary.id : 'gemini-2.0-flash';
  return runTranscribe(env, { model, prompt: payload.prompt, audioB64: payload.audioB64, mimeType: payload.mimeType, generationConfig: { temperature: 0.2 } });
}

async function runModel(env, body) {
  const category = inferCategory(body.model);
  if (category === 'image') return runImage(env, body);
  if (category === 'voice') return runTts(env, body);
  if (category === 'transcribe') return runTranscribe(env, body);
  return runGemini(env, body);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const aiTestPage = () => `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Test</title>
<style>
body{font-family:system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 14px;background:#0d1117;color:#e6edf3}
input,select,textarea,button{width:100%;box-sizing:border-box;margin:6px 0;padding:10px;border-radius:8px;border:1px solid #30363d;background:#161b22;color:#e6edf3}
button{background:#238636;border:none;cursor:pointer;font-weight:bold}
pre{background:#161b22;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap}
label{font-size:12px;color:#8b949e}
h1{font-size:22px}
</style>
</head>
<body>
<h1>🤖 AI Test — Phase 4 Studio API</h1>
<p>Test token (paste from browser DevTools → Application → Local Storage → aics_token):</p>
<input id="tok" placeholder="aics_token">
<button onclick="run()">Run Test</button>
<pre id="out">Result…</pre>
<script>
function run(){
  var t=document.getElementById('tok').value.trim();
  var o=document.getElementById('out');
  o.textContent='Loading…';
  fetch('/api/studio/story/generate',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify({prompt:'hello in myanmar',model:'gemini-2.5-flash'})})
  .then(r=>r.json()).then(d=>{
    if(d.found){o.textContent="FOUND ✅ "+d.studio+"/"+d.plan+"/"+d.type+"\n\n"+d.system_prompt;}
    else{o.textContent="NOT FOUND — "+JSON.stringify(d);}
  }).catch(e=>{o.textContent='ERROR: '+e;});
}
</script>
</body>
</html>`;

const cmsTestPage = () => `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CMS Test</title>
<style>
body{font-family:system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 14px;background:#0d1117;color:#e6edf3}
input,select,textarea,button{width:100%;box-sizing:border-box;margin:6px 0;padding:10px;border-radius:8px;border:1px solid #30363d;background:#161b22;color:#e6edf3}
button{background:#238636;border:none;cursor:pointer;font-weight:bold}
pre{background:#161b22;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap}
label{font-size:12px;color:#8b949e}
h1{font-size:22px}
</style>
</head>
<body>
<h1>📋 CMS Test</h1>
<p>Test token (paste from browser DevTools → Application → Local Storage → aics_token):</p>
<input id="tok" placeholder="aics_token">
<button onclick="run()">Run Test</button>
<pre id="out">Result…</pre>
<script>
function run(){
  var t=document.getElementById('tok').value.trim();
  var o=document.getElementById('out');
  o.textContent='Loading…';
  fetch('/api/cms',{method:'GET',headers:{'Authorization':'Bearer '+t}})
  .then(r=>r.json()).then(d=>{
    o.textContent=d.output?("["+d.studio+"/"+d.plan+"/"+d.type+"]\n\n"+d.output):("ERROR: "+(d.error||"")+" "+(d.detail||""));})';
    else{o.textContent='NO CMS rows — '+JSON.stringify(d);}
  }).catch(e=>{o.textContent='ERROR: '+e;});
}
</script>
</body>
</html>`;

const studioTestPage = () => `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Studio Test</title>
<style>
body{font-family:system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 14px;background:#0d1117;color:#e6edf3}
input,select,textarea,button{width:100%;box-sizing:border-box;margin:6px 0;padding:10px;border-radius:8px;border:1px solid #30363d;background:#161b22;color:#e6edf3}
button{background:#238636;border:none;cursor:pointer;font-weight:bold}
pre{background:#161b22;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap}
label{font-size:12px;color:#8b949e}
h1{font-size:22px}
</style>
</head>
<body>
<h1>🧪 Studio Test</h1>
<p>Test token:</p>
<input id="tok" placeholder="aics_token">
<button onclick="run()">Run</button>
<pre id="out">Result…</pre>
<script>
function run(){
  var t=document.getElementById('tok').value.trim();
  var o=document.getElementById('out');
  o.textContent='Loading…';
  fetch('/api/studio/shop/generate',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify({prompt:'test'})})
  .then(r=>r.json()).then(d=>{o.textContent=JSON.stringify(d,null,2);})
  .catch(e=>{o.textContent='ERROR: '+e;});
}
</script>
</body>
</html>`;

const creationsTestPage = () => `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Creations Test</title>
<style>
body{font-family:system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 14px;background:#0d1117;color:#e6edf3}
input,select,textarea,button{width:100%;box-sizing:border-box;margin:6px 0;padding:10px;border-radius:8px;border:1px solid #30363d;background:#161b22;color:#e6edf3}
button{background:#238636;border:none;cursor:pointer;font-weight:bold}
pre{background:#161b22;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap}
label{font-size:12px;color:#8b949e}
h1{font-size:22px}
</style>
</head>
<body>
<h1>🖼️ Creations Test</h1>
<p>Test token:</p>
<input id="tok" placeholder="aics_token">
<button onclick="run()">Run</button>
<pre id="out">Result…</pre>
<script>
function run(){
  var t=document.getElementById('tok').value.trim();
  var o=document.getElementById('out');
  o.textContent='Loading…';
  fetch('/api/studio/voice/generate',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify({prompt:'test voice'})})
  .then(r=>r.json()).then(d=>{o.textContent=JSON.stringify(d,null,2);})
  .catch(e=>{o.textContent='ERROR: '+e;});
}
</script>
</body>
</html>`;

const notFoundPage = () => `<div style="text-align:center"><h1>404</h1><p style="color:#8b949e">Page not found</p><a href="/app" style="color:#58a6ff">Go home</a></div>`;

async function oauthRedirectPage() {
  return `<!DOCTYPE html><html lang="my"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login…</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#0d1117;color:#e6edf3}code{background:#161b22;padding:2px 8px;border-radius:6px}</style></head><body><div style="max-width:420px;padding:24px"><h2>🔐 Login…</h2><p>Google login redirecting…</p></div><script>
try{
  const q = new URLSearchParams(location.search);
  const next = q.get('next') || '/app';
  const allowed = ['/app', '/admin'];
  const ok = allowed.some((a) => next === a || next.startsWith(a + '/'));
  const dest = ok ? next : '/app';
  location.href = dest;
}catch(e){ location.href='/app'; }
</script></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = corsFor(request, env);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': origin || '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' } });
    }

    // ── Static routes ──────────────────────────────────────────────
    if (path === '/' || path === '/index.html') return new Response('AI Creative Studio API is running', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    if (path === '/health') return json({ ok: true, status: 'ok', time: new Date().toISOString() }, 200, cors);
    if (path === '/app') return htmlPage(frontendSsrHtml());
    if (path === '/admin') return htmlPage(adminSsrHtml(env));
    if (path === '/app/creations') return htmlPage(creationsPageHtml());
    if (path === '/login') return oauthRedirectPage();
    if (path === '/logout') return htmlPage(logoutPage());

    // ── Test pages (dev only) ─────────────────────────────────────
    if (path === '/ai-test') return htmlPage(aiTestPage());
    if (path === '/cms-test') return htmlPage(cmsTestPage());
    if (path === '/studio-test') return htmlPage(studioTestPage());
    if (path === '/creations-test') return htmlPage(creationsTestPage());

    // ── Auth routes ────────────────────────────────────────────────
    if (path === '/api/auth/login') {
      const next = url.searchParams.get('next') || '/app';
      const allowed = ['/app', '/admin'];
      const okNext = allowed.some((a) => next === a || next.startsWith(a + '/'));
      const dest = okNext ? next : '/app';
      const redirectUri = url.origin + '/api/auth/callback';
      const clientId = env.GOOGLE_CLIENT_ID || '';
      if (!clientId) return json({ error: 'google_not_configured', detail: 'GOOGLE_CLIENT_ID missing' }, 500, cors);
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent select_account',
        state: dest,
      });
      return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString(), 302);
    }

    if (path === '/api/auth/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state') || '/app';
      if (!code) return json({ error: 'missing_code' }, 400, cors);
      const redirectUri = url.origin + '/api/auth/callback';
      const clientId = env.GOOGLE_CLIENT_ID || '';
      const clientSecret = env.GOOGLE_CLIENT_SECRET || '';
      if (!clientId || !clientSecret) return json({ error: 'google_not_configured', detail: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing' }, 500, cors);
      try {
        const tok = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
        });
        const tokJson = await tok.json();
        if (!tok.ok || !tokJson.access_token) return json({ error: 'google_token_failed', detail: tokJson.error_description || 'token exchange failed' }, 400, cors);
        const user = await getGoogleUser(tokJson.access_token);
        const saved = await getOrCreateUser(env, user, request);
        if (!saved) return json({ error: 'invalid_email' }, 400, cors);
        const token = await makeToken(env, saved);
        const allowed = ['/app', '/admin'];
        const dest = allowed.some((a) => state === a || state.startsWith(a + '/')) ? state : '/app';
        const html = `<!DOCTYPE html><html lang="my"><head><meta charset="utf-8"><title>Login OK</title></head><body><script>
        const dest = ${JSON.stringify(dest)};
        const allowed = ${JSON.stringify(allowed)};
        const ok = allowed.some((a) => dest === a || dest.startsWith(a + '/'));
        localStorage.setItem('aics_token', ${JSON.stringify(token)});
        document.cookie = 'aics_token=' + encodeURIComponent(${JSON.stringify(token)}) + '; Path=/; Max-Age=' + (60*60*24*30) + '; SameSite=Lax; ' + (location.protocol === 'https:' ? 'Secure;' : '');
        location.href = ok ? dest : '/app';
        </script></body></html>`;
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      } catch (e) {
        return json({ error: 'callback_error', detail: String(e && e.message || e) }, 500, cors);
      }
    }

    // ── API: users ────────────────────────────────────────────────
    if (path === '/api/users/me') {
      const payload = await getSessionUser(env, request);
      if (!payload || !payload.email) return json({ error: 'unauthorized' }, 401, cors);
      const adminEmail = env.ADMIN_EMAIL || '';
      const isAdmin = Boolean(adminEmail) && String(payload.email || '').toLowerCase() === String(adminEmail).toLowerCase();
      return json({ ok: true, email: payload.email, plan: payload.plan || 'FREE', isAdmin }, 200, cors);
    }

    if (path === '/api/auth/status') {
      const payload = await getSessionUser(env, request);
      if (!payload || !payload.email) return json({ ok: false, loggedIn: false }, 200, cors);
      return json({ ok: true, loggedIn: true, email: payload.email, plan: payload.plan || 'FREE' }, 200, cors);
    }

    if (path === '/api/logout') {
      const html = `<html><body><script>localStorage.removeItem('aics_token');document.cookie='aics_token=; Max-Age=0; Path=/; SameSite=Lax';location.href='/app';</script></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // ── API: studios ──────────────────────────────────────────────
    if (path === '/api/studios') {
      const settings = await getStudioSettings(env);
      const enabled = {};
      Object.keys(STUDIO_REGISTRY).forEach((id) => { enabled[id] = settings[id] !== false; });
      return json({ ok: true, items: Object.keys(STUDIO_REGISTRY).map((id) => ({ id, name: STUDIO_REGISTRY[id].name, nameMy: STUDIO_REGISTRY[id].nameMy, enabled: enabled[id] })) }, 200, cors);
    }

    if (path === '/api/features') {
      const settings = await getFeatureSettings(env);
      return json({ ok: true, items: Object.keys(FEATURE_REGISTRY).map((id) => ({ id, enabled: settings[id].enabled, access: settings[id].access, limit_value: settings[id].limit_value })) }, 200, cors);
    }

    if (path === '/api/models') {
      const models = await getAiModels(env);
      return json({ ok: true, items: models.map((m) => ({ id: m.id, name: m.name, category: m.category, plan_access: m.plan_access, is_default: m.is_default })) }, 200, cors);
    }

    if (isStudioApiPath(path)) {
      return handleStudioRequest(request, path, env, getSessionUser, getCmsForStudio, pickCms, runModel, escapeHtml, checkFeatureEnabled, checkLimit, incrementUsage, getDailyLimit, FEATURE_REGISTRY, getFeatureSettings, checkApiLimit);
    }

    const adminResult = await adminApi(request, path, env, getSessionUser);
    if (adminResult) return adminResult;

    // ── API: projects (Phase 5) ───────────────────────────────────
    if (path === '/api/projects' && request.method === 'GET') {
      const user = await getSessionUser(env, request);
      if (!user) return json({ error: 'unauthorized' }, 401, cors);
      const { results } = await env.DB.prepare('SELECT id, title, data, updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC').bind(user.id).all();
      return json({ ok: true, items: results }, 200, cors);
    }

    if (path === '/api/projects' && request.method === 'POST') {
      const user = await getSessionUser(env, request);
      if (!user) return json({ error: 'unauthorized' }, 401, cors);
      const body = await request.json().catch(() => null);
      if (!body || !body.title) return json({ error: 'title_required' }, 400, cors);
      const r = await env.DB.prepare('INSERT INTO projects (user_id, title, data, created_at, updated_at) VALUES (?, ?, ?, datetime(\'now\'), datetime(\'now\'))').bind(user.id, String(body.title).slice(0, 120), JSON.stringify(body.data || {})).run();
      return json({ ok: true, id: r.meta.last_row_id }, 200, cors);
    }

    if (path.indexOf('/api/projects/') === 0 && request.method === 'PUT') {
      const id = decodeURIComponent(path.slice('/api/projects/'.length));
      const user = await getSessionUser(env, request);
      if (!user) return json({ error: 'unauthorized' }, 401, cors);
      const body = await request.json().catch(() => null);
      await env.DB.prepare('UPDATE projects SET title=?, data=?, updated_at=datetime(\'now\') WHERE id=? AND user_id=?').bind(String((body && body.title) || '').slice(0, 120), JSON.stringify((body && body.data) || {}), id, user.id).run();
      return json({ ok: true }, 200, cors);
    }

    if (path.indexOf('/api/projects/') === 0 && request.method === 'DELETE') {
      const id = decodeURIComponent(path.slice('/api/projects/'.length));
      const user = await getSessionUser(env, request);
      if (!user) return json({ error: 'unauthorized' }, 401, cors);
      await env.DB.prepare('DELETE FROM projects WHERE id=? AND user_id=?').bind(id, user.id).run();
      return json({ ok: true }, 200, cors);
    }

    if (path === '/api/admin' || path === '/api/admin/') {
      const user = await getSessionUser(env, request);
      if (!user) return json({ error: 'unauthorized' }, 401, cors);
      const adminEmail = env.ADMIN_EMAIL || '';
      if (!adminEmail || String(user.email).toLowerCase() !== String(adminEmail).toLowerCase()) return json({ error: 'forbidden' }, 403, cors);
      return json({ ok: true }, 200, cors);
    }

    // ── Admin panel page ──────────────────────────────────────────
    if (path === '/admin') {
      const user = await getSessionUser(env, request);
      if (!user || !user.email) return new Response('Redirecting to login…', { status: 302, headers: { Location: '/api/auth/login?next=' + encodeURIComponent('/admin') } });
      const adminEmail = env.ADMIN_EMAIL || '';
      if (!adminEmail || String(user.email).toLowerCase() !== String(adminEmail).toLowerCase()) {
        return new Response('Admin only', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      return htmlPage(ADMIN_HTML);
    }

    // ── Static asset serving (per-page) ───────────────────────────
    if (path.indexOf('/app/') === 0) {
      const slug = path.startsWith('/app/') ? path.replace(/\/+$/, '').split('/').pop() : '';
      if (slug === 'creations') return htmlPage(creationsPageHtml());
      if (slug === 'story') return htmlPage(storyPageHtml());
      if (slug === 'content') return htmlPage(contentPageHtml());
      if (slug === 'short') return htmlPage(shortPageHtml());
      if (slug === 'image') return htmlPage(imagePageHtml());
      if (slug === 'voice') return htmlPage(voicePageHtml());
      if (slug === 'shop') return htmlPage(shopPageHtml());
    }

    // ── Test routes (imported, Phase 9) ───────────────────────────
    const testResult = await handleTestRoutes(request, path, env);
    if (testResult) return testResult;

    return json({ error: 'not_found', path }, 404, cors);
  },
};

// ═══ SSR HTML (Phase 10: Studio pages lazy-load from /api/frontend/studio/…js) ═══

const frontendSsrHtml = () => `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>AI Creative Studio — ဖန်တီးကြည့်ရအောင်</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✦</text></svg>">
<style>
:root{--bg:#080C18;--panel:#0D1424;--card:#111A2C;--card2:#151F33;--line:rgba(255,255,255,.08);--text:#F8FAFC;--muted:#8D98AB;--cyan:#00E5FF;--purple:#7B5CFF;--green:#4ADE80;--orange:#FF9F2B;--red:#FF6672;--shadow:0 18px 60px rgba(0,0,0,.28);--radius:16px}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Myanmar",sans-serif}
body{background:radial-gradient(900px 500px at 85% -10%,rgba(123,92,255,.13),transparent 55%),radial-gradient(700px 500px at 10% 0%,rgba(0,229,255,.07),transparent 52%),var(--bg)}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
.hidden{display:none!important}
#loading{min-height:100vh;display:grid;place-items:center;color:var(--muted);font-size:14px;padding:30px;text-align:center}
#app{min-height:100vh}
.topbar{position:sticky;top:0;z-index:50;height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;background:rgba(8,12,24,.82);backdrop-filter:blur(20px);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:11px;cursor:pointer}
.brand-mark{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--purple),var(--cyan));box-shadow:0 8px 28px rgba(0,229,255,.15);font-size:18px}
.brand-title{font-weight:800;font-size:13px;letter-spacing:.04em}.brand-sub{font-size:10px;color:var(--muted);margin-top:2px}
.top-actions{display:flex;align-items:center;gap:12px}
.avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--purple),var(--cyan));color:#fff;font-size:13px;font-weight:800;cursor:pointer;border:1px solid rgba(255,255,255,.12)}
.wrap{max-width:1240px;margin:0 auto;padding:22px 20px 60px}
.hero{display:grid;grid-template-columns:1.25fr .75fr;gap:20px;align-items:center;padding:34px 26px;border-radius:20px;background:linear-gradient(135deg,rgba(21,31,51,.95),rgba(13,20,36,.95));border:1px solid var(--line);box-shadow:var(--shadow)}
.hero h1{font-size:30px;line-height:1.22;margin:0 0 10px;letter-spacing:-.02em}
.hero h1 b{background:linear-gradient(90deg,var(--cyan),var(--purple));-webkit-background-clip:text;background-clip:text;color:transparent}
.hero p{margin:0;color:var(--muted);font-size:14px;line-height:1.7}
.hero .cta{margin-top:20px}
.hero-card{position:relative;min-height:150px;border-radius:18px;overflow:hidden;background:linear-gradient(135deg,rgba(0,229,255,.14),rgba(123,92,255,.16));border:1px solid rgba(0,229,255,.14);padding:20px;font-size:12px;line-height:1.8}
.section{display:flex;justify-content:space-between;align-items:center;gap:14px;margin:30px 0 14px}
.section h2{font-size:19px;margin:0;letter-spacing:-.01em}.section .sub{font-size:11px;color:var(--muted)}
.grid{display:grid;gap:14px;grid-template-columns:repeat(4,minmax(0,1fr))}
.studio{position:relative;padding:20px;border-radius:16px;background:linear-gradient(180deg,rgba(21,31,51,.96),rgba(15,24,41,.96));border:1px solid var(--line);cursor:pointer;transition:.22s;overflow:hidden}
.studio:hover{transform:translateY(-3px);border-color:rgba(0,229,255,.28);box-shadow:0 18px 44px rgba(0,0,0,.24)}
.studio .icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-size:20px;margin-bottom:13px;background:rgba(0,229,255,.09);border:1px solid rgba(0,229,255,.12)}
.studio h3{margin:0 0 5px;font-size:15px}.studio p{margin:0;font-size:11.5px;color:var(--muted);line-height:1.6}
.studio .go{position:absolute;right:14px;bottom:12px;font-size:11px;color:var(--cyan);opacity:0;transition:.2s}
.studio:hover .go{opacity:1}
.studio.disabled{opacity:.4;pointer-events:none;filter:grayscale(.5)}
.pro-badge{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.08em;padding:3px 7px;border-radius:999px;background:rgba(123,92,255,.16);color:#C9BCFF;border:1px solid rgba(123,92,255,.28);text-transform:uppercase}
.footer{border-top:1px solid var(--line);margin-top:44px;padding:20px 0 30px;color:var(--muted);font-size:11px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
@media(max-width:980px){.hero{grid-template-columns:1fr}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.grid{grid-template-columns:1fr}.hero h1{font-size:25px}.wrap{padding:16px 14px 48px}}
</style>
</head>
<body>
<div id="loading">✦ AI Creative Studio — ဖွင့်နေပါသည်…</div>
<div id="app" class="hidden">
<header class="topbar">
  <div class="brand" onclick="location.href='/app'"><div class="brand-mark">✦</div><div><div class="brand-title">AI CREATIVE STUDIO</div><div class="brand-sub">Premium Myanmar AI</div></div></div>
  <div class="top-actions">
    <span style="font-size:11px;color:var(--muted)" id="planBadge"></span>
    <div class="avatar" id="avatarBtn" title="Account">?</div>
  </div>
</header>
<div class="wrap">
  <div class="hero">
    <div>
      <h1>Myanmar ကို ဦးတည်တဲ့ <b>AI Creative Studio</b></h1>
      <p>စာသား (Story/Content/Short)၊ ဗီဒီယို (AI Video)၊ ပုံ (Image)၊ အသံ (Voice) တွေကို မြန်မာလို ဖန်တီးပါ။ Prompt ရိုက်ရုံနဲ့ ချက်ချင်း အဆင်သင့်။</p>
      <div class="cta"><button class="btn primary" id="ctaBtn">စတင်ဖန်တီးမယ် →</button></div>
    </div>
    <div class="hero-card">✦ + ✦ + ✦<br>Story · Video · Content · Short · Image · Voice · Shop<br>Premium AI Features — Myanmar First</div>
  </div>
  <div class="section"><div><h2>AI Studios</h2><div class="sub">ရွေးချယ်ပြီး စတင်ပါ</div></div></div>
  <div class="grid" id="studioGrid">…</div>
</div>
<div class="footer"><span>© 2026 AI Creative Studio</span><span>Made in Myanmar 🇲🇲</span></div>
</div>
<script>
// Phase 10 — Studio modules lazy-load
const STUDIOS=[
  {id:'STORY',name:'AI Story',my:'📖',desc:'မြန်မာစာသားဖြင့် ဇာတ်လမ်းဖန်တီးပါ',path:'/api/frontend/studio/story.js',plan:'FREE'},
  {id:'CONTENT',name:'AI Content',my:'📝',desc:'Marketing / Article စာသားများ ဖန်တီးပါ',path:'/api/frontend/studio/content.js',plan:'FREE'},
  {id:'SHORT',name:'AI Short',my:'⚡',desc:'ဇာတ်လမ်းတို (Short Story) ဖန်တီးပါ',path:'/api/frontend/studio/short.js',plan:'FREE'},
  {id:'IMAGE',name:'AI Image',my:'🖼️',desc:'ပုံဖန်တီးပါ — မြန်မာလို ရေးရုံပဲ',path:'/api/frontend/studio/image.js',plan:'FREE'},
  {id:'VOICE',name:'AI Voice',my:'🎙️',desc:'စာသားကို အသံအဖြစ် ဖန်တီးပါ',path:'/api/frontend/studio/voice.js',plan:'FREE'},
  {id:'SHOP',name:'AI Shop',my:'🛍️',desc:'ဆိုရှယ်မီဒီယာ Post / Ad စာသားများ',path:'/api/frontend/studio/shop.js',plan:'FREE'}
];
var token=localStorage.getItem('aics_token')||'';
function boot(){
  fetch('/api/studios').then(function(r){return r.json();}).then(function(d){
    var enabled={};(d.items||[]).forEach(function(s){enabled[s.id]=s.enabled;});
    var grid=document.getElementById('studioGrid');
    grid.innerHTML=STUDIOS.map(function(s){
      var on=enabled[s.id]!==false;
      return '<div class="studio '+(on?'':'disabled')+'" onclick="'+((token&&on)?'go(\''+s.id+'\')':'login()')+'">'+
        '<div class="icon">'+s.my+'</div><h3>'+s.name+'</h3><p>'+s.desc+'</p>'+
        '<span class="go">ဖွင့်မယ် →</span></div>';
    }).join('')||'<div class="studio">Studio list unavailable</div>';
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('loading').style.display='none';
    document.getElementById('ctaBtn').onclick=function(){ if(token){go('STORY');}else{login();} };
  }).catch(function(){document.getElementById('app').classList.remove('hidden');document.getElementById('loading').style.display='none';});
  fetch('/api/users/me').then(function(r){return r.json();}).then(function(d){
    if(d&&d.email){
      document.getElementById('planBadge').textContent='Plan: '+(d.plan||'FREE');
      document.getElementById('avatarBtn').textContent=(d.email||'?').slice(0,1).toUpperCase();
    }else{ document.getElementById('planBadge').textContent=''; document.getElementById('avatarBtn').textContent='?'; }
  }).catch(function(){});
}
function login(){location.href='/api/auth/login?next='+encodeURIComponent(location.pathname||'/app');}
function go(id){location.href='/app/'+id.toLowerCase();}
boot();
</script>
</body>
</html>`;

const adminSsrHtml = (env) => {
  const adminEmail = env.ADMIN_EMAIL || '';
  if (!adminEmail) return `<!DOCTYPE html><html lang="my"><head><meta charset="utf-8"><title>Admin</title></head><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#080C18;color:#F8FAFC"><div style="text-align:center"><h2>Admin Center</h2><p>ADMIN_EMAIL မထားရသေးပါ။ Cloudflare Secret ထဲ ထည့်ပါ။</p></div></body></html>`;
  return `<!DOCTYPE html><html lang="my"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin — AI Creative Studio</title><style>body{font-family:system-ui,sans-serif;background:#080C18;color:#F8FAFC;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box}code{background:#111A2C;padding:2px 8px;border-radius:6px;font-size:.9em}</style></head><body><div style="max-width:560px;text-align:center;background:#0D1424;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:30px"><h2>🔐 Admin login</h2><p style="color:#8D98AB">Admin အကောင့်နဲ့ ဝင်ရောက်ပါ။</p><a href="/api/auth/login?next=%2Fadmin" style="display:inline-block;margin-top:14px;background:linear-gradient(135deg,#00BFD6,#008FA4);color:#fff;padding:11px 18px;border-radius:10px;text-decoration:none">Google နဲ့ ဝင်မည်</a></div></body></html>`;
};

const creationsPageHtml = () => `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>My Creations — AI Creative Studio</title>
<style>
body{font-family:system-ui,sans-serif;background:#080C18;color:#F8FAFC;margin:0;min-height:100vh}
.wrap{max-width:1080px;margin:0 auto;padding:24px 18px 60px}
.topbar{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(8,12,24,.8);backdrop-filter:blur(16px);position:sticky;top:0}
.card{background:#0D1424;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;margin-bottom:12px}
button{cursor:pointer;border:none;border-radius:9px;padding:8px 13px;font-size:13px}
.btn{background:#00BFD6;color:#fff}
.muted{color:#8D98AB;font-size:12px}
.empty{text-align:center;padding:60px 20px;color:#8D98AB}
</style>
</head>
<body>
<div class="topbar"><div style="font-weight:800">✦ My Creations</div><button class="btn" onclick="location.href='/app'">← App</button></div>
<div class="wrap"><div id="list" class="empty">Loading…</div></div>
<script>
function load(){
  var t=localStorage.getItem('aics_token')||'';
  var box=document.getElementById('list');
  fetch('/api/creations',{headers:{'Authorization':'Bearer '+t}}).then(function(r){return r.json();}).then(function(d){
    var items=d.items||[];
    if(!items.length){box.className='empty';box.innerHTML='<b>မဖန်တီးရသေးပါ။</b><br><br><button class="btn" onclick="location.href=\'/app\'">စတင်ဖန်တီးမယ်</button>';return;}
    box.className='';
    box.innerHTML=items.map(function(c){
      return '<div class="card"><b>'+esc(c.title||'Untitled')+'</b><div class="muted" style="margin-top:6px">'+esc(c.type||'')+' · '+esc(c.created_at||'')+'</div></div>';
    }).join('');
  }).catch(function(e){box.innerHTML='<div class="card">Error: '+esc(String(e&&e.message||e))+'</div>';});
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
load();
</script>
</body>
</html>`;

const storyPageHtml = () => studioPageTemplate('STORY', 'Story', '📖', 'story');
const contentPageHtml = () => studioPageTemplate('CONTENT', 'Content', '📝', 'content');
const shortPageHtml = () => studioPageTemplate('SHORT', 'Short', '⚡', 'short');
const imagePageHtml = () => studioPageTemplate('IMAGE', 'Image', '🖼️', 'image');
const voicePageHtml = () => studioPageTemplate('VOICE', 'Voice', '🎙️', 'voice');
const shopPageHtml = () => studioPageTemplate('SHOP', 'Shop', '🛍️', 'shop');

const studioPageTemplate = (id, name, icon, slug) => `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${name} — AI Creative Studio</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${icon}</text></svg>">
<style>
:root{--bg:#080C18;--panel:#0D1424;--card:#111A2C;--card2:#151F33;--line:rgba(255,255,255,.08);--text:#F8FAFC;--muted:#8D98AB;--cyan:#00E5FF;--purple:#7B5CFF;--green:#4ADE80;--orange:#FF9F2B;--red:#FF6672;--radius:16px}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Myanmar",sans-serif}
body{background:radial-gradient(900px 500px at 85% -10%,rgba(123,92,255,.13),transparent 55%),radial-gradient(700px 500px at 10% 0%,rgba(0,229,255,.07),transparent 52%),var(--bg)}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
.hidden{display:none!important}
.topbar{position:sticky;top:0;z-index:50;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:rgba(8,12,24,.84);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;cursor:pointer}
.brand-mark{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,var(--purple),var(--cyan));font-size:16px}
.brand-title{font-weight:800;font-size:12px}
.back{color:var(--muted);text-decoration:none;font-size:12px;border:1px solid var(--line);padding:7px 11px;border-radius:9px}
.wrap{max-width:960px;margin:0 auto;padding:20px 18px 60px}
.panel{background:linear-gradient(180deg,rgba(21,31,51,.97),rgba(15,24,41,.97));border:1px solid var(--line);border-radius:var(--radius);padding:18px;box-shadow:0 10px 34px rgba(0,0,0,.1)}
.studio-head{display:flex;align-items:center;gap:13px;margin-bottom:14px}
.studio-head .icon{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;font-size:20px;background:rgba(0,229,255,.09);border:1px solid rgba(0,229,255,.12)}
.studio-head h1{font-size:19px;margin:0}
.studio-head .sub{font-size:11px;color:var(--muted);margin-top:3px}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:13px}
.tab{font-size:11.5px;padding:7px 11px;border-radius:9px;border:1px solid var(--line);color:var(--muted);cursor:pointer;background:transparent}
.tab.on{background:rgba(0,229,255,.1);border-color:rgba(0,229,255,.2);color:#fff}
textarea{width:100%;min-height:110px;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:#0C1525;color:#EAF0F7;padding:11px;font-size:13px;outline:none;resize:vertical;box-sizing:border-box}
textarea:focus{border-color:rgba(0,229,255,.42);box-shadow:0 0 0 3px rgba(0,229,255,.06)}
.gen-btn{width:100%;padding:13px;border:none;border-radius:11px;background:linear-gradient(135deg,#00BFD6,#008FA4);color:#fff;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 10px 26px rgba(0,229,255,.14)}
.gen-btn:disabled{opacity:.55;cursor:not-allowed}
.model-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}
.model-row select{background:#0C1525;border:1px solid rgba(255,255,255,.1);color:#EAF0F7;border-radius:9px;padding:8px 10px;font-size:12px;outline:none}
.out{background:#0A111E;border:1px solid var(--line);border-radius:12px;padding:14px;white-space:pre-wrap;font-size:13px;line-height:1.7;min-height:80px;margin-top:14px}
.progress{height:3px;background:rgba(0,229,255,.15);border-radius:3px;overflow:hidden;margin-top:10px;display:none}
.progress>div{height:100%;width:40%;background:linear-gradient(90deg,var(--cyan),var(--purple));animation:slide 1.1s ease-in-out infinite}
@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
.plan-tag{font-size:9.5px;font-weight:800;letter-spacing:.08em;padding:3px 7px;border-radius:999px;background:rgba(123,92,255,.16);color:#C9BCFF;border:1px solid rgba(123,92,255,.28);text-transform:uppercase}
.muted{color:var(--muted);font-size:11px}
.err{color:#FF8E98;font-size:12px;margin-top:8px}
.footer{margin-top:30px;text-align:center;color:var(--muted);font-size:10.5px}
@media(max-width:560px){.wrap{padding:14px 12px 50px}.studio-head h1{font-size:17px}}
</style>
</head>
<body>
<div class="topbar"><div class="brand" onclick="location.href='/app'"><div class="brand-mark">${icon}</div><div class="brand-title">${name}</div></div><a class="back" href="/app">← Home</a></div>
<div class="wrap">
  <div class="panel">
    <div class="studio-head"><div class="icon">${icon}</div><div><h1>${name} — AI ဖန်တီးမှု</h1><div class="sub">${id} Studio · Premium Myanmar AI</div></div></div>
    <div class="tabs" id="tabs"><button class="tab on" data-t="1">စာသား</button><button class="tab" data-t="2">ဗီဒီယို</button></div>
    <textarea id="prompt" placeholder="ဥပမာ — ${name} အတွက် သင့်ရဲ့စာသားကို ရေးပါ…"></textarea>
    <div class="model-row"><select id="model"></select><span id="planTag" class="plan-tag">FREE</span></div>
    <button class="gen-btn" id="genBtn">✦ ${name} ဖန်တီးမယ်</button>
    <div class="progress" id="prog"><div></div></div>
    <div class="err" id="err"></div>
    <div class="out" id="out">Result က ဒီမှာ ပေါ်ပါမယ်…</div>
  </div>
  <div class="footer">✦ ${name} Studio — AI Creative Studio © 2026</div>
</div>
<script>
var STUDIO='${id}';var TOKEN=localStorage.getItem('aics_token')||'';
var tabs=[['1','စာသား'],['2','ဗီဒီယို']];
function init(){
  if(!TOKEN){location.href='/api/auth/login?next='+encodeURIComponent('/app/'+'${slug}');return;}
  var tabsBox=document.getElementById('tabs');tabsBox.innerHTML='';
  tabs.forEach(function(t){var b=document.createElement('button');b.className='tab'+(t[0]==='1'?' on':'');b.textContent=t[1];b.onclick=function(){setTab(t[0]);};tabsBox.appendChild(b);});
  loadModels();
  document.getElementById('genBtn').onclick=generate;
  fetch('/api/users/me').then(function(r){return r.json();}).then(function(d){
    if(d&&d.email){document.getElementById('planTag').textContent='Plan: '+(d.plan||'FREE');if(d.isAdmin){var a=document.createElement('a');a.href='/admin';a.textContent=' · Admin';a.style.color='#00E5FF';a.style.marginLeft='6px';document.getElementById('planTag').appendChild(a);}}
  }).catch(function(){});
}
function setTab(t){document.querySelectorAll('#tabs .tab').forEach(function(b){b.className='tab'+(b.getAttribute('data-t')===t?' on':'');});}
function loadModels(){
  fetch('/api/models').then(function(r){return r.json();}).then(function(d){
    var sel=document.getElementById('model');sel.innerHTML='';
    (d.items||[]).forEach(function(m){
      if(m.category!=='${slug==='image'?'image':(slug==='voice'?'voice':'text')}')return;
      var o=document.createElement('option');o.value=m.id;o.textContent=m.name||m.id;sel.appendChild(o);
    });
    if(!sel.options.length){var o=document.createElement('option');o.value='gemini-2.5-flash';o.textContent='gemini-2.5-flash (default)';sel.appendChild(o);}
  }).catch(function(){});
}
function generate(){
  var prompt=document.getElementById('prompt').value.trim();
  if(!prompt){document.getElementById('err').textContent='Prompt ရိုက်ပါ။';return;}
  document.getElementById('err').textContent='';
  var t=document.querySelector('#tabs .tab.on');var mode=t?t.getAttribute('data-t'):'1';
  var btn=document.getElementById('genBtn');btn.disabled=true;btn.textContent='⏳ ဖန်တီးနေသည်…';
  document.getElementById('prog').style.display='block';
  var out=document.getElementById('out');out.textContent='…';
  fetch('/api/studio/${slug}/generate',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN},body:JSON.stringify({prompt:prompt,model:document.getElementById('model').value,mode:mode})})
  .then(function(r){return r.json();}).then(function(d){
    document.getElementById('prog').style.display='none';btn.disabled=false;btn.textContent='✦ ${name} ဖန်တီးမယ်';
    if(d.error&&d.detail){out.textContent='ERROR: '+d.detail;return;}
    out.textContent=d.output||d.text||JSON.stringify(d);
  }).catch(function(e){document.getElementById('prog').style.display='none';btn.disabled=false;btn.textContent='✦ ${name} ဖန်တီးမယ်';out.textContent='Network error: '+String(e&&e.message||e);});
}
init();
</script>
</body>
</html>`;

const logoutPage = () => `<!DOCTYPE html><html lang="my"><head><meta charset="utf-8"><title>Logged out</title></head><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#080C18;color:#F8FAFC"><div style="text-align:center"><h2>ထွက်လိုက်ပါပြီ</h2><p class="muted">ပြန်ဝင်ရန် → <a href="/api/auth/login?next=%2Fapp" style="color:#00E5FF">Login</a></p></div></body></html>`;
