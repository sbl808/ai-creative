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
      assert.match(sql, /studio_settings/i, 'Worker account route may read Platform Studio settings only');
      return { async all() { return { results: [] }; } };
    }
  }
};
const deps = {
  bearer: (request) => (request.headers.get('Authorization') || '').replace(/^Bearer /, ''),
  verifyTokenSafe: async (_env, token) => token === 'valid-token'
    ? { sub: 'user-a', email: 'user@example.com' }
    : null,
  resolvePlan: async () => 'PRO',
  json: (body, status = 200, cors = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors }
  })
};

// Account metadata remains available, but personal settings are not read from D1.
const profileResponse = await handleUserRoutes(
  new Request('https://example.test/api/users/me', {
    headers: { Authorization: 'Bearer valid-token' }
  }),
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
assert.ok(sqlCalls.length > 0);
assert.ok(sqlCalls.every((sql) => /studio_settings/i.test(sql)));
assert.equal(sqlCalls.some((sql) => /user_settings|user_preferences|SELECT\s+name\s+FROM\s+users/i.test(sql)), false);

// The removed legacy route and old D1 write routes must not be handled.
sqlCalls.length = 0;
const legacyResponse = await handleUserRoutes(
  new Request('https://example.test/api/users/me/legacy-settings', {
    headers: { Authorization: 'Bearer valid-token' }
  }),
  env, {}, deps
);
assert.equal(legacyResponse, null, 'legacy D1 settings endpoint must be absent');
assert.equal(sqlCalls.length, 0, 'legacy endpoint request must not query D1');

for (const path of ['/api/users/me/profile', '/api/users/me/settings']) {
  const response = await handleUserRoutes(
    new Request('https://example.test' + path, {
      method: 'PUT',
      headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name', settings: { theme: 'light' } })
    }),
    env, {}, deps
  );
  assert.equal(response, null, path + ' must not be a D1 user-data write endpoint');
}

// A transaction-aware IndexedDB double exercises the browser repository CRUD contract.
function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createIndexedDb() {
  const records = new Map();
  const database = {
    transaction(storeName, mode) {
      assert.equal(storeName, 'user_settings');
      assert.ok(mode === 'readonly' || mode === 'readwrite');
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
            if (!this.pending && !this.aborted && this.oncomplete) this.oncomplete();
          });
        },
        objectStore(name) {
          assert.equal(name, 'user_settings');
          return {
            get(key) {
              const request = { result: undefined, error: null, onsuccess: null, onerror: null };
              tx.pending += 1;
              queueMicrotask(() => {
                if (!tx.aborted) {
                  request.result = clone(records.get(key));
                  if (request.onsuccess) request.onsuccess();
                }
                tx.pending -= 1;
                tx.scheduleCompletion();
              });
              return request;
            },
            put(value) {
              const request = { result: undefined, error: null, onsuccess: null, onerror: null };
              tx.pending += 1;
              queueMicrotask(() => {
                if (!tx.aborted) {
                  records.set(value.id, clone(value));
                  request.result = value.id;
                  if (request.onsuccess) request.onsuccess();
                }
                tx.pending -= 1;
                tx.scheduleCompletion();
              });
              return request;
            },
            delete(key) {
              const request = { result: undefined, error: null, onsuccess: null, onerror: null };
              tx.pending += 1;
              queueMicrotask(() => {
                if (!tx.aborted) {
                  records.delete(key);
                  if (request.onsuccess) request.onsuccess();
                }
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
  return { database, records };
}

function createRepository(testDb, ownerId = 'user-a') {
  const window = {};
  const context = {
    window,
    Promise,
    Object,
    Array,
    String,
    Date,
    Error,
    RegExp,
    __aicsRequireUserId: () => ownerId,
    __aicsDbOpen: () => Promise.resolve(testDb.database),
    __aicsStorageError(code) {
      const error = new Error(code);
      error.code = code;
      return error;
    }
  };
  vm.runInNewContext(userSettingsRepositoryScript(), context, { timeout: 1000 });
  return window.AICS_USER_SETTINGS;
}

const repositorySource = userSettingsRepositoryScript();
assert.doesNotMatch(repositorySource, /migrateLegacy|legacySettingsMigration|__aicsFillMissingSettings/,
  'browser settings repository must not contain the removed D1 migration workflow');
assert.match(repositorySource, /get: function \(\)/);
assert.match(repositorySource, /save: function \(patch\)/);
assert.match(repositorySource, /remove: function \(\)/);

const testDb = createIndexedDb();
const userA = createRepository(testDb, 'user-a');
const userB = createRepository(testDb, 'user-b');

assert.equal(await userA.get(), null, 'new browser profile must start without a settings record');

const saved = await userA.save({
  profile: { name: 'Browser User' },
  settings: { default_studio: 'story', default_voice: 'Kore', theme: 'dark' },
  preferences: { compact_mode: 'true' }
});
assert.equal(saved.ownerId, 'user-a');
assert.equal(saved.profile.name, 'Browser User');
assert.equal(saved.settings.default_studio, 'story');
assert.equal(saved.preferences.compact_mode, 'true');

const loaded = await userA.get();
assert.equal(loaded.profile.name, 'Browser User');
assert.equal(loaded.settings.default_voice, 'Kore');
assert.equal(await userB.get(), null, 'a different owner must not read another browser record');

const merged = await userA.save({
  profile: { name: 'Updated Browser User' },
  settings: { theme: 'light' },
  preferences: { show_tips: 'false' }
});
assert.equal(merged.profile.name, 'Updated Browser User');
assert.equal(merged.settings.theme, 'light');
assert.equal(merged.settings.default_studio, 'story', 'partial saves must preserve unrelated settings');
assert.equal(merged.preferences.compact_mode, 'true', 'partial saves must preserve unrelated preferences');
assert.equal(merged.preferences.show_tips, 'false');

await assert.rejects(
  userA.save({ settings: { theme: 42 } }),
  (error) => error && error.code === 'invalid_user_settings'
);

await userB.save({ settings: { default_studio: 'short' } });
assert.equal((await userB.get()).settings.default_studio, 'short');
assert.equal((await userA.get()).settings.default_studio, 'story');

assert.equal(await userA.remove(), true);
assert.equal(await userA.get(), null, 'remove must delete only the current owner browser record');
assert.equal((await userB.get()).settings.default_studio, 'short',
  'removing one owner record must not affect another owner record');

// Frontend contract: load and save remain browser-only; OAuth name and model compatibility remain.
const settingsSource = await readFile(new URL('../worker/src/frontend/settings.js', import.meta.url), 'utf8');
const sharedSource = await readFile(new URL('../worker/src/frontend/shared.js', import.meta.url), 'utf8');
const authSource = await readFile(new URL('../worker/src/routes/auth.routes.js', import.meta.url), 'utf8');
const loginSource = await readFile(new URL('../worker/src/frontend/login.js', import.meta.url), 'utf8');

assert.match(settingsSource, /window\.AICS_USER_SETTINGS\.save\(\{profile:/);
assert.match(settingsSource, /window\.AICS_USER_SETTINGS\.save\(\{settings:/);
assert.doesNotMatch(settingsSource, /\/api\/users\/me\/(?:legacy-settings|profile|settings)/);
assert.match(sharedSource, /window\.AICS_LOAD_USER_SETTINGS/);
assert.match(sharedSource, /window\.AICS_USER_SETTINGS\.get\(\)/);
assert.doesNotMatch(sharedSource, /legacy-settings|legacySettingsMigration|migrateLegacy/);
assert.match(sharedSource, /AICS_OAUTH_PROFILE_NAME/);
assert.match(sharedSource, /AICS_USER_SETTINGS\.save\(\{ profile: \{ name: AICS_OAUTH_PROFILE_NAME \} \}\)/);
assert.match(sharedSource, /aics_default_model/);
assert.doesNotMatch(authSource, /INSERT INTO users \(email, name/);
assert.doesNotMatch(authSource, /UPDATE users SET name/);
assert.match(loginSource, /userSettingsRepositoryScript/);
assert.match(loginSource, /\$\{userSettingsRepositoryScript\(\)\}/);

console.log('User Settings browser-only IndexedDB contract tests passed.');
