#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleUserRoutes } from '../worker/src/routes/users.routes.js';
import { handleAiRoutes } from '../worker/src/routes/ai.routes.js';
import { trackUsage } from '../worker/src/core/usage.js';

const d1Calls = [];
const db = {
  prepare(sql) {
    d1Calls.push(String(sql));
    throw new Error('D1 user usage access is forbidden by the IndexedDB-only policy');
  },
};
const env = { ADMIN_EMAIL: '', DB: db };

console.log('--- User profile privacy contract ---');
{
  const request = new Request('https://aics.test/api/users/me', {
    method: 'GET',
    headers: { Authorization: 'Bearer test-token' },
  });
  const response = await handleUserRoutes(request, env, {}, {
    bearer: () => 'test-token',
    verifyTokenSafe: async () => ({ sub: 'verified-user-1', email: 'user@example.test' }),
    resolvePlan: async () => 'FREE',
    json: (body, status, headers = {}) => new Response(JSON.stringify(body), {
      status, headers: { 'Content-Type': 'application/json', ...headers },
    }),
  });

  assert.equal(response.status, 200, 'user profile endpoint should remain available');
  const payload = await response.json();
  assert.equal(payload.user_id, 'verified-user-1');
  assert.equal(Object.hasOwn(payload, 'usage'), false,
    'API response must not expose server-side usage counters');
  assert.equal(d1Calls.length, 0, 'user profile must not read or write D1 usage data');
}

console.log('--- Studio usage tracking privacy contract ---');
{
  await trackUsage(env, 'private-user-id', 'IMAGE', 1);
  await trackUsage(env, 'private-user-id', 'VOICE', 1);
  await trackUsage(env, 'private-user-id', 'AI', 1);
  assert.equal(d1Calls.length, 0,
    'Studio usage tracking must remain a no-op and must not access D1');
}

console.log('--- AI connection-test privacy contract ---');
{
  const limiterCalls = [];
  const response = await handleAiRoutes(
    new Request('https://aics.test/api/ai/test', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: '{',
    }),
    {
      ...env,
      AI_TEST_RATE_LIMITER: {
        async limit(input) {
          limiterCalls.push(input);
          return { success: true };
        },
      },
    },
    {},
    {
      bearer: () => 'test-token',
      verifyTokenSafe: async () => ({ sub: 'verified-user-2' }),
      json: (body, status, headers = {}) => new Response(JSON.stringify(body), {
        status, headers: { 'Content-Type': 'application/json', ...headers },
      }),
      friendlyError: () => 'safe error',
    },
  );

  assert.equal(response.status, 400, 'invalid JSON should stop before any AI provider request');
  assert.deepEqual(limiterCalls, [{ key: 'verified-user-2' }],
    'AI Test rate limiting must use the verified user subject');
  assert.equal(d1Calls.length, 0, 'AI Test route must not read or write D1 usage counters');
}

console.log('--- Source-level H6 guardrails ---');
{
  const [userRouteSource, usageSource, aiRouteSource] = await Promise.all([
    readFile(new URL('../worker/src/routes/users.routes.js', import.meta.url), 'utf8'),
    readFile(new URL('../worker/src/core/usage.js', import.meta.url), 'utf8'),
    readFile(new URL('../worker/src/routes/ai.routes.js', import.meta.url), 'utf8'),
  ]);

  assert.equal(userRouteSource.toLowerCase().includes('from usage'), false,
    'user profile route must not contain D1 usage queries');
  assert.equal(usageSource.includes('env.DB'), false,
    'usage service must not access the D1 binding');
  assert.equal(usageSource.includes('.prepare('), false,
    'usage service must not execute D1 statements');
  assert.equal(aiRouteSource.includes('api_test_limits'), false,
    'AI Test route must not reference the historical D1 counter table');
  assert.equal(aiRouteSource.includes('env.DB'), false,
    'AI Test route must not access the D1 binding');
  assert.equal(aiRouteSource.includes('.prepare('), false,
    'AI Test route must not execute D1 statements');
  assert.equal(d1Calls.length, 0, 'no tested H6 path may access D1');
}

console.log('User Usage / Studio / AI Test privacy contracts passed.');
