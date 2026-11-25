import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleUserRoutes } from '../worker/src/routes/users.routes.js';
import { userSettingsRepositoryScript } from '../worker/src/frontend/storage/repositories/user-settings.js';

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
            return { results: [
              { pref_key: 'compact_mode', pref_value: 'true' },
              { pref_key: 'bad key', pref_value: 'ignored' },
              { pref_key: 'null_value', pref_value: null },
              { pref_key: 'long_value', pref_value: 'x'.repeat(501) }
            ] };
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
assert.deepEqual(legacy.migration, { skippedPreferences: 3 });
assert.equal(Object.keys(legacy.preferences).length, 1, 'invalid legacy preferences must not be returned');
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

const repositorySource = userSettingsRepositoryScript();
assert.match(repositorySource, /migrateLegacy: function \(patch\)/,
  'repository must expose a dedicated legacy migration operation');
assert.match(repositorySource, /legacySettingsMigration:\s*\{\s*status:\s*'complete'/,
  'migration completion marker must be persisted with the settings record');
assert.match(repositorySource, /__aicsFillMissingSettings\(currentProfile, clean\.profile\)/);
assert.match(repositorySource, /__aicsFillMissingSettings\(currentSettings, clean\.settings\)/);
assert.match(repositorySource, /__aicsFillMissingSettings\(currentPreferences, clean\.preferences\)/);
assert.match(repositorySource, /!Object\.prototype\.hasOwnProperty\.call\(target, key\)/,
  'existing values must not be overwritten during legacy migration');
assert.match(repositorySource, /tx\.oncomplete = function \(\) \{ if \(!settled\) \{ settled = true; resolve\(result\); \} \}/,
  'migration promise must resolve only after the IndexedDB transaction completes');

const settingsSource = await readFile(new URL('../worker/src/frontend/settings.js', import.meta.url), 'utf8');
const sharedSource = await readFile(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
const authSource = await readFile(new URL('../worker/src/routes/auth.routes.js', import.meta.url), 'utf8');
const loginSource = await readFile(new URL('../worker/src/frontend/login.js', import.meta.url), 'utf8');
assert.match(settingsSource, /window\.AICS_USER_SETTINGS\.save\(\{profile:/);
assert.match(settingsSource, /window\.AICS_USER_SETTINGS\.save\(\{settings:/);
assert.doesNotMatch(settingsSource, /\/api\/users\/me\/(?:profile|settings)/);
assert.match(sharedSource, /window\.AICS_LOAD_USER_SETTINGS/);
assert.match(sharedSource, /\/api\/users\/me\/legacy-settings/);
assert.match(sharedSource, /legacySettingsMigration/);
assert.match(sharedSource, /function isRecord\(value\)/,
  'legacy response fields must be validated as non-array objects');
assert.match(sharedSource, /typeof legacy\.profile\.name !==/,
  'legacy profile name must have the expected string type');
assert.match(sharedSource, /Number\.isSafeInteger\(legacy\.migration\.skippedPreferences\)/,
  'legacy skipped preference count must be a non-negative safe integer');
assert.match(sharedSource, /legacy_settings_invalid_response/,
  'invalid legacy response must fail before IndexedDB migration');
assert.doesNotMatch(sharedSource, /profile: legacy\.profile \|\| \{\}/,
  'invalid or missing profile must not be silently replaced with an empty object');
assert.doesNotMatch(sharedSource, /settings: legacy\.settings \|\| \{\}/,
  'invalid or missing settings must not be silently replaced with an empty object');
assert.doesNotMatch(sharedSource, /preferences: legacy\.preferences \|\| \{\}/,
  'invalid or missing preferences must not be silently replaced with an empty object');
assert.match(sharedSource, /skippedLegacyPreferences = legacy\.migration\.skippedPreferences/,
  'client must read only the server-reported skipped preference count');
assert.match(sharedSource, /skippedLegacyPreferences > 0 && typeof __sbToast/,
  'client must notify only when invalid legacy preferences were skipped');
assert.match(sharedSource, /ကျန်ဆက်တင်များကို ပြန်လည်ရယူထားသည်/,
  'migration notice must explain that valid settings were still restored');
assert.match(sharedSource, /AICS_USER_SETTINGS\.migrateLegacy/);
assert.match(sharedSource, /legacy_settings_persistence_unverified/);
assert.match(sharedSource, /existingRecord\) return existingRecord/,
  'an existing IndexedDB record must remain usable if the legacy endpoint is temporarily unavailable');
assert.ok(sharedSource.includes(String.raw`cache: \'no-store\'`),
  'legacy settings response must not be cached');
assert.match(sharedSource, /window\.AICS_USER_SETTINGS\.get\(\)/,
  'migration flow must read the IndexedDB record back after migration');
assert.doesNotMatch(sharedSource, /AICS_USER_SETTINGS\.save\(\{ profile: legacyProfile, settings:/,
  'legacy settings must use the fill-only-missing migration method');
assert.doesNotMatch(authSource, /INSERT INTO users \(email, name/);
assert.doesNotMatch(authSource, /UPDATE users SET name/);
assert.match(loginSource, /userSettingsRepositoryScript/);
assert.match(loginSource, /\$\{userSettingsRepositoryScript\(\)\}/);
assert.doesNotMatch(loginSource, /\/api\/auth\/(?:signup|signin)/);
assert.match(sharedSource, /window\.AICS_USER_SETTINGS\.save\(\{ profile: \{ name: AICS_OAUTH_PROFILE_NAME \} \}\)/);

console.log('User Settings IndexedDB migration contract tests passed.');
