import { handleAuthRoutes } from './routes/auth.routes.js';
import { handlePlanRoutes } from './routes/plans.routes.js';
import { handleUserRoutes } from './routes/users.routes.js';
import { handleAiModelRoutes } from './routes/aiModels.routes.js';
import { handleByokRoutes } from './routes/byok.routes.js';
import { handleAiRoutes } from './routes/ai.routes.js';
import { handleCmsRoutes } from './routes/cms.routes.js';
import { handleIdeasRoutes } from './routes/ideas.routes.js';
import { handleGenericStudioRoute } from './routes/studio.routes.js';
import { handleContentStudioRoutes } from './routes/studios/content.routes.js';
import { handleStoryStudioRoutes } from './routes/studios/story.routes.js';
import { handleShortStudioRoutes } from './routes/studios/short.routes.js';
import { handleImageStudioRoutes } from './routes/studios/image.routes.js';
import { handleVoiceStudioRoutes } from './routes/studios/voice.routes.js';
import { handleShopStudioRoutes } from './routes/studios/shop.routes.js';
import { enforceSharedAiRateLimit, isApiRequestBodyTooLarge } from './middleware/requestGuards.js';
import { buildCors } from './middleware/cors.js';
// AI Creative Studio — Cloudflare Worker (Phase 3e+ — hardened errors + Phase 2 core modular)
import { verifyToken } from './core/auth.js';


import { ndjsonResponse } from './core/streaming.js';










import { handleProjectRoutes } from './routes/projects.routes.js';
import { trackUsage } from './core/usage.js';

import { isStudioEnabled } from './core/studioSettings.js';
import { checkFeature } from './core/featureSettings.js';
import { getStudio } from './config/studios.js';
import { getUserApiKey } from './core/utilities.js';
import { APP_HTML } from './frontend.js';
// V2 — Lazy Loading (rule 10): Studio page code ကို ထို Studio ဖွင့်မှသာ Load လုပ်သည်
// (v1 က Studio 6 ခုလုံး၏ HTML ကို Worker boot တွင် အကုန် အဆင်သင့် လုပ်ထားသည်)
import { getStudioPage } from './frontend/studioPages.js';
import { CREATIONS_HTML } from './frontend/creations.js';
import { IDEAS_HTML } from './frontend/ideas.js';
import { SETTINGS_HTML } from './frontend/settings.js';
import { PROJECTS_HTML } from './frontend/projects.js';
import { LOGIN_HTML } from './frontend/login.js';
import { PRELOGIN_HOME_HTML } from './frontend/prelogin-home.js';
import { ADMIN_HTML, adminApi } from './admin.js';


// Production-readiness (CORS): per-request allowed-origin enforcement.
// We never fall back to '*' for cross-origin requests. Only origins listed in
// the environment's ALLOWED_ORIGINS (wrangler.toml per env.dev/staging/prod)
// are echoed back; same-origin / no-Origin requests simply get no ACAO header.
function json(data, status, c) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: { 'Content-Type': 'application/json', ...c } });
}

// Rule 22 — Error Handling: User ကို Technical Error အပြည့်မပြပါ။
// အသေးစိတ် Error ကို Server Log ထဲတွင် သိမ်းပြီး User ကို ဖော်ရွေသော Message သာ ပြသည်
function friendlyError(e) {
  try { console.error('[AICS]', (e && e.stack) || e); } catch (_) {}
  return 'Something went wrong. Please try again.';
}

