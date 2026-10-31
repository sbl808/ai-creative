const OAUTH_STATE_COOKIE = 'aics_oauth_state';
const OAUTH_STATE_TTL_SECONDS = 600;
const oauthEncoder = new TextEncoder();

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function createOAuthNonce() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

function safeOAuthRedirect(next, requestOrigin, env = {}) {
  const allowedOrigins = new Set([requestOrigin]);
  for (const value of String(env.ALLOWED_ORIGINS || '').split(',')) {
    const candidate = value.trim();
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
          parsed.origin === candidate.replace(/\/$/, '') &&
          !parsed.username && !parsed.password) allowedOrigins.add(parsed.origin);
    } catch (_) {}
  }

  try {
    const target = new URL(String(next || '/app'), requestOrigin);
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return requestOrigin + '/app';
    if (target.username || target.password || !allowedOrigins.has(target.origin)) return requestOrigin + '/app';
    if (target.protocol === 'http:' && target.hostname !== 'localhost' && target.hostname !== '127.0.0.1') {
      return requestOrigin + '/app';
    }
    return target.href;
  } catch (_) {
    return requestOrigin + '/app';
  }
}

async function createOAuthStateCookieValue(env, state, redirectTo, now = Date.now()) {
  const secret = String(env.SESSION_SIGNING_KEY || '').trim();
  if (!secret) throw new Error('missing_signing_key');
  const payload = {
    state: String(state),
    redirectTo: String(redirectTo),
    expiresAt: Math.floor(now / 1000) + OAUTH_STATE_TTL_SECONDS,
  };
  const encoded = toBase64Url(oauthEncoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', oauthEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, oauthEncoder.encode(encoded));
  return encoded + '.' + toBase64Url(signature);
}

async function verifyOAuthStateCookieValue(env, cookieValue, now = Date.now()) {
  try {
    const secret = String(env.SESSION_SIGNING_KEY || '').trim();
    if (!secret || !cookieValue) return null;
    const parts = String(cookieValue).split('.');
    if (parts.length !== 2) return null;
    const key = await crypto.subtle.importKey('raw', oauthEncoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, fromBase64Url(parts[1]), oauthEncoder.encode(parts[0]));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0])));
    if (!payload || typeof payload.state !== 'string' || !payload.state ||
        typeof payload.redirectTo !== 'string' ||
        !Number.isSafeInteger(payload.expiresAt) || payload.expiresAt <= Math.floor(now / 1000)) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function readCookie(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  const prefix = name + '=';
  for (const item of cookies.split(';')) {
    const part = item.trim();
    if (part.startsWith(prefix)) {
      try { return decodeURIComponent(part.slice(prefix.length)); } catch (_) { return null; }
    }
  }
  return null;
}

import { signToken, hashPassword, verifyPassword } from '../core/auth.js';

