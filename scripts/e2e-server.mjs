#!/usr/bin/env node
/**
 * AI Creative Studio V2 — E2E test server
 * ------------------------------------------------------------------
 * Boots the REAL worker (worker/src/index.js) inside a plain Node HTTP
 * server with a mocked D1 + signing key, so Playwright can drive the
 * actual pages/scripts in a real browser against real worker responses.
 *
 * No external network is required (AI providers are never reached; the
 * studio "generate" calls fail honestly with no_api_key → 500 → friendly
 * error UI, which is exactly what the E2E asserts).
 *
 * Usage: import { startE2EServer } from './e2e-server.mjs';
 */
import http from 'node:http';
import { signToken } from '../worker/src/core/auth.js';

export const E2E_KEY = 'e2e-test-session-key';

// ------------------------------------------------------------------ mock D1
// Enough for: resolvePlan, /api/users/me, settings/preferences,
// studio_settings, ai_models, user_keys, usage — all return empty/null
// except the users plan lookup (FREE) and user name lookup.
class MockD1 {
  constructor() {
    this.projects = []; // in-memory rows: { id, user_id, title, description, created_at, updated_at }
    this._seq = 0;
  }
  prepare(sql) {
    const self = this;
    return {
      _args: [],
      bind(...args) { this._args = args; return this; },
      async first() {
        if (/SELECT plan, expiry FROM users WHERE id = \?/.test(sql)) {
          return { plan: 'FREE', expiry: null };
        }
        if (/SELECT name FROM users WHERE id = \?/.test(sql)) {
          return { name: 'E2E User' };
        }
        return null;
      },
      async all() {
        if (/SELECT id, title, description, created_at, updated_at FROM projects WHERE user_id = \?/.test(sql)) {
          const uid = this._args[0];
          const rows = self.projects
            .filter((p) => p.user_id === uid)
            .slice()
            .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
            .slice(0, 100);
          return { results: rows };
        }
        return { results: [] };
      },
      async run() {
        if (/INSERT INTO projects \(id, user_id, title, description, created_at, updated_at\)/.test(sql)) {
          const [id, userId, title, description] = this._args;
          const row = { id, user_id: userId, title, description, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
          self.projects.push(row);
          return { success: true, meta: { changes: 1 } };
        }
        if (/DELETE FROM projects WHERE id = \? AND user_id = \?/.test(sql)) {
          const [id, userId] = this._args;
          const before = self.projects.length;
          self.projects = self.projects.filter((p) => !(p.id === id && p.user_id === userId));
          return { success: true, meta: { changes: before - self.projects.length } };
        }
        return { success: true, meta: { changes: 1 } };
      },
    };
  }
}

export function buildE2EEnv(origin) {
  return {
    SESSION_SIGNING_KEY: E2E_KEY,
    GOOGLE_OAUTH_CLIENT_ID: 'e2e-client',
    GOOGLE_OAUTH_CLIENT_SECRET: 'e2e-secret',
    ALLOWED_ORIGINS: origin,
    ADMIN_EMAIL: 'e2e@test.local',
    DB: new MockD1(),
    // NOTE: no GEMINI_API_KEY on purpose — AI calls must fail honestly.
  };
}

export async function createE2EToken() {
  return signToken({ SESSION_SIGNING_KEY: E2E_KEY }, { sub: 'e2e-user', email: 'e2e@test.local', name: 'E2E User' });
}

/**
 * Starts the worker-backed HTTP server. Returns { server, port, url, env, token }.
 */
export async function startE2EServer(port = 0) {
  // Fresh worker module instance per server start (cache-buster).
  const worker = (await import('../worker/src/index.js?e2e=' + Date.now() + Math.random())).default;

  // Build the stable env BEFORE accepting requests (closure sees it immediately).
  const token = await createE2EToken();
  let env = null;

  const server = http.createServer(async (req, res) => {
    const origin = 'http://127.0.0.1:' + (server.address ? server.address().port : port);
    const url = new URL(req.url || '/', origin);
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(', ') : String(v);
    }
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise((resolve) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }
    const request = new Request(url.href, {
      method: req.method,
      headers,
      body: body && body.length ? body : undefined,
    });
    try {
      // One stable env per server (mocked D1 keeps state across requests,
      // matching how a real Worker env binding behaves).
      const response = await worker.fetch(request, env, {});
      const respHeaders = {};
      const cookies = [];
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') cookies.push(value);
        else respHeaders[key] = value;
      });
      const buf = Buffer.from(await response.arrayBuffer());
      const outHeaders = { ...respHeaders };
      if (cookies.length) outHeaders['Set-Cookie'] = cookies;
      res.writeHead(response.status, outHeaders);
      res.end(buf);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('E2E_SERVER_ERROR: ' + String((e && e.message) || e));
    }
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const realPort = server.address().port;
  env = buildE2EEnv('http://127.0.0.1:' + realPort);
  return { server, port: realPort, url: 'http://127.0.0.1:' + realPort, env, token };
}
