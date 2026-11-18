import { signToken } from '../platform/auth/index.js';

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

function safeOAuthRedirect(next, requestOrigin) {
  try {
    const target = new URL(String(next || '/app'), requestOrigin);
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return requestOrigin + '/app';
    if (target.username || target.password || target.origin !== requestOrigin) return requestOrigin + '/app';
    if (target.protocol === 'http:' && target.hostname !== 'localhost' && target.hostname !== '127.0.0.1') {
      return requestOrigin + '/app';
    }
    return target.href;
  } catch (_) {
    return requestOrigin + '/app';
  }
}

function appendOAuthProfileName(redirectTo, profileName) {
  const name = String(profileName || '').trim().slice(0, 60);
  if (!name) return String(redirectTo || '');
  try {
    const target = new URL(String(redirectTo));
    const params = new URLSearchParams(target.hash.replace(/^#/, ''));
    params.set('aics_profile_name', name);
    target.hash = params.toString();
    return target.href;
  } catch (_) {
    return String(redirectTo || '');
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

export async function handleAuthRoutes(request, env, cors, deps) {
  const url = new URL(request.url);
  const path = url.pathname;
  const { json, friendlyError, verifyTokenSafe, cookieToken, clearSessionCookie } = deps;

  if (path === '/api/auth/login' && request.method === 'GET') {
    if (!env.GOOGLE_OAUTH_CLIENT_ID) {
      return json({ error: 'auth_service_unavailable' }, 503, cors);
    }
    const redirectTo = safeOAuthRedirect(url.searchParams.get('next') || '/app', url.origin);
    const state = createOAuthNonce();
    const stateCookie = await createOAuthStateCookieValue(env, state, redirectTo);
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_ID) +
      '&redirect_uri=' + encodeURIComponent(url.origin + '/api/auth/callback') +
      '&response_type=code&scope=openid%20email%20profile' +
      '&state=' + encodeURIComponent(state) + '&access_type=online';
    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl,
        'Cache-Control': 'no-store',
        'Set-Cookie': OAUTH_STATE_COOKIE + '=' + encodeURIComponent(stateCookie) +
          '; Path=/api/auth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600',
      },
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
      if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
        return withClearedState(json({ error: 'auth_service_unavailable' }, 503, cors));
      }
      const code = url.searchParams.get('code');
      if (!code) return withClearedState(json({ error: 'auth_failed' }, 400, cors));
      if (!env.DB) return withClearedState(json({ error: 'account_service_unavailable' }, 503, cors));

      const origin = url.origin;
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'code=' + encodeURIComponent(code) +
          '&client_id=' + encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_ID) +
          '&client_secret=' + encodeURIComponent(env.GOOGLE_OAUTH_CLIENT_SECRET) +
          '&redirect_uri=' + encodeURIComponent(origin + '/api/auth/callback') +
          '&grant_type=authorization_code',
      });
      if (!tokenResponse.ok) {
        return withClearedState(json({ error: 'auth_failed', detail: 'Login could not be completed. Please try again.' }, 400, cors));
      }
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenData || typeof tokenData.access_token !== 'string' || !tokenData.access_token) {
        return withClearedState(json({ error: 'auth_failed', detail: 'Login could not be completed. Please try again.' }, 400, cors));
      }

      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: 'Bearer ' + tokenData.access_token },
      });
      if (!userResponse.ok) {
        return withClearedState(json({ error: 'userinfo_failed', detail: 'Login could not be completed. Please try again.' }, 400, cors));
      }
      const user = await userResponse.json().catch(() => ({}));
      const googleSub = String(user && user.id || '').trim();
      const email = String(user && user.email || '').trim().toLowerCase();
      if (!googleSub || googleSub.length > 255 || !email ||
          email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          user.verified_email !== true) {
        return withClearedState(json({ error: 'google_account_not_verified' }, 400, cors));
      }

      // Never link accounts by email alone: Google subject is the stable identity key.
      const emailOwner = await env.DB.prepare(
        'SELECT id, google_sub FROM users WHERE email = ?'
      ).bind(email).first();
      if (emailOwner && String(emailOwner.google_sub || '') !== googleSub) {
        return withClearedState(json({ error: 'account_identity_conflict' }, 409, cors));
      }

      let account = await env.DB.prepare(
        'SELECT id, plan, expiry FROM users WHERE google_sub = ?'
      ).bind(googleSub).first();

      if (account) {
        await env.DB.prepare(
          "UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(email, account.id).run();
        account = { ...account, email };
      } else {
        const insert = await env.DB.prepare(
          "INSERT INTO users (google_sub, email, plan, created_at, updated_at) " +
          "VALUES (?, ?, 'FREE', datetime('now'), datetime('now'))"
        ).bind(googleSub, email).run();
        const userId = insert && insert.meta ? insert.meta.last_row_id : null;
        if (!userId) {
          return withClearedState(json({ error: 'account_service_unavailable' }, 503, cors));
        }
        account = { id: userId, plan: 'FREE', expiry: null, email };
      }

      const token = await signToken(env, {
        sub: String(account.id),
        email,
        plan: account.plan || 'FREE',
      });
      const sessionCookie = 'aics_token=' + encodeURIComponent(token) +
        '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800';
      const response = new Response(null, {
        status: 302,
        headers: {
          Location: appendOAuthProfileName(statePayload.redirectTo, user.name),
          'Set-Cookie': sessionCookie,
          'Cache-Control': 'no-store',
        },
      });
      return withClearedState(response);
    } catch (_) {
      return withClearedState(json({ error: 'auth_error', detail: friendlyError() }, 500, cors));
    }
  }

  if (path === '/api/auth/logout' && request.method === 'GET') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.origin + '/app',
        'Set-Cookie': clearSessionCookie(),
        'Cache-Control': 'no-store',
      },
    });
  }

  if (path === '/api/auth/session' && request.method === 'GET') {
    const token = cookieToken(request);
    if (!token) return json({ error: 'no_session' }, 401, cors);
    const payload = await verifyTokenSafe(env, token);
    if (!payload) return json({ error: 'invalid_session' }, 401, cors);
    return json({
      ok: true,
      token,
      email: payload.email,
      plan: payload.plan || 'FREE',
      user_id: payload.sub,
    }, 200, cors);
  }

  // Email/password signup and signin routes are intentionally not supported.
  return null;
}

export {
  safeOAuthRedirect,
  appendOAuthProfileName,
  createOAuthStateCookieValue,
  verifyOAuthStateCookieValue,
};
