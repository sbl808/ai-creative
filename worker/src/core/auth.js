// AI Creative Studio — Auth (fixed crypto key handling)
const enc = new TextEncoder();
let keyCache = null;

async function getKey(secret) {
  if (keyCache) return keyCache;
  // Production-readiness: NEVER silently fall back to a well-known dev key.
  // If SESSION_SIGNING_KEY is missing/empty we fail loudly instead of signing
  // tokens with a publicly guessable secret. Callers surface this as a safe
  // 5xx / unauthenticated response (see verifyTokenSafe + friendlyError).
  const s = secret != null ? String(secret).trim() : '';
  if (!s) {
    throw new Error('missing_signing_key');
  }
  keyCache = await crypto.subtle.importKey(
    'raw',
    enc.encode(s),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return keyCache;
}

function b64url(data) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(data)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function signToken(env, payload) {
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  })));
  const key = await getKey(env.SESSION_SIGNING_KEY);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(header + '.' + body));
  return header + '.' + body + '.' + b64url(sig);
}

async function verifyToken(env, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('bad_token');
  const key = await getKey(env.SESSION_SIGNING_KEY);
  const ok = await crypto.subtle.verify('HMAC', key, b64urlDecode(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('bad_signature');
  const data = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  if (data.exp && data.exp < Math.floor(Date.now() / 1000)) throw new Error('expired');
  return data;
}

// ============================================================
// Phase 12 — Email/Password (Rule 11: Plain Text ဖြင့် မသိမ်းပါ)
// PBKDF2-SHA256 + Per-User Random Salt + Timing-safe Compare
// Iterations 30k — Cloudflare Workers CPU Budget နှင့် ညှိထားသည်
// Google OAuth က Primary Authentication အဖြစ် ဆက်ထားသည်
// ============================================================
const PBKDF2_ITERATIONS = 30000;

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(String(password || '')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return 'pbkdf2$' + PBKDF2_ITERATIONS + '$' + b64url(salt) + '$' + b64url(new Uint8Array(bits));
}

async function verifyPassword(password, stored) {
  try {
    const parts = String(stored || '').split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const iterations = parseInt(parts[1], 10);
    if (!(iterations > 0 && iterations <= 600000)) return false;
    const salt = b64urlDecode(parts[2]);
    const expect = b64urlDecode(parts[3]);
    if (!expect.length) return false;
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(String(password || '')), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      expect.length * 8
    );
    const got = new Uint8Array(bits);
    if (got.length !== expect.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got[i] ^ expect[i];
    return diff === 0;
  } catch (e) {
    return false;
  }
}

export { signToken, verifyToken, hashPassword, verifyPassword };
