#!/usr/bin/env node
/**
 * IndexedDB Studio Session Results Repository behavior tests.
 * Run: node --experimental-default-type=module scripts/indexeddb-session-results-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { databaseScript } from '../worker/src/frontend/storage/database.js';
import { storageErrorsScript } from '../worker/src/frontend/storage/storage-errors.js';
import { storageOwnerScript } from '../worker/src/frontend/storage/storage-owner.js';
import { sessionsRepositoryScript } from '../worker/src/frontend/storage/repositories/sessions.js';
import { sessionResultsRepositoryScript } from '../worker/src/frontend/storage/repositories/session-results.js';

const source = [
  databaseScript(),
  storageErrorsScript(),
  storageOwnerScript(),
  sessionsRepositoryScript(),
  sessionResultsRepositoryScript()
].join('\n');

new vm.Script(source, { filename: 'session-results-repository.js' });
assert.match(source, /window\.AICS_SESSION_RESULTS\s*=\s*\{/);
assert.match(source, /continuePrimaryKey/);
assert.match(source, /window\.AICS_SESSIONS\s*=\s*\{/);
assert.match(source, /continuePrimaryKey/);
assert.match(source, /owner_sessionId/);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function compareKeys(left, right) {
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    for (let i = 0; i < length; i++) {
      const result = compareKeys(left[i], right[i]);
      if (result) return result;
    }
    return 0;
  }
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function keyPathValue(record, keyPath) {
  if (Array.isArray(keyPath)) return keyPath.map((part) => record[part]);
  return record[keyPath];
}

class FakeKeyRange {
  constructor(lower, upper, lowerOpen, upperOpen, only) {
    this.lower = lower;
    this.upper = upper;
    this.lowerOpen = Boolean(lowerOpen);
    this.upperOpen = Boolean(upperOpen);
    this.only = Boolean(only);
  }
  includes(value) {
    if (this.only) return compareKeys(value, this.lower) === 0;
    const low = compareKeys(value, this.lower);
    const high = compareKeys(value, this.upper);
    return (low > 0 || (low === 0 && !this.lowerOpen))
      && (high < 0 || (high === 0 && !this.upperOpen));
  }
  static bound(lower, upper, lowerOpen, upperOpen) {
    return new FakeKeyRange(lower, upper, lowerOpen, upperOpen, false);
  }
  static only(value) {
    return new FakeKeyRange(value, value, false, false, true);
  }
}

function createFakeIndexedDB() {
  const records = new Map();
  const definitions = new Map();
  let version = 0;

  function makeRequest(transaction, operation) {
    const request = { result: undefined, error: null, onsuccess: null, onerror: null };
    transaction.pending++;
    queueMicrotask(() => {
      if (transaction.aborted) {
        transaction.pending--;
        transaction.scheduleCompletion();
        return;
      }
      try {
        request.result = operation();
        if (request.onsuccess) request.onsuccess();
      } catch (error) {
        request.error = error;
        transaction.error = error;
        if (request.onerror) request.onerror();
        if (transaction.onerror) transaction.onerror();
      }
      transaction.pending--;
      transaction.scheduleCompletion();
    });
    return request;
  }

  function makeCursorRequest(transaction, entries, direction, onDelete) {
    const request = { result: null, error: null, onsuccess: null, onerror: null };
    const ordered = entries.slice().sort((a, b) => {
      const keyOrder = compareKeys(a.key, b.key);
      const primaryOrder = compareKeys(a.primaryKey, b.primaryKey);
      const order = keyOrder || primaryOrder;
      return direction === 'prev' ? -order : order;
    });
    let position = 0;
    transaction.pending++;

    function emit() {
      queueMicrotask(() => {
        if (transaction.aborted) {
          transaction.pending--;
          transaction.scheduleCompletion();
          return;
        }
        const entry = ordered[position] || null;
        if (!entry) {
          request.result = null;
          if (request.onsuccess) request.onsuccess();
          transaction.pending--;
          transaction.scheduleCompletion();
          return;
        }

        let continued = false;
        const cursor = {
          key: clone(entry.key),
          primaryKey: clone(entry.primaryKey),
          value: clone(entry.value),
          continue() {
            continued = true;
            position++;
            emit();
          },
          continuePrimaryKey(key, primaryKey) {
            continued = true;
            const target = { key, primaryKey };
            position = ordered.findIndex((candidate) => {
              const keyCompare = compareKeys(candidate.key, target.key);
              const pairCompare = keyCompare || compareKeys(candidate.primaryKey, target.primaryKey);
              return direction === 'prev' ? pairCompare < 0 : pairCompare > 0;
            });
            if (position < 0) position = ordered.length;
            emit();
          },
          delete() {
            onDelete(entry.primaryKey);
          }
        };
        request.result = cursor;
        if (request.onsuccess) request.onsuccess();
        if (!continued) {
          transaction.pending--;
          transaction.scheduleCompletion();
        }
      });
    }

    emit();
    return request;
  }

  const database = {
    objectStoreNames: {
      contains(name) { return records.has(name); }
    },
    createObjectStore(name, options) {
      records.set(name, new Map());
      definitions.set(name, { keyPath: options && options.keyPath, indexes: new Map() });
      return {
        createIndex(indexName, keyPath) {
          definitions.get(name).indexes.set(indexName, keyPath);
        }
      };
    },
    close() {},
    transaction(storeNames, mode) {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      for (const name of names) {
        if (!records.has(name)) throw new Error('NotFoundError');
      }
      const transaction = {
        mode,
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        pending: 0,
        aborted: false,
        completionQueued: false,
        scheduleCompletion() {
          if (this.pending || this.completionQueued || this.aborted) return;
          this.completionQueued = true;
          queueMicrotask(() => {
            this.completionQueued = false;
            if (!this.pending && !this.aborted && this.oncomplete) this.oncomplete();
          });
        },
        abort() {
          if (this.aborted) return;
          this.aborted = true;
          queueMicrotask(() => { if (this.onabort) this.onabort(); });
        },
        objectStore(name) {
          if (!names.includes(name)) throw new Error('NotFoundError');
          const map = records.get(name);
          const definition = definitions.get(name);
          const ensureWritable = () => {
            if (mode !== 'readwrite') throw new Error('ReadOnlyError');
          };
          const store = {
            get(id) {
              return makeRequest(transaction, () => clone(map.get(id)));
            },
            add(value) {
              ensureWritable();
              return makeRequest(transaction, () => {
                const key = value[definition.keyPath];
                if (map.has(key)) throw new Error('ConstraintError');
                map.set(key, clone(value));
                return key;
              });
            },
            put(value) {
              ensureWritable();
              return makeRequest(transaction, () => {
                const key = value[definition.keyPath];
                map.set(key, clone(value));
                return key;
              });
            },
            delete(id) {
              ensureWritable();
              return makeRequest(transaction, () => map.delete(id));
            },
            index(indexName) {
              const indexKeyPath = definition.indexes.get(indexName);
              if (!indexKeyPath) throw new Error('NotFoundError');
              function matchingEntries(range) {
                const result = [];
                for (const [primaryKey, value] of map.entries()) {
                  const key = keyPathValue(value, indexKeyPath);
                  if (!range || range.includes(key)) {
                    result.push({ key, primaryKey, value });
                  }
                }
                return result;
              }
              return {
                getAll(query) {
                  return makeRequest(transaction, () => matchingEntries(
                    query instanceof FakeKeyRange ? query : null
                  ).map((entry) => clone(entry.value)));
                },
                openCursor(range, direction) {
                  const entries = matchingEntries(range);
                  return makeCursorRequest(
                    transaction,
                    entries,
                    direction || 'next',
                    (primaryKey) => {
                      ensureWritable();
                      map.delete(primaryKey);
                    }
                  );
                }
              };
            }
          };
          return store;
        }
      };
      return transaction;
    }
  };

  return {
    records,
    database,
    get version() { return version; },
    open(name, requestedVersion) {
      const request = {
        result: null,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null
      };
      queueMicrotask(() => {
        request.result = database;
        if (requestedVersion > version) {
          const oldVersion = version;
          version = requestedVersion;
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ oldVersion, newVersion: version });
          }
        }
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    }
  };
}

function makeToken(subject) {
  return 'header.' + Buffer.from(JSON.stringify({ sub: subject })).toString('base64url') + '.signature';
}

const fixedTime = '2026-11-01T10:00:00.000Z';
class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [fixedTime]));
  }
  static now() {
    return new Date(fixedTime).getTime();
  }
}

let activeToken = makeToken('user-a');
const fakeIndexedDB = createFakeIndexedDB();
const localStorage = {
  getItem(key) { return key === 'aics_token' ? activeToken : null; }
};
const window = {
  indexedDB: { open: (name, requestedVersion) => fakeIndexedDB.open(name, requestedVersion) },
  IDBKeyRange: FakeKeyRange
};
const context = {
  window,
  localStorage,
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  Date: FixedDate,
  Math,
  Promise,
  JSON,
  String,
  Error,
  Array,
  Object,
  Number,
  isFinite,
  encodeURIComponent,
  decodeURIComponent
};

vm.runInNewContext(source, context, { timeout: 1000 });

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => error && error.code === code);
}

const sessionA = await window.AICS_SESSIONS.create({ studio: 'story', title: 'User A session' });
const sessionB = await window.AICS_SESSIONS.create({ studio: 'image', title: 'User B session' });
assert.equal(fakeIndexedDB.version, 3, 'repository should use IndexedDB schema v3');

const firstResult = await window.AICS_SESSION_RESULTS.create({
  sessionId: sessionA.id,
  type: 'story',
  content: { text: 'First generated story' }
});
assert.equal(firstResult.ownerId, 'user-a');
assert.equal(firstResult.sessionId, sessionA.id);
assert.equal(firstResult.type, 'story');
assert.deepEqual(JSON.parse(JSON.stringify(firstResult.content)), { text: 'First generated story' });

const readResult = await window.AICS_SESSION_RESULTS.get(firstResult.id);
assert.equal(readResult.id, firstResult.id, 'get should return the saved result');
assert.deepEqual(JSON.parse(JSON.stringify(readResult.content)), { text: 'First generated story' });

await expectCode(window.AICS_SESSION_RESULTS.create({
  sessionId: 'missing-session',
  type: 'story',
  content: { text: 'orphan' }
}), 'session_not_found');
await expectCode(window.AICS_SESSION_RESULTS.create({
  sessionId: sessionA.id,
  content: { text: 'missing type' }
}), 'missing_result_type');
await expectCode(window.AICS_SESSION_RESULTS.create({
  sessionId: sessionA.id,
  type: 'story'
}), 'missing_result_content');

activeToken = makeToken('user-b');
assert.equal(await window.AICS_SESSION_RESULTS.get(firstResult.id), null,
  'another owner must not read a result');
await expectCode(window.AICS_SESSION_RESULTS.create({
  sessionId: sessionA.id,
  type: 'story',
  content: { text: 'unauthorized' }
}), 'forbidden');
await expectCode(window.AICS_SESSION_RESULTS.list({ sessionId: sessionA.id }), 'forbidden');
await expectCode(window.AICS_SESSION_RESULTS.remove(firstResult.id), 'forbidden');

const userBResult = await window.AICS_SESSION_RESULTS.create({
  sessionId: sessionB.id,
  type: 'image',
  content: { asset: 'user-b-image' }
});
assert.equal(userBResult.ownerId, 'user-b');
assert.equal((await window.AICS_SESSION_RESULTS.list({ sessionId: sessionB.id })).items.length, 1);

activeToken = makeToken('user-a');
const resultIds = [firstResult.id];
for (let index = 1; index < 23; index++) {
  const result = await window.AICS_SESSION_RESULTS.create({
    sessionId: sessionA.id,
    type: index % 2 ? 'story' : 'image',
    content: { index }
  });
  resultIds.push(result.id);
}

const collected = [];
let cursor = null;
let pages = 0;
do {
  const page = await window.AICS_SESSION_RESULTS.list({
    sessionId: sessionA.id,
    limit: 10,
    cursor
  });
  pages++;
  assert.ok(page.items.length <= 10, 'each result page must respect its limit');
  collected.push(...page.items.map((item) => item.id));
  cursor = page.nextCursor;
  assert.equal(page.hasMore, Boolean(cursor));
} while (cursor);

assert.equal(pages, 3, '23 results should be returned in three pages');
assert.equal(collected.length, 23, 'pagination should return every result');
assert.equal(new Set(collected).size, 23, 'pagination must not return duplicate results');
assert.deepEqual(new Set(collected), new Set(resultIds),
  'pagination must not skip results with equal createdAt timestamps');

assert.equal(await window.AICS_SESSION_RESULTS.remove(firstResult.id), true,
  'remove should confirm a successful deletion');
assert.equal(await window.AICS_SESSION_RESULTS.get(firstResult.id), null,
  'removed result should no longer be readable');
assert.equal(await window.AICS_SESSION_RESULTS.remove(resultIds[1]), true);

await window.AICS_SESSIONS.remove(sessionA.id);
await expectCode(window.AICS_SESSION_RESULTS.list({ sessionId: sessionA.id }), 'session_not_found');

activeToken = '';
assert.equal(await window.AICS_SESSION_RESULTS.get(userBResult.id), null,
  'unauthenticated users must not read results');
const anonymousList = await window.AICS_SESSION_RESULTS.list({ sessionId: sessionB.id });
assert.equal(anonymousList.items.length, 0);
await assert.rejects(window.AICS_SESSION_RESULTS.create({
  sessionId: sessionB.id,
  type: 'image',
  content: { asset: 'anonymous' }
}), /auth_required/);
await assert.rejects(window.AICS_SESSION_RESULTS.remove(userBResult.id), /auth_required/);

console.log('IndexedDB Session Results Repository tests passed.');
