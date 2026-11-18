import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logAdminAction, listAdminLogs } from '../worker/src/core/adminLogs.js';

const calls = [];
const env = { DB: { prepare(sql) { return { bind(...values) { calls.push({ sql, values }); return {
  run: async () => ({ success: true }),
  all: async () => ({ results: [{ action_code: 'cms_create', result_code: 'success', created_at: '2026-11-19 00:00:00' }] }),
}; } }; } } };

await logAdminAction(env, 'cms_create');
assert.equal(calls.length, 1);
assert.match(calls[0].sql, /INSERT INTO admin_logs \(action_code, result_code, created_at\)/);
assert.deepEqual(calls[0].values, ['cms_create', 'success']);
assert.doesNotMatch(calls[0].sql, /admin_email|user_id|detail|payload|content/i);

await logAdminAction(env, 'cms_create', 'arbitrary-payload');
assert.equal(calls.length, 1, 'unknown result codes must not be persisted');
await logAdminAction(env, 'user@example.com');
assert.equal(calls.length, 1, 'unknown action codes must not be persisted');

const items = await listAdminLogs(env, 100);
assert.equal(calls.length, 2);
assert.match(calls[1].sql, /SELECT action_code, result_code, created_at FROM admin_logs/);
assert.doesNotMatch(calls[1].sql, /admin_email|user_id|detail|payload|content/i);
assert.deepEqual(items[0], { action_code: 'cms_create', result_code: 'success', created_at: '2026-11-19 00:00:00' });

const api = readFileSync(new URL('../worker/src/admin/api.js', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../worker/src/admin/task-api-utils.js', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../worker/src/admin/ui.js', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../worker/migrations-platform/0008_admin_logs.sql', import.meta.url), 'utf8');
assert.doesNotMatch(api, /logAdminAction\(env,\s*user\.email/);
assert.doesNotMatch(helper, /JSON\.stringify\(metadata|user\s*&&\s*user\.email/);
assert.match(helper, /logAdminAction\(env, action\)/);
assert.match(ui, /r\.action_code/);
assert.match(ui, /r\.result_code/);
assert.doesNotMatch(ui, /r\.admin_email|r\.detail/);
assert.match(schema, /action_code TEXT NOT NULL/);
assert.match(schema, /result_code TEXT NOT NULL/);
const schemaColumns = schema.split('CREATE TABLE IF NOT EXISTS admin_logs (')[1].split(');')[0];
assert.doesNotMatch(schemaColumns, /admin_email|user_id|detail|payload|content/i);

console.log('Admin Logs privacy contract: PASS');