function htmlPage(html) {
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function bearer(req) {
  const h = req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

async function readBody(request) {
  try { return await request.json(); } catch (e) { return null; }
}

// STEP 8 — Bound API JSON request bodies before any route calls request.json().
// Keep enough room for the existing base64 image/audio workflows, while rejecting
// oversized bodies before they reach route parsing or Gemini/D1 work.
// Admin Panel ကို Browser မှ တိုက်ရိုက် နှိပ်ဝင်နိုင်ရန် Cookie Session (Phase 11 — Rule 13)
// HttpOnly Cookie — Frontend JS မှ မဖတ်နိုင်၊ CSRF ကာကွယ်ရန် SameSite=Lax
function cookieToken(req) {
  const c = req.headers.get('Cookie') || '';
  const m = c.match(/(?:^|;\s*)aics_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

function clearSessionCookie() {
  return 'aics_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

async function verifyTokenSafe(env, token) {
  try { return await verifyToken(env, token); } catch (e) { return null; }
}

// Phase 12-fix — App Page တိုင်းအတွက် Server-side Session Guard:
// Cookie (သို့) Authorization မရှိလျှင် → Professional Login Page (/login) သို့ ပို့သည်
// (Login မဝင်ဘဲ Home/Studio စာမျက်နှာများ မမြင်ရအောင် — "Login လိုအပ်ပါသည်" ကို မပြဘဲ /login သို့ တန်းသွားသည်)
async function appSessionGuard(request, env, origin) {
  const c = cookieToken(request);
  if (!c) return { redirect: origin + '/login' };
  const p = await verifyTokenSafe(env, c);
  if (!p) return { redirect: origin + '/login', clear: true };
  return null;
}

// Phase 12-fix — /login သို့ ရောက်လာသူသည် Session ရှိပြီးသားဆိုလျှင်
// Login Screen ကို မပြဘဲ Personal Workspace (/app) သို့ တိုက်ရိုက်ပို့သည် (Remember Session — Rule 14)
async function loginGuardRedirect(request, env, origin) {
  const c = cookieToken(request);
  if (!c) return null;
  const p = await verifyTokenSafe(env, c);
  if (!p) return new Response(null, { status: 302, headers: { Location: origin + '/login', 'Set-Cookie': clearSessionCookie() } });
  return new Response(null, { status: 302, headers: { Location: origin + '/app' } });
}

async function resolvePlan(env, payload) {
  if (!payload || !payload.sub || !env.DB) return 'FREE';
  try {
    const row = await env.DB.prepare('SELECT plan, expiry FROM users WHERE id = ?').bind(payload.sub).first();
    if (!row) return 'FREE';
    if (row.plan === 'PRO' && row.expiry && new Date(row.expiry) < new Date()) return 'FREE';
    return row.plan || 'FREE';
  } catch (e) { return 'FREE'; }
}

// Usage Tracking — Track လုပ်ရာတွင် မှားယွင်းမှု ရှိလျှင်ပင် အဓိက API မထိခိုက်စေရန် Safe Wrapper (Phase 3)
async function trackUsageSafe(env, userId, category) {
  try { await trackUsage(env, userId, category); } catch (e) {}
}

// Phase 5 — Feature Check (Rule 15): Free/Pro ကို Admin Config (feature_settings) ဖြင့် ထိန်းချုပ်သည်
// မသင့်လျော်ပါက json 403 Response ကို ပြန်ပေးသည် (မှန်လျှင် null)
async function requireFeature(env, featureId, plan, reqType, corsHeaders) {
  const r = await checkFeature(env, featureId, plan, reqType);
  if (r.ok) return null;
  if (r.reason === 'settings_unavailable') {
    return json({ error: 'feature_settings_unavailable', detail: 'Feature settings ကို ယခု စစ်ဆေးမရပါ။ ခဏနေမှ ပြန်ကြိုးစားပါ။' }, 503, corsHeaders);
  }
  const msg = r.reason === 'pro_type'
    ? 'ဒီ feature က PRO အတွက်ပါ။ Type 1 ကို သုံးပါ၊ သို့မဟုတ် upgrade လုပ်ပါ။'
    : (r.reason === 'disabled' ? 'ဒီ feature ကို ယခု ပိတ်ထားပါသည်။' : 'ဒီ feature က PRO အတွက်ပါ။');
  return json({ error: r.reason === 'disabled' ? 'feature_disabled' : 'pro_only', detail: msg }, 403, corsHeaders);
}

// Studio Disabled ဖြစ်ပါက ပြမည့် Friendly စာမျက်နှာ (Phase 4 — Rule 14)
function studioDisabledPage(studioId) {
  const s = getStudio(studioId);
  const name = s ? s.nameMy : studioId;
  return '<!DOCTYPE html><html lang="my"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + name + ' — ပိတ်ထားသည်</title></head>' +
    '<body style="font-family:sans-serif;background:#080c18;color:#e8ecf4;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px">' +
    '<div style="max-width:420px;text-align:center;background:#151b2b;border:1px solid #26324a;border-radius:14px;padding:32px">' +
    '<div style="font-size:40px">🔒</div>' +
    '<h2 style="margin:12px 0;color:#00e5ff">' + name + ' ကို ယခု ပိတ်ထားပါသည်</h2>' +
    '<p style="color:#94a3b8;font-size:14px;line-height:1.7">ဤ Studio ကို Admin မှ ခေတ္တ ပိတ်ထားပါသည်။ နောက်မှ ပြန်ဖွင့်ပါမည်။</p>' +
    '<a href="/app" style="display:inline-block;margin-top:16px;padding:11px 22px;background:#00e5ff;color:#001014;border-radius:10px;text-decoration:none;font-weight:bold">🏠 ပင်မသို့ ပြန်သွားရန်</a>' +
    '</div></body></html>';
}

function loginResultPage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Login OK</title></head>' +
    '<body style="font-family:sans-serif;max-width:640px;margin:24px auto;padding:0 16px;background:#F4F3EE;color:#1A1B1C">' +
    '<h2 style="color:#52C41A">✅ Login OK</h2>' +
    '<p>Copy your token below.</p>' +
    '<textarea id="tok" rows="4" style="width:100%;font-family:monospace;font-size:12px;box-sizing:border-box"></textarea>' +
    '<br><button onclick="cp()" style="margin-top:8px;padding:10px 22px;font-size:14px">📋 Copy Token</button>' +
    '<div id="status" style="margin-top:8px;font-size:13px"></div>' +
    '<script>' +
    'var h=location.hash.replace("#token=","");' +
    'document.getElementById("tok").value=decodeURIComponent(h);' +
    'function cp(){var t=document.getElementById("tok");t.select();document.execCommand("copy");document.getElementById("status").textContent="Copied ✅";}' +
    '<\/script></body></html>';
}

function aiTestPage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Test</title></head>' +
    '<body style="font-family:sans-serif;max-width:640px;margin:24px auto;padding:0 16px;background:#F4F3EE;color:#1A1B1C">' +
    '<h2 style="color:#1b6d96">🤖 AI Router Test</h2>' +
    '<label style="font-size:13px;font-weight:600">Session Token</label><br><input id="tok" type="password" style="width:100%;padding:8px;box-sizing:border-box"><br>' +
    '<label style="font-size:13px;font-weight:600">Prompt</label><br>' +
    '<textarea id="p" rows="3" style="width:100%;font-size:13px;box-sizing:border-box">Hello</textarea>' +
    '<label style="font-size:13px;font-weight:600">Gemini API Key (BYOK — optional)</label><br>' +
    '<input id="key" type="password" style="width:100%;font-size:13px;box-sizing:border-box;padding:8px">' +
    '<br><button onclick="run()" style="margin-top:8px;padding:10px 22px;font-size:14px">▶ Run</button>' +
    '<div id="out" style="margin-top:10px;padding:12px;background:#fff;border-radius:8px;border:1px solid #E4E3DD;font-size:13px;white-space:pre-wrap;min-height:60px">Result will show here.</div>' +
    '<script>' +
    'function run(){var o=document.getElementById("out");o.textContent="Loading...";' +
    'fetch("/api/ai/test",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+document.getElementById("tok").value.trim()},' +
    'body:JSON.stringify({prompt:document.getElementById("p").value,apiKey:document.getElementById("key").value})})' +
    '.then(function(r){return r.json();}).then(function(d){o.textContent=d.output?("✅ "+d.output):("ERROR: "+(d.error||"")+" "+(d.detail||""));})' +
    '.catch(function(e){o.textContent="Network error: "+e;});}' +
    '<\/script></body></html>';
}

function cmsTestPage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CMS Test</title></head>' +
    '<body style="font-family:sans-serif;max-width:640px;margin:24px auto;padding:0 16px;background:#F4F3EE;color:#1A1B1C">' +
    '<h2 style="color:#1b6d96">📋 CMS Test</h2>' +
    '<label style="font-size:13px;font-weight:600">Session Token</label><br>' +
    '<textarea id="tok" rows="3" style="width:100%;font-family:monospace;font-size:12px;box-sizing:border-box"></textarea>' +
    '<label style="font-size:13px;font-weight:600">Studio</label><br>' +
    '<input id="st" value="STORY" style="width:100%;font-size:13px;box-sizing:border-box;padding:8px">' +
    '<label style="font-size:13px;font-weight:600">Type (1-5)</label><br>' +
    '<input id="ty" value="1" style="width:100%;font-size:13px;box-sizing:border-box;padding:8px">' +
    '<br><button onclick="run()" style="margin-top:8px;padding:10px 22px;font-size:14px">📥 Get Prompt</button>' +
    '<div id="out" style="margin-top:10px;padding:12px;background:#fff;border-radius:8px;border:1px solid #E4E3DD;font-size:13px;white-space:pre-wrap;min-height:60px">Result will show here.</div>' +
    '<script>' +
    'function run(){var o=document.getElementById("out");o.textContent="Loading...";' +
    'fetch("/api/cms/prompt",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+document.getElementById("tok").value},' +
    'body:JSON.stringify({studio:document.getElementById("st").value,type:document.getElementById("ty").value})})' +
    '.then(function(r){return r.json();}).then(function(d){' +
    'if(d.found){o.textContent="FOUND ✅ "+d.studio+"/"+d.plan+"/"+d.type+"\\n\\n"+d.system_prompt;}' +
    'else{o.textContent="NOT FOUND — "+document.getElementById("st").value+"/"+document.getElementById("ty").value;}})' +
    '.catch(function(e){o.textContent="Network error: "+e;});}' +
    '<\/script></body></html>';
}

function studioTestPage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio Test</title></head>' +
    '<body style="font-family:sans-serif;max-width:640px;margin:24px auto;padding:0 16px;background:#F4F3EE;color:#1A1B1C">' +
    '<h2 style="color:#1b6d96">🎨 Studio Engine Test</h2>' +
    '<label style="font-size:13px;font-weight:600">Session Token</label><br>' +
    '<textarea id="tok" rows="3" style="width:100%;font-family:monospace;font-size:12px;box-sizing:border-box"></textarea>' +
    '<label style="font-size:13px;font-weight:600">Studio (STORY / IMAGE / CONTENT ...)</label><br>' +
    '<input id="st" value="STORY" style="width:100%;font-size:13px;box-sizing:border-box;padding:8px">' +
    '<label style="font-size:13px;font-weight:600">Type (1-5)</label><br>' +
    '<input id="ty" value="1" style="width:100%;font-size:13px;box-sizing:border-box;padding:8px">' +
    '<label style="font-size:13px;font-weight:600">User Idea</label><br>' +
    '<textarea id="id" rows="3" style="width:100%;font-size:13px;box-sizing:border-box">Write a short story about a boy and his dog.</textarea>' +
    '<label style="font-size:13px;font-weight:600">Gemini API Key (BYOK — optional)</label><br>' +
    '<input id="key" type="password" style="width:100%;font-size:13px;box-sizing:border-box;padding:8px">' +
    '<br><button onclick="run()" style="margin-top:8px;padding:10px 22px;font-size:14px">▶ Run Studio</button>' +
    '<div id="out" style="margin-top:10px;padding:12px;background:#fff;border-radius:8px;border:1px solid #E4E3DD;font-size:13px;white-space:pre-wrap;min-height:80px">Result will show here.</div>' +
    '<script>' +
    'function run(){var o=document.getElementById("out");o.textContent="Loading...";' +
    'fetch("/api/studio/generate",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+document.getElementById("tok").value},' +
    'body:JSON.stringify({studio:document.getElementById("st").value,type:document.getElementById("ty").value,idea:document.getElementById("id").value,apiKey:document.getElementById("key").value})})' +
    '.then(function(r){return r.json();}).then(function(d){' +
    'if(d.data){o.innerHTML="";var im=document.createElement("img");im.src="data:"+d.mimeType+";base64,"+d.data;im.style.maxWidth="100%";im.style.borderRadius="8px";o.appendChild(im);return;}' +
    'o.textContent=d.output?("["+d.studio+"/"+d.plan+"/"+d.type+"]\\n\\n"+d.output):("ERROR: "+(d.error||"")+" "+(d.detail||""));})' +
    '.catch(function(e){o.textContent="Network error: "+e;});}' +
    '<\/script></body></html>';
}

function creationsTestPage() {
  // Phase 13 — Option 2: Creations ကို Server/D1 တွင် မသိမ်းတော့ပါ (Browser IndexedDB သာ)
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Creations — Client-side</title></head>' +
    '<body style="font-family:sans-serif;max-width:640px;margin:24px auto;padding:0 16px;background:#F4F3EE;color:#1A1B1C">' +
    '<h2 style="color:#1b6d96">💾 My Creations</h2>' +
    '<p style="font-size:14px;line-height:1.6">Phase 13 (Option 2) မှစ၍ User ဖန်တီးမှုအားလုံးကို <b>Browser (IndexedDB)</b> တွင်သာ သိမ်းပါသည်။<br>' +
    'Server/D1 တွင် User Content မသိမ်းတော့ပါ — <code>/api/creations</code> endpoint များကို ဖယ်ရှားပြီးပါပြီ။</p>' +
    '<p style="font-size:14px">My Creations စာမျက်နှာ: <a href="/app/creations">/app/creations</a> (Login ဝင်ပြီးမှ ကြည့်ရှုနိုင်ပါသည်)</p>' +
    '</body></html>';
}

export default {
  async fetch(request, env, ctx) {
    // Per-request CORS headers (allowed-origin enforced via env.ALLOWED_ORIGINS).
    // Declared outside try so the outer error handler can use them too.
    const cors = buildCors(request, env);
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const isProdEnv = String(env.ENVIRONMENT || '').toLowerCase() === 'prod';
      // 204 must carry no body (per Fetch spec); headers still carry the allowlist result.
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

      // Reject oversized API POST bodies before JSON parsing, auth-side effects,
      // database access, or AI provider calls.
      if (await isApiRequestBodyTooLarge(request)) {
        return json({ error: 'request_body_too_large', message: 'Request body exceeds the 32 MiB limit.' }, 413, cors);
      }

      // STEP 9 — shared D1-backed AI generation limit (30 requests/user/10 minutes).
      const rateLimitResponse = await enforceSharedAiRateLimit(request, env, path, { cookieToken, verifyTokenSafe, json, friendlyError });
      if (rateLimitResponse) {
        const headers = new Headers(rateLimitResponse.headers);
        for (const [key, value] of Object.entries(cors)) headers.set(key, value);
        return new Response(rateLimitResponse.body, {
          status: rateLimitResponse.status,
          statusText: rateLimitResponse.statusText,
          headers,
        });
      }

      if (path === '/' && request.method === 'GET') return htmlPage(PRELOGIN_HOME_HTML);

      const authResponse = await handleAuthRoutes(request, env, cors, { json, friendlyError, readBody, verifyTokenSafe, cookieToken, clearSessionCookie });
      if (authResponse) return authResponse;

      if (path === '/auth/result' && request.method === 'GET') return htmlPage(loginResultPage());
      // Phase 12 — Professional Personal Login UI (/login)
      if (path === '/login' || path === '/login/') {
        const loggedIn = await loginGuardRedirect(request, env, url.origin);
        if (loggedIn) return loggedIn;
        return htmlPage(LOGIN_HTML);
      }
      // Phase 12-fix — Login မဝင်ဘဲ App Page များကို မမြင်ရအောင် Session Guard
      // (Sidebar + "Login လိုအပ်ပါသည်" ကို ပြမည့်အစား /login သို့ ပို့သည်)
      if (path === '/app' || path === '/app/') {
        const g = await appSessionGuard(request, env, url.origin);
        if (g) return new Response(null, { status: 302, headers: { Location: g.redirect, ...(g.clear ? { 'Set-Cookie': clearSessionCookie() } : {}) } });
        return htmlPage(APP_HTML);
      }
      // ===== Studio Pages (Phase 4 — Registry + Admin ON/OFF နှင့် ချိတ်သည်) =====
      // Studio Disabled ဖြစ်ပါက Friendly Message ပြပြီး Access ပိတ်သည် (Rule 14 — Server-side)
      // Phase 7 — /app/ မဟုတ်သော Path (ဥပမာ /api/admin/studios/shop) ကို Studio Page နှင့် မရောမှတ်ရန် ပြင်သည်
      // Phase 1 — Loader error contract (Production hardening):
      //   unknown studio        → 404  STUDIO_NOT_FOUND
      //   known, module failed  → 500  STUDIO_PAGE_LOAD_FAILED (module error ကို 404 အဖြစ် မပြ)
      //   user ကို stack trace မပြ; server log တွင် slug + message + error id ထည့်သည်
      {
        // V2 — Lazy Loading: Studio page ကို ထို Studio slug ရှိမှသာ ခေါ်သည် (rule 10)
        const studioSlug = path.startsWith('/app/') ? path.replace(/\/+$/, '').split('/').pop() : '';
        let studioHtml = null;
        try {
          studioHtml = await getStudioPage(studioSlug);
        } catch (e) {
          const errId = Math.random().toString(36).slice(2, 10);
          try {
            console.error('[AICS] studio page load failed ' + JSON.stringify({
              slug: studioSlug,
              errId: errId,
              message: (e && e.message) ? String(e.message) : String(e),
            }));
          } catch (_) {}
          return new Response('STUDIO_PAGE_LOAD_FAILED', {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
        if (studioHtml) {
          const g = await appSessionGuard(request, env, url.origin);
          if (g) return new Response(null, { status: 302, headers: { Location: g.redirect, ...(g.clear ? { 'Set-Cookie': clearSessionCookie() } : {}) } });
          const enabled = await isStudioEnabled(env, studioSlug);
          if (!enabled) return htmlPage(studioDisabledPage(studioSlug));
          return htmlPage(studioHtml);
        }
      }
      if (path === '/app/ideas' || path === '/app/ideas/') {
        const g = await appSessionGuard(request, env, url.origin);
        if (g) return new Response(null, { status: 302, headers: { Location: g.redirect, ...(g.clear ? { 'Set-Cookie': clearSessionCookie() } : {}) } });
        return htmlPage(IDEAS_HTML);
      }
      if (path === '/app/creations' || path === '/app/creations/') {
        const g = await appSessionGuard(request, env, url.origin);
        if (g) return new Response(null, { status: 302, headers: { Location: g.redirect, ...(g.clear ? { 'Set-Cookie': clearSessionCookie() } : {}) } });
        return htmlPage(CREATIONS_HTML);
      }
      if (path === '/app/settings' || path === '/app/settings/') {
        const g = await appSessionGuard(request, env, url.origin);
        if (g) return new Response(null, { status: 302, headers: { Location: g.redirect, ...(g.clear ? { 'Set-Cookie': clearSessionCookie() } : {}) } });
        return htmlPage(SETTINGS_HTML);
      }
      if (path === '/app/projects' || path === '/app/projects/') {
        const g = await appSessionGuard(request, env, url.origin);
        if (g) return new Response(null, { status: 302, headers: { Location: g.redirect, ...(g.clear ? { 'Set-Cookie': clearSessionCookie() } : {}) } });
        return htmlPage(PROJECTS_HTML);
      }
      if (path === '/admin' || path === '/admin/') {
        // Admin Panel — admin မဟုတ်သူတွေ မမြင်ရအောင် Server-side Role Check (Rule 13)
        // Phase 11 — Browser မှ နှိပ်ဝင်သည့်အခါ Authorization Header မပါတတ်သောကြောင့်
        // Cookie Session ကိုပါ လက်ခံသည် (Header က ဦးစားပေး)
        const token = bearer(request) || cookieToken(request);
        if (!token) return Response.redirect(url.origin + '/api/auth/login?next=' + encodeURIComponent(url.origin + '/admin'), 302);
        const payload = await verifyTokenSafe(env, token);
        if (!payload) {
          // Cookie ပျက်သွားပါက Login သို့ ပြန်ပို့ပြီး Cookie ကို ရှင်းသည် (Header ဖြင့်လာပါက 404 ဖြစ်သည်)
          if (cookieToken(request)) {
            return new Response(null, {
              status: 302,
              headers: { Location: url.origin + '/api/auth/login?next=' + encodeURIComponent(url.origin + '/admin'), 'Set-Cookie': clearSessionCookie() },
            });
          }
          return json({ error: 'not_found' }, 404, cors);
        }
        const adminEmail = env.ADMIN_EMAIL || '';
        if (!adminEmail || String(payload.email).toLowerCase() !== String(adminEmail).toLowerCase()) {
          return json({ error: 'not_found' }, 404, cors);
        }
        return htmlPage(ADMIN_HTML);
      }
      const adminResp = await adminApi(request, path, env, verifyToken);
      if (adminResp) return adminResp;
      if (!isProdEnv && path === '/ai-test') return htmlPage(aiTestPage());
      if (!isProdEnv && path === '/cms-test') return htmlPage(cmsTestPage());
      if (!isProdEnv && path === '/studio-test') return htmlPage(studioTestPage());
      if (!isProdEnv && path === '/creations-test') return htmlPage(creationsTestPage());

      const planResponse = await handlePlanRoutes(request, env, cors, { json });
      if (planResponse) return planResponse;

      const userResponse = await handleUserRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan, friendlyError, readBody });
      if (userResponse) return userResponse;

      const aiModelResponse = await handleAiModelRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan });
      if (aiModelResponse) return aiModelResponse;

      const byokResponse = await handleByokRoutes(request, env, cors, { bearer, verifyTokenSafe, json, friendlyError });
      if (byokResponse) return byokResponse;

      const aiResponse = await handleAiRoutes(request, env, cors, { bearer, verifyTokenSafe, json, friendlyError, getUserApiKey });
      if (aiResponse) return aiResponse;

      const cmsResponse = await handleCmsRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan });
      if (cmsResponse) return cmsResponse;

      const ideasResponse = await handleIdeasRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, getUserApiKey, trackUsageSafe, friendlyError });
      if (ideasResponse) return ideasResponse;

      const genericStudioResponse = await handleGenericStudioRoute(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, getUserApiKey, trackUsageSafe, friendlyError, getStudio, isStudioEnabled });
      if (genericStudioResponse) return genericStudioResponse;

      // ===== Studio API — Disabled Studio ကို Server-side တွင် ပိတ်သည် (Rule 14) =====
      // UI တွင် ဖျောက်ထားရုံဖြင့် မရ — API ကိုယ်တိုင် စစ်ဆေးသည်
      {
        const studioApiId = (path.match(/^\/api\/studio\/(story|content|short|image|voice|shop)\//) || [])[1];
        if (studioApiId) {
          const enabled = await isStudioEnabled(env, studioApiId);
          if (!enabled) return json({ error: 'studio_disabled', message: 'This studio is currently disabled.' }, 403, cors);
        }
      }

      const contentStudioResponse = await handleContentStudioRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse, isStudioEnabled });
      if (contentStudioResponse) return contentStudioResponse;

      const storyStudioResponse = await handleStoryStudioRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse, isStudioEnabled });
      if (storyStudioResponse) return storyStudioResponse;

      const shortStudioResponse = await handleShortStudioRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse, isStudioEnabled });
      if (shortStudioResponse) return shortStudioResponse;

      const imageStudioResponse = await handleImageStudioRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse, isStudioEnabled });
      if (imageStudioResponse) return imageStudioResponse;

      const voiceStudioResponse = await handleVoiceStudioRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse, isStudioEnabled });
      if (voiceStudioResponse) return voiceStudioResponse;

      const shopStudioResponse = await handleShopStudioRoutes(request, env, cors, { bearer, verifyTokenSafe, json, resolvePlan, requireFeature, trackUsageSafe, getUserApiKey, friendlyError, ndjsonResponse, isStudioEnabled });
      if (shopStudioResponse) return shopStudioResponse;

      const projectResponse = await handleProjectRoutes(request, env, cors, {
        bearer,
        verifyTokenSafe,
        readBody,
        json,
        friendlyError,
      });
      if (projectResponse) return projectResponse;

      // ===== Creations (Phase 13 — Option 2) =====
      // User ဖန်တီးမှုအားလုံးကို Browser IndexedDB တွင်သာ သိမ်းသည်။
      // Server-side /api/creations endpoints များကို ဖယ်ရှားပြီးပြီ — D1 တွင် User Content မသိမ်းတော့ပါ။

      // Favicon — Console 404 noise ကို ဖယ်ရှားရန် inline SVG icon ပြန်ပေးသည်
      if (path === '/favicon.ico' && request.method === 'GET') {
        const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0d1424"/><text x="16" y="23" font-size="19" text-anchor="middle">🎨</text></svg>';
        return new Response(icon, {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=86400',
            ...cors,
          },
        });
      }

      // Phase 1 — Unknown /app/* path (studio မရှိ) → 404 STUDIO_NOT_FOUND
      // (creations/settings/projects စစ်ပြီးမှသာ ဤနေရာသို့ ရောက်သည် — ထို routes များ မထိခိုက်)
      if (path.startsWith('/app/')) {
        return new Response('STUDIO_NOT_FOUND', {
          status: 404,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      return json({ error: 'not_found', path }, 404, cors);
    } catch (e) {
      return json({ error: 'internal', detail: friendlyError(e) }, 500, cors);
    }
  },
};
