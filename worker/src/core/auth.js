// AI Creative Studio — Stateless session token authentication.
const enc = new TextEncoder();
let keyCache = null;

async function getKey(secret) {
  if (keyCache) return keyCache;
  const value = secret != null ? String(secret).trim() : '';
  if (!value) throw new Error('missing_signing_key');
  keyCache = await crypto.subtle.importKey(
    'raw',
    enc.encode(value),
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

function b64urlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signToken(env, payload) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24 * 7,
  })));
  const key = await getKey(env.SESSION_SIGNING_KEY);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(header + '.' + body));
  return header + '.' + body + '.' + b64url(signature);
}

async function verifyToken(env, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('bad_token');
  const key = await getKey(env.SESSION_SIGNING_KEY);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    b64urlDecode(parts[2]),
    enc.encode(parts[0] + '.' + parts[1])
  );
  if (!valid) throw new Error('bad_signature');
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  if (!Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('expired');
  }
  return payload;
}

export { signToken, verifyToken };
