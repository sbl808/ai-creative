import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { handleAuthRoutes, verifyOAuthStateCookieValue } from '../worker/src/routes/auth.routes.js';
import { signToken, verifyToken } from '../worker/src/platform/auth/index.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const authSource = await readFile('worker/src/routes/auth.routes.js', 'utf8');
const coreSource = await readFile('worker/src/core/auth.js', 'utf8');
const platformSource = await readFile('worker/src/platform/auth/index.js', 'utf8');
const loginSource = await readFile('worker/src/frontend/login.js', 'utf8');

assert.match(authSource, /SELECT id, google_sub FROM users WHERE email = \?/);
assert.match(authSource, /SELECT id, plan, expiry FROM users WHERE google_sub = \?/);
assert.match(authSource, /INSERT INTO users \(google_sub, email, plan/);
assert.match(authSource, /user\.verified_email !== true/);
assert.doesNotMatch(authSource, /hashPassword|verifyPassword|\/api\/auth\/signup|\/api\/auth\/signin/);
assert.doesNotMatch(authSource, /console\.(?:log|error)\s*\(/);
assert.doesNotMatch(coreSource, /PBKDF2|hashPassword|verifyPassword/);
assert.doesNotMatch(platformSource, /hashPassword|verifyPassword/);
assert.match(loginSource, /\/api\/auth\/login/);
assert.doesNotMatch(loginSource, /\/api\/auth\/signup|\/api\/auth\/signin|signinForm|password|Sign up/i);

const env = {
  SESSION_SIGNING_KEY: 'test-session-signing-key',
  GOOGLE_OAUTH_CLIENT_ID: 'test-client-id',
  GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret',
};
const cors = {};
const deps = {
  json(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    });
  },
  friendlyError() { return 'Something went wrong. Please try again.'; },
  verifyTokenSafe: async (runtimeEnv, token) => {
    try { return await verifyToken(runtimeEnv, token); } catch (_) { return null; }
  },
  cookieToken(request) {
    const match = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)aics_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  },
  clearSessionCookie() {
    return 'aics_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
  },
};

function fakeDatabase({ emailOwner = null, existing = null, insertedId = 41 } = {}) {
  const calls = [];
  return {
    calls,
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              async first() {
                calls.push({ method: 'first', sql, values });
                if (sql.includes('WHERE email = ?')) return emailOwner;
                if (sql.includes('WHERE google_sub = ?')) return existing;
                return null;
              },
              async run() {
                calls.push({ method: 'run', sql, values });
                if (sql.startsWith('INSERT INTO users')) return { meta: { last_row_id: insertedId } };
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };
}

async function runGoogleCallback(database, profile) {
  const runtimeEnv = { ...env, ...database };
  const loginResponse = await handleAuthRoutes(
    new Request('https://studio.test/api/auth/login?next=/app'),
    runtimeEnv,
    cors,
    deps
  );
  assert.equal(loginResponse.status, 302);
  const setCookie = loginResponse.headers.get('Set-Cookie');
  const encodedStateCookie = setCookie.match(/aics_oauth_state=([^;]+)/)[1];
  const stateCookie = decodeURIComponent(encodedStateCookie);
  const statePayload = await verifyOAuthStateCookieValue(runtimeEnv, stateCookie);
  assert.ok(statePayload);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).includes('oauth2.googleapis.com/token')) {
      return Response.json({ access_token: 'test-access-token' });
    }
    if (String(input).includes('googleapis.com/oauth2/v2/userinfo')) {
      return Response.json(profile);
    }
    throw new Error('unexpected_test_fetch');
  };
  try {
    const callback = new Request(
      'https://studio.test/api/auth/callback?code=test-code&state=' + encodeURIComponent(statePayload.state),
      { headers: { Cookie: 'aics_oauth_state=' + encodedStateCookie } }
    );
    return await handleAuthRoutes(callback, runtimeEnv, cors, deps);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const newAccountDb = fakeDatabase();
const success = await runGoogleCallback(newAccountDb, {
  id: 'google-sub-123',
  email: 'New.User@example.test',
  verified_email: true,
  name: 'New User',
});
assert.equal(success.status, 302);
assert.match(success.headers.get('Location'), /aics_profile_name=New\+User/);
assert.ok(success.headers.get('Set-Cookie').includes('aics_token='));
const insertCall = newAccountDb.calls.find((call) => call.sql.startsWith('INSERT INTO users'));
assert.deepEqual(insertCall.values.slice(0, 2), ['google-sub-123', 'new.user@example.test']);
const sessionToken = decodeURIComponent(success.headers.get('Set-Cookie').match(/aics_token=([^;]+)/)[1]);
const session = await verifyToken(env, sessionToken);
assert.equal(session.sub, '41');
assert.equal(session.plan, 'FREE');

const existingDb = fakeDatabase({
  emailOwner: { id: 9, google_sub: 'google-sub-existing' },
  existing: { id: 9, plan: 'PRO', expiry: '2030-01-01' },
});
const existingSuccess = await runGoogleCallback(existingDb, {
  id: 'google-sub-existing',
  email: 'member@example.test',
  verified_email: true,
});
assert.equal(existingSuccess.status, 302);
const existingSessionToken = decodeURIComponent(existingSuccess.headers.get('Set-Cookie').match(/aics_token=([^;]+)/)[1]);
const existingSession = await verifyToken(env, existingSessionToken);
assert.equal(existingSession.sub, '9');
assert.equal(existingSession.plan, 'PRO');
assert.ok(existingDb.calls.some((call) => call.sql.startsWith('UPDATE users SET email')));

const conflictDb = fakeDatabase({
  emailOwner: { id: 12, google_sub: 'another-google-sub' },
});
const conflict = await runGoogleCallback(conflictDb, {
  id: 'google-sub-123',
  email: 'taken@example.test',
  verified_email: true,
});
assert.equal(conflict.status, 409);
assert.deepEqual(await conflict.json(), { error: 'account_identity_conflict' });
assert.equal(conflictDb.calls.some((call) => call.sql.startsWith('INSERT INTO users')), false);

const unverifiedDb = fakeDatabase();
const unverified = await runGoogleCallback(unverifiedDb, {
  id: 'google-sub-unverified',
  email: 'unverified@example.test',
  verified_email: false,
});
assert.equal(unverified.status, 400);
assert.equal(unverifiedDb.calls.length, 0);

const legacySignup = await handleAuthRoutes(
  new Request('https://studio.test/api/auth/signup', { method: 'POST' }),
  { ...env, ...fakeDatabase() },
  cors,
  deps
);
const legacySignin = await handleAuthRoutes(
  new Request('https://studio.test/api/auth/signin', { method: 'POST' }),
  { ...env, ...fakeDatabase() },
  cors,
  deps
);
assert.equal(legacySignup, null);
assert.equal(legacySignin, null);

const token = await signToken(env, { sub: '5', email: 'user@example.test', plan: 'FREE' });
assert.equal((await verifyToken(env, token)).sub, '5');

console.log('Google OAuth-only authentication contract tests passed.');