export async function handleAuthRoutes(request, env, cors, deps) {
  const path = new URL(request.url).pathname;
  const url = new URL(request.url);
  const { json, friendlyError, readBody, verifyTokenSafe, cookieToken, clearSessionCookie } = deps;

      if (path === '/api/auth/login' && request.method === 'GET') {
        const origin = url.origin;
        const redirectTo = safeOAuthRedirect(url.searchParams.get('next') || '/app', origin, env);
        const state = createOAuthNonce();
        const stateCookie = await createOAuthStateCookieValue(env, state, redirectTo);
        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_ID || '') +
          '&redirect_uri=' + encodeURIComponent(origin + '/api/auth/callback') +
          '&response_type=code&scope=openid%20email%20profile' +
          '&state=' + encodeURIComponent(state) + '&access_type=online';
        return new Response(null, {
          status: 302,
          headers: { Location: authUrl, 'Set-Cookie': OAUTH_STATE_COOKIE + '=' + encodeURIComponent(stateCookie) + '; Path=/api/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600' },
        });
      }

      if (path === '/api/auth/callback' && request.method === 'GET') {
        const stateCookie = readCookie(request, OAUTH_STATE_COOKIE);
        const statePayload = await verifyOAuthStateCookieValue(env, stateCookie);
        const suppliedState = url.searchParams.get('state') || '';
        const stateValid = !!statePayload && !!suppliedState && suppliedState === statePayload.state;
        const clearStateCookie = OAUTH_STATE_COOKIE + '=; Path=/api/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
        const withClearedState = (response) => {
          response.headers.append('Set-Cookie', clearStateCookie);
          return response;
        };
        if (!stateValid) return withClearedState(json({ error: 'invalid_oauth_state' }, 400, cors));
        try {
          const code = url.searchParams.get('code');
          if (!code) return withClearedState(json({ error: 'no_code' }, 400, cors));
          const origin = url.origin;
          const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'code=' + encodeURIComponent(code) +
              '&client_id=' + encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_ID) +
              '&client_secret=' + encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_SECRET) +
              '&redirect_uri=' + encodeURIComponent(origin + '/api/auth/callback') +
              '&grant_type=authorization_code',
          });
          const tokenData = await res.json().catch(() => ({}));
          if (!tokenData.access_token) {
            try { console.error('[AICS] oauth token failed', JSON.stringify(tokenData).slice(0, 300)); } catch (_) {}
            return json({ error: 'auth_failed', detail: 'Login could not be completed. Please try again.' }, 400, cors);
          }
          const ures = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: 'Bearer ' + tokenData.access_token },
          });
          const user = await ures.json().catch(() => ({}));
          if (!user.id || !user.email) {
            try { console.error('[AICS] oauth userinfo failed', JSON.stringify(user).slice(0, 300)); } catch (_) {}
            return json({ error: 'userinfo_failed', detail: 'Login could not be completed. Please try again.' }, 400, cors);
          }

          const existing = env.DB ? await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(user.email).first() : null;
          let userId;
          if (existing) {
            userId = existing.id;
            // Phase 12 — Google မှ Name ပါလာပါက User နာမည် ဖြည့်ပေးသည် (Name ရှိပြီးသားဆိုလျှင် မပြောင်း)
            if (user.name) {
              try {
                await env.DB.prepare('UPDATE users SET name = CASE WHEN name = \'\' THEN ? ELSE name END, updated_at = datetime(\'now\') WHERE id = ?').bind(String(user.name).slice(0, 60), userId).run();
              } catch (e) { console.error('[AICS] update google name failed', String(e)); }
            } else {
              await env.DB.prepare('UPDATE users SET updated_at = datetime(\'now\') WHERE id = ?').bind(userId).run();
            }
          } else {
            const ins = await env.DB.prepare('INSERT INTO users (email, name, plan, created_at, updated_at) VALUES (?, ?, \'FREE\', datetime(\'now\'), datetime(\'now\'))').bind(user.email, String(user.name || '').slice(0, 60)).run();
            userId = ins.meta.last_row_id;
          }

          const token = await signToken(env, { sub: String(userId), email: user.email, plan: 'FREE' });
          // Phase 12 — Default ကို Personal Workspace (/app) သို့ ပြောင်းသည်
          // Phase 11 — Browser မှ Page Navigation များတွင် Header မပါသော်လည်း Admin Panel ဝင်နိုင်ရန်
          // HttpOnly Cookie ကိုပါ ထည့်ပေးသည် (Authorization Header ကို မူလအတိုင်း ထားသည်)
          const sessionCookie = 'aics_token=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800';
          const response = new Response(null, {
            status: 302,
            headers: { Location: statePayload.redirectTo, 'Set-Cookie': sessionCookie },
          });
          return withClearedState(response);
        } catch (e) {
          return withClearedState(json({ error: 'auth_error', detail: friendlyError(e) }, 500, cors));
        }
      }

      // Phase 11 — Logout: HttpOnly Cookie ကို ရှင်းပြီး ပင်မသို့ ပြန်ပို့သည်
      if (path === '/api/auth/logout' && request.method === 'GET') {
        return new Response(null, {
          status: 302,
          headers: { Location: url.origin + '/app', 'Set-Cookie': clearSessionCookie() },
        });
      }

      // ===== Phase 12-fix — Remember Session: Cookie ရှိလျှင် Token ပြန်ပေးသည် =====
      // (App ပြန်ဖွင့်လျှင် localStorage မရှိသော်လည်း Cookie ဖြင့် Session ပြန်ရသည် — Rule 14)
      if (path === '/api/auth/session' && request.method === 'GET') {
        const c = cookieToken(request);
        if (!c) return json({ error: 'no_session' }, 401, cors);
        const p = await verifyTokenSafe(env, c);
        if (!p) return json({ error: 'invalid_session' }, 401, cors);
        return json({ ok: true, token: c, email: p.email, plan: p.plan || 'FREE', user_id: p.sub }, 200, cors);
      }

      // ===== Phase 12 — Email/Password Sign Up (PBKDF2 — Plain Text မသိမ်းပါ) =====
      if (path === '/api/auth/signup' && request.method === 'POST') {
        const body = await readBody(request).catch(() => null);
        const name = String((body && body.name) || '').trim().slice(0, 60);
        const email = String((body && body.email) || '').trim().toLowerCase();
        const password = String((body && body.password) || '');
        if (!name) return json({ error: 'missing_name', detail: 'Name ထည့်ပါ။' }, 400, cors);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_email', detail: 'Email ပုံစံ မမှန်ပါ။' }, 400, cors);
        if (password.length < 6) return json({ error: 'weak_password', detail: 'Password အနည်းဆုံး ၆ လုံး ရှိရပါမည်။' }, 400, cors);
        if (!env.DB) return json({ error: 'db_missing' }, 500, cors);
        const dup = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (dup) return json({ error: 'email_taken', detail: 'ဒီ Email နဲ့ Account ရှိပြီးသားပါ။ Google Login သုံးပါ သို့မဟုတ် Sign in လုပ်ပါ။' }, 409, cors);
        const hash = await hashPassword(password);
        const ins = await env.DB.prepare('INSERT INTO users (email, name, password_hash, plan, created_at, updated_at) VALUES (?, ?, ?, \'FREE\', datetime(\'now\'), datetime(\'now\'))').bind(email, name, hash).run();
        const userId = ins.meta.last_row_id;
        const token = await signToken(env, { sub: String(userId), email, plan: 'FREE' });
        // Phase 12-fix — /app သို့ Browser Navigation မှာပါ Session ရှိစေရန် Cookie ကိုပါ ထည့်ပေးသည်
        const sessionCookie = 'aics_token=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800';
        return json({ ok: true, token, email, name, plan: 'FREE', user_id: String(userId) }, 201, { ...cors, 'Set-Cookie': sessionCookie });
      }

      // ===== Phase 12 — Email/Password Sign In =====
      if (path === '/api/auth/signin' && request.method === 'POST') {
        const body = await readBody(request).catch(() => null);
        const email = String((body && body.email) || '').trim().toLowerCase();
        const password = String((body && body.password) || '');
        if (!email || !password || !env.DB) return json({ error: 'invalid_credentials', detail: 'Email သို့မဟုတ် Password မှားနေပါသည်။' }, 401, cors);
        const row = await env.DB.prepare('SELECT id, name, plan, expiry, password_hash FROM users WHERE email = ?').bind(email).first();
        if (!row || !row.password_hash) return json({ error: 'invalid_credentials', detail: 'Email သို့မဟုတ် Password မှားနေပါသည်။' }, 401, cors);
        const okPass = await verifyPassword(password, row.password_hash);
        if (!okPass) return json({ error: 'invalid_credentials', detail: 'Email သို့မဟုတ် Password မှားနေပါသည်။' }, 401, cors);
        const token = await signToken(env, { sub: String(row.id), email, plan: row.plan || 'FREE' });
        // Phase 12-fix — Sign In ပြီးနောက် /app သို့ Browser Navigation အတွက် Cookie ပါ ထည့်ပေးသည်
        const sessionCookie = 'aics_token=' + encodeURIComponent(token) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800';
        return json({ ok: true, token, email, name: row.name || '', plan: row.plan || 'FREE', user_id: String(row.id) }, 200, { ...cors, 'Set-Cookie': sessionCookie });
      }

  return null;
}

export { safeOAuthRedirect, createOAuthStateCookieValue, verifyOAuthStateCookieValue };
