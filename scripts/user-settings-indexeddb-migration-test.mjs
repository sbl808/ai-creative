import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleUserRoutes } from '../worker/src/routes/users.routes.js';

const sqlCalls = [];
const env = {
  ADMIN_EMAIL: 'admin@example.com',
  DB: {
    prepare(sql) {
      sqlCalls.push(sql);
      const statement = {
        args: [],
        bind(...args) { this.args = args; return this; },
        async first() {
          if (sql.includes('FROM user_settings')) {
            return {
              default_studio: 'story',
              default_voice: 'Kore',
              default_model: 'gemini-3.5-flash-lite',
              language: 'my',
              theme: 'dark'
            };
          }
          if (sql.includes('FROM users')) return { name: 'Legacy Profile' };
          return null;
        },
        async all() {
          if (sql.includes('FROM user_preferences')) {
            return { results: [{ pref_key: 'compact_mode', pref_value: 'true' }] };
          }
          return { results: [] };
        }
      };
      return statement;
    }
  }
};
const deps = {
  bearer: (request) => (request.headers.get('Authorization') || '').replace(/^Bearer /, ''),
  verifyTokenSafe: async (_env, token) => token === 'valid-token' ? { sub: 'user-a', email: 'user@example.com' } : null,
  resolvePlan: async () => 'PRO',
  json: (body, status = 200, cors = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors }
  })
};

const profileResponse = await handleUserRoutes(
  new Request('https://example.test/api/users/me', { headers: { Authorization: 'Bearer valid-token' } }),
  env, {}, deps
);
assert.equal(profileResponse.status, 200);
assert.equal(profileResponse.headers.get('Cache-Control'), 'no-store');
const profile = await profileResponse.json();
assert.equal(profile.email, 'user@example.com');
assert.equal(profile.plan, 'PRO');
assert.equal(profile.user_id, 'user-a');
assert.equal(profile.name, undefined);
assert.equal(profile.settings, undefined);
assert.equal(profile.preferences, undefined);
assert.equal(sqlCalls.some((sql) => /FROM user_settings|FROM user_preferences|SELECT name FROM users/i.test(sql)), false,
  'normal account endpoint must not read legacy personal settings');

sqlCalls.length = 0;
const legacyResponse = await handleUserRoutes(
  new Request('https://example.test/api/users/me/legacy-settings', { headers: { Authorization: 'Bearer valid-token' } }),
  env, {}, deps
);
assert.equal(legacyResponse.status, 200);
assert.equal(legacyResponse.headers.get('Cache-Control'), 'no-store');
const legacy = await legacyResponse.json();
assert.deepEqual(legacy.profile, { name: 'Legacy Profile' });
assert.equal(legacy.settings.default_voice, 'Kore');
assert.deepEqual(legacy.preferences, { compact_mode: 'true' });
assert.ok(sqlCalls.length >= 3);
assert.ok(sqlCalls.every((sql) => /^\s*SELECT\b/i.test(sql)), 'legacy migration endpoint must be read-only');

for (const path of ['/api/users/me/profile', '/api/users/me/settings']) {
  const response = await handleUserRoutes(
    new Request('https://example.test' + path, {
      method: 'PUT',
      headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', settings: { theme: 'light' } })
    }),
    env, {}, deps
  );
  assert.equal(response, null, path + ' must no longer be a D1 write endpoint');
}

const settingsSource = await readFile(new URL('../worker/src/frontend/settings.js', import.meta.url), 'utf8');
const sharedSource = await readFile(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
const authSource = await readFile(new URL('../worker/src/routes/auth.routes.js', import.meta.url), 'utf8');
const loginSource = await readFile(new URL('../worker/src/frontend/login.js', import.meta.url), 'utf8');
assert.doesNotMatch(settingsSource, /profileName|saveName|window\.AICS_USER_SETTINGS\.save\(\{profile:/, 'Settings UI must not expose or save Profile Name');
assert.match(settingsSource, /window\.AICS_USER_SETTINGS\.save\(\{settings:/);
assert.doesNotMatch(settingsSource, /pref_studio|pref_voice|default_studio\s*:|default_voice\s*:/, 'Settings UI must not expose or write Default Studio or Default Voice');
assert.doesNotMatch(settingsSource, /\/api\/users\/me\/(?:profile|settings)/);
assert.match(sharedSource, /window\.AICS_LOAD_USER_SETTINGS/);
assert.match(sharedSource, /\/api\/users\/me\/legacy-settings/);
assert.doesNotMatch(authSource, /INSERT INTO users \(email, name/);
assert.doesNotMatch(authSource, /UPDATE users SET name/);
assert.match(loginSource, /userSettingsRepositoryScript/);
assert.match(loginSource, /window\.AICS_USER_SETTINGS\.save\(\{ profile: \{ name: name \} \}\)/);

console.log('User Settings IndexedDB migration contract tests passed.');
