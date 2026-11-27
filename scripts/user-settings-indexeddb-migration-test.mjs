import assert from 'node:assert/strict';
import vm from 'node:vm';
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
const saveMethodStart = repositorySource.indexOf('save: function (patch)');
const migrationMethodStart = repositorySource.indexOf('migrateLegacy: function (patch)');
assert.ok(saveMethodStart >= 0 && !repositorySource.slice(saveMethodStart, migrationMethodStart).includes("current.legacySettingsMigration.status === 'complete'"),
  'normal settings saves must remain available after legacy migration completes');
const idempotencyGuardIndex = repositorySource.indexOf("if (current && current.legacySettingsMigration && current.legacySettingsMigration.status === 'complete')", migrationMethodStart);
const migrationMergeIndex = repositorySource.indexOf('__aicsFillMissingSettings(currentProfile, clean.profile)', migrationMethodStart);
assert.ok(idempotencyGuardIndex > migrationMethodStart && idempotencyGuardIndex < migrationMergeIndex,
  'completed legacy migrations must return before applying legacy values again');
assert.match(repositorySource, /if \(current && current\.legacySettingsMigration && current\.legacySettingsMigration\.status === 'complete'\) \{\s*result = current;\s*return;\s*\}/,
  'a completed migration must return the existing IndexedDB record without another write');
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
assert.match(settingsSource, /window\.AICS_APP_PREFERENCES\.getLanguage\(legacyLanguage\)/, 'legacy browser language is used as fallback when no app preference exists');
assert.match(settingsSource, /window\.AICS_APP_PREFERENCES\.setLanguage\(language\)/, 'App Language is persisted in the browser-global store');
assert.match(settingsSource, /default_studio:document\.getElementById\('pref_studio'\)\.value/, 'Default Studio remains available');
assert.match(settingsSource, /default_voice:document\.getElementById\('pref_voice'\)\.value\.trim\(\)/, 'Default Voice remains available');
assert.match(settingsSource, /window\.AICS_USER_SETTINGS\.save\(\{profile:/, 'Profile Name remains available');
assert.doesNotMatch(settingsSource, /\/api\/users\/me\/(?:profile|settings)/);
assert.match(sharedSource, /window\.AICS_LOAD_USER_SETTINGS/);
assert.match(sharedSource, /\/api\/users\/me\/legacy-settings/);
assert.match(sharedSource, /legacySettingsMigration/);
assert.match(sharedSource, /legacy\.migration && legacy\.migration\.skippedPreferences/,
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
assert.match(loginSource, /appPreferencesRepositoryScript/);
assert.match(loginSource, /i18nRuntimeScript/);
assert.match(loginSource, /\$\{userSettingsRepositoryScript\(\)\}/);
assert.doesNotMatch(loginSource, /\/api\/auth\/(?:signup|signin)/);
assert.match(sharedSource, /window\.AICS_USER_SETTINGS\.save\(\{ profile: \{ name: AICS_OAUTH_PROFILE_NAME \} \}\)/);

// Exercise the repository migration against a transaction-aware IndexedDB test double.
function createMigrationTestDatabase(initialRecord, options = {}) {
  let persisted = initialRecord ? JSON.parse(JSON.stringify(initialRecord)) : null;
  let putCalls = 0;
  let failNextPut = options.failNextPut === true;

  const database = {
    transaction(storeNames, mode) {
      assert.equal(mode, 'readwrite');
      assert.deepEqual(Array.isArray(storeNames) ? storeNames : [storeNames], ['user_settings']);
      let working = persisted ? JSON.parse(JSON.stringify(persisted)) : null;
      const tx = {
        pending: 0,
        aborted: false,
        completionQueued: false,
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        abort() {
          if (this.aborted) return;
          this.aborted = true;
          queueMicrotask(() => { if (this.onabort) this.onabort(); });
        },
        scheduleCompletion() {
          if (this.pending || this.completionQueued || this.aborted) return;
          this.completionQueued = true;
          queueMicrotask(() => {
            this.completionQueued = false;
            if (this.pending || this.aborted) return;
            persisted = working ? JSON.parse(JSON.stringify(working)) : null;
            if (this.oncomplete) this.oncomplete();
          });
        },
        objectStore(name) {
          assert.equal(name, 'user_settings');
          return {
            get(key) {
              const request = { result: undefined, error: null, onsuccess: null, onerror: null };
              tx.pending += 1;
              queueMicrotask(() => {
                if (tx.aborted) {
                  tx.pending -= 1;
                  tx.scheduleCompletion();
                  return;
                }
                request.result = working && working.id === key
                  ? JSON.parse(JSON.stringify(working))
                  : undefined;
                if (request.onsuccess) request.onsuccess();
                tx.pending -= 1;
                tx.scheduleCompletion();
              });
              return request;
            },
            put(value) {
              if (failNextPut) {
                failNextPut = false;
                throw new Error('simulated IndexedDB write failure');
              }
              putCalls += 1;
              const request = { result: undefined, error: null, onsuccess: null, onerror: null };
              tx.pending += 1;
              queueMicrotask(() => {
                if (tx.aborted) {
                  tx.pending -= 1;
                  tx.scheduleCompletion();
                  return;
                }
                working = JSON.parse(JSON.stringify(value));
                request.result = value.id;
                if (request.onsuccess) request.onsuccess();
                tx.pending -= 1;
                tx.scheduleCompletion();
              });
              return request;
            }
          };
        }
      };
      return tx;
    }
  };

  return {
    database,
    getRecord: () => persisted ? JSON.parse(JSON.stringify(persisted)) : null,
    get putCalls() { return putCalls; }
  };
}

function createMigrationRepository(testDatabase) {
  const window = {};
  const context = {
    window,
    Promise,
    Object,
    Array,
    String,
    Date,
    Error,
    __aicsRequireUserId: () => 'user-a',
    __aicsDbOpen: () => Promise.resolve(testDatabase.database),
    __aicsStorageError(code) {
      const error = new Error(code);
      error.code = code;
      return error;
    }
  };
  vm.runInNewContext(userSettingsRepositoryScript(), context, { timeout: 1000 });
  return window.AICS_USER_SETTINGS;
}

const migrationDb = createMigrationTestDatabase({
  id: 'user-a',
  ownerId: 'user-a',
  profile: { name: 'Existing Name' },
  settings: { theme: 'dark' },
  preferences: { compact_mode: 'false' },
  updatedAt: '2026-11-01T00:00:00.000Z'
});
const migrationRepository = createMigrationRepository(migrationDb);
const migratedRecord = await migrationRepository.migrateLegacy({
  profile: { name: 'Legacy Name' },
  settings: { theme: 'light', default_studio: 'story', default_voice: 'Kore' },
  preferences: { compact_mode: 'true', show_tips: 'true' }
});
assert.equal(migratedRecord.profile.name, 'Existing Name',
  'legacy profile data must not overwrite an existing user value');
assert.equal(migratedRecord.settings.theme, 'dark',
  'legacy settings must not overwrite an existing user value');
assert.equal(migratedRecord.settings.default_studio, 'story',
  'missing settings must be filled from the legacy source');
assert.equal(migratedRecord.settings.default_voice, 'Kore');
assert.equal(migratedRecord.preferences.compact_mode, 'false',
  'legacy preferences must not overwrite an existing user value');
assert.equal(migratedRecord.preferences.show_tips, 'true',
  'missing preferences must be filled from the legacy source');
assert.equal(migratedRecord.legacySettingsMigration.status, 'complete');
assert.equal(migrationDb.putCalls, 1);

const retryResult = await migrationRepository.migrateLegacy({
  profile: { name: 'A later legacy value' },
  settings: { theme: 'light', default_studio: 'short' },
  preferences: { compact_mode: 'true', show_tips: 'false' }
});
assert.equal(retryResult.profile.name, 'Existing Name');
assert.equal(retryResult.settings.default_studio, 'story');
assert.equal(retryResult.preferences.show_tips, 'true');
assert.equal(migrationDb.putCalls, 1,
  'a completed migration retry must not write to IndexedDB again');
assert.equal(JSON.stringify(retryResult), JSON.stringify(migratedRecord),
  'a completed migration retry must return the original migrated record');

const savedAfterMigration = await migrationRepository.save({ settings: { theme: 'light' } });
assert.equal(savedAfterMigration.settings.theme, 'light',
  'users must still be able to save settings after legacy migration completes');
assert.equal(migrationDb.putCalls, 2,
  'a normal settings save after migration must persist exactly once');

const failedAttemptDb = createMigrationTestDatabase({
  id: 'user-a',
  ownerId: 'user-a',
  profile: { name: 'Keep This Name' },
  settings: { theme: 'dark' },
  preferences: {}
}, { failNextPut: true });
const failedAttemptRepository = createMigrationRepository(failedAttemptDb);
await assert.rejects(
  failedAttemptRepository.migrateLegacy({
    profile: { name: 'Legacy Name' },
    settings: { theme: 'light', default_voice: 'Kore' },
    preferences: { compact_mode: 'true' }
  }),
  error => error && error.code === 'indexeddb_write_failed'
);
assert.equal(failedAttemptDb.getRecord().profile.name, 'Keep This Name',
  'a failed migration write must leave the existing IndexedDB record unchanged');
assert.equal(failedAttemptDb.getRecord().legacySettingsMigration, undefined,
  'a failed migration must not persist the completion marker');

const successfulRetry = await failedAttemptRepository.migrateLegacy({
  profile: { name: 'Legacy Name' },
  settings: { theme: 'light', default_voice: 'Kore' },
  preferences: { compact_mode: 'true' }
});
assert.equal(successfulRetry.profile.name, 'Keep This Name',
  'retry after a failed write must still preserve existing values');
assert.equal(successfulRetry.settings.theme, 'dark');
assert.equal(successfulRetry.settings.default_voice, 'Kore');
assert.equal(successfulRetry.preferences.compact_mode, 'true');
assert.equal(successfulRetry.legacySettingsMigration.status, 'complete');
assert.equal(failedAttemptDb.putCalls, 1,
  'the failed write must not count as a persisted write; the successful retry writes once');


console.log('User Settings IndexedDB migration contract and runtime tests passed.');
