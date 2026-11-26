import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleUserRoutes } from '../worker/src/routes/users.routes.js';
import { getAiModels } from '../worker/src/core/aiModels.js';
import { getStudioSettings } from '../worker/src/core/studioSettings.js';
import { checkFeature } from '../worker/src/core/featureSettings.js';

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
const userSettingsSource = await readFile(new URL('../worker/src/frontend/storage/repositories/user-settings.js', import.meta.url), 'utf8');
assert.match(settingsSource, /window\.AICS_USER_SETTINGS\.save\(\{profile:/);
assert.match(settingsSource, /window\.AICS_USER_SETTINGS\.save\(\{settings:/);
assert.doesNotMatch(settingsSource, /\/api\/users\/me\/(?:profile|settings)/);
assert.match(sharedSource, /window\.AICS_LOAD_USER_SETTINGS/);
assert.match(sharedSource, /\/api\/users\/me\/legacy-settings/);
assert.match(sharedSource, /AICS_USER_SETTINGS\.migrateLegacy/);
assert.match(sharedSource, /legacySettingsMigration/);
assert.match(userSettingsSource, /__aicsFillMissingSettings/);
assert.match(userSettingsSource, /legacySettingsMigration/);
assert.match(userSettingsSource, /status: 'complete'/);
assert.doesNotMatch(authSource, /INSERT INTO users \(email, name/);
assert.doesNotMatch(authSource, /UPDATE users SET name/);
assert.match(loginSource, /userSettingsRepositoryScript/);
assert.match(loginSource, /window\.AICS_USER_SETTINGS\.save\(\{ profile: \{ name: name \} \}\)/);


const persistedModelEnv = {
  DB: {
    prepare() {
      return {
        async all() {
          return { results: [{
            id: 'admin-transcriber', name: 'Admin Transcriber', category: 'transcribe',
            enabled: 1, is_default: 1, plan_access: 'FREE', provider: 'gemini',
            capabilities_json: '["audio-transcription"]',
            supported_tasks_json: '["content.transcribe"]', status: 'active'
          }] };
        }
      };
    }
  }
};
const persistedModels = await getAiModels(persistedModelEnv);
const persistedTranscriber = persistedModels.find((model) => model.id === 'admin-transcriber');
assert.ok(persistedTranscriber.supported_tasks.includes('content.transcribe'));
assert.ok(persistedTranscriber.supported_tasks.includes('subtitle.transcribe'),
  'legacy persisted transcribe models must gain Subtitle support without losing configured tasks');


const missingRowEnv = {
  DB: {
    prepare(sql) {
      return {
        values: [],
        bind(...values) { this.values = values; return this; },
        async run() { return { meta: { changes: 0 } }; },
        async all() {
          if (sql.includes('FROM studio_settings')) {
            return { results: [{ studio_id: 'story', enabled: 0 }] };
          }
          return { results: [] };
        },
        async first() { return null; }
      };
    }
  }
};
const missingStudioRows = await getStudioSettings(missingRowEnv);
assert.equal(missingStudioRows.story, false, 'existing Admin-disabled Studio must remain disabled');
assert.equal(missingStudioRows.subtitle, false,
  'a missing Studio row after settings persistence must fail closed; initialization is explicit Admin-only');
const missingSubtitleFeature = await checkFeature(missingRowEnv, 'subtitle.transcribe', 'FREE', '1');
assert.deepEqual(missingSubtitleFeature, { ok: false, reason: 'disabled' },
  'a missing Feature row after settings persistence must fail closed until explicit initialization');
console.log('User Settings IndexedDB migration contract tests passed.');
