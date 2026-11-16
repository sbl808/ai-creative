#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleUserRoutes } from '../worker/src/routes/users.routes.js';

const sqlStatements = [];
const env = {
  ADMIN_EMAIL: '',
  DB: {
    prepare(sql) {
      sqlStatements.push(String(sql));
      if (String(sql).toLowerCase().includes('from usage')) {
        throw new Error('D1 usage access is forbidden by the IndexedDB-only policy');
      }
      return {
        async all() { return { results: [] }; },
        async first() { return null; },
      };
    },
  },
};

const request = new Request('https://aics.test/api/users/me', {
  method: 'GET',
  headers: { Authorization: 'Bearer test-token' },
});
const response = await handleUserRoutes(request, env, {}, {
  bearer: () => 'test-token',
  verifyTokenSafe: async () => ({ sub: 'verified-user-1', email: 'user@example.test' }),
  resolvePlan: async () => 'FREE',
  json: (body, status, headers = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  }),
});

assert.equal(response.status, 200, 'user profile endpoint should remain available');
const payload = await response.json();
assert.equal(payload.user_id, 'verified-user-1');
assert.equal(Object.hasOwn(payload, 'usage'), false, 'API response must not expose server-side usage counters');
assert.equal(sqlStatements.some((sql) => sql.toLowerCase().includes('from usage')), false,
  'profile endpoint must not read the D1 usage table');

const routeSource = await readFile(new URL('../worker/src/routes/users.routes.js', import.meta.url), 'utf8');
assert.equal(routeSource.toLowerCase().includes('from usage'), false,
  'user route source must not contain D1 usage queries');

console.log('User usage privacy contract passed.');
