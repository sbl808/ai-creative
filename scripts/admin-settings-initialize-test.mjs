import assert from 'node:assert/strict';
import { adminApi } from '../worker/src/admin/api.js';
import { STUDIO_REGISTRY } from '../worker/src/configuration/studio-config/index.js';
import { FEATURE_REGISTRY } from '../worker/src/configuration/feature-config/index.js';

function createDb({ studioRows = {}, featureRows = {} } = {}) {
  const studios = new Map(Object.entries(studioRows));
  const features = new Map(Object.entries(featureRows));
  const statements = [];
  const logs = [];
  return {
    studios, features, statements, logs,
    prepare(sql) {
      statements.push(sql);
      return {
        values: [],
        bind(...values) { this.values = values; return this; },
        async run() {
          if (sql.includes('INSERT OR IGNORE INTO studio_settings')) {
            const [id, enabled] = this.values;
            if (studios.has(id)) return { meta: { changes: 0 } };
            studios.set(id, { enabled });
            return { meta: { changes: 1 } };
          }
          if (sql.includes('INSERT OR IGNORE INTO feature_settings')) {
            const [id, access] = this.values;
            if (features.has(id)) return { meta: { changes: 0 } };
            features.set(id, { enabled: 1, access, limit_value: 0 });
            return { meta: { changes: 1 } };
          }
          if (sql.includes('INSERT INTO admin_logs')) {
            logs.push(this.values);
            return { meta: { changes: 1 } };
          }
          throw new Error('Unexpected SQL in test: ' + sql);
        }
      };
    }
  };
}

const verifyToken = async (_env, token) => {
  if (token === 'admin-token') return { email: 'ADMIN@example.com' };
  if (token === 'user-token') return { email: 'user@example.com' };
  return null;
};

function request(token, method = 'POST') {
  return new Request('https://example.test/api/admin/settings/initialize', {
    method,
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  });
}

async function payload(response) {
  return response ? response.json() : null;
}

// Missing authentication must be rejected before touching the database.
{
  const DB = createDb();
  const response = await adminApi(request(null), '/api/admin/settings/initialize', {
    ADMIN_EMAIL: 'admin@example.com', DB
  }, verifyToken);
  assert.equal(response.status, 401);
  assert.equal(DB.statements.length, 0);
}

// A signed-in non-admin must be forbidden and must not initialize any rows.
{
  const DB = createDb();
  const response = await adminApi(request('user-token'), '/api/admin/settings/initialize', {
    ADMIN_EMAIL: 'admin@example.com', DB
  }, verifyToken);
  assert.equal(response.status, 403);
  assert.equal(DB.statements.length, 0);
}

// The configured Admin may initialize missing registry rows.
{
  const DB = createDb();
  const response = await adminApi(request('admin-token'), '/api/admin/settings/initialize', {
    ADMIN_EMAIL: 'admin@example.com', DB
  }, verifyToken);
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.ok, true);
  assert.equal(body.studiosAdded, Object.keys(STUDIO_REGISTRY).length);
  assert.equal(body.featuresAdded, Object.keys(FEATURE_REGISTRY).length);
  assert.equal(DB.studios.size, Object.keys(STUDIO_REGISTRY).length);
  assert.equal(DB.features.size, Object.keys(FEATURE_REGISTRY).length);
  assert.equal(DB.logs.length, 1);
  assert.equal(DB.logs[0][1], 'settings_initialize');
  const settingInserts = DB.statements.filter(sql => /INSERT .* INTO (?:studio_settings|feature_settings)/i.test(sql));
  assert.ok(settingInserts.length > 0 && settingInserts.every(sql => sql.includes('INSERT OR IGNORE')),
    'initialization must use INSERT OR IGNORE and never overwrite saved settings');
}

// Existing Admin overrides, including explicit OFF values, must remain unchanged.
// A second initialization must be idempotent and add no duplicate rows.
{
  const DB = createDb({
    studioRows: { story: { enabled: 0 } },
    featureRows: { 'story.generate': { enabled: 0, access: 'PRO', limit_value: 17 } }
  });
  const env = { ADMIN_EMAIL: 'admin@example.com', DB };
  const first = await adminApi(request('admin-token'), '/api/admin/settings/initialize', env, verifyToken);
  assert.equal(first.status, 200);
  const firstBody = await payload(first);
  assert.equal(firstBody.studiosAdded, Object.keys(STUDIO_REGISTRY).length - 1);
  assert.equal(firstBody.featuresAdded, Object.keys(FEATURE_REGISTRY).length - 1);
  assert.deepEqual(DB.studios.get('story'), { enabled: 0 });
  assert.deepEqual(DB.features.get('story.generate'), { enabled: 0, access: 'PRO', limit_value: 17 });

  const second = await adminApi(request('admin-token'), '/api/admin/settings/initialize', env, verifyToken);
  assert.equal(second.status, 200);
  const secondBody = await payload(second);
  assert.equal(secondBody.studiosAdded, 0);
  assert.equal(secondBody.featuresAdded, 0);
  assert.deepEqual(DB.studios.get('story'), { enabled: 0 });
  assert.deepEqual(DB.features.get('story.generate'), { enabled: 0, access: 'PRO', limit_value: 17 });
  assert.equal(DB.logs.length, 2);
}

// Missing database must return a service error without throwing.
{
  const response = await adminApi(request('admin-token'), '/api/admin/settings/initialize', {
    ADMIN_EMAIL: 'admin@example.com'
  }, verifyToken);
  assert.equal(response.status, 503);
  assert.deepEqual(await payload(response), { error: 'db_unavailable' });
}

console.log('Admin settings initialization contract tests passed.');
