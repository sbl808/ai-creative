#!/usr/bin/env node
/**
 * IndexedDB Studio Sessions Repository behavior tests.
 * Run: node --experimental-default-type=module scripts/indexeddb-sessions-test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { databaseScript } from '../worker/src/frontend/storage/database.js';
import { storageErrorsScript } from '../worker/src/frontend/storage/storage-errors.js';
import { storageOwnerScript } from '../worker/src/frontend/storage/storage-owner.js';
import { sessionsRepositoryScript } from '../worker/src/frontend/storage/repositories/sessions.js';

const source = [
  databaseScript(),
  storageErrorsScript(),
  storageOwnerScript(),
  sessionsRepositoryScript()
].join('\n');

new vm.Script(source, { filename: 'sessions-repository.js' });
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

async function flushTransactions() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

assert.equal(fakeIndexedDB.version, 0);
const first = await window.AICS_SESSIONS.create({
  studio: 'story',
  title: 'First session',
  draft: { input: { topic: 'A' } }
});
assert.equal(fakeIndexedDB.version, 5, 'database should initialize at schema v5');
assert.equal(first.ownerId, 'user-a');
assert.equal(first.studio, 'STORY');
assert.equal(first.status, 'active');
assert.deepEqual(JSON.parse(JSON.stringify(first.draft)), { input: { topic: 'A' } });

const readFirst = await window.AICS_SESSIONS.get(first.id);
assert.equal(readFirst.id, first.id, 'Read should return the created session');

const updatedFirst = await window.AICS_SESSIONS.update(first.id, {
  title: 'Updated session',
  draft: { input: { topic: 'B' } },
  status: 'archived'
});
assert.equal(updatedFirst.title, 'Updated session');
assert.equal(updatedFirst.status, 'archived');
assert.deepEqual(JSON.parse(JSON.stringify(updatedFirst.draft)), { input: { topic: 'B' } });

activeToken = makeToken('user-b');
assert.equal(await window.AICS_SESSIONS.get(first.id), null, 'another owner must not read the session');
await assert.rejects(window.AICS_SESSIONS.update(first.id, { title: 'Hijack' }), /forbidden/);
await assert.rejects(window.AICS_SESSIONS.remove(first.id), /forbidden/);
const secondOwnerSession = await window.AICS_SESSIONS.create({ studio: 'image', title: 'User B session' });
assert.equal(secondOwnerSession.ownerId, 'user-b');
assert.equal((await window.AICS_SESSIONS.list()).items.length, 1);

activeToken = makeToken('user-a');
const sessionIds = [first.id];
for (let index = 1; index < 25; index++) {
  const session = await window.AICS_SESSIONS.create({
    studio: 'story',
    title: 'Session ' + index,
    draft: { index }
  });
  sessionIds.push(session.id);
}

const collectedIds = [];
let cursor = null;
let pageCount = 0;
do {
  const page = await window.AICS_SESSIONS.list({ limit: 10, cursor });
  pageCount++;
  assert.ok(page.items.length <= 10, 'each page must contain no more than 10 sessions');
  collectedIds.push(...page.items.map((item) => item.id));
  cursor = page.nextCursor;
  assert.equal(page.hasMore, Boolean(cursor));
} while (cursor);

assert.equal(pageCount, 3, '25 sessions should be returned in three pages');
assert.equal(collectedIds.length, 25, 'pagination must return all 25 sessions');
assert.equal(new Set(collectedIds).size, 25, 'pagination must not return duplicate sessions');
assert.deepEqual(new Set(collectedIds), new Set(sessionIds), 'pagination must not skip sessions with duplicate updatedAt timestamps');

const sessionResults = fakeIndexedDB.records.get('session_results');
sessionResults.set('result-a1', {
  id: 'result-a1',
  ownerId: 'user-a',
  sessionId: first.id,
  type: 'story',
  content: { text: 'Result 1' },
  createdAt: fixedTime
});
sessionResults.set('result-a2', {
  id: 'result-a2',
  ownerId: 'user-a',
  sessionId: first.id,
  type: 'image',
  content: { url: 'local://result-2' },
  createdAt: fixedTime
});
sessionResults.set('result-b1', {
  id: 'result-b1',
  ownerId: 'user-b',
  sessionId: secondOwnerSession.id,
  type: 'image',
  content: { url: 'local://user-b' },
  createdAt: fixedTime
});

await window.AICS_SESSIONS.remove(first.id);
assert.equal(await window.AICS_SESSIONS.get(first.id), null, 'Delete should remove the session');
assert.equal(sessionResults.has('result-a1'), false, 'Delete should cascade to the first related result');
assert.equal(sessionResults.has('result-a2'), false, 'Delete should cascade to every related result');
assert.equal(sessionResults.has('result-b1'), true, 'Delete must not remove another owner’s results');

activeToken = '';
assert.equal(await window.AICS_SESSIONS.get(secondOwnerSession.id), null);
assert.equal((await window.AICS_SESSIONS.list()).items.length, 0, 'unauthenticated owner must have no visible sessions');
await assert.rejects(window.AICS_SESSIONS.create({ studio: 'story' }), /auth_required/);

console.log('IndexedDB Sessions Repository tests passed.');
